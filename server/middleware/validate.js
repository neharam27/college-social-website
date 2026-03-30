const { body, param, validationResult } = require("express-validator")

/**
 * Runs express-validator checks and returns 422 with errors if invalid
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: "Validation failed",
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    })
  }
  next()
}

// ─────────────────────────────────────────────────
// AUTH VALIDATORS
// ─────────────────────────────────────────────────

const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 80 }).withMessage("Name must be 2–80 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email address")
    .normalizeEmail()
    .custom(val => {
      if (!val.endsWith("@college.edu"))
        throw new Error("Only @college.edu email addresses are allowed")
      return true
    }),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number"),

  body("role")
    .optional()
    .isIn(["student", "club_admin", "club_moderator", "superadmin"])
    .withMessage("Invalid role"),

  handleValidation
]

const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email address")
    .normalizeEmail()
    .custom(val => {
      if (!val.endsWith("@college.edu"))
        throw new Error("Only @college.edu email addresses are allowed")
      return true
    }),

  body("password")
    .notEmpty().withMessage("Password is required"),

  handleValidation
]

const validateForgotPassword = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email address")
    .normalizeEmail(),
  handleValidation
]

const validateResetPassword = [
  body("token")
    .notEmpty().withMessage("Reset token is required"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number"),
  handleValidation
]

// ─────────────────────────────────────────────────
// POST VALIDATORS
// ─────────────────────────────────────────────────

const validateCreatePost = [
  body("club_id")
    .notEmpty().withMessage("club_id is required")
    .isInt({ min: 1 }).withMessage("club_id must be a positive integer"),

  body("content")
    .trim()
    .notEmpty().withMessage("Content is required")
    .isLength({ max: 2000 }).withMessage("Content must be under 2000 characters"),

  body("image")
    .optional()
    .isURL().withMessage("Image must be a valid URL"),

  handleValidation
]

// ─────────────────────────────────────────────────
// COMMENT VALIDATORS
// ─────────────────────────────────────────────────

const validateAddComment = [
  body("post_id")
    .notEmpty().withMessage("post_id is required")
    .isInt({ min: 1 }).withMessage("post_id must be a positive integer"),

  body("comment")
    .trim()
    .notEmpty().withMessage("Comment cannot be empty")
    .isLength({ max: 500 }).withMessage("Comment must be under 500 characters"),

  handleValidation
]

// ─────────────────────────────────────────────────
// CLUB VALIDATORS
// ─────────────────────────────────────────────────

const validateCreateClub = [
  body("club_name")
    .trim()
    .notEmpty().withMessage("Club name is required")
    .isLength({ min: 3, max: 100 }).withMessage("Club name must be 3–100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Description must be under 500 characters"),

  handleValidation
]

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateCreatePost,
  validateAddComment,
  validateCreateClub,
}
