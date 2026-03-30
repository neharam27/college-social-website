const express = require("express")
const db      = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")
const { requireRole } = require("../middleware/rbac")
const { validateAddComment } = require("../middleware/validate")
const { auditMiddleware }    = require("../middleware/auditLog")

const router = express.Router()

// =====================================
// ADD COMMENT (any authenticated user)
// =====================================
router.post(
  "/add",
  verifyToken,
  validateAddComment,
  auditMiddleware("COMMENT_ADDED", "comment"),
  (req, res) => {
    const { post_id, comment } = req.body
    const user_id = req.user.id

    // Verify post exists and is active
    db.query("SELECT id FROM posts WHERE id = ? AND status = 'active'", [post_id], (err, posts) => {
      if (err) return res.status(500).json({ message: "Server error" })
      if (posts.length === 0) return res.status(404).json({ message: "Post not found" })

      db.query(
        "INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)",
        [post_id, user_id, comment],
        (err2, result) => {
          if (err2) return res.status(500).json({ message: "Failed to add comment" })

          // Notify club admin
          db.query(
            `SELECT p.club_id, c.created_by AS admin_id, u.name AS commenter_name
             FROM posts p
             JOIN clubs c ON c.id = p.club_id
             JOIN users u ON u.id = ?
             WHERE p.id = ?`,
            [user_id, post_id],
            (err3, rows) => {
              if (!err3 && rows.length > 0) {
                const { admin_id, club_id, commenter_name } = rows[0]
                if (admin_id !== user_id) {
                  db.query(
                    "INSERT INTO notifications (user_id, type, message, link) VALUES (?, 'comment', ?, ?)",
                    [admin_id, `💬 ${commenter_name} commented on your post`, `/club/${club_id}`]
                  )
                }
              }
            }
          )

          res.json({ message: "Comment added successfully 💬", commentId: result.insertId })
        }
      )
    })
  }
)

// =====================================
// DELETE COMMENT
// User: can delete own comment
// Club Admin/Moderator: can delete any comment in their club
// Superadmin: can delete any comment
// =====================================
router.delete(
  "/delete/:id",
  verifyToken,
  auditMiddleware("COMMENT_DELETED", "comment"),
  (req, res) => {
    const commentId = req.params.id

    db.query(
      `SELECT c.*, p.club_id AS post_club_id
       FROM comments c
       JOIN posts p ON c.post_id = p.id
       WHERE c.id = ? AND c.status = 'active'`,
      [commentId],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" })
        if (result.length === 0) return res.status(404).json({ message: "Comment not found" })

        const comment = result[0]
        const user    = req.user

        const isOwner       = comment.user_id === user.id
        const isClubAdmin   = user.role === "club_admin"      && user.club_id === comment.post_club_id
        const isModerator   = user.role === "club_moderator"  && user.club_id === comment.post_club_id
        const isSuperadmin  = user.role === "superadmin"

        if (!isOwner && !isClubAdmin && !isModerator && !isSuperadmin) {
          return res.status(403).json({ message: "Not authorized to delete this comment" })
        }

        db.query(
          "UPDATE comments SET status = 'deleted' WHERE id = ?",
          [commentId],
          (err2) => {
            if (err2) return res.status(500).json({ message: "Server error" })
            res.json({ message: "Comment deleted 🗑️" })
          }
        )
      }
    )
  }
)

// =====================================
// GET COMMENTS FOR A POST (active only)
// =====================================
router.get("/:postId", (req, res) => {
  const { postId } = req.params

  const query = `
    SELECT comments.id, comments.comment, comments.created_at, users.id AS user_id, users.name
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.post_id = ? AND comments.status = 'active'
    ORDER BY comments.created_at DESC
  `

  db.query(query, [postId], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" })
    res.json(result)
  })
})

module.exports = router
