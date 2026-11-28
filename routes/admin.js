
"use strict";

const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

const REPORT_PAGE_SIZE = 20;


// ==================== 관리자 권한 검증 ====================

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(requireAdmin);


// ==================== 공통 입력값 검증 ====================

function isValidNumber(value, min, max) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function validId(id) {
  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  );
}

function cleanText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function invalidRequest(res, message) {
  return res.status(400).json({
    success: false,
    message
  });
}

function requireJson(req, res, next) {
  if (!req.is("application/json")) {
    return res.status(415).json({
      success: false,
      message: "JSON 형식의 요청만 허용합니다."
    });
  }

  next();
}


// ==================== 공통 오류 처리 ====================

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
        console.error("관리자 요청 처리 오류:", err);
      }

      res.status(err.httpStatus || 500).json({
        success: false,
        message: err.httpStatus
          ? err.message
          : "관리자 요청 처리에 실패했습니다."
      });
    }
  };
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


// ==================== 관리자 권한 확인 ====================

router.get("/status", (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.authUser.id,
      username: req.authUser.username,
      role: req.authUser.role
    }
  });
});


// ==================== 층 건너뛰기 ====================

router.post("/floor", requireJson, (req, res) => {

  const floor = req.body?.floor;

  if (
    !Number.isSafeInteger(floor) ||
    floor < 1 ||
    floor > 1000000
  ) {
    return invalidRequest(
      res,
      "층수는 1~1000000 사이의 정수여야 합니다."
    );
  }

  console.log(
    `[관리자 층 이동 승인] 사용자: ${req.authUser.id}, 층수: ${floor}`
  );

  return res.json({
    success: true,
    floor
  });

});


// ==================== 능력치 수정 ====================

router.post("/stats", requireJson, (req, res) => {

  const stats = req.body;

  if (
    !stats ||
    typeof stats !== "object" ||
    Array.isArray(stats)
  ) {
    return invalidRequest(
      res,
      "잘못된 능력치 데이터입니다."
    );
  }

  const limits = {
    hp: [1, 1000000000],
    currentHp: [1, 1000000000],
    atk: [0, 1000000000],
    ap: [0, 1000000000],
    spd: [0.1, 100],
    crit: [0, 100],
    critDamage: [100, 10000]
  };

  const integerStats = new Set([
    "hp",
    "currentHp",
    "atk",
    "ap"
  ]);

  const result = {};
  const entries = Object.entries(stats);

  if (entries.length === 0) {
    return invalidRequest(
      res,
      "수정할 능력치를 입력해주세요."
    );
  }

  for (const [key, value] of entries) {

    if (
      !Object.prototype.hasOwnProperty.call(limits, key)
    ) {
      return invalidRequest(
        res,
        `허용되지 않은 능력치: ${key}`
      );
    }

    const [min, max] = limits[key];

    if (!isValidNumber(value, min, max)) {
      return invalidRequest(
        res,
        `잘못된 능력치: ${key}`
      );
    }

    if (
      integerStats.has(key) &&
      !Number.isSafeInteger(value)
    ) {
      return invalidRequest(
        res,
        `${key}는 정수여야 합니다.`
      );
    }

    result[key] = value;

  }

  console.log(
    `[관리자 능력치 수정 승인] 사용자: ${req.authUser.id}`,
    result
  );

  return res.json({
    success: true,
    stats: result
  });

});


// ==================== 게시판 생성 ====================

router.post(
  "/boards",
  requireJson,
  handle(async (req, res) => {

    const name = cleanText(req.body?.name);

    const adminOnly =
      req.body?.admin_only ?? false;

    let sortOrder = req.body?.sort_order;

    // 게시판 이름 검증
    if (
      !name ||
      name.length > 50
    ) {
      fail(
        400,
        "게시판 이름은 1~50자로 입력해주세요."
      );
    }

    // 시스템에서 사용하는 탭 이름 보호
    if (
      ["전체", "신고 관리", "신고관리"].includes(name)
    ) {
      fail(
        400,
        "시스템에서 사용하는 게시판 이름입니다."
      );
    }

    // 작성 권한 검증
    if (typeof adminOnly !== "boolean") {
      fail(
        400,
        "게시판 권한 설정이 잘못되었습니다."
      );
    }

    // 정렬 순서를 입력하지 않은 경우
    // 기존 게시판의 마지막에 추가
    if (sortOrder === undefined) {
      const [rows] = await db.execute(`
        SELECT COALESCE(MAX(sort_order), 0) AS max_order
        FROM boards
      `);

      sortOrder = Number(rows[0].max_order) + 1;
    }

    if (
      !Number.isSafeInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 1000000
    ) {
      fail(
        400,
        "게시판 정렬 순서가 잘못되었습니다."
      );
    }

    let result;

    try {
      [result] = await db.execute(`
        INSERT INTO boards (
          name,
          admin_only,
          sort_order
        )
        VALUES (?, ?, ?)
      `, [
        name,
        adminOnly ? 1 : 0,
        sortOrder
      ]);

    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        fail(
          409,
          "이미 존재하는 게시판 이름입니다."
        );
      }

      throw err;
    }

    console.log(
      `[관리자 게시판 생성] 사용자: ${req.authUser.id}, 게시판: ${name}`
    );

    res.status(201).json({
      success: true,

      board: {
        id: result.insertId,
        name,
        admin_only: adminOnly ? 1 : 0,
        sort_order: sortOrder
      },

      message: "게시판이 생성되었습니다."
    });

  })
);


