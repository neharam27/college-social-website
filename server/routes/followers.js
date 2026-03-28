const express = require("express")
const db = require("../config/db")
const verifyToken = require("../middleware/authMiddleware")

const router = express.Router()

// FOLLOW CLUB
router.post("/follow", verifyToken, (req, res) => {

  const { club_id } = req.body
  const user_id = req.user.id

  db.query(
    "INSERT INTO followers (club_id, user_id) VALUES (?, ?)",
    [club_id, user_id],
    (err) => {

      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Already following" })
        }
        return res.status(500).json(err)
      }

      res.json({ message: "Club followed successfully 🔔" })
    }
  )
})


// UNFOLLOW CLUB
router.post("/unfollow", verifyToken, (req, res) => {

  const { club_id } = req.body
  const user_id = req.user.id

  db.query(
    "DELETE FROM followers WHERE club_id = ? AND user_id = ?",
    [club_id, user_id],
    (err) => {
      if (err) return res.status(500).json(err)

      res.json({ message: "Unfollowed club ❌" })
    }
  )
})


// CHECK IF USER FOLLOWS A CLUB
router.get("/check/:clubId", verifyToken, (req, res) => {

  const user_id = req.user.id
  const { clubId } = req.params

  db.query(
    "SELECT * FROM followers WHERE club_id = ? AND user_id = ?",
    [clubId, user_id],
    (err, result) => {

      if (err) return res.status(500).json(err)

      res.json({ isFollowing: result.length > 0 })
    }
  )
})


// GET ALL FOLLOWED CLUBS BY USER
router.get("/my", verifyToken, (req, res) => {

  const user_id = req.user.id

  db.query(
    "SELECT club_id FROM followers WHERE user_id = ?",
    [user_id],
    (err, result) => {

      if (err) return res.status(500).json(err)

      res.json(result)
    }
  )
})


// GET FOLLOWER COUNT
router.get("/:clubId", (req, res) => {

  const { clubId } = req.params

  db.query(
    "SELECT COUNT(*) AS followerCount FROM followers WHERE club_id = ?",
    [clubId],
    (err, result) => {

      if (err) return res.status(500).json(err)

      res.json(result[0])
    }
  )
})

module.exports = router