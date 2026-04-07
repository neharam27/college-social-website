const express     = require("express")
const db          = require("../config/db")
const jwt         = require("jsonwebtoken")
const verifyToken = require("../middleware/authMiddleware")
const { requireRole } = require("../middleware/rbac")

const router = express.Router()

// ─── Auto-create tables ───────────────────────────────────────────────────────
function onPollsTable(err) {
  if (err) console.error("polls table error:", err.message)
  else console.log("polls table ready")
}
function onOptionsTable(err) {
  if (err) console.error("poll_options table error:", err.message)
  else console.log("poll_options table ready")
}
function onVotesTable(err) {
  if (err) console.error("poll_votes table error:", err.message)
  else console.log("poll_votes table ready")
}

db.query(
  "CREATE TABLE IF NOT EXISTS polls (" +
  "  id INT AUTO_INCREMENT PRIMARY KEY," +
  "  club_id INT NOT NULL," +
  "  question VARCHAR(500) NOT NULL," +
  "  is_anonymous TINYINT(1) DEFAULT 0," +
  "  ends_at DATETIME NULL," +
  "  status ENUM('active','closed','deleted') DEFAULT 'active'," +
  "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
  "  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE" +
  ")",
  onPollsTable
)

db.query(
  "CREATE TABLE IF NOT EXISTS poll_options (" +
  "  id INT AUTO_INCREMENT PRIMARY KEY," +
  "  poll_id INT NOT NULL," +
  "  option_text VARCHAR(255) NOT NULL," +
  "  display_order INT DEFAULT 0," +
  "  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE" +
  ")",
  onOptionsTable
)

db.query(
  "CREATE TABLE IF NOT EXISTS poll_votes (" +
  "  id INT AUTO_INCREMENT PRIMARY KEY," +
  "  poll_id INT NOT NULL," +
  "  option_id INT NOT NULL," +
  "  user_id INT NOT NULL," +
  "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
  "  UNIQUE (poll_id, user_id)," +
  "  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE," +
  "  FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE," +
  "  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
  ")",
  onVotesTable
)

