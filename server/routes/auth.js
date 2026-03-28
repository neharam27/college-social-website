const express  = require("express")
const bcrypt    = require("bcrypt")
const jwt       = require("jsonwebtoken")
const { randomUUID: uuidv4 } = require("crypto")
const speakeasy = require("speakeasy")
const db        = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")
const { requireRole } = require("../middleware/rbac")
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../middleware/validate")
const { createAuditLog } = require("../middleware/auditLog")

const router = express.Router()

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Console-based email mock — replace with nodemailer transport in production */
const sendEmail = async ({ to, subject, html }) => {
  console.log("\n📧 [MOCK EMAIL]")
  console.log(`   To: ${to}`)
  console.log(`   Subject: ${subject}`)
  console.log(`   Body: ${html}`)
  console.log("")
}

/** Build an access token (15 min) */
const signAccessToken = (user) =>
  jwt.sign(
    {
      id:      user.id,
      role:    user.role,
      club_id: user.club_id || null,
      status:  user.status  || "active",
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  )

/** Build a long-lived refresh token (7 days) and persist to DB */
const createRefreshToken = (userId, callback) => {
  const token     = uuidv4()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  db.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt],
    (err) => callback(err, token)
  )
}

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
router.post("/register", validateRegister, async (req, res) => {
  const { name, email, password, role = "student" } = req.body

  // Block direct superadmin self-registration
  if (role === "superadmin") {
    return res.status(403).json({ message: "Cannot self-register as superadmin" })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12)
    const verifyToken    = uuidv4()
    const tokenExpiry    = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
      (err, existing) => {
        if (err) return res.status(500).json({ message: "Server error" })
        if (existing.length > 0) {
          return res.status(409).json({ message: "Email already registered" })
        }

        db.query(
          "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
          [name, email, hashedPassword, role],
          (err2, result) => {
            if (err2) return res.status(500).json({ message: "Registration failed" })

            const userId = result.insertId

            // Store email verification token
            db.query(
              "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)",
              [userId, verifyToken, tokenExpiry]
            )

            // Send verification email (mock)
            sendEmail({
              to: email,
              subject: "Verify your CollegeSocial account",
              html: `<p>Hi ${name},</p><p>Click the link to verify your email:</p>
                     <p><a href="http://localhost:3000/verify-email?token=${verifyToken}">Verify Email</a></p>
                     <p>This link expires in 24 hours.</p>`
            })

            res.status(201).json({
              message: "Registered successfully. Please verify your email. ✅"
            })
          }
        )
      }
    )
  } catch (error) {
    res.status(500).json({ message: "Registration failed" })
  }
})

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
router.post("/login", validateLogin, (req, res) => {
  const { email, password } = req.body
  const ip = req.ip || req.headers["x-forwarded-for"] || null

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" })

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    const user = result[0]

    // Check account status
    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" })
    }
    if (user.status === "deleted") {
      return res.status(403).json({ message: "Account not found" })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // If 2FA is enabled for this user, require code
    if (user.totp_secret) {
      return res.status(200).json({
        requires2FA: true,
        userId: user.id,
        message: "2FA code required"
      })
    }

    const accessToken = signAccessToken(user)
    createRefreshToken(user.id, (err2, refreshToken) => {
      if (err2) return res.status(500).json({ message: "Token creation failed" })

      createAuditLog(user.id, "LOGIN", "user", user.id, ip)

      res.json({
        message: "Login successful ✅",
        accessToken,
        refreshToken,
        user: {
          id:      user.id,
          name:    user.name,
          email:   user.email,
          role:    user.role,
          club_id: user.club_id
        }
      })
    })
  })
})

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" })
  }

  db.query(
    `SELECT rt.*, u.id AS uid, u.role, u.club_id, u.status, u.name, u.email
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = ? AND rt.expires_at > NOW()`,
    [refreshToken],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })

      if (result.length === 0) {
        return res.status(401).json({ message: "Invalid or expired refresh token" })
      }

      const row  = result[0]
      const user = { id: row.uid, role: row.role, club_id: row.club_id, status: row.status }

      if (user.status !== "active") {
        return res.status(403).json({ message: "Account is not active" })
      }

      const newAccessToken = signAccessToken(user)

      res.json({
        accessToken: newAccessToken,
        user: { id: row.uid, name: row.name, email: row.email, role: row.role, club_id: row.club_id }
      })
    }
  )
})

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
router.post("/logout", verifyToken, (req, res) => {
  const { refreshToken } = req.body

  if (refreshToken) {
    db.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken])
  }

  createAuditLog(req.user.id, "LOGOUT", "user", req.user.id, req.ip)
  res.json({ message: "Logged out successfully" })
})

