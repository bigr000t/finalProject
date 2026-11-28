"use strict";

const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();


// ==================== 저장 설정 ====================

const SAVE_VERSION = 3;
const MAX_PASSIVE_LEVEL = 3;
const MAX_ITEM_STACK = 3;


// ==================== 클래스별 패시브 ====================

const CLASS_PASSIVES = {
  warrior: [
    "warrior_iron_body",
    "warrior_retribution",
    "warrior_indomitable",
    "warrior_berserk",
    "warrior_last_strike"
  ],

  rogue: [
    "rogue_mastery",
    "rogue_swiftness",
    "rogue_double_strike",
    "rogue_weakness",
    "rogue_assassination"
  ],

  mage: [
    "mage_amplification",
    "mage_enhancement",
    "mage_conversion",
    "mage_circulation",
    "mage_magic_burst"
  ]
};


// ==================== 특수 아이템 목록 ====================

const SPECIAL_ITEM_IDS = new Set([
  // 기본 특수 아이템
  "vampireRing",
  "guardianAmulet",
  "thornGloves",
  "immortalMark",
  "goldenRing",
  "secondBlade",
  "thirdBlade",
  "shiningBlade",
  "pointingFirefly",
  "guidingFirefly",
  "precisionHornet",
  "crystalHeart",

  // 조건부 특수 아이템
  "berserkerHeart",
  "purityShield",
  "huntingHornet",
  "guardianCloak",

  // 최상급 비급서
  "supremeHpBook",
  "supremeAtkBook",
  "supremeApBook",

  // 파밍 및 경제 특수 아이템
  "luckyDice",
  "blessedChalice",

  // 능력치 교환 특수 아이템
  "heavyArmor",
  "blindSword",
  "madnessMask",
  "brokenMagicSword",
  "recklessBlade",
  "forbiddenGrimoire",
  "bloodthirstySword",

  // 특수 성장 아이템
  "arroganceCrown"
]);


// ==================== 공통 검증 함수 ====================

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function invalidSave(reason) {
  console.warn(`[게임 저장 거부] ${reason}`);
  return false;
}


// ==================== 관리자 저장 비활성화 ====================

function skipAdminSave(req, res, next) {
  if (req.authUser.role !== "admin") {
    return next();
  }

  res.set("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.json({
      success: true,
      save: null,
      skipped: true
    });
  }

  if (req.method === "POST") {
    return res.json({
      success: true,
      saved: false,
      skipped: true,
      message: "관리자 계정은 게임을 저장하지 않습니다."
    });
  }

  return res.json({
    success: true,
    deleted: false,
    skipped: true,
    message: "관리자 계정의 저장 데이터는 변경하지 않습니다."
  });
}


// ==================== 획득 가능한 패시브 포인트 ====================

function getEarnedPassivePoints(clearedFloor) {
  if (!isNonNegativeInteger(clearedFloor)) {
    return 0;
  }

  const cycles = Math.floor(clearedFloor / 200);
  const remainder = clearedFloor % 200;
  const eliteFloors = [10, 50, 150, 190];

  return (
    cycles * 4 +
    eliteFloors.filter(floor => floor <= remainder).length
  );
}


// ==================== 아이템 보유 개수 ====================

function getItemCount(items, itemId) {
  if (!SPECIAL_ITEM_IDS.has(itemId)) {
    return 0;
  }

  const count = items?.[itemId] ?? 0;

  if (!Number.isSafeInteger(count)) {
    return 0;
  }

  return Math.min(
    MAX_ITEM_STACK,
    Math.max(0, count)
  );
}


// ==================== 특수 아이템 검증 ====================

function isValidItems(items) {
  if (!isObject(items)) {
    return false;
  }

  for (const [id, count] of Object.entries(items)) {
    if (!SPECIAL_ITEM_IDS.has(id)) {
      return false;
    }

    if (
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > MAX_ITEM_STACK
    ) {
      return false;
    }

    // 오만의 왕관은 항상 최대 중첩
    if (
      id === "arroganceCrown" &&
      count !== MAX_ITEM_STACK
    ) {
      return false;
    }
  }

  return true;
}


