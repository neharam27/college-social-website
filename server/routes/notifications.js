const express = require("express")
const db = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// GET MY NOTIFICATIONS
router.get("/", verifyToken, (req, res) => {
  const user_id = req.user.id

  db.query(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
    [user_id],
    (err, result) => {
      if (err) return res.status(500).json(err)
      res.json(result)
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
      if (err) return res.status(500).json(err)
      res.json({ message: "All notifications marked as read" })
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
      if (err) return res.status(500).json(err)
      res.json({ count: result[0].count })
    }
  )
})

module.exports = router
