"use strict";

const express = require("express");
const router = express.Router();

const db = require("../db");

const {
  requireLogin
} = require("../middleware/auth");


// ==================== 저장 설정 ====================

const SAVE_VERSION = 2;


// ==================== 클래스별 패시브 ====================

const CLASS_PASSIVES = {

  warrior: [
    "warrior_iron_body",
    "warrior_retribution",
    "warrior_indomitable"
  ],

  rogue: [
    "rogue_swiftness",
    "rogue_mastery",
    "rogue_double_strike"
  ],

  mage: [
    "mage_concentration",
    "mage_amplification",
    "mage_magic_burst"
  ]

};


// ==================== 특수 아이템 목록 ====================

const SPECIAL_ITEM_IDS = new Set([

  // 기존 특수 아이템
  "vampireRing",
  "thornGloves",
  "immortalMark",
  "goldenRing",
  "guardianAmulet",
  "secondBlade",
  "shiningBlade",
  "pointingFirefly",
  "guidingFirefly",

  // 신규 조건부 특수 아이템
  "berserkerHeart",
  "purityShield",

  // 최상급 비급서
  "supremeHpBook",
  "supremeAtkBook",
  "supremeDefBook",

  // 파밍 특수 아이템
  "luckyDice",

  // 능력치 교환형 특수 아이템
  "heavyArmor",
  "blindSword",
  "madnessMask"

]);


// ==================== 저장 검증 실패 ====================

function invalidSave(reason) {

  console.warn(
    `[게임 저장 거부] ${reason}`
  );

  return false;

}


// ==================== 최대 체력 계산 ====================

function getMaxHp(data) {

  let percentHp = 0;

  const ownedIds = new Set(

    data.passives.map(
      passive => passive.id
    )

  );


  // ==================== 전사 패시브 ====================

    //최대 체력 4% 증가
  if (
    data.classKey === "warrior" &&
    ownedIds.has("warrior_iron_body")
  ) {

    percentHp += 0.04;

  }


  // ==================== 도적 패시브 ====================

  // 최대 체력 3% 증가
  if (
    data.classKey === "rogue" &&
    ownedIds.has("rogue_mastery")
  ) {

    percentHp += 0.03;

  }


  // ==================== 최상급 생명력 비급서 ====================

  const hpBookCount =
    data.items?.supremeHpBook ?? 0;

  const hpBookValues = [

    0,
    0.4,
    0.8,
    1.2

  ];

  const floorHp = Math.floor(

    data.floor *
    hpBookValues[hpBookCount]

  );


  // ==================== 최종 최대 체력 ====================

  return Math.max(

    1,

    Math.floor(

      (data.player.base.hp + floorHp) *

      (1 + percentHp)

    )

  );

}

// ==================== 이전 전사 패시브 호환 ====================

function migrateWarriorPassives(data) {

  if (
    !data ||
    data.version !== SAVE_VERSION ||
    data.classKey !== "warrior" ||
    !Array.isArray(data.passives)
  ) {
    return data;
  }

  const migration = {

    warrior_iron_skin: {
      id: "warrior_iron_body",
      name: "강철의 육체"
    },

    warrior_vitality: {
      id: "warrior_retribution",
      name: "응징"
    }

  };

  const needsMigration = data.passives.some(
    passive =>
      passive &&
      Object.hasOwn(migration, passive.id)
  );

  if (!needsMigration) {
    return data;
  }

  data.passives = data.passives.map(passive => {

    if (
      passive &&
      Object.hasOwn(migration, passive.id)
    ) {
      return { ...migration[passive.id] };
    }

    return passive;

  });

  // 최대 체력 감소에 따른 현재 체력 보정

  if (
    data.player?.base &&
    Number.isFinite(data.player.hp) &&
    data.passives.every(
      passive => passive && typeof passive === "object"
    )
  ) {

    const maxHp = getMaxHp(data);

    if (Number.isFinite(maxHp)) {

      data.player.hp = Math.min(
        data.player.hp,
        maxHp
      );

    }

  }

  return data;

}

// ==================== 저장 데이터 유효성 검사 ====================

