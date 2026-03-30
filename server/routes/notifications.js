const express = require("express")
const db = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// GET MY NOTIFICATIONS (with optional filter)
router.get("/", verifyToken, (req, res) => {
  const user_id = req.user.id
  const { filter } = req.query // "all" | "unread"

  const whereExtra = filter === "unread" ? " AND is_read = FALSE" : ""

  db.query(
    `SELECT * FROM notifications WHERE user_id = ?${whereExtra} ORDER BY created_at DESC LIMIT 50`,
    [user_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json(result)
    }
  )
})

// MARK SINGLE NOTIFICATION AS READ
router.patch("/:id/read", verifyToken, (req, res) => {
  const user_id = req.user.id
  const { id }  = req.params

  db.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
    [id, user_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json({ message: "Marked as read" })
    }
  )
})

// MARK ALL AS READ
router.post("/read-all", verifyToken, (req, res) => {
  const user_id = req.user.id

  db.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = ?",
    [user_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json({ message: "All notifications marked as read" })
    }
  )
})

// DELETE A SINGLE NOTIFICATION
router.delete("/:id", verifyToken, (req, res) => {
  const user_id = req.user.id
  const { id }  = req.params

  db.query(
    "DELETE FROM notifications WHERE id = ? AND user_id = ?",
    [id, user_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json({ message: "Notification deleted" })
    }
  )
})

// CLEAR ALL NOTIFICATIONS
router.delete("/", verifyToken, (req, res) => {
  const user_id = req.user.id

  db.query(
    "DELETE FROM notifications WHERE user_id = ?",
    [user_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json({ message: "All notifications cleared" })
    }
  )
})

// UNREAD COUNT
router.get("/unread-count", verifyToken, (req, res) => {
  const user_id = req.user.id

  db.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE",
    [user_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json({ count: result[0].count })
    }
  )
})

module.exports = router
