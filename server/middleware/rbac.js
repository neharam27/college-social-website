/**
 * Role-Based Access Control (RBAC) middleware helpers
 *
 * Roles hierarchy:
 *  superadmin   > club_admin > club_moderator > student
 */

/**
 * requireRole(...roles)
 * Usage: router.post("/create", verifyToken, requireRole("club_admin", "superadmin"), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" })
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Required role: ${roles.join(" or ")}`
    })
  }
  next()
}

/**
 * requireSuperadmin
 * Shorthand for platform-level operations only
 */
const requireSuperadmin = requireRole("superadmin")

/**
 * requireClubOwnership
 * Ensures a club_admin can only act on THEIR OWN club.
 * Superadmins bypass this check.
 *
 * Reads club_id from: req.body.club_id  OR  req.params.id  OR  req.params.club_id
 */
const requireClubOwnership = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" })

  // Superadmins can act on any club
  if (req.user.role === "superadmin") return next()

  const targetClubId = parseInt(
    req.body.club_id || req.params.id || req.params.club_id
  )

  if (!targetClubId) {
    return res.status(400).json({ message: "club_id is required" })
  }

  if (req.user.club_id !== targetClubId) {
    return res.status(403).json({
      message: "You can only manage your own club"
    })
  }

  next()
}

/**
 * requireActiveAccount
 * Extra guard — blocks suspended/deleted mid-request
 * (authMiddleware already does this, but this is a belt-and-suspenders check)
 */
const requireActiveAccount = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" })
  if (req.user.status !== "active") {
    return res.status(403).json({ message: "Your account is not active" })
  }
  next()
}

module.exports = {
  requireRole,
  requireSuperadmin,
  requireClubOwnership,
  requireActiveAccount,
}
