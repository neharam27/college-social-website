const express = require("express")
const cors = require("cors")
require("dotenv").config()

const app = express()

app.use(cors())
app.use(express.json())

const db = require("./config/db")

const authRoutes = require("./routes/auth")
app.use("/api/auth", authRoutes)

const clubRoutes = require("./routes/clubs")
app.use("/api/clubs", clubRoutes)

const postRoutes = require("./routes/posts")
app.use("/api/posts", postRoutes)

const commentRoutes = require("./routes/comments")
app.use("/api/comments", commentRoutes)

const likeRoutes = require("./routes/likes")
app.use("/api/likes", likeRoutes)

const followerRoutes = require("./routes/followers")
app.use("/api/followers", followerRoutes)

const verifyToken = require("./middleware/authMiddleware")

app.get("/api/protected", verifyToken, (req, res) => {
  res.json({
    message: "You accessed a protected route 🎉",
    user: req.user
  })
})

app.get("/", (req, res) => {
  res.send("College Social Media Backend Running 🚀")
})

app.listen(5000, () => {
  console.log("Server running on port 5000")
})


