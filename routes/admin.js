"use strict";

const express = require("express");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// 모든 관리자 API에 권한 검증 적용
router.use(requireAdmin);

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


// ==================== 능력치 수정 ====================


// ==================== 모듈 내보내기 ====================

module.exports = router;
