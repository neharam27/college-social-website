-- =====================================================
-- College Social — Database Migration Script
-- MySQL 8.0 compatible
-- Run this ONCE in your MySQL database: college_social
-- =====================================================

-- Helper: add columns only if they don't already exist
DROP PROCEDURE IF EXISTS AddColIfMissing;
DELIMITER $$
CREATE PROCEDURE AddColIfMissing(
  tbl VARCHAR(64), col VARCHAR(64), def TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- 1. Add new columns to users table
CALL AddColIfMissing('users', 'club_id',        'INT NULL');
CALL AddColIfMissing('users', 'status',         "ENUM('active','suspended','deleted') DEFAULT 'active'");
CALL AddColIfMissing('users', 'email_verified', 'TINYINT(1) DEFAULT 0');
CALL AddColIfMissing('users', 'totp_secret',    'VARCHAR(255) NULL');
CALL AddColIfMissing('users', 'updated_at',     'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- 2. Add new columns to posts table
CALL AddColIfMissing('posts', 'status',     "ENUM('active','deleted') DEFAULT 'active'");
CALL AddColIfMissing('posts', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- 3. Add new columns to comments table
CALL AddColIfMissing('comments', 'status',     "ENUM('active','deleted') DEFAULT 'active'");
CALL AddColIfMissing('comments', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- 4. Add new columns to clubs table
CALL AddColIfMissing('clubs', 'status',     "ENUM('active','suspended','deleted') DEFAULT 'active'");
CALL AddColIfMissing('clubs', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

DROP PROCEDURE IF EXISTS AddColIfMissing;

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

-- 9. Performance indexes (safe — skipped if already exist)
DROP PROCEDURE IF EXISTS CreateIndexIfMissing;
DELIMITER $$
CREATE PROCEDURE CreateIndexIfMissing(
  tbl VARCHAR(64), idx VARCHAR(64), col VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND INDEX_NAME   = idx
  ) THEN
    SET @sql = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '`(`', col, '`)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL CreateIndexIfMissing('posts',          'idx_posts_club_id',        'club_id');
CALL CreateIndexIfMissing('posts',          'idx_posts_status',         'status');
CALL CreateIndexIfMissing('comments',       'idx_comments_post_id',     'post_id');
CALL CreateIndexIfMissing('comments',       'idx_comments_status',      'status');
CALL CreateIndexIfMissing('followers',      'idx_followers_user_id',    'user_id');
CALL CreateIndexIfMissing('notifications',  'idx_notifications_user',   'user_id');
CALL CreateIndexIfMissing('refresh_tokens', 'idx_refresh_tokens_token', 'token');

DROP PROCEDURE IF EXISTS CreateIndexIfMissing;

SELECT 'Migration complete ✅' AS result;
