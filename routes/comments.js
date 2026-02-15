const express = require("express")
const db = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// ADD COMMENT (Protected)
router.post("/add", verifyToken, (req, res) => {
  const { post_id, comment } = req.body
  const user_id = req.user.id

  db.query(
    "INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)",
    [post_id, user_id, comment],
    (err, result) => {
      if (err) return res.status(500).json(err)

      res.json({
        message: "Comment added successfully 💬",
        commentId: result.insertId
      })
    }
  )
})

// GET COMMENTS FOR A POST
router.get("/:postId", (req, res) => {
  const { postId } = req.params

  const query = `
    SELECT comments.*, users.name 
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.post_id = ?
    ORDER BY comments.created_at DESC
  `

  db.query(query, [postId], (err, result) => {
    if (err) return res.status(500).json(err)

    res.json(result)
  })
})

module.exports = router
