const express = require("express")
const db      = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")
const { requireRole, requireClubOwnership } = require("../middleware/rbac")
const { validateCreateClub } = require("../middleware/validate")
const { auditMiddleware }    = require("../middleware/auditLog")

const router = express.Router()

// =====================================
// CREATE CLUB (club_admin only — binds club to admin)
// =====================================
router.post(
  "/create",
  verifyToken,
  requireRole("club_admin", "superadmin"),
  validateCreateClub,
  auditMiddleware("CLUB_CREATED", "club"),
  (req, res) => {
    const { club_name, description, logo } = req.body
    const created_by = req.user.id

    // club_admin can only own one club
    if (req.user.role === "club_admin" && req.user.club_id) {
      return res.status(409).json({ message: "You already admin a club. One club per admin." })
    }

    db.query(
      "INSERT INTO clubs (club_name, description, logo, created_by) VALUES (?, ?, ?, ?)",
      [club_name, description || null, logo || null, created_by],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to create club" })

        const clubId = result.insertId

        // Bind club_id to this admin user
        db.query(
          "UPDATE users SET club_id = ? WHERE id = ?",
          [clubId, created_by],
          (err2) => {
            if (err2) console.error("Could not bind club_id to admin user:", err2)
          }
        )

        res.json({ message: "Club created successfully 🎉", clubId })
      }
    )
  }
)

// =====================================
// GET ALL CLUBS (active only)
// =====================================
router.get("/all", (req, res) => {
  db.query(
    "SELECT id, club_name, description, logo, created_at FROM clubs WHERE status = 'active'",
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      res.json(result)
    }
  )
})

// =====================================
// GET SINGLE CLUB
// =====================================
router.get("/:id", (req, res) => {
  db.query(
    "SELECT id, club_name, description, logo, created_at FROM clubs WHERE id = ? AND status = 'active'",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" })
      if (result.length === 0) return res.status(404).json({ message: "Club not found" })
      res.json(result[0])
    }
  )
})

// =====================================
// UPDATE CLUB (own club only)
// =====================================
router.put(
  "/:id",
  verifyToken,
  requireRole("club_admin", "superadmin"),
  requireClubOwnership,
  auditMiddleware("CLUB_UPDATED", "club"),
  (req, res) => {
    const { club_name, description, logo } = req.body
    const clubId = req.params.id

    db.query(
      "UPDATE clubs SET club_name = COALESCE(?, club_name), description = COALESCE(?, description), logo = COALESCE(?, logo) WHERE id = ?",
      [club_name || null, description || null, logo || null, clubId],
      (err) => {
        if (err) return res.status(500).json({ message: "Failed to update club" })
        res.json({ message: "Club updated successfully ✅" })
      }
    )
  }
)

// =====================================
// DELETE CLUB (superadmin only — soft delete)
// =====================================
router.delete(
  "/:id",
  verifyToken,
  requireRole("superadmin"),
  auditMiddleware("CLUB_DELETED", "club"),
  (req, res) => {
    db.query(
      "UPDATE clubs SET status = 'deleted' WHERE id = ?",
      [req.params.id],
      (err) => {
        if (err) return res.status(500).json({ message: "Server error" })
        res.json({ message: "Club removed from platform 🗑️" })
      }
    )
  }
)

module.exports = router