// ==================== 최대 생명력 계산 ====================

// 클라이언트 state.js의 getMaxHp()와 동일한 공식

function getMaxHp(data) {
  const items = data.items ?? {};
  const passives = data.passives ?? {};

  let passivePercentHp = 0;
  let itemPercentHp = 0;
  let itemPercentHpPenalty = 0;
  let floorBonusHp = 0;
  let crownPrimary = 1;


  // ==================== 강철의 육체 ====================

  if (data.classKey === "warrior") {
    passivePercentHp +=
      0.03 * (passives.warrior_iron_body ?? 0);
  }


  // ==================== 오만의 왕관 ====================

  const crownActive =
    getItemCount(items, "arroganceCrown") > 0;

  if (crownActive) {
    let disabledItemCount = 0;

    for (const id of SPECIAL_ITEM_IDS) {
      if (id === "arroganceCrown") {
        continue;
      }

      disabledItemCount += getItemCount(items, id);
    }

    crownPrimary =
      1.16 + disabledItemCount * 0.04;

  } else {


    // ==================== 크리스탈 하트 ====================

    const crystalHeartValues = [
      0, 0.06, 0.12, 0.18
    ];

    itemPercentHp += crystalHeartValues[
      getItemCount(items, "crystalHeart")
    ];


    // ==================== 무거운 갑주 ====================

    const heavyArmorValues = [
      0, 0.18, 0.36, 0.54
    ];

    itemPercentHp += heavyArmorValues[
      getItemCount(items, "heavyArmor")
    ];


    // ==================== 최상급 생명력 비급서 ====================

    const hpBookValues = [
      0, 0.30, 0.60, 0.90
    ];

    floorBonusHp = Math.floor(
      data.floor *
      hpBookValues[
        getItemCount(items, "supremeHpBook")
      ] +
      1e-9
    );


    // ==================== 최대 생명력 감소 아이템 ====================

    const hpPenaltyValues = [
      0, 0.125, 0.25, 0.375
    ];

    const penaltyItems = [
      "madnessMask",
      "forbiddenGrimoire",
      "bloodthirstySword"
    ];

    for (const id of penaltyItems) {
      itemPercentHpPenalty += hpPenaltyValues[
        getItemCount(items, id)
      ];
    }
  }


  // ==================== 최대 생명력 증감 합연산 ====================

  const hpMultiplier =
    1 +
    passivePercentHp +
    itemPercentHp -
    itemPercentHpPenalty;

  // 최대 생명력 소진
  if (hpMultiplier <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (data.player.base.hp + floorBonusHp) *
      hpMultiplier *
      crownPrimary +
      1e-9
    )
  );
}


// ==================== 리더보드 스냅샷 검증 ====================

