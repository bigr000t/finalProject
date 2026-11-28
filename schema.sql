
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
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================== 게시판 관리 ====================

CREATE TABLE IF NOT EXISTS boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    admin_only BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY (name)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================== 초기 게시판 ====================

INSERT IGNORE INTO boards (
    id,
    name,
    admin_only,
    sort_order
)
VALUES
    (1, '자유게시판', FALSE, 2),
    (2, '공지사항', TRUE, 1);


-- ==================== 게시글 ====================

CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    board_id INT NOT NULL DEFAULT 1,

    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_posts_board_created (
        board_id,
        created_at
    ),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_posts_board
        FOREIGN KEY (board_id)
        REFERENCES boards(id)
        ON DELETE RESTRICT

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================== 댓글 ====================

CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_comments_post_created (
        post_id,
        created_at
    ),

    FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================== 게시글 추천 ====================

CREATE TABLE IF NOT EXISTS post_likes (
    post_id INT NOT NULL,
    user_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (post_id, user_id),

    FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================== 게시글 신고 ====================

CREATE TABLE IF NOT EXISTS post_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,

    post_id INT DEFAULT NULL,
    user_id INT NOT NULL,

    post_title VARCHAR(200) NOT NULL,
    reason VARCHAR(500) NOT NULL,

    status ENUM(
        'pending',
        'dismissed',
        'resolved'
    ) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL DEFAULT NULL,

    UNIQUE KEY uq_post_report (
        post_id,
        user_id
    ),

    INDEX idx_reports_status (
        status,
        created_at
    ),

    FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE SET NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


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

    KEY idx_runs_class_floor (
        class_name,
        highest_floor DESC
    ),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================== 명예의 전당 ====================

CREATE TABLE IF NOT EXISTS runs_archive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,

    username VARCHAR(50) NOT NULL,
    highest_floor INT NOT NULL,
    class_name VARCHAR(50) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- ==================== 게임 저장 데이터 ====================

CREATE TABLE IF NOT EXISTS game_saves (
    user_id INT NOT NULL PRIMARY KEY,

    save_data JSON NOT NULL,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
