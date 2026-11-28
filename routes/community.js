
"use strict";

const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

const PAGE_SIZE = 20;
const MAX_COMMENT_LENGTH = 2000;
const MAX_REPORT_LENGTH = 500;


// ==================== 공통 함수 ====================

function validId(id) {
  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  );
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validPost(title, content) {
  return (
    title.length > 0 &&
    title.length <= 200 &&
    content.length > 0 &&
    Buffer.byteLength(content, "utf8") <= 65535
  );
}

function isAdmin(req) {
  return req.authUser?.role === "admin";
}

function fail(status, message) {
  const error = new Error(message);
  error.httpStatus = status;
  throw error;
}

function handle(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (!err.httpStatus) {
        console.error("커뮤니티 처리 오류:", err);
      }

      res.status(err.httpStatus || 500).json({
        success: false,
        message: err.httpStatus
          ? err.message
          : "커뮤니티 요청 처리에 실패했습니다."
      });
    }
  };
}

function getPostId(req) {
  const id = Number(req.params.id);

  if (!validId(id)) {
    fail(400, "잘못된 게시글 번호입니다.");
  }

  return id;
}


// ==================== 트랜잭션 ====================

async function transaction(callback) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const result = await callback(connection);

    await connection.commit();

    return result;

  } catch (err) {
    await connection.rollback();
    throw err;

  } finally {
    connection.release();
  }
}


// 게시글 잠금 및 존재 확인
async function lockPost(connection, postId) {
  const [rows] = await connection.execute(`
    SELECT id, user_id, title
    FROM posts
    WHERE id = ?
    FOR UPDATE
  `, [postId]);

  if (rows.length === 0) {
    fail(404, "게시글을 찾을 수 없습니다.");
  }

  return rows[0];
}


// ==================== 게시판 목록 조회 ====================

router.get("/api/boards", handle(async (req, res) => {
  const [boards] = await db.execute(`
    SELECT
      id,
      name,
      admin_only,
      sort_order,
      created_at
    FROM boards
    ORDER BY sort_order ASC, id ASC
  `);

  res.json(boards);
}));


// ==================== 게시글 목록 조회 ====================

router.get("/api/posts", handle(async (req, res) => {
  const boardId = Number(req.query.board_id ?? 0);
  const page = Number(req.query.page ?? 1);

  const search = cleanText(req.query.search);
  const searchType = req.query.searchType || "all";
  const sort = req.query.sort || "latest";

  if (boardId !== 0 && !validId(boardId)) {
    fail(400, "잘못된 게시판 번호입니다.");
  }

  if (!validId(page)) {
    fail(400, "잘못된 페이지 번호입니다.");
  }

  if (search.length > 200) {
    fail(400, "검색어가 너무 깁니다.");
  }

  if (!["all", "title", "content", "author"].includes(searchType)) {
    fail(400, "잘못된 검색 조건입니다.");
  }

  if (!["latest", "likes"].includes(sort)) {
    fail(400, "잘못된 정렬 조건입니다.");
  }

  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];
  const params = [];

  // 게시판 필터
  if (boardId > 0) {
    conditions.push("p.board_id = ?");
    params.push(boardId);
  }

  // 게시글 검색
  if (search) {
    // LIKE 와일드카드를 일반 문자로 처리
    const escaped = search.replace(/[!%_]/g, "!$&");
    const keyword = `%${escaped}%`;

    switch (searchType) {
      case "title":
        conditions.push("p.title LIKE ? ESCAPE '!'");
        params.push(keyword);
        break;

      case "content":
        conditions.push("p.content LIKE ? ESCAPE '!'");
        params.push(keyword);
        break;

      case "author":
        conditions.push("u.username LIKE ? ESCAPE '!'");
        params.push(keyword);
        break;

      default:
        conditions.push(`
          (
            p.title LIKE ? ESCAPE '!'
            OR p.content LIKE ? ESCAPE '!'
          )
        `);

        params.push(keyword, keyword);
        break;
    }
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const orderBy = sort === "likes"
    ? "like_count DESC, p.created_at DESC, p.id DESC"
    : "p.created_at DESC, p.id DESC";

  // 전체 게시글 수
  const [countRows] = await db.execute(`
    SELECT COUNT(*) AS total
    FROM posts AS p
    JOIN users AS u ON p.user_id = u.id
    JOIN boards AS b ON p.board_id = b.id
    ${where}
  `, params);

  const total = Number(countRows[0].total);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 게시글 목록
  const [posts] = await db.execute(`
    SELECT
      p.id,
      p.user_id,
      p.board_id,
      p.title,
      p.created_at,
      p.updated_at,

      u.username,
      u.role,

      b.name AS board_name,

      (
        SELECT COUNT(*)
        FROM comments AS c
        WHERE c.post_id = p.id
      ) AS comment_count,

      (
        SELECT COUNT(*)
        FROM post_likes AS l
        WHERE l.post_id = p.id
      ) AS like_count

    FROM posts AS p

    JOIN users AS u
      ON p.user_id = u.id

    JOIN boards AS b
      ON p.board_id = b.id

    ${where}

    ORDER BY ${orderBy}

    LIMIT ${PAGE_SIZE}
    OFFSET ${offset}
  `, params);

  // 기존 배열 응답 형식을 유지하면서
  // 페이지 정보를 HTTP 헤더로 전달
  res.set({
    "X-Total-Count": String(total),
    "X-Total-Pages": String(totalPages),
    "X-Current-Page": String(page),
    "X-Page-Size": String(PAGE_SIZE)
  });

  res.json(posts);
}));