function isValidLeaderboardSnapshot(snapshot, data) {

  // 이전 저장 데이터 호환
  if (snapshot === undefined || snapshot === null) {
    return true;
  }

  if (!isObject(snapshot)) {
    return false;
  }

  if (snapshot.classKey !== data.classKey) {
    return false;
  }

  const clearedFloor =
    data.phase === "combat"
      ? data.floor - 1
      : data.floor;

  if (
    !Number.isSafeInteger(snapshot.floor) ||
    snapshot.floor < 1 ||
    snapshot.floor !== clearedFloor
  ) {
    return false;
  }

  const build = snapshot.build;

  if (
    !isObject(build) ||
    !isObject(build.final_stats) ||
    !Array.isArray(build.special_items) ||
    !Array.isArray(build.passives)
  ) {
    return false;
  }


  // ==================== 최종 능력치 ====================

  const statKeys = [
    "maxHp",
    "atk",
    "ap",
    "spd",
    "crit",
    "critDamage"
  ];

  for (const key of statKeys) {
    const value = build.final_stats[key];

    if (!Number.isFinite(value) || value < 0) {
      return false;
    }
  }

  if (
    build.final_stats.maxHp <= 0 ||
    build.final_stats.spd < 0.1 ||
    build.final_stats.crit > 100
  ) {
    return false;
  }


  // ==================== 특수 아이템 ====================

  if (build.special_items.length > SPECIAL_ITEM_IDS.size) {
    return false;
  }

  const ownedItems = new Set();

  for (const item of build.special_items) {
    if (!isObject(item)) {
      return false;
    }

    if (
      !SPECIAL_ITEM_IDS.has(item.id) ||
      ownedItems.has(item.id)
    ) {
      return false;
    }

    if (
      typeof item.name !== "string" ||
      item.name.length === 0 ||
      item.name.length > 100
    ) {
      return false;
    }

    if (
      !Number.isSafeInteger(item.count) ||
      item.count < 1 ||
      item.count > MAX_ITEM_STACK
    ) {
      return false;
    }

    if (
      item.id === "arroganceCrown" &&
      item.count !== MAX_ITEM_STACK
    ) {
      return false;
    }

    ownedItems.add(item.id);
  }


  // ==================== 패시브 ====================

  const allowedPassives = new Set(
    CLASS_PASSIVES[data.classKey]
  );

  if (build.passives.length > allowedPassives.size) {
    return false;
  }

  const ownedPassives = new Set();
  let spentPoints = 0;

  for (const passive of build.passives) {
    if (!isObject(passive)) {
      return false;
    }

    if (
      !allowedPassives.has(passive.id) ||
      ownedPassives.has(passive.id)
    ) {
      return false;
    }

    if (
      typeof passive.name !== "string" ||
      passive.name.length === 0 ||
      passive.name.length > 100
    ) {
      return false;
    }

    if (
      !Number.isInteger(passive.level) ||
      passive.level < 1 ||
      passive.level > MAX_PASSIVE_LEVEL
    ) {
      return false;
    }

    ownedPassives.add(passive.id);

    spentPoints += passive.level;
  }

  if (
    spentPoints >
    getEarnedPassivePoints(snapshot.floor)
  ) {
    return false;
  }

  return true;
}


// ==================== 저장 데이터 유효성 검사 ====================