// ─── Helper: extract user id from optional token ──────────────────────────────
const optionalUserId = (req) => {
  try {
    const header = req.headers.authorization
    if (!header) return null
    const token   = header.split(" ")[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    return payload.id
  } catch (e) { return null }
}

// ─── Helper: fetch polls + options + user vote ───────────────────────────────
const enrichPolls = (polls, userId, callback) => {
  if (polls.length === 0) return callback(null, [])

  const pollIds = polls.map(p => p.id)

  db.query(
    `SELECT po.id, po.poll_id, po.option_text, po.display_order,
            COUNT(pv.id) AS vote_count
     FROM poll_options po
     LEFT JOIN poll_votes pv ON pv.option_id = po.id
     WHERE po.poll_id IN (?)
     GROUP BY po.id
     ORDER BY po.display_order ASC`,
    [pollIds],
    (err, options) => {
      if (err) return callback(err)

      // Fetch user's votes for these polls
      if (!userId) {
        const result = polls.map(p => ({
          ...p,
          options: options.filter(o => o.poll_id === p.id),
          user_voted_option: null
        }))
        return callback(null, result)
      }

      db.query(
        "SELECT poll_id, option_id FROM poll_votes WHERE poll_id IN (?) AND user_id = ?",
        [pollIds, userId],
        (err2, votes) => {
          if (err2) return callback(err2)

          const voteMap = {}
          votes.forEach(v => { voteMap[v.poll_id] = v.option_id })

          const result = polls.map(p => ({
            ...p,
            options: options.filter(o => o.poll_id === p.id),
            user_voted_option: voteMap[p.id] || null
          }))
          callback(null, result)
        }
      )
    }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL POLLS (public, with optional auth for vote state)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/all", (req, res) => {
  const userId = optionalUserId(req)

  db.query(
    `SELECT p.id, p.club_id, p.question, p.is_anonymous, p.ends_at, p.status, p.created_at,
            c.club_name,
            COUNT(DISTINCT pv.id) AS total_votes
     FROM polls p
     JOIN clubs c ON p.club_id = c.id
     LEFT JOIN poll_votes pv ON pv.poll_id = p.id
     WHERE p.status != 'deleted' AND c.status = 'active'
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT 50`,
    (err, polls) => {
      if (err) return res.status(500).json({ message: "Server error" })
      enrichPolls(polls, userId, (err2, result) => {
        if (err2) return res.status(500).json({ message: "Server error" })
        res.json(result)
      })
    }
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// GET POLLS FOR A SPECIFIC CLUB
// ─────────────────────────────────────────────────────────────────────────────
router.get("/club/:id", (req, res) => {
  const userId = optionalUserId(req)

  db.query(
    `SELECT p.id, p.club_id, p.question, p.is_anonymous, p.ends_at, p.status, p.created_at,
            c.club_name,
            COUNT(DISTINCT pv.id) AS total_votes
     FROM polls p
     JOIN clubs c ON p.club_id = c.id
     LEFT JOIN poll_votes pv ON pv.poll_id = p.id
     WHERE p.club_id = ? AND p.status != 'deleted'
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [req.params.id],
    (err, polls) => {
      if (err) return res.status(500).json({ message: "Server error" })
      enrichPolls(polls, userId, (err2, result) => {
        if (err2) return res.status(500).json({ message: "Server error" })
        res.json(result)
      })
    }
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// CREATE POLL (club_admin — own club only)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/create", verifyToken, requireRole("club_admin", "superadmin"), (req, res) => {
  const { question, options, is_anonymous = false, ends_at = null } = req.body
  const club_id = req.user.club_id

  if (!club_id) return res.status(400).json({ message: "No club linked to your account" })
  if (!question?.trim()) return res.status(400).json({ message: "Question is required" })
  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: "At least 2 options required" })
  }
  if (options.length > 6) return res.status(400).json({ message: "Maximum 6 options allowed" })

  const cleanOptions = options.map(o => o.trim()).filter(Boolean)
  if (cleanOptions.length < 2) return res.status(400).json({ message: "Options cannot be empty" })

  db.query(
    "INSERT INTO polls (club_id, question, is_anonymous, ends_at) VALUES (?, ?, ?, ?)",
    [club_id, question.trim(), is_anonymous ? 1 : 0, ends_at || null],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to create poll" })

      const pollId = result.insertId
      const optionValues = cleanOptions.map((text, i) => [pollId, text, i])

      db.query(
        "INSERT INTO poll_options (poll_id, option_text, display_order) VALUES ?",
        [optionValues],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Failed to add options" })

          // Notify followers
          db.query(
            `SELECT f.user_id, c.club_name FROM followers f
             JOIN clubs c ON c.id = ?
             WHERE f.club_id = ?`,
            [club_id, club_id],
            (err3, followers) => {
              if (!err3 && followers.length > 0) {
                const clubName = followers[0].club_name
                const notifs = followers.map(f => [
                  f.user_id, "poll", `🗳️ New poll in ${clubName}: "${question.trim().slice(0, 60)}${question.length > 60 ? "…" : ""}"`, `/polls`
                ])
                db.query("INSERT INTO notifications (user_id, type, message, link) VALUES ?", [notifs])
              }
            }
          )

          res.json({ message: "Poll created! 🗳️", pollId })
        }
      )
    }
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// VOTE (authenticated — one vote per poll, changeable)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/vote", verifyToken, (req, res) => {
  const { poll_id, option_id } = req.body
  const user_id = req.user.id

  if (!poll_id || !option_id) return res.status(400).json({ message: "poll_id and option_id required" })

  // Verify poll is still active
  db.query(
    "SELECT * FROM polls WHERE id = ? AND status = 'active'",
    [poll_id],
    (err, polls) => {
      if (err) return res.status(500).json({ message: "Server error" })
      if (polls.length === 0) return res.status(400).json({ message: "Poll not found or closed" })

      const poll = polls[0]
      if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
        return res.status(400).json({ message: "This poll has ended" })
      }

      // Check existing vote
      db.query(
        "SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?",
        [poll_id, user_id],
        (err2, existing) => {
          if (err2) return res.status(500).json({ message: "Server error" })

          if (existing.length > 0) {
            if (existing[0].option_id === option_id) {
              // Same option → remove vote (un-vote)
              db.query("DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?", [poll_id, user_id], err3 => {
                if (err3) return res.status(500).json({ message: "Server error" })
                res.json({ voted: false, option_id: null, message: "Vote removed" })
              })
            } else {
              // Different option → change vote
              db.query(
                "UPDATE poll_votes SET option_id = ? WHERE poll_id = ? AND user_id = ?",
                [option_id, poll_id, user_id],
                err3 => {
                  if (err3) return res.status(500).json({ message: "Server error" })
                  res.json({ voted: true, changed: true, option_id, message: "Vote changed ✅" })
                }
              )
            }
          } else {
            // New vote
            db.query(
              "INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)",
              [poll_id, option_id, user_id],
              err3 => {
                if (err3) return res.status(500).json({ message: "Server error" })
                res.json({ voted: true, option_id, message: "Vote recorded! 🗳️" })
              }
            )
          }
        }
      )
    }
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// CLOSE POLL (club_admin)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/close", verifyToken, requireRole("club_admin", "superadmin"), (req, res) => {
  const pollId  = req.params.id
  const club_id = req.user.club_id

  db.query(
    "UPDATE polls SET status = 'closed' WHERE id = ? AND (club_id = ? OR ? = 'superadmin')",
    [pollId, club_id, req.user.role],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      if (result.affectedRows === 0) return res.status(403).json({ message: "Not allowed" })
      res.json({ message: "Poll closed ✅" })
    }
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE POLL (club_admin)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", verifyToken, requireRole("club_admin", "superadmin"), (req, res) => {
  const pollId  = req.params.id
  const club_id = req.user.club_id

  db.query(
    "UPDATE polls SET status = 'deleted' WHERE id = ? AND (club_id = ? OR ? = 'superadmin')",
    [pollId, club_id, req.user.role],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      if (result.affectedRows === 0) return res.status(403).json({ message: "Not allowed" })
      res.json({ message: "Poll deleted 🗑️" })
    }
  )
})

module.exports = router
