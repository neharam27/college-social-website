-- =====================================================
-- College Social — Database Migration Script
-- Run this ONCE in your MySQL database: college_social
-- =====================================================

-- 1. Add new columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS club_id INT NULL,
  ADD COLUMN IF NOT EXISTS status ENUM('active','suspended','deleted') DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. Add new columns to posts table
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS status ENUM('active','deleted') DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 3. Add new columns to comments table
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS status ENUM('active','deleted') DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 4. Add new columns to clubs table
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS status ENUM('active','suspended','deleted') DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 5. Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(512) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50)  NULL,
  target_id   INT          NULL,
  ip_address  VARCHAR(45)  NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Password resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Email verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Performance indexes (ignore errors if they already exist)
CREATE INDEX IF NOT EXISTS idx_posts_club_id        ON posts(club_id);
CREATE INDEX IF NOT EXISTS idx_posts_status         ON posts(status);
CREATE INDEX IF NOT EXISTS idx_comments_post_id     ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status      ON comments(status);
CREATE INDEX IF NOT EXISTS idx_followers_user_id    ON followers(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
