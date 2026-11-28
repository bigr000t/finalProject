"use strict";

const db = require("../db");

// 사용자 정보 및 권한 조회
async function setUser(req, res, next) {
  res.locals.user = null;
  req.authUser = null;

  if (!req.session.user) {
    return next();
  }

  try {
    const [rows] = await db.execute(
      "SELECT id, username, role FROM users WHERE id = ?",
      [req.session.user.id]
    );

    const user = rows[0];

    // 존재하지 않는 계정 처리
    if (!user) {
      delete req.session.user;
      return next();
    }

    // 서버 내부 사용자 정보
    req.authUser = user;

    // EJS에 사용자 정보 전달
    res.locals.user = user;

    next();

  } catch (err) {
    console.error("사용자 정보 조회 오류:", err);

    return res.status(500).json({
      success: false,
      message: "사용자 정보를 확인할 수 없습니다."
    });
  }
}

// 로그인 여부 확인
function requireLogin(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: "로그인이 필요합니다."
    });
  }

  next();
}

// 관리자 권한 확인
function requireAdmin(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({
      success: false,
      message: "로그인이 필요합니다."
    });
  }

  if (req.authUser.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "관리자 권한이 필요합니다."
    });
  }

  next();
}

// 미들웨어 내보내기
module.exports = {
  setUser,
  requireLogin,
  requireAdmin
};
