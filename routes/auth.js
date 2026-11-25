
"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();


// ==================== 회원가입 ====================

router.post("/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    // 입력값 검증
    if (
      username.length < 3 ||
      username.length > 50 ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).send(
        "아이디는 3~50자, 비밀번호는 8자 이상 72바이트 이하로 입력하세요."
      );
    }

    // 비밀번호 해시 생성
    const passwordHash = await bcrypt.hash(password, 10);

    // 사용자 등록
    await db.execute(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, passwordHash]
    );

    res.redirect("/#account");

  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).send(
        "이미 사용 중인 아이디입니다."
      );
    }

    console.error("회원가입 오류:", err);
    res.status(500).send("회원가입에 실패했습니다.");
  }
});


// ==================== 로그인 ====================

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    // 사용자 조회
    const [rows] = await db.execute(
      `SELECT id, username, password_hash
       FROM users
       WHERE username = ?`,
      [username]
    );

    const user = rows[0];

    // 사용자 및 비밀번호 검증
    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).send(
        "아이디 또는 비밀번호가 틀렸습니다."
      );
    }

    // 세션 재생성
    req.session.regenerate(err => {
      if (err) {
        console.error("세션 생성 오류:", err);
        return res.status(500).send("로그인에 실패했습니다.");
      }

      req.session.user = {
        id: user.id,
        username: user.username
      };

      // 세션 저장
      req.session.save(err => {
        if (err) {
          console.error("세션 저장 오류:", err);
          return res.status(500).send("세션 저장에 실패했습니다.");
        }

        res.redirect("/");
      });
    });

  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).send("로그인에 실패했습니다.");
  }
});


// ==================== 로그아웃 ====================

router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("로그아웃 오류:", err);
      return res.status(500).send("로그아웃에 실패했습니다.");
    }

    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});



// ==================== 비밀번호 변경 ====================

router.post("/change-password", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    // 입력값 검증
    if (
      !currentPassword ||
      newPassword.length < 8 ||
      Buffer.byteLength(newPassword, "utf8") > 72
    ) {
      return res.status(400).send(
        "비밀번호는 8자 이상 72바이트 이하로 입력하세요."
      );
    }

    // 새로운 비밀번호 확인
    if (newPassword !== confirmPassword) {
      return res.status(400).send(
        "새로운 비밀번호가 서로 일치하지 않습니다."
      );
    }

    // 기존 비밀번호 조회
    const [rows] = await db.execute(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).send(
        "사용자를 찾을 수 없습니다."
      );
    }

    // 현재 비밀번호 검증
    const matched = await bcrypt.compare(
      currentPassword,
      rows[0].password_hash
    );

    if (!matched) {
      return res.status(403).send(
        "현재 비밀번호가 일치하지 않습니다."
      );
    }

    // 기존 비밀번호 재사용 방지
    if (await bcrypt.compare(newPassword, rows[0].password_hash)) {
      return res.status(400).send(
        "기존 비밀번호와 다른 비밀번호를 입력하세요."
      );
    }

    // 새로운 비밀번호 해싱
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 비밀번호 변경
    const [result] = await db.execute(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ? AND password_hash = ?`,
      [passwordHash, userId, rows[0].password_hash]
    );

    if (result.affectedRows === 0) {
      return res.status(409).send(
        "비밀번호 정보가 변경되었습니다. 다시 시도하세요."
      );
    }

    // 현재 세션 종료
    req.session.destroy(err => {
      if (err) {
        console.error("세션 종료 오류:", err);

        return res.status(500).send(
          "비밀번호는 변경되었으나 로그아웃에 실패했습니다."
        );
      }

      res.clearCookie("connect.sid");

      res.redirect("/#account");
    });

  } catch (err) {
    console.error("비밀번호 변경 오류:", err);

    res.status(500).send(
      "비밀번호 변경에 실패했습니다."
    );
  }
});


// ==================== 모듈 내보내기 ====================

module.exports = router;