function isValidSave(data) {

  if (!data || typeof data !== "object") {
    return invalidSave("저장 데이터 없음");
  }

  // 저장 버전 확인
  if (data.version !== SAVE_VERSION) {
    return invalidSave(
      `저장 버전 불일치: ${data.version}`
    );
  }


  // ==================== 클래스 및 진행 상태 ====================

  const allowedClasses = [
    "warrior",
    "rogue",
    "mage"
  ];

  const allowedPhases = [
    "combat",
    "reward",
    "shop"
  ];

  if (!allowedClasses.includes(data.classKey)) {
    return invalidSave("잘못된 클래스");
  }

  if (!allowedPhases.includes(data.phase)) {
    return invalidSave(
      `잘못된 진행 상태: ${data.phase}`
    );
  }


  // ==================== 층수 검증 ====================

  // 무한 등반이므로 200층 제한 제거
  if (
    !Number.isSafeInteger(data.floor) ||
    data.floor < 1
  ) {
    return invalidSave("잘못된 층수");
  }


  // ==================== 골드 검증 ====================

  if (
    !Number.isSafeInteger(data.gold) ||
    data.gold < 0
  ) {
    return invalidSave("잘못된 골드");
  }


  // ==================== 리롤 횟수 검증 ====================

  if (
    !Number.isSafeInteger(data.rerollCount) ||
    data.rerollCount < 0
  ) {
    return invalidSave("잘못된 리롤 횟수");
  }


  // ==================== 패시브 검증 ====================

  if (
    !Array.isArray(data.passives) ||
    data.passives.length > 3
  ) {
    return invalidSave("잘못된 패시브 목록");
  }

  const allowedPassives = new Set(
    CLASS_PASSIVES[data.classKey]
  );

  const ownedPassives = new Set();

  for (const passive of data.passives) {

    if (
      !passive ||
      typeof passive !== "object"
    ) {
      return invalidSave("잘못된 패시브 데이터");
    }

    if (!allowedPassives.has(passive.id)) {

      return invalidSave(
        `허용되지 않은 패시브: ${passive.id}`
      );

    }

    if (ownedPassives.has(passive.id)) {

      return invalidSave(
        `중복 패시브: ${passive.id}`
      );

    }

    ownedPassives.add(passive.id);

  }


  // ==================== 특수 아이템 검증 ====================

  if (data.items !== undefined) {

    if (
      !data.items ||
      typeof data.items !== "object" ||
      Array.isArray(data.items)
    ) {
      return invalidSave("잘못된 아이템 데이터");
    }

    for (
      const [itemId, count]
      of Object.entries(data.items)
    ) {

      if (!SPECIAL_ITEM_IDS.has(itemId)) {

        return invalidSave(
          `존재하지 않는 아이템: ${itemId}`
        );

      }

      if (
        !Number.isSafeInteger(count) ||
        count < 1 ||
        count > 3
      ) {

        return invalidSave(
          `잘못된 아이템 개수: ${itemId}`
        );

      }

    }

  }


  // ==================== 플레이어 데이터 검증 ====================

  if (!data.player || !data.player.base) {
    return invalidSave("플레이어 데이터 없음");
  }

  const stats = [
    "hp",
    "atk",
    "def",
    "spd",
    "crit"
  ];

  for (const stat of stats) {

    if (
      !Number.isFinite(data.player.base[stat]) ||
      data.player.base[stat] < 0
    ) {

      return invalidSave(
        `잘못된 플레이어 능력치: ${stat}`
      );

    }

  }

  if (
    data.player.base.hp <= 0 ||
    data.player.base.spd <= 0
  ) {
    return invalidSave("잘못된 기본 HP 또는 SPD");
  }


  // ==================== 플레이어 체력 검증 ====================

  const maxHp = getMaxHp(data);

  if (
    !Number.isFinite(data.player.hp) ||
    data.player.hp <= 0 ||
    data.player.hp > maxHp
  ) {

    return invalidSave(

      `잘못된 현재 체력: ` +
      `${data.player.hp}/${maxHp}`

    );

  }


  // ==================== 몬스터 체력 검증 ====================

  if (
    !data.enemy ||
    !Number.isFinite(data.enemy.maxHp) ||
    !Number.isFinite(data.enemy.currentHp) ||
    data.enemy.maxHp <= 0 ||
    data.enemy.currentHp < 0 ||
    data.enemy.currentHp > data.enemy.maxHp
  ) {
    return invalidSave("잘못된 몬스터 체력");
  }


  // ==================== 몬스터 공격력 검증 ====================

  if (
    !Number.isFinite(data.enemy.atk) ||
    data.enemy.atk < 0
  ) {
    return invalidSave("잘못된 몬스터 공격력");
  }


  // ==================== 몬스터 방어력 검증 ====================

  if (
    !Number.isFinite(data.enemy.def) ||
    data.enemy.def < 0
  ) {
    return invalidSave("잘못된 몬스터 방어력");
  }


  // ==================== 몬스터 공격 속도 검증 ====================

  if (
    !Number.isFinite(data.enemy.spd) ||
    data.enemy.spd <= 0 ||
    data.enemy.spd > 3
  ) {
    return invalidSave("잘못된 몬스터 공격 속도");
  }


  // ==================== 몬스터 치명타 검증 ====================

  if (
    !Number.isFinite(data.enemy.crit) ||
    data.enemy.crit < 0 ||
    data.enemy.crit > 0.5
  ) {
    return invalidSave("잘못된 몬스터 치명타 확률");
  }


  // ==================== 전투 상태 검증 ====================

  if (
    data.phase === "combat" &&
    data.enemy.currentHp <= 0
  ) {
    return invalidSave("전투 중 몬스터 사망 상태");
  }

  if (
    data.phase !== "combat" &&
    data.enemy.currentHp !== 0
  ) {
    return invalidSave("클리어 후 몬스터 생존 상태");
  }


  // ==================== 보상 데이터 검증 ====================

  if (
    !Array.isArray(data.rewards) ||
    data.rewards.length > 3
  ) {
    return invalidSave("잘못된 보상 목록");
  }

  if (
    data.phase === "reward" &&
    data.rewards.length !== 3
  ) {
    return invalidSave("보상 개수 불일치");
  }


  // ==================== 검증 완료 ====================

  return true;

}


