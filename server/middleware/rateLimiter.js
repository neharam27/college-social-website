const rateLimit = require("express-rate-limit")

/**
 * Auth limiter: tighter limit for login/register/reset
 * Max 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes"
  }
})

/**
 * General API limiter: 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes"
  }
})

module.exports = { authLimiter, apiLimiter }
