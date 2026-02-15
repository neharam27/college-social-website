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
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Already liked" })
        }
        return res.status(500).json(err)
      }

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
