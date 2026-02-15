const express = require("express")
const db = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// CREATE CLUB (Only club_admin)
router.post("/create", verifyToken, (req, res) => {
  if (req.user.role !== "club_admin") {
    return res.status(403).json({ message: "Only club admins can create clubs" })
  }

  const { club_name, description, logo } = req.body
  const created_by = req.user.id

  db.query(
    "INSERT INTO clubs (club_name, description, logo, created_by) VALUES (?, ?, ?, ?)",
    [club_name, description, logo, created_by],
    (err, result) => {
      if (err) return res.status(500).json(err)

      res.json({
        message: "Club created successfully 🎉",
        clubId: result.insertId
      })
    }
  )
})


// GET ALL CLUBS
router.get("/all", (req, res) => {
  db.query("SELECT * FROM clubs", (err, result) => {
    if (err) return res.status(500).json(err)

    res.json(result)
  })
})

module.exports = router