function isValidSave(data) {
  if (!isObject(data)) {
    return invalidSave("저장 데이터 없음");
  }


  // ==================== 저장 버전 ====================

  if (data.version !== SAVE_VERSION) {
    return invalidSave(
      `저장 버전 불일치: ${data.version}`
    );
  }


  // ==================== 클래스 및 진행 상태 ====================

  if (!Object.hasOwn(CLASS_PASSIVES, data.classKey)) {
    return invalidSave("잘못된 클래스");
  }

  const allowedPhases = [
    "combat",
    "reward",
    "shop"
  ];

  if (!allowedPhases.includes(data.phase)) {
    return invalidSave(
      `잘못된 진행 상태: ${data.phase}`
    );
  }


  // ==================== 기본 진행 데이터 ====================

  if (
    !Number.isSafeInteger(data.floor) ||
    data.floor < 1
  ) {
    return invalidSave("잘못된 층수");
  }

  if (!isNonNegativeInteger(data.gold)) {
    return invalidSave("잘못된 골드");
  }

  if (!isNonNegativeInteger(data.rerollCount)) {
    return invalidSave("잘못된 리롤 횟수");
  }

  if (!isNonNegativeInteger(data.passivePoints)) {
    return invalidSave("잘못된 패시브 포인트");
  }


  // ==================== 패시브 검증 ====================

  if (!isObject(data.passives)) {
    return invalidSave("잘못된 패시브 데이터");
  }

  const allowedPassives = new Set(
    CLASS_PASSIVES[data.classKey]
  );

  let spentPoints = 0;

  for (const [id, level] of Object.entries(data.passives)) {
    if (!allowedPassives.has(id)) {
      return invalidSave(
        `허용되지 않은 패시브: ${id}`
      );
    }

    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > MAX_PASSIVE_LEVEL
    ) {
      return invalidSave(
        `잘못된 패시브 레벨: ${id}`
      );
    }

    spentPoints += level;
  }


  // ==================== 패시브 포인트 총량 ====================

  const clearedFloor =
    data.phase === "combat"
      ? data.floor - 1
      : data.floor;

  const earnedPoints =
    getEarnedPassivePoints(clearedFloor);

  if (
    spentPoints + data.passivePoints !== earnedPoints
  ) {
    return invalidSave(
      `패시브 포인트 불일치: ` +
      `사용 ${spentPoints}, ` +
      `보유 ${data.passivePoints}, ` +
      `획득 가능 ${earnedPoints}`
    );
  }


  // ==================== 특수 아이템 ====================

  if (
    data.items !== undefined &&
    !isValidItems(data.items)
  ) {
    return invalidSave("잘못된 특수 아이템 데이터");
  }


  // ==================== 플레이어 데이터 ====================

  if (
    !isObject(data.player) ||
    !isObject(data.player.base)
  ) {
    return invalidSave("플레이어 데이터 없음");
  }

  const stats = [
    "hp",
    "atk",
    "ap",
    "spd",
    "crit"
  ];

  for (const stat of stats) {
    const value = data.player.base[stat];

    if (!Number.isFinite(value) || value < 0) {
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


  // ==================== 플레이어 최대 생명력 ====================

  const maxHp = getMaxHp(data);

  if (
    !Number.isFinite(maxHp) ||
    maxHp <= 0
  ) {
    return invalidSave("잘못된 최대 생명력");
  }

  if (
    !Number.isFinite(data.player.hp) ||
    data.player.hp <= 0 ||
    data.player.hp > maxHp
  ) {
    return invalidSave(
      `잘못된 현재 생명력: ${data.player.hp}/${maxHp}`
    );
  }


  // ==================== 몬스터 데이터 ====================

  if (
    !isObject(data.enemy) ||
    !Number.isFinite(data.enemy.maxHp) ||
    !Number.isFinite(data.enemy.currentHp) ||
    data.enemy.maxHp <= 0 ||
    data.enemy.currentHp < 0 ||
    data.enemy.currentHp > data.enemy.maxHp
  ) {
    return invalidSave("잘못된 몬스터 생명력");
  }

  if (
    !Number.isFinite(data.enemy.atk) ||
    data.enemy.atk < 0
  ) {
    return invalidSave("잘못된 몬스터 공격력");
  }

  if (
    !Number.isFinite(data.enemy.spd) ||
    data.enemy.spd <= 0 ||
    data.enemy.spd > 3
  ) {
    return invalidSave("잘못된 몬스터 공격 속도");
  }

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


  // ==================== 보상 데이터 ====================

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


  // ==================== 리더보드 스냅샷 ====================

  if (
    !isValidLeaderboardSnapshot(
      data.leaderboardSnapshot,
      data
    )
  ) {
    return invalidSave("잘못된 리더보드 스냅샷");
  }

  return true;
}


// ==================== 게임 불러오기 ====================

router.get(
  "/api/save",
  requireLogin,
  skipAdminSave,

  async (req, res) => {
    try {
      const userId = req.authUser.id;

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

      const saveData =
        typeof row.save_data === "string"
          ? JSON.parse(row.save_data)
          : row.save_data;


      // 저장 버전 확인
      if (!saveData || saveData.version !== SAVE_VERSION) {
        return res.json({
          success: true,
          save: null,
          message:
            "이전 버전의 저장 데이터입니다. " +
            "새로운 도전을 시작해주세요."
        });
      }


      // 저장 데이터 검증
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
  skipAdminSave,

  async (req, res) => {
    try {
      const userId = req.authUser.id;
      const data = req.body;

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
        `상태: ${data.phase}, ` +
        `버전: ${data.version}`
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
  skipAdminSave,

  async (req, res) => {
    try {
      const userId = req.authUser.id;

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
      console.error("게임 저장 삭제 오류:", error);

      return res.status(500).json({
        success: false,
        message: "저장 데이터를 삭제하지 못했습니다."
      });
    }
  }
);


// ==================== 라우터 내보내기 ====================

module.exports = router;
