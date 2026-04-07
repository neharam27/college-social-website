const express = require("express")
const db      = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")
const { requireRole, requireClubOwnership } = require("../middleware/rbac")
const { validateCreatePost }  = require("../middleware/validate")
const { auditMiddleware }     = require("../middleware/auditLog")

const router = express.Router()

// =====================================
// CREATE POST (Club Admin — own club only)
// =====================================
router.post(
  "/create",
  verifyToken,
  requireRole("club_admin", "superadmin"),
  validateCreatePost,
  requireClubOwnership,
  auditMiddleware("POST_CREATED", "post"),
  (req, res) => {
    const { club_id, content, image } = req.body

    db.query(
      "INSERT INTO posts (club_id, content, image) VALUES (?, ?, ?)",
      [club_id, content, image || null],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to create post" })

        // Fan-out notifications to followers
        db.query(
          `SELECT f.user_id, c.club_name FROM followers f
           JOIN clubs c ON c.id = ?
           WHERE f.club_id = ?`,
          [club_id, club_id],
          (err2, followers) => {
            if (!err2 && followers.length > 0) {
              const clubName = followers[0].club_name
              const values   = followers.map(f => [
                f.user_id,
                "new_post",
                `📢 New post in ${clubName}!`,
                `/club/${club_id}`
              ])
              db.query("INSERT INTO notifications (user_id, type, message, link) VALUES ?", [values])
            }
          }
        )

        res.json({ message: "Post created successfully 🎉", postId: result.insertId })
      }
    )
  }
)

// =====================================
// DELETE POST (Club Admin — own club only; superadmin any)
// =====================================
router.delete(
  "/delete/:id",
  verifyToken,
  requireRole("club_admin", "superadmin"),
  auditMiddleware("POST_DELETED", "post"),
  (req, res) => {
    const postId = req.params.id

    // Verify that the post belongs to this admin's club (superadmin bypass is in requireClubOwnership)
    db.query("SELECT * FROM posts WHERE id = ? AND status = 'active'", [postId], (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      if (result.length === 0) return res.status(404).json({ message: "Post not found" })

      const post = result[0]

      // Non-superadmin must own the club
      if (req.user.role !== "superadmin" && req.user.club_id !== post.club_id) {
        return res.status(403).json({ message: "You can only delete posts from your own club" })
      }

      // Soft delete
      db.query("UPDATE posts SET status = 'deleted' WHERE id = ?", [postId], (err2) => {
        if (err2) return res.status(500).json({ message: "Server error" })
        res.json({ message: "Post deleted successfully 🗑️" })
      })
    })
  }
)

// =====================================
// GET ALL POSTS (active only, with like count)
// =====================================
router.get("/all", (req, res) => {
  const query = `
    SELECT
      posts.*,
      clubs.club_name,
      COUNT(DISTINCT likes.id) AS like_count,
      COUNT(DISTINCT c.id) AS comment_count
    FROM posts
    JOIN clubs ON posts.club_id = clubs.id
    LEFT JOIN likes ON posts.id = likes.post_id
    LEFT JOIN comments c ON posts.id = c.post_id AND c.status = 'active'
    WHERE posts.status = 'active' AND clubs.status = 'active'
    GROUP BY posts.id
    ORDER BY posts.created_at DESC
  `
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" })
    res.json(result)
  })
})

// =====================================
// GET POSTS BY CLUB (active only)
// =====================================
router.get("/club/:id", (req, res) => {
  const clubId = req.params.id
  const query = `
    SELECT
      posts.*,
      clubs.club_name,
      COUNT(DISTINCT likes.id) AS like_count,
      COUNT(DISTINCT c.id) AS comment_count
    FROM posts
    JOIN clubs ON posts.club_id = clubs.id
    LEFT JOIN likes ON posts.id = likes.post_id
    LEFT JOIN comments c ON posts.id = c.post_id AND c.status = 'active'
    WHERE posts.club_id = ? AND posts.status = 'active'
    GROUP BY posts.id
    ORDER BY posts.created_at DESC
  `
  db.query(query, [clubId], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" })
    res.json(result)
  })
})

// =====================================
// PERSONALIZED FEED (Protected)
// =====================================
router.get("/feed", verifyToken, (req, res) => {
  const user_id = req.user.id
  const query = `
    SELECT
      posts.*,
      clubs.club_name,
      COUNT(DISTINCT likes.id) AS like_count,
      COUNT(DISTINCT c.id) AS comment_count
    FROM posts
    JOIN clubs ON posts.club_id = clubs.id
    JOIN followers ON posts.club_id = followers.club_id
    LEFT JOIN likes ON posts.id = likes.post_id
    LEFT JOIN comments c ON posts.id = c.post_id AND c.status = 'active'
    WHERE followers.user_id = ? AND posts.status = 'active'
    GROUP BY posts.id
    ORDER BY posts.created_at DESC
  `
  db.query(query, [user_id], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" })
    res.json(result)
  })
})

module.exports = router
