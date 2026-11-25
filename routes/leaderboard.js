"use strict";

const express = require("express");
const db = require("../db");

const {
  requireLogin
} = require("../middleware/auth");

const router = express.Router();


// ==================== 기록 검증 설정 ====================

const ALLOWED_CLASSES = [
  "warrior",
  "rogue",
  "mage"
];


// ==================== 최고 기록 갱신 ====================

router.post("/api/runs", requireLogin, async (req, res) => {

  let connection;

  try {

    const userId = req.session.user.id;

    const highestFloor = Number(
      req.body.highest_floor
    );

    const className = String(
      req.body.class_name || ""
    );


    // ==================== 데이터 검증 ====================

    if (
      !Number.isSafeInteger(highestFloor) ||
      highestFloor < 1 ||
      !ALLOWED_CLASSES.includes(className)
    ) {

      return res.status(400).json({

        success: false,

        message: "잘못된 도전 기록입니다."

      });

    }


    // ==================== 트랜잭션 시작 ====================

    connection = await db.getConnection();

    await connection.beginTransaction();


    // 동일 사용자의 동시 기록 갱신 방지
    await connection.execute(

      `
      SELECT id
      FROM users
      WHERE id = ?
      FOR UPDATE
      `,

      [userId]

    );


    // ==================== 기존 최고 기록 조회 ====================

    const [rows] = await connection.execute(

      `
      SELECT id, highest_floor
      FROM runs
      WHERE user_id = ?
      ORDER BY highest_floor DESC, id DESC
      LIMIT 1
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
          class_name
        )
        VALUES (?, ?, ?)
        `,

        [
          userId,
          highestFloor,
          className
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
          created_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
        `,

        [
          highestFloor,
          className,
          rows[0].id,
          userId
        ]

      );

      updated = true;

    }


    // ==================== 기존 최고 기록 유지 ====================

    else {

      bestFloor = Number(
        rows[0].highest_floor
      );

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

      await connection.rollback().catch(
        () => {}
      );

    }

    console.error(
      "도전 기록 저장 오류:",
      error
    );

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

    res.set(
      "Cache-Control",
      "no-store"
    );

    const [rows] = await db.execute(`

      SELECT

        u.username,

        MAX(r.highest_floor) AS highest_floor

      FROM runs AS r

      INNER JOIN users AS u
        ON r.user_id = u.id

      GROUP BY
        u.id,
        u.username

      ORDER BY
        highest_floor DESC,
        u.username ASC

      LIMIT 10

    `);

    return res.json(rows);


  } catch (error) {

    console.error(
      "리더보드 조회 오류:",
      error
    );

    return res.status(500).json({

      success: false,

      message: "리더보드를 불러오지 못했습니다."

    });

  }

});


// ==================== 모듈 내보내기 ====================

module.exports = router;