// ==================== 게시글 상세 조회 ====================

router.get("/api/posts/:id", handle(async (req, res) => {
  const id = getPostId(req);
  const userId = req.authUser?.id || 0;

  const [rows] = await db.execute(`
    SELECT
      p.id,
      p.user_id,
      p.board_id,
      p.title,
      p.content,
      p.created_at,
      p.updated_at,

      u.username,
      u.role,

      b.name AS board_name,

      (
        SELECT COUNT(*)
        FROM comments AS c
        WHERE c.post_id = p.id
      ) AS comment_count,

      (
        SELECT COUNT(*)
        FROM post_likes AS l
        WHERE l.post_id = p.id
      ) AS like_count,

      EXISTS (
        SELECT 1
        FROM post_likes AS l
        WHERE l.post_id = p.id
          AND l.user_id = ?
      ) AS liked_by_me,

      EXISTS (
        SELECT 1
        FROM post_reports AS r
        WHERE r.post_id = p.id
          AND r.user_id = ?
      ) AS reported_by_me

    FROM posts AS p

    JOIN users AS u
      ON p.user_id = u.id

    JOIN boards AS b
      ON p.board_id = b.id

    WHERE p.id = ?
  `, [userId, userId, id]);

  if (rows.length === 0) {
    fail(404, "게시글을 찾을 수 없습니다.");
  }

  const post = rows[0];

  post.liked_by_me = Boolean(post.liked_by_me);
  post.reported_by_me = Boolean(post.reported_by_me);

  post.can_edit = Boolean(
    req.authUser &&
    req.authUser.id === post.user_id
  );

  post.can_delete = Boolean(
    req.authUser &&
    (
      isAdmin(req) ||
      req.authUser.id === post.user_id
    )
  );

  res.json(post);
}));


// ==================== 게시글 작성 ====================

router.post(
  ["/posts", "/api/posts"],
  requireLogin,
  handle(async (req, res) => {
    const title = cleanText(req.body?.title);
    const content = cleanText(req.body?.content);
    const boardId = Number(req.body?.board_id ?? 1);

    if (!validPost(title, content)) {
      fail(400, "제목과 내용을 확인하세요.");
    }

    if (!validId(boardId)) {
      fail(400, "잘못된 게시판 번호입니다.");
    }

    const postId = await transaction(async (connection) => {
      const [boards] = await connection.execute(`
        SELECT id, admin_only
        FROM boards
        WHERE id = ?
        LOCK IN SHARE MODE
      `, [boardId]);

      if (boards.length === 0) {
        fail(404, "게시판을 찾을 수 없습니다.");
      }

      if (boards[0].admin_only && !isAdmin(req)) {
        fail(403, "관리자만 작성할 수 있는 게시판입니다.");
      }

      const [result] = await connection.execute(`
        INSERT INTO posts (
          user_id,
          board_id,
          title,
          content
        )
        VALUES (?, ?, ?, ?)
      `, [
        req.authUser.id,
        boardId,
        title,
        content
      ]);

      return result.insertId;
    });

    res.status(201).json({
      success: true,
      id: postId,
      message: "게시글이 작성되었습니다."
    });
  })
);


