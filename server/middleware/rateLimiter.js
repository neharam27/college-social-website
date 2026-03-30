const rateLimit = require("express-rate-limit")

/**
 * Auth limiter: prevents brute-force on login/register/reset
 * Max 100 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again in 15 minutes."
  }
})

/**
 * General API limiter: 500 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again in 15 minutes."
  }
})

module.exports = { authLimiter, apiLimiter }
