
"use strict";

const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();


// ==================== 공통 입력값 검증 ====================

function validId(id) {
  return Number.isSafeInteger(id) && id > 0;
}

function validPost(title, content) {
  return (
    title.length > 0 &&
    title.length <= 200 &&
    content.length > 0 &&
    Buffer.byteLength(content, "utf8") <= 65535
  );
}


// ==================== 게시글 목록 조회 ====================

router.get("/api/posts", async (req, res) => {
  try {
    const [posts] = await db.execute(`
      SELECT
        p.id,
        p.user_id,
        p.title,
        p.created_at,
        p.updated_at,
        u.username
      FROM posts AS p
      JOIN users AS u ON p.user_id = u.id
      ORDER BY p.created_at DESC, p.id DESC
    `);

    res.json(posts);

  } catch (err) {
    console.error("게시글 목록 조회 오류:", err);

    res.status(500).json({
      success: false,
      message: "게시글 목록을 불러오지 못했습니다."
    });
  }
});


// ==================== 게시글 상세 조회 ====================

router.get("/api/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "잘못된 게시글 번호입니다."
      });
    }

    const [rows] = await db.execute(`
      SELECT
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.created_at,
        p.updated_at,
        u.username
      FROM posts AS p
      JOIN users AS u ON p.user_id = u.id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "게시글을 찾을 수 없습니다."
      });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error("게시글 상세 조회 오류:", err);

    res.status(500).json({
      success: false,
      message: "게시글을 불러오지 못했습니다."
    });
  }
});


// ==================== 게시글 작성 ====================

router.post("/posts", requireLogin, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();

    if (!validPost(title, content)) {
      return res.status(400).json({
        success: false,
        message: "제목과 내용을 확인하세요."
      });
    }

    const [result] = await db.execute(
      `INSERT INTO posts (user_id, title, content)
       VALUES (?, ?, ?)`,
      [req.session.user.id, title, content]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: "게시글이 작성되었습니다."
    });

  } catch (err) {
    console.error("게시글 작성 오류:", err);

    res.status(500).json({
      success: false,
      message: "게시글 작성에 실패했습니다."
    });
  }
});


// ==================== 게시글 수정 ====================

router.post("/posts/:id/edit", requireLogin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();

    if (!validId(id) || !validPost(title, content)) {
      return res.status(400).json({
        success: false,
        message: "잘못된 게시글 정보입니다."
      });
    }

    const [result] = await db.execute(
      `UPDATE posts
       SET title = ?, content = ?
       WHERE id = ? AND user_id = ?`,
      [title, content, id, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "게시글이 없거나 수정 권한이 없습니다."
      });
    }

    res.json({
      success: true,
      message: "게시글이 수정되었습니다."
    });

  } catch (err) {
    console.error("게시글 수정 오류:", err);

    res.status(500).json({
      success: false,
      message: "게시글 수정에 실패했습니다."
    });
  }
});


// ==================== 게시글 삭제 ====================

router.post("/posts/:id/delete", requireLogin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "잘못된 게시글 번호입니다."
      });
    }

    const [result] = await db.execute(
      `DELETE FROM posts
       WHERE id = ? AND user_id = ?`,
      [id, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "게시글이 없거나 삭제 권한이 없습니다."
      });
    }

    res.json({
      success: true,
      message: "게시글이 삭제되었습니다."
    });

  } catch (err) {
    console.error("게시글 삭제 오류:", err);

    res.status(500).json({
      success: false,
      message: "게시글 삭제에 실패했습니다."
    });
  }
});


// ==================== 모듈 내보내기 ====================

module.exports = router;
