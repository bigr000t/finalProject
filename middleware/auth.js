"use strict";

const db = require("../db");

// EJS에 로그인 정보 전달
function setUser(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
}

// 로그인 여부 확인
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "로그인이 필요합니다."
    });
  }

  next();
}

// 관리자 권한 확인
async function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({
      success: false,
      message: "로그인이 필요합니다."
    });
  }

  try {
    const [rows] = await db.execute(
      "SELECT role FROM users WHERE id = ?",
      [req.session.user.id]
    );

    if (rows.length === 0 || rows[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "관리자 권한이 필요합니다."
      });
    }

    next();

  } catch (error) {
    console.error("[requireAdmin]", error);

    return res.status(500).json({
      success: false,
      message: "관리자 권한 확인 중 오류가 발생했습니다."
    });
  }
}

// 미들웨어 내보내기
module.exports = {
  setUser,
  requireLogin,
  requireAdmin
};
