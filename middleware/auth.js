
"use strict";

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

// 미들웨어 내보내기
module.exports = {
  setUser,
  requireLogin
};
