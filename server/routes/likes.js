const express = require("express")
const db = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// LIKE A POST (Protected)
router.post("/like", verifyToken, (req, res) => {
  const { post_id } = req.body
  const user_id = req.user.id

  db.query(
    "INSERT INTO likes (post_id, user_id) VALUES (?, ?)",
    [post_id, user_id],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Already liked" })
        }
        return res.status(500).json(err)
      }

      // Notify the club admin — get post owner via club
      db.query(
        `SELECT p.club_id, c.created_by AS admin_id, u.name AS liker_name
         FROM posts p
         JOIN clubs c ON c.id = p.club_id
         JOIN users u ON u.id = ?
         WHERE p.id = ?`,
        [user_id, post_id],
        (err2, rows) => {
          if (!err2 && rows.length > 0) {
            const { admin_id, club_id, liker_name } = rows[0]
            // Don't notify if the admin liked their own post
            if (admin_id !== user_id) {
              db.query(
                "INSERT INTO notifications (user_id, type, message, link) VALUES (?, 'like', ?, ?)",
                [admin_id, `❤️ ${liker_name} liked your post`, `/club/${club_id}`]
              )
            }
          }
        }
      )

      res.json({ message: "Post liked ❤️" })
    }
  )
})

// UNLIKE A POST (Protected)
router.delete("/unlike", verifyToken, (req, res) => {
  const { post_id } = req.body
  const user_id = req.user.id

  db.query(
    "DELETE FROM likes WHERE post_id = ? AND user_id = ?",
    [post_id, user_id],
    (err, result) => {
      if (err) return res.status(500).json(err)

      res.json({ message: "Post unliked 💔" })
    }
  )
})

// GET POSTS LIKED BY CURRENT USER
router.get("/my", verifyToken, (req, res) => {
  db.query(
    "SELECT post_id FROM likes WHERE user_id = ?",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json(result.map(r => r.post_id))
    }
  )
})

// GET LIKE COUNT FOR A POST
router.get("/:postId", (req, res) => {
  const { postId } = req.params

  db.query(
    "SELECT COUNT(*) AS likeCount FROM likes WHERE post_id = ?",
    [postId],
    (err, result) => {
      if (err) return res.status(500).json(err)

      res.json(result[0])
    }
  )
})

module.exports = router
