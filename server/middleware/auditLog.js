const db = require("../config/db")

/**
 * createAuditLog(userId, action, targetType, targetId, ipAddress)
 * Writes an audit entry to the audit_logs table.
 * Fails silently — never blocks the request.
 */
const createAuditLog = (userId, action, targetType = null, targetId = null, ipAddress = null) => {
  db.query(
    "INSERT INTO audit_logs (user_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [userId, action, targetType, targetId, ipAddress],
    (err) => {
      if (err) console.error("[AuditLog Error]", err.message)
    }
  )
}

/**
 * auditMiddleware(action, targetType?)
 * Express middleware factory — logs after each successful request.
 * Usage: router.post("/create", verifyToken, auditMiddleware("POST_CREATED", "post"), handler)
 *
 * NOTE: This wraps res.json to detect success (2xx) before logging.
 */
const auditMiddleware = (action, targetType = null) => (req, res, next) => {
  const originalJson = res.json.bind(res)

  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      const targetId = body?.postId || body?.clubId || body?.commentId || null
      const ip = req.ip || req.headers["x-forwarded-for"] || null
      createAuditLog(req.user.id, action, targetType, targetId, ip)
    }
    return originalJson(body)
  }

  next()
}

module.exports = { createAuditLog, auditMiddleware }
