"use strict";

const express = require("express");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();


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


// ==================== 모듈 내보내기 ====================

module.exports = router;
