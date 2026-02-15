const express = require("express")
const db = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// CREATE POST (Only Club Owner)
router.post("/create", verifyToken, (req, res) => {
  const { club_id, content, image } = req.body
  const user_id = req.user.id

  // First check if this user owns the club
  db.query(
    "SELECT * FROM clubs WHERE id = ? AND created_by = ?",
    [club_id, user_id],
    (err, result) => {
      if (err) return res.status(500).json(err)

      if (result.length === 0) {
        return res.status(403).json({
          message: "You are not authorized to post for this club"
        })
      }

      // If user owns club, allow post creation
      db.query(
        "INSERT INTO posts (club_id, content, image) VALUES (?, ?, ?)",
        [club_id, content, image],
        (err, result) => {
          if (err) return res.status(500).json(err)

          res.json({
            message: "Post created successfully 🎉",
            postId: result.insertId
          })
        }
      )
    }
  )
})


// GET ALL POSTS (with club info)
router.get("/all", (req, res) => {
  const query = `
    SELECT posts.*, clubs.club_name 
    FROM posts
    JOIN clubs ON posts.club_id = clubs.id
    ORDER BY posts.created_at DESC
  `

  db.query(query, (err, result) => {
    if (err) return res.status(500).json(err)

    res.json(result)
  })
})

// GET PERSONALIZED FEED (Protected)
router.get("/feed", verifyToken, (req, res) => {
  const user_id = req.user.id

  const query = `
    SELECT posts.*, clubs.club_name
    FROM posts
    JOIN clubs ON posts.club_id = clubs.id
    JOIN followers ON posts.club_id = followers.club_id
    WHERE followers.user_id = ?
    ORDER BY posts.created_at DESC
  `

  db.query(query, [user_id], (err, result) => {
    if (err) return res.status(500).json(err)

    res.json(result)
  })
})

module.exports = router
