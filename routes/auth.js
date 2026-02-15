const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const db = require("../config/db")

const router = express.Router()

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role],
      (err, result) => {
        if (err) return res.status(500).json(err)
        res.json({ message: "User Registered Successfully ✅" })
      }
    )
  } catch (error) {
    res.status(500).json({ error: "Registration failed" })
  }
})

// LOGIN
router.post("/login", (req, res) => {
  const { email, password } = req.body

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json(err)

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    const validPassword = await bcrypt.compare(password, result[0].password)

    if (!validPassword) {
      return res.status(401).json({ message: "Wrong password" })
    }

    const token = jwt.sign(
      { id: result[0].id, role: result[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    res.json({ message: "Login successful ✅", token })
  })
})

module.exports = router
