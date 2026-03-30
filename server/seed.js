/**
 * seed.js — College Social Platform Seeder
 *
 * Creates 20 club admin accounts + 20 clubs + sample posts.
 * CLEARS existing clubs, posts, followers, likes, notifications first.
 *
 * Run: node seed.js
 */

require("dotenv").config()
const mysql  = require("mysql2")
const bcrypt = require("bcrypt")

const db = mysql.createConnection({
  host:     "localhost",
  user:     "root",
  password: process.env.DB_PASSWORD,
  database: "college_social",
  multipleStatements: true,
})

// ─── Club definitions ────────────────────────────────────────────────────────
const CLUBS = [
  { name: "Robotics Club",         slug: "robotics",       desc: "Build, code and compete with robots. Weekly workshops and inter-college competitions." },
  { name: "Coding Club",           slug: "coding",         desc: "Competitive programming, hackathons, and open-source contributions." },
  { name: "Drama & Theatre",       slug: "drama",          desc: "Annual plays, street theatre, and acting workshops for all skill levels." },
  { name: "Basketball Club",       slug: "basketball",     desc: "Practice sessions every evening. Inter-college tournaments throughout the year." },
  { name: "Photography Club",      slug: "photography",    desc: "Explore composition, lighting, and editing. Monthly photo walks around campus." },
  { name: "Music Society",         slug: "music",          desc: "Vocals, instruments, and band jams. Performances at every college fest." },
  { name: "Debate Club",           slug: "debate",         desc: "Sharpen your public speaking and critical thinking. MUN and debate competitions." },
  { name: "Art Club",              slug: "art",            desc: "Painting, sketching, digital art, and live installations across campus." },
  { name: "Hackathon Cell",        slug: "hackathon",      desc: "Host and participate in 24/7 hackathons. Build products that matter." },
  { name: "Environment Club",      slug: "environment",    desc: "Campus sustainability drives, tree plantation, and green initiatives." },
  { name: "Chess Club",            slug: "chess",          desc: "Weekend tournaments and training sessions for beginners to advanced players." },
  { name: "E-Cell",                slug: "ecell",          desc: "Entrepreneurship talks, startup pitches, and mentorship from founders." },
  { name: "Cultural Club",         slug: "cultural",       desc: "Celebrating festivals, traditions, and diversity across the campus community." },
  { name: "Dance Society",         slug: "dance",          desc: "Contemporary, classical and street dance. Performances at every event." },
  { name: "Science Club",          slug: "science",        desc: "Experiments, science fairs, and research project showcases." },
  { name: "Film Club",             slug: "film",           desc: "Short film production, screenings, and movie critique sessions." },
  { name: "Literary Society",      slug: "literary",       desc: "Book discussions, creative writing workshops, and the campus magazine." },
  { name: "Yoga & Wellness",       slug: "yoga",           desc: "Morning yoga sessions, meditation, and mental wellness workshops." },
  { name: "Gaming Club",           slug: "gaming",         desc: "Esports tournaments, LAN parties, and game dev workshops." },
  { name: "Volunteer Club",        slug: "volunteer",      desc: "Community outreach, teaching underprivileged kids, and welfare drives." },
]

const PASSWORD    = "College@123"   // same for every account
const STUDENT_PWD = "College@123"   // demo student account