// ==================== 게시글 수정 ====================

router.post(
  "/posts/:id/edit",
  requireLogin,
  handle(async (req, res) => {
    const id = getPostId(req);

    const title = cleanText(req.body?.title);
    const content = cleanText(req.body?.content);

    if (!validPost(title, content)) {
      fail(400, "잘못된 게시글 정보입니다.");
    }

    const [result] = await db.execute(`
      UPDATE posts
      SET
        title = ?,
        content = ?
      WHERE id = ?
        AND user_id = ?
    `, [
      title,
      content,
      id,
      req.authUser.id
    ]);

    if (result.affectedRows === 0) {
      fail(404, "게시글이 없거나 수정 권한이 없습니다.");
    }

    res.json({
      success: true,
      message: "게시글이 수정되었습니다."
    });
  })
);


// ==================== 게시글 삭제 ====================

const deletePostHandler = handle(async (req, res) => {
  const id = getPostId(req);

  await transaction(async (connection) => {
    const post = await lockPost(connection, id);

    if (
      post.user_id !== req.authUser.id &&
      !isAdmin(req)
    ) {
      fail(403, "게시글 삭제 권한이 없습니다.");
    }

    // 게시글 삭제 전 미처리 신고 종료
    await connection.execute(`
      UPDATE post_reports
      SET
        status = 'resolved',
        processed_at = CURRENT_TIMESTAMP
      WHERE post_id = ?
        AND status = 'pending'
    `, [id]);

    // 댓글과 추천 기록은 외래 키에 의해 삭제
    // 신고 기록은 보존
    await connection.execute(`
      DELETE FROM posts
      WHERE id = ?
    `, [id]);
  });

  res.json({
    success: true,
    message: "게시글이 삭제되었습니다."
  });
});

// 기존 API 유지
router.post(
  "/posts/:id/delete",
  requireLogin,
  deletePostHandler
);

// 신규 API
router.delete(
  "/api/posts/:id",
  requireLogin,
  deletePostHandler
);


// ==================== 댓글 목록 조회 ====================

router.get(
  "/api/posts/:id/comments",
  handle(async (req, res) => {
    const postId = getPostId(req);

    const [posts] = await db.execute(`
      SELECT id
      FROM posts
      WHERE id = ?
    `, [postId]);

    if (posts.length === 0) {
      fail(404, "게시글을 찾을 수 없습니다.");
    }

    const [comments] = await db.execute(`
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,

        u.username,
        u.role

      FROM comments AS c

      JOIN users AS u
        ON c.user_id = u.id

      WHERE c.post_id = ?

      ORDER BY c.created_at ASC, c.id ASC
    `, [postId]);

    const result = comments.map(comment => ({
      ...comment,

      can_delete: Boolean(
        req.authUser &&
        (
          isAdmin(req) ||
          req.authUser.id === comment.user_id
        )
      )
    }));

    res.json(result);
  })
);


// ==================== 댓글 작성 ====================

router.post(
  "/api/posts/:id/comments",
  requireLogin,
  handle(async (req, res) => {
    const postId = getPostId(req);
    const content = cleanText(req.body?.content);

    if (
      !content ||
      content.length > MAX_COMMENT_LENGTH
    ) {
      fail(400, "댓글은 1~2000자로 작성하세요.");
    }

    const commentId = await transaction(async (connection) => {
      await lockPost(connection, postId);

      const [result] = await connection.execute(`
        INSERT INTO comments (
          post_id,
          user_id,
          content
        )
        VALUES (?, ?, ?)
      `, [
        postId,
        req.authUser.id,
        content
      ]);

      return result.insertId;
    });

    res.status(201).json({
      success: true,
      id: commentId,
      message: "댓글이 작성되었습니다."
    });
  })
);