// ─────────────────────────────────────────────
// VERIFY EMAIL
// ─────────────────────────────────────────────
router.get("/verify-email", (req, res) => {
  const { token } = req.query

  if (!token) {
    return res.status(400).json({ message: "Verification token required" })
  }

  db.query(
    "SELECT * FROM email_verifications WHERE token = ? AND expires_at > NOW()",
    [token],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })

      if (result.length === 0) {
        return res.status(400).json({ message: "Invalid or expired verification token" })
      }

      const { user_id } = result[0]

      db.query("UPDATE users SET email_verified = 1 WHERE id = ?", [user_id], (err2) => {
        if (err2) return res.status(500).json({ message: "Server error" })

        db.query("DELETE FROM email_verifications WHERE user_id = ?", [user_id])

        res.json({ message: "Email verified successfully ✅" })
      })
    }
  )
})

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
router.post("/forgot-password", validateForgotPassword, (req, res) => {
  const { email } = req.body

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" })

    // Always return success to prevent email enumeration
    if (result.length === 0) {
      return res.json({ message: "If this email exists, a reset link has been sent." })
    }

    const user      = result[0]
    const token     = uuidv4()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Clear old tokens for this user
    db.query("DELETE FROM password_resets WHERE user_id = ?", [user.id], () => {
      db.query(
        "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
        [user.id, token, expiresAt],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Server error" })

          sendEmail({
            to: user.email,
            subject: "Reset your CollegeSocial password",
            html: `<p>Hi ${user.name},</p>
                   <p>Click the link to reset your password (expires in 1 hour):</p>
                   <p><a href="http://localhost:3000/reset-password?token=${token}">Reset Password</a></p>
                   <p>If you didn't request this, ignore this email.</p>`
          })

          res.json({ message: "If this email exists, a reset link has been sent." })
        }
      )
    })
  })
})

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
router.post("/reset-password", validateResetPassword, async (req, res) => {
  const { token, password } = req.body

  db.query(
    "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() AND used = 0",
    [token],
    async (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })

      if (result.length === 0) {
        return res.status(400).json({ message: "Invalid or expired reset token" })
      }

      const { user_id } = result[0]
      const hashed      = await bcrypt.hash(password, 12)

      db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user_id], (err2) => {
        if (err2) return res.status(500).json({ message: "Server error" })

        // Mark token as used and delete all refresh tokens (force re-login)
        db.query("UPDATE password_resets SET used = 1 WHERE token = ?", [token])
        db.query("DELETE FROM refresh_tokens WHERE user_id = ?", [user_id])

        createAuditLog(user_id, "PASSWORD_RESET", "user", user_id, req.ip)

        res.json({ message: "Password reset successfully. Please log in. ✅" })
      })
    }
  )
})

// ─────────────────────────────────────────────
// 2FA — SETUP (Groundwork)
// ─────────────────────────────────────────────
router.post("/2fa/setup", verifyToken, requireRole("club_admin", "superadmin"), (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `CollegeSocial (${req.user.id})`
  })

  // Store secret temporarily — user must verify first before it's activated
  db.query(
    "UPDATE users SET totp_secret = ? WHERE id = ?",
    [secret.base32, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Server error" })

      res.json({
        message: "2FA secret generated. Verify with an authenticator app.",
        secret: secret.base32,
        otpauth_url: secret.otpauth_url
      })
    }
  )
})

// ─────────────────────────────────────────────
// 2FA — VERIFY CODE (after login when 2FA enabled)
// ─────────────────────────────────────────────
router.post("/2fa/verify", (req, res) => {
  const { userId, code } = req.body

  if (!userId || !code) {
    return res.status(400).json({ message: "userId and code are required" })
  }

  db.query("SELECT * FROM users WHERE id = ?", [userId], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    const user = result[0]

    if (!user.totp_secret) {
      return res.status(400).json({ message: "2FA not set up for this account" })
    }

    const verified = speakeasy.totp.verify({
      secret:   user.totp_secret,
      encoding: "base32",
      token:    code,
      window:   1
    })

    if (!verified) {
      return res.status(401).json({ message: "Invalid 2FA code" })
    }

    const accessToken = signAccessToken(user)
    createRefreshToken(user.id, (err2, refreshToken) => {
      if (err2) return res.status(500).json({ message: "Token creation failed" })

      createAuditLog(user.id, "LOGIN_2FA", "user", user.id, req.ip)

      res.json({
        message: "2FA verified. Login successful ✅",
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, club_id: user.club_id }
      })
    })
  })
})

// ─────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────
router.get("/me", verifyToken, (req, res) => {
  db.query(
    "SELECT id, name, email, role, club_id, status, email_verified FROM users WHERE id = ?",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      if (result.length === 0) return res.status(404).json({ message: "User not found" })
      res.json(result[0])
    }
  )
})

module.exports = router