// ==================== 게임 불러오기 ====================

router.get(
  "/api/save",
  requireLogin,
  async (req, res) => {

    try {

      const userId = req.session.user.id;

      const [rows] = await db.execute(
        `
        SELECT save_data, updated_at
        FROM game_saves
        WHERE user_id = ?
        `,
        [userId]
      );

      res.set("Cache-Control", "no-store");

      if (rows.length === 0) {

        return res.json({
          success: true,
          save: null
        });

      }

      const row = rows[0];

      const saveData = migrateWarriorPassives(

        typeof row.save_data === "string"
          ? JSON.parse(row.save_data)
          : row.save_data

      );
      // 이전 버전의 저장 데이터는 불러오지 않음
      if (!isValidSave(saveData)) {

        return res.json({

          success: true,

          save: null,

          message: "호환되지 않는 저장 데이터입니다."

        });

      }


      return res.json({

        success: true,

        save: saveData,

        updatedAt: row.updated_at

      });

    } catch (error) {

      console.error("게임 불러오기 오류:", error);

      return res.status(500).json({

        success: false,

        message: "게임을 불러오지 못했습니다."

      });

    }

  }
);


// ==================== 게임 저장 ====================

router.post(
  "/api/save",
  requireLogin,
  async (req, res) => {

    try {

      const userId = req.session.user.id;

      const data = req.body;


      // 저장 요청 확인
      console.log(
        `[게임 저장 요청] 사용자: ${userId}`
      );


      if (!isValidSave(data)) {

        return res.status(400).json({

          success: false,

          message: "잘못된 저장 데이터입니다."

        });

      }

      const saveData = JSON.stringify(data);


      await db.execute(
        `
        INSERT INTO game_saves (
          user_id,
          save_data
        )
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          save_data = ?,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          userId,
          saveData,
          saveData
        ]
      );


      console.log(

        `[게임 저장 성공] ` +
        `사용자: ${userId}, ` +
        `층수: ${data.floor}, ` +
        `상태: ${data.phase}`

      );


      return res.json({

        success: true,

        message: "게임이 저장되었습니다."

      });

    } catch (error) {

      console.error("게임 저장 오류:", error);

      return res.status(500).json({

        success: false,

        message: "게임을 저장하지 못했습니다."

      });

    }

  }
);


// ==================== 저장 데이터 삭제 ====================

router.delete(
  "/api/save",
  requireLogin,
  async (req, res) => {

    try {

      const userId = req.session.user.id;

      await db.execute(
        `
        DELETE FROM game_saves
        WHERE user_id = ?
        `,
        [userId]
      );

      console.log(
        `[게임 저장 삭제] 사용자: ${userId}`
      );

      return res.json({

        success: true,

        message: "저장 데이터가 삭제되었습니다."

      });

    } catch (error) {

      console.error("저장 데이터 삭제 오류:", error);

      return res.status(500).json({

        success: false,

        message: "저장 데이터를 삭제하지 못했습니다."

      });

    }

  }
);


module.exports = router;