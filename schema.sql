CREATE DATABASE IF NOT EXISTS finalProject
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE finalProject;


-- ==================== 계정 관리 ====================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
);


-- ==================== 커뮤니티 ====================

CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);


-- ==================== 리더보드 ====================

CREATE TABLE IF NOT EXISTS runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    highest_floor INT NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    final_stats JSON,
    special_items JSON,
    passives JSON,

    UNIQUE KEY uq_runs_user_id (user_id),
    KEY idx_runs_class_floor (class_name, highest_floor DESC),

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);


-- ==================== 명예의 전당 ====================

CREATE TABLE IF NOT EXISTS runs_archive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    highest_floor INT NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==================== 게임 저장 데이터 ====================

CREATE TABLE IF NOT EXISTS game_saves (
    user_id INT NOT NULL PRIMARY KEY,
    save_data JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
