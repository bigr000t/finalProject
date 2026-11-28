"use strict";

const express = require("express");
const db = require("../db");

const { requireLogin } = require("../middleware/auth");

const router = express.Router();


// ==================== 기록 검증 설정 ====================

const ALLOWED_CLASSES = [
  "warrior",
  "rogue",
  "mage"
];

const LEADERBOARD_LIMIT = 10;
const MAX_INT = 2147483647;
const MAX_JSON_BYTES = 32768;


// ==================== 공통 검증 함수 ====================

function isPositiveInteger(value) {
  return (
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= MAX_INT
  );
}

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isCollection(value) {
  return Array.isArray(value) || isObject(value);
}

function encodeJSON(value) {
  const json = JSON.stringify(value);

  if (
    typeof json !== "string" ||
    Buffer.byteLength(json, "utf8") > MAX_JSON_BYTES
  ) {
    throw new Error("잘못된 빌드 데이터 크기");
  }

  return json;
}

function decodeJSON(value) {
  if (typeof value === "string") {
    return JSON.parse(value);
  }

  return value;
}


// ==================== 최고 기록 갱신 ====================

router.post("/api/runs", requireLogin, async (req, res) => {

  let connection;

  try {

    const userId = req.authUser.id;
    const body = req.body || {};


    // ==================== 관리자 기록 등록 차단 ====================

    if (req.authUser.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "관리자 계정은 기록을 등록할 수 없습니다."
      });
    }


    // ==================== 기록 데이터 ====================

    const highestFloor = Number(body.highest_floor);
    const className = String(body.class_name || "");

    const finalStats = body.final_stats;
    const specialItems = body.special_items;
    const passives = body.passives;


    // ==================== 데이터 검증 ====================

    if (
      !isPositiveInteger(highestFloor) ||
      !ALLOWED_CLASSES.includes(className) ||
      !isObject(finalStats) ||
      !isCollection(specialItems) ||
      !isCollection(passives)
    ) {
      return res.status(400).json({
        success: false,
        message: "잘못된 도전 기록입니다."
      });
    }


    // ==================== JSON 변환 ====================

    let statsJSON;
    let itemsJSON;
    let passivesJSON;

    try {

      statsJSON = encodeJSON(finalStats);
      itemsJSON = encodeJSON(specialItems);
      passivesJSON = encodeJSON(passives);

    } catch {

      return res.status(400).json({
        success: false,
        message: "잘못된 빌드 정보입니다."
      });

    }


    // ==================== 트랜잭션 시작 ====================

    connection = await db.getConnection();

    await connection.beginTransaction();


    // ==================== 계정 잠금 및 권한 재확인 ====================

    const [users] = await connection.execute(
      `
      SELECT id, role
      FROM users
      WHERE id = ?
      FOR UPDATE
      `,
      [userId]
    );

    if (users.length === 0) {

      await connection.rollback();

      return res.status(401).json({
        success: false,
        message: "유효하지 않은 계정입니다."
      });

    }

    if (users[0].role === "admin") {

      await connection.rollback();

      return res.status(403).json({
        success: false,
        message: "관리자 계정은 기록을 등록할 수 없습니다."
      });

    }


    // ==================== 기존 최고 기록 조회 ====================

    const [rows] = await connection.execute(
      `
      SELECT id, highest_floor
      FROM runs
      WHERE user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    let updated = false;
    let bestFloor = highestFloor;


    // ==================== 최초 기록 등록 ====================

    if (rows.length === 0) {

      await connection.execute(
        `
        INSERT INTO runs (
          user_id,
          highest_floor,
          class_name,
          final_stats,
          special_items,
          passives
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          userId,
          highestFloor,
          className,
          statsJSON,
          itemsJSON,
          passivesJSON
        ]
      );

      updated = true;

    }


    // ==================== 최고 기록 경신 ====================

    else if (
      highestFloor > Number(rows[0].highest_floor)
    ) {

      await connection.execute(
        `
        UPDATE runs
        SET
          highest_floor = ?,
          class_name = ?,
          final_stats = ?,
          special_items = ?,
          passives = ?,
          created_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
        `,
        [
          highestFloor,
          className,
          statsJSON,
          itemsJSON,
          passivesJSON,
          rows[0].id,
          userId
        ]
      );

      updated = true;

    }


    // ==================== 기존 최고 기록 유지 ====================

    else {

      bestFloor = Number(rows[0].highest_floor);

    }


    // ==================== 트랜잭션 완료 ====================

    await connection.commit();

    if (updated) {

      console.log(
        `[최고 기록 갱신] ` +
        `사용자: ${userId}, ` +
        `층수: ${highestFloor}, ` +
        `클래스: ${className}`
      );

    }

    return res.json({
      success: true,
      updated,
      highest_floor: bestFloor,
      message: updated
        ? `최고 기록 갱신! ${bestFloor}층`
        : `기존 최고 기록 유지: ${bestFloor}층`
    });


  } catch (error) {

    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("도전 기록 저장 오류:", error);

    return res.status(500).json({
      success: false,
      message: "기록 저장에 실패했습니다."
    });


  } finally {

    if (connection) {
      connection.release();
    }

  }

});


