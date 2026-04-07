require("dotenv").config()

const express = require("express")
const cors    = require("cors")

const app = express()

const { authLimiter, apiLimiter } = require("./middleware/rateLimiter")

app.use(cors())
app.use(express.json({ limit: "10kb" }))  // Limit payload size

const db = require("./config/db")

// Routes
const authRoutes         = require("./routes/auth")
const clubRoutes         = require("./routes/clubs")
const postRoutes         = require("./routes/posts")
const commentRoutes      = require("./routes/comments")
const likeRoutes         = require("./routes/likes")
const followerRoutes     = require("./routes/followers")
const aiRoutes           = require("./routes/ai")
const notificationRoutes = require("./routes/notifications")
const bookmarkRoutes     = require("./routes/bookmarks")
const pollRoutes         = require("./routes/polls")

// Apply rate limiting
app.use("/api/auth", authLimiter)   // Tight limit on auth
app.use("/api",      apiLimiter)    // General limit on all API routes

app.use("/api/auth",          authRoutes)
app.use("/api/clubs",         clubRoutes)
app.use("/api/posts",         postRoutes)
app.use("/api/comments",      commentRoutes)
app.use("/api/likes",         likeRoutes)
app.use("/api/followers",     followerRoutes)
app.use("/api/ai",            aiRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/bookmarks",     bookmarkRoutes)
app.use("/api/polls",         pollRoutes)

app.get("/", (req, res) => {
  res.send("College Social Media Backend Running 🚀")
})

app.listen(5000, () => {
  console.log("Server running on port 5000")
})
