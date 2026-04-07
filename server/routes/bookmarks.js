const express    = require("express")
const db         = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// Auto-create bookmarks table if not exists
db.query(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    post_id    INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) {
    console.error("❌ bookmarks table init error:", err.code, err.message)
  } else {
    console.log("✅ bookmarks table ready")
  }
})

// =====================================
// SAVE POST (toggle bookmark)
// =====================================
router.post("/save", verifyToken, (req, res) => {
  const { post_id } = req.body
  const user_id = req.user.id

  if (!post_id) return res.status(400).json({ message: "post_id required" })

  // Check if already bookmarked
  db.query(
    "SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?",
    [user_id, post_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" })

      if (rows.length > 0) {
        // Already bookmarked → remove
        db.query(
          "DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?",
          [user_id, post_id],
          (err2) => {
            if (err2) return res.status(500).json({ message: "Server error" })
            res.json({ bookmarked: false, message: "Bookmark removed" })
          }
        )
      } else {
        // Not bookmarked → add
        db.query(
          "INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)",
          [user_id, post_id],
          (err2) => {
            if (err2) return res.status(500).json({ message: "Server error" })
            res.json({ bookmarked: true, message: "Post saved! 📌" })
          }
        )
      }
    }
  )
})

// =====================================
// GET MY BOOKMARKED POSTS
// =====================================
router.get("/my", verifyToken, (req, res) => {
  const user_id = req.user.id
  const query = `
    SELECT
      posts.*,
      clubs.club_name,
      COUNT(DISTINCT likes.id) AS like_count,
      COUNT(DISTINCT c.id)     AS comment_count,
      bookmarks.created_at     AS saved_at
    FROM bookmarks
    JOIN posts  ON bookmarks.post_id  = posts.id
    JOIN clubs  ON posts.club_id      = clubs.id
    LEFT JOIN likes    ON posts.id = likes.post_id
    LEFT JOIN comments c ON posts.id = c.post_id AND c.status = 'active'
    WHERE bookmarks.user_id = ?
      AND posts.status = 'active'
    GROUP BY posts.id, bookmarks.created_at
    ORDER BY bookmarks.created_at DESC
  `
  db.query(query, [user_id], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" })
    res.json(result)
  })
})

// =====================================
// GET MY BOOKMARKED POST IDS (for fast UI sync)
// =====================================
router.get("/my-ids", verifyToken, (req, res) => {
  const user_id = req.user.id
  db.query(
    "SELECT post_id FROM bookmarks WHERE user_id = ?",
    [user_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json(result.map(r => r.post_id))
    }
  )
})

module.exports = router