// ==================== 미처리 신고 건수 ====================

router.get(
  "/reports/count",
  handle(async (req, res) => {

    const [rows] = await db.execute(`
      SELECT COUNT(*) AS pending_count
      FROM post_reports
      WHERE status = 'pending'
    `);

    res.json({
      success: true,
      pending_count: Number(rows[0].pending_count)
    });

  })
);


// ==================== 신고 목록 조회 ====================

router.get(
  "/reports",
  handle(async (req, res) => {

    const status =
      req.query.status ?? "pending";

    const page =
      Number(req.query.page ?? 1);

    const allowedStatuses = [
      "all",
      "pending",
      "dismissed",
      "resolved"
    ];

    if (!allowedStatuses.includes(status)) {
      fail(400, "잘못된 신고 상태입니다.");
    }

    if (!validId(page)) {
      fail(400, "잘못된 페이지 번호입니다.");
    }

    const conditions = [];
    const params = [];

    if (status !== "all") {
      conditions.push("r.status = ?");
      params.push(status);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const offset =
      (page - 1) * REPORT_PAGE_SIZE;

    // 전체 신고 건수
    const [countRows] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM post_reports AS r
      ${where}
    `, params);

    const total =
      Number(countRows[0].total);

    const totalPages =
      Math.ceil(total / REPORT_PAGE_SIZE);

    // 신고 목록
    const [reports] = await db.execute(`
      SELECT
        r.id,
        r.post_id,
        r.user_id,
        r.post_title,
        r.reason,
        r.status,
        r.created_at,
        r.processed_at,

        reporter.username AS reporter_username,

        p.title AS current_post_title,
        p.user_id AS post_user_id,

        author.username AS post_username,
        author.role AS post_role,

        b.name AS board_name,

        (
          SELECT COUNT(*)
          FROM post_reports AS other_report
          WHERE other_report.post_id = r.post_id
            AND other_report.status = 'pending'
        ) AS pending_report_count

      FROM post_reports AS r

      JOIN users AS reporter
        ON r.user_id = reporter.id

      LEFT JOIN posts AS p
        ON r.post_id = p.id

      LEFT JOIN users AS author
        ON p.user_id = author.id

      LEFT JOIN boards AS b
        ON p.board_id = b.id

      ${where}

      ORDER BY
        r.created_at DESC,
        r.id DESC

      LIMIT ${REPORT_PAGE_SIZE}
      OFFSET ${offset}
    `, params);

    res.json({
      success: true,

      reports,

      pagination: {
        total,
        totalPages,
        currentPage: page,
        pageSize: REPORT_PAGE_SIZE
      }
    });

  })
);


// ==================== 신고 처리 ====================

router.patch(
  "/reports/:id",
  requireJson,
  handle(async (req, res) => {

    const reportId =
      Number(req.params.id);

    const action =
      req.body?.action;

    if (!validId(reportId)) {
      fail(
        400,
        "잘못된 신고 번호입니다."
      );
    }

    if (
      !["dismiss", "delete"].includes(action)
    ) {
      fail(
        400,
        "잘못된 신고 처리 방식입니다."
      );
    }

    // 신고의 원본 게시글 번호 확인
    const [initialReports] = await db.execute(`
      SELECT
        id,
        post_id
      FROM post_reports
      WHERE id = ?
    `, [reportId]);

    if (initialReports.length === 0) {
      fail(
        404,
        "신고 내역을 찾을 수 없습니다."
      );
    }

    const initialReport =
      initialReports[0];

    const result = await transaction(
      async (connection) => {

        // community.js와 동일하게
        // 게시글부터 잠가 교착 상태 가능성을 줄임
        if (initialReport.post_id !== null) {
          await connection.execute(`
            SELECT id
            FROM posts
            WHERE id = ?
            FOR UPDATE
          `, [initialReport.post_id]);
        }

        // 최신 신고 상태 확인 및 잠금
        const [reports] =
          await connection.execute(`
            SELECT
              id,
              post_id,
              status
            FROM post_reports
            WHERE id = ?
            FOR UPDATE
          `, [reportId]);

        if (reports.length === 0) {
          fail(
            404,
            "신고 내역을 찾을 수 없습니다."
          );
        }

        const report = reports[0];

        if (report.status !== "pending") {
          fail(
            409,
            "이미 처리된 신고입니다."
          );
        }


        // ---------- 신고 기각 ----------

        if (action === "dismiss") {

          await connection.execute(`
            UPDATE post_reports
            SET
              status = 'dismissed',
              processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [reportId]);

          return {
            status: "dismissed",
            deletedPost: false,
            affectedReports: 1
          };

        }


        // ---------- 게시글이 이미 삭제된 경우 ----------

        if (report.post_id === null) {

          await connection.execute(`
            UPDATE post_reports
            SET
              status = 'resolved',
              processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [reportId]);

          return {
            status: "resolved",
            deletedPost: false,
            affectedReports: 1
          };

        }


        // ---------- 게시글 삭제 ----------

        const postId =
          report.post_id;

        // 동일 게시글의 미처리 신고를 모두 종료
        const [updatedReports] =
          await connection.execute(`
            UPDATE post_reports
            SET
              status = 'resolved',
              processed_at = CURRENT_TIMESTAMP
            WHERE post_id = ?
              AND status = 'pending'
          `, [postId]);

        // 게시글 삭제
        // 댓글 및 추천 기록은 자동 삭제
        // 신고 기록은 보존
        const [deletedPosts] =
          await connection.execute(`
            DELETE FROM posts
            WHERE id = ?
          `, [postId]);

        if (deletedPosts.affectedRows !== 1) {
          fail(
            409,
            "게시글 삭제에 실패했습니다."
          );
        }

        return {
          status: "resolved",
          deletedPost: true,
          affectedReports:
            updatedReports.affectedRows
        };

      }
    );

    console.log(
      `[관리자 신고 처리] 사용자: ${req.authUser.id}, 신고: ${reportId}, 처리: ${action}`,
      result
    );

    let message;

    if (result.status === "dismissed") {
      message = "신고가 기각되었습니다.";

    } else if (result.deletedPost) {
      message = "게시글을 삭제하고 신고를 처리했습니다.";

    } else {
      message = "이미 삭제된 게시글의 신고를 처리했습니다.";
    }

    res.json({
      success: true,

      report_id: reportId,

      status: result.status,

      deleted_post: result.deletedPost,

      affected_reports:
        result.affectedReports,

      message
    });

  })
);

// ==================== 게시판 수정 ====================

router.patch("/boards/:id", requireJson, handle(async (req, res) => {
  const id = Number(req.params.id);
  const name = cleanText(req.body?.name);
  const adminOnly = req.body?.admin_only;
  const sortOrder = req.body?.sort_order;

  if (!validId(id)) {
    fail(400, "잘못된 게시판 번호입니다.");
  }

  if (!name || name.length > 50) {
    fail(400, "게시판 이름은 1~50자로 입력해주세요.");
  }

  if (["전체", "신고 관리", "신고관리"].includes(name)) {
    fail(400, "시스템에서 사용하는 게시판 이름입니다.");
  }

  if (typeof adminOnly !== "boolean") {
    fail(400, "잘못된 작성 권한입니다.");
  }

  if (
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 1000000
  ) {
    fail(400, "잘못된 표시 순서입니다.");
  }

  try {
    await transaction(async connection => {
      const [boards] = await connection.execute(
        "SELECT id FROM boards WHERE id = ? FOR UPDATE",
        [id]
      );

      if (!boards.length) {
        fail(404, "게시판을 찾을 수 없습니다.");
      }

      await connection.execute(`
        UPDATE boards
        SET name = ?, admin_only = ?, sort_order = ?
        WHERE id = ?
      `, [name, adminOnly ? 1 : 0, sortOrder, id]);
    });

  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      fail(409, "이미 존재하는 게시판 이름입니다.");
    }

    throw err;
  }

  res.json({
    success: true,
    message: "게시판이 수정되었습니다."
  });
}));


// ==================== 게시글 이동 ====================

router.patch("/posts/:id/board", requireJson, handle(async (req, res) => {
  const postId = Number(req.params.id);
  const boardId = req.body?.board_id;

  if (!validId(postId) || !validId(boardId)) {
    fail(400, "잘못된 게시글 또는 게시판 번호입니다.");
  }

  await transaction(async connection => {
    const [boards] = await connection.execute(
      "SELECT id FROM boards WHERE id = ? FOR SHARE",
      [boardId]
    );

    if (!boards.length) {
      fail(404, "이동할 게시판을 찾을 수 없습니다.");
    }

    const [posts] = await connection.execute(
      "SELECT id FROM posts WHERE id = ? FOR UPDATE",
      [postId]
    );

    if (!posts.length) {
      fail(404, "게시글을 찾을 수 없습니다.");
    }

    await connection.execute(`
      UPDATE posts
      SET board_id = ?, updated_at = updated_at
      WHERE id = ?
    `, [boardId, postId]);
  });

  res.json({
    success: true,
    message: "게시글이 이동되었습니다."
  });
}));

// ==================== 모듈 내보내기 ====================

module.exports = router;
