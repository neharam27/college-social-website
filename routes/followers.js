const express = require("express")
const db = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// FOLLOW CLUB (Protected)
router.post("/follow", verifyToken, (req, res) => {
  const { club_id } = req.body
  const user_id = req.user.id

  db.query(
    "INSERT INTO followers (club_id, user_id) VALUES (?, ?)",
    [club_id, user_id],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Already following" })
        }
        return res.status(500).json(err)
      }

      res.json({ message: "Club followed successfully 🔔" })
    }
  )
})

// UNFOLLOW CLUB (Protected)
router.delete("/unfollow", verifyToken, (req, res) => {
  const { club_id } = req.body
  const user_id = req.user.id

  db.query(
    "DELETE FROM followers WHERE club_id = ? AND user_id = ?",
    [club_id, user_id],
    (err, result) => {
      if (err) return res.status(500).json(err)

      res.json({ message: "Unfollowed club ❌" })
    }
  )
})

// GET FOLLOWER COUNT
router.get("/:clubId", (req, res) => {
  const { clubId } = req.params

  db.query(
    "SELECT COUNT(*) AS followerCount FROM followers WHERE club_id = ?",
    [clubId],
    (err, result) => {
      if (err) return res.status(500).json(err)

      res.json(result[0])
    }
  )
})

module.exports = router