// ==================== 리더보드 조회 ====================

router.get("/api/leaderboard", async (req, res) => {

  try {

    res.set("Cache-Control", "no-store");

    const className = String(
      req.query.class || "warrior"
    );


    // ==================== 명예의 전당 조회 ====================

    if (className === "archive") {

      const [rows] = await db.execute(
        `
        SELECT
          username,
          highest_floor,
          class_name
        FROM runs_archive
        ORDER BY
          highest_floor DESC,
          username ASC
        `
      );

      return res.json(rows);

    }


    // ==================== 클래스 검증 ====================

    if (!ALLOWED_CLASSES.includes(className)) {

      return res.status(400).json({
        success: false,
        message: "잘못된 클래스입니다."
      });

    }


    // ==================== 클래스별 리더보드 조회 ====================

    const [rows] = await db.execute(
      `
      SELECT
        r.id,
        u.username,
        r.highest_floor,
        r.class_name

      FROM runs AS r

      INNER JOIN users AS u
        ON r.user_id = u.id

      WHERE r.class_name = ?
        AND u.role = 'user'

      ORDER BY
        r.highest_floor DESC,
        u.username ASC

      LIMIT ${LEADERBOARD_LIMIT}
      `,
      [className]
    );

    return res.json(rows);


  } catch (error) {

    console.error("리더보드 조회 오류:", error);

    return res.status(500).json({
      success: false,
      message: "리더보드를 불러오지 못했습니다."
    });

  }

});


// ==================== 기록 상세 보기 ====================

router.get("/api/runs/:id", async (req, res) => {

  try {

    res.set("Cache-Control", "no-store");

    const runId = Number(req.params.id);
    const viewerId = req.authUser?.id ?? null;


    // ==================== 기록 번호 검증 ====================

    if (!isPositiveInteger(runId)) {

      return res.status(400).json({
        success: false,
        message: "잘못된 기록 번호입니다."
      });

    }


    // ==================== 상세 기록 조회 ====================

    const [rows] = await db.execute(
      `
      SELECT
        r.id,
        u.username,
        r.highest_floor,
        r.class_name,
        r.final_stats,
        r.special_items,
        r.passives,

        CASE
          WHEN viewer.id = r.user_id THEN 1
          WHEN viewer.role = 'admin' THEN 1
          ELSE 0
        END AS can_delete

      FROM runs AS r

      INNER JOIN users AS u
        ON r.user_id = u.id

      LEFT JOIN users AS viewer
        ON viewer.id = ?

      WHERE r.id = ?
        AND u.role = 'user'

      LIMIT 1
      `,
      [viewerId, runId]
    );


    // ==================== 기록 존재 여부 확인 ====================

    if (rows.length === 0) {

      return res.status(404).json({
        success: false,
        message: "존재하지 않는 기록입니다."
      });

    }

    const record = rows[0];


    // ==================== 상세 정보 반환 ====================

    return res.json({
      success: true,

      record: {
        id: record.id,
        username: record.username,
        highest_floor: record.highest_floor,
        class_name: record.class_name,

        final_stats: decodeJSON(
          record.final_stats
        ),

        special_items: decodeJSON(
          record.special_items
        ),

        passives: decodeJSON(
          record.passives
        ),

        can_delete: Number(
          record.can_delete
        ) === 1
      }

    });


  } catch (error) {

    console.error("기록 상세 조회 오류:", error);

    return res.status(500).json({
      success: false,
      message: "상세 정보를 불러오지 못했습니다."
    });

  }

});


// ==================== 기록 삭제 ====================

router.delete("/api/runs/:id", requireLogin, async (req, res) => {

  try {

    const runId = Number(req.params.id);
    const userId = req.authUser.id;


    // ==================== 기록 번호 검증 ====================

    if (!isPositiveInteger(runId)) {

      return res.status(400).json({
        success: false,
        message: "잘못된 기록 번호입니다."
      });

    }


    // ==================== 본인 또는 관리자 기록 삭제 ====================

    const [result] = await db.execute(
      `
      DELETE r

      FROM runs AS r

      INNER JOIN users AS actor
        ON actor.id = ?

      WHERE r.id = ?

        AND (
          r.user_id = actor.id
          OR actor.role = 'admin'
        )
      `,
      [userId, runId]
    );


    // ==================== 삭제 결과 확인 ====================

    if (result.affectedRows === 0) {

      return res.status(404).json({
        success: false,
        message: "기록이 없거나 삭제 권한이 없습니다."
      });

    }

    console.log(
      `[리더보드 기록 삭제] ` +
      `요청 계정: ${userId}, ` +
      `기록 ID: ${runId}`
    );

    return res.json({
      success: true,
      message: "기록이 삭제되었습니다."
    });


  } catch (error) {

    console.error("기록 삭제 오류:", error);

    return res.status(500).json({
      success: false,
      message: "기록 삭제에 실패했습니다."
    });

  }

});


// ==================== 모듈 내보내기 ====================

module.exports = router;
