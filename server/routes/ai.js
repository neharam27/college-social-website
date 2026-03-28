const express = require("express")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/chat", verifyToken, async (req, res) => {
  try {
    const { question } = req.body

    res.json({
      answer: "AI feature temporarily paused. Will resume later."
    })

  } catch (err) {
    res.status(500).json({
      message: "AI error"
    })
  }
})

module.exports = router

