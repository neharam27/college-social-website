const jwt = require("jsonwebtoken")
const db  = require("../config/db")

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" })
  }

  const token = authHeader.split(" ")[1]

  if (!token) {
    return res.status(403).json({ message: "Invalid token format" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" })
    }

    // Attach full user context from token
    req.user = {
      id:      decoded.id,
      role:    decoded.role,
      club_id: decoded.club_id || null,
      status:  decoded.status  || "active"
    }

    // Block suspended or deleted accounts
    if (req.user.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" })
    }
    if (req.user.status === "deleted") {
      return res.status(403).json({ message: "Account not found" })
    }

    next()
  })
}

module.exports = verifyToken