// Sample posts per club (3 each)
const POSTS = (clubName) => [
  `📢 Welcome to the official ${clubName} page! Stay tuned for upcoming events and announcements. Follow us to never miss an update.`,
  `🎉 Our next event is coming up soon! Members please check your emails for details. Non-members — join us, it's free and open to all students.`,
  `📸 Great turnout at our last session! Thank you to everyone who showed up. Looking forward to seeing even more of you next time. 💪`,
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  )

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("\n🌱  College Social — Database Seeder")
  console.log("=====================================\n")

  // 1. Clear dependent data first
  console.log("🗑️  Clearing old data...")
  await query("SET FOREIGN_KEY_CHECKS = 0")
  await query("TRUNCATE TABLE notifications")
  await query("TRUNCATE TABLE likes")
  await query("TRUNCATE TABLE comments")
  await query("TRUNCATE TABLE followers")
  await query("TRUNCATE TABLE refresh_tokens")
  await query("TRUNCATE TABLE email_verifications")
  await query("TRUNCATE TABLE password_resets")
  await query("TRUNCATE TABLE audit_logs")
  await query("TRUNCATE TABLE posts")
  await query("TRUNCATE TABLE clubs")
  // Remove old club_admin / seeded users but keep any superadmin
  await query("DELETE FROM users WHERE role IN ('club_admin', 'student') AND email LIKE '%@college.edu'")
  await query("SET FOREIGN_KEY_CHECKS = 1")
  console.log("   ✅ Old data cleared\n")

  const hash = await bcrypt.hash(PASSWORD, 12)

  // 2. Create demo student account
  console.log("👤  Creating demo student account...")
  await query(
    "INSERT INTO users (name, email, password, role, status, email_verified) VALUES (?, ?, ?, 'student', 'active', 1)",
    ["Demo Student", "student@college.edu", hash]
  )
  console.log("   ✅ student@college.edu\n")

  console.log("🏛️  Creating 20 clubs + admin accounts...\n")

  const credentials = []

  for (let i = 0; i < CLUBS.length; i++) {
    const club  = CLUBS[i]
    const email = `${club.slug}@college.edu`
    const name  = `${club.name} Admin`

    // Create admin user
    const userResult = await query(
      "INSERT INTO users (name, email, password, role, status, email_verified) VALUES (?, ?, ?, 'club_admin', 'active', 1)",
      [name, email, hash]
    )
    const userId = userResult.insertId

    // Create club
    const clubResult = await query(
      "INSERT INTO clubs (club_name, description, created_by, status) VALUES (?, ?, ?, 'active')",
      [club.name, club.desc, userId]
    )
    const clubId = clubResult.insertId

    // Bind club_id back to admin
    await query("UPDATE users SET club_id = ? WHERE id = ?", [clubId, userId])

    // Insert sample posts
    for (const content of POSTS(club.name)) {
      await query(
        "INSERT INTO posts (club_id, content, status) VALUES (?, ?, 'active')",
        [clubId, content]
      )
    }

    credentials.push({ no: i + 1, club: club.name, email, password: PASSWORD })
    process.stdout.write(`   [${String(i + 1).padStart(2, "0")}/20] ${club.name.padEnd(22)} ✅\n`)
    await sleep(50) // avoid overwhelming the DB
  }

  // 3. Print credentials table
  console.log("\n\n╔══════════════════════════════════════════════════════════════════════╗")
  console.log("║                    🔑  CLUB ADMIN CREDENTIALS                       ║")
  console.log("╠══╦═══════════════════════╦═══════════════════════════╦═════════════╣")
  console.log("║# ║ Club                  ║ Email                     ║ Password    ║")
  console.log("╠══╬═══════════════════════╬═══════════════════════════╬═════════════╣")
  for (const c of credentials) {
    const no    = String(c.no).padEnd(2)
    const club  = c.club.padEnd(21)
    const email = c.email.padEnd(25)
    const pwd   = c.password.padEnd(11)
    console.log(`║${no}║ ${club} ║ ${email} ║ ${pwd} ║`)
  }
  console.log("╠══╩═══════════════════════╩═══════════════════════════╩═════════════╣")
  console.log("║  DEMO STUDENT  │ student@college.edu               │ College@123  ║")
  console.log("╚══════════════════════════════════════════════════════════════════════╝")
  console.log("\n✨  Seeding complete! 20 clubs + 60 posts + 1 student account created.")
  console.log("    All passwords: College@123\n")

  db.end()
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message)
  db.end()
  process.exit(1)
})