// ==================== 댓글 삭제 ====================

router.delete(
  "/api/comments/:id",
  requireLogin,
  handle(async (req, res) => {
    const id = Number(req.params.id);

    if (!validId(id)) {
      fail(400, "잘못된 댓글 번호입니다.");
    }

    const [result] = await db.execute(`
      DELETE FROM comments
      WHERE id = ?
        AND (
          user_id = ?
          OR ? = 1
        )
    `, [
      id,
      req.authUser.id,
      isAdmin(req) ? 1 : 0
    ]);

    if (result.affectedRows === 0) {
      fail(404, "댓글이 없거나 삭제 권한이 없습니다.");
    }

    res.json({
      success: true,
      message: "댓글이 삭제되었습니다."
    });
  })
);


// ==================== 게시글 추천 ====================

router.post(
  "/api/posts/:id/like",
  requireLogin,
  handle(async (req, res) => {
    const postId = getPostId(req);
    const userId = req.authUser.id;

    const likeCount = await transaction(async (connection) => {
      const post = await lockPost(connection, postId);

      if (post.user_id === userId) {
        fail(400, "본인의 게시글은 추천할 수 없습니다.");
      }

      try {
        await connection.execute(`
          INSERT INTO post_likes (
            post_id,
            user_id
          )
          VALUES (?, ?)
        `, [postId, userId]);

      } catch (err) {
        // 이미 추천한 경우 기존 상태 유지
        if (err.code !== "ER_DUP_ENTRY") {
          throw err;
        }
      }

      const [rows] = await connection.execute(`
        SELECT COUNT(*) AS like_count
        FROM post_likes
        WHERE post_id = ?
      `, [postId]);

      return Number(rows[0].like_count);
    });

    res.json({
      success: true,
      liked: true,
      like_count: likeCount,
      message: "게시글을 추천했습니다."
    });
  })
);


// ==================== 게시글 추천 취소 ====================

router.delete(
  "/api/posts/:id/like",
  requireLogin,
  handle(async (req, res) => {
    const postId = getPostId(req);
    const userId = req.authUser.id;

    const likeCount = await transaction(async (connection) => {
      await lockPost(connection, postId);

      await connection.execute(`
        DELETE FROM post_likes
        WHERE post_id = ?
          AND user_id = ?
      `, [postId, userId]);

      const [rows] = await connection.execute(`
        SELECT COUNT(*) AS like_count
        FROM post_likes
        WHERE post_id = ?
      `, [postId]);

      return Number(rows[0].like_count);
    });

    res.json({
      success: true,
      liked: false,
      like_count: likeCount,
      message: "추천을 취소했습니다."
    });
  })
);


// ==================== 게시글 신고 ====================

router.post(
  "/api/posts/:id/report",
  requireLogin,
  handle(async (req, res) => {
    const postId = getPostId(req);
    const userId = req.authUser.id;
    const reason = cleanText(req.body?.reason);

    if (
      !reason ||
      reason.length > MAX_REPORT_LENGTH
    ) {
      fail(400, "신고 사유는 1~500자로 작성하세요.");
    }

    await transaction(async (connection) => {
      const post = await lockPost(connection, postId);

      if (post.user_id === userId) {
        fail(400, "본인의 게시글은 신고할 수 없습니다.");
      }

      try {
        await connection.execute(`
          INSERT INTO post_reports (
            post_id,
            user_id,
            post_title,
            reason,
            status
          )
          VALUES (?, ?, ?, ?, 'pending')
        `, [
          postId,
          userId,
          post.title,
          reason
        ]);

      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          fail(409, "이미 신고한 게시글입니다.");
        }

        throw err;
      }
    });

    res.status(201).json({
      success: true,
      message: "신고가 관리자에게 접수되었습니다."
    });
  })
);


// ==================== 모듈 내보내기 ====================

module.exports = router;
