"use strict";

const express = require("express");
const router = express.Router();

const db = require("../db");

const {
  requireLogin
} = require("../middleware/auth");


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
  "thornGloves",
  "immortalMark",
  "goldenRing",
  "guardianAmulet",
  "secondBlade",
  "shiningBlade",
  "pointingFirefly",
  "guidingFirefly",

  // 조건부 특수 아이템
  "berserkerHeart",
  "purityShield",

  // 최상급 비급서
  "supremeHpBook",
  "supremeAtkBook",
  "supremeApBook",

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


// ==================== 획득 가능한 패시브 포인트 ====================

// 200층마다 엘리트 몬스터 4종 등장
// 10층, 50층, 150층, 190층

function getEarnedPassivePoints(clearedFloor) {

  if (

    !Number.isSafeInteger(clearedFloor) ||

    clearedFloor < 0

  ) {

    return 0;

  }

  const cycles = Math.floor(
    clearedFloor / 200
  );

  const remainder = clearedFloor % 200;

  const eliteFloors = [
    10,
    50,
    150,
    190
  ];

  return (

    cycles * 4 +

    eliteFloors.filter(

      floor => floor <= remainder

    ).length

  );

}


// ==================== 최대 체력 계산 ====================

// 클라이언트 state.js의 getMaxHp()와
// 동일한 계산식을 사용해야 함

function getMaxHp(data) {

  let percentHp = 0;


  // ==================== 전사 : 강철의 육체 ====================

  if (data.classKey === "warrior") {

    const level =

      data.passives?.warrior_iron_body ?? 0;

    // 레벨당 최대 생명력 4% 증가

    percentHp += 0.04 * level;

  }


  // ==================== 최상급 생명력 비급서 ====================

  const hpBookCount =

    data.items?.supremeHpBook ?? 0;

  const hpBookValues = [

    0,

    0.8,

    1.6,

    2.4

  ];

  const floorHp = Math.floor(

    data.floor *

    hpBookValues[hpBookCount]

  );


  // ==================== 광기의 가면 ====================

  const madnessMaskCount =

    data.items?.madnessMask ?? 0;

  const madnessMaskValues = [

    0,

    0.12,

    0.24,

    0.36

  ];

  const percentHpPenalty =

    madnessMaskValues[madnessMaskCount];


  // ==================== 최종 최대 체력 ====================

  return Math.max(

    1,

    Math.floor(

      (data.player.base.hp + floorHp) *

      (1 + percentHp) *

      (1 - percentHpPenalty)

    )

  );

}


// ==================== 저장 데이터 유효성 검사 ====================

function isValidSave(data) {

  if (

    !data ||

    typeof data !== "object" ||

    Array.isArray(data)

  ) {

    return invalidSave(
      "저장 데이터 없음"
    );

  }


  // ==================== 저장 버전 검증 ====================

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

    return invalidSave(
      "잘못된 클래스"
    );

  }

  if (!allowedPhases.includes(data.phase)) {

    return invalidSave(

      `잘못된 진행 상태: ${data.phase}`

    );

  }


  // ==================== 층수 검증 ====================

  if (

    !Number.isSafeInteger(data.floor) ||

    data.floor < 1

  ) {

    return invalidSave(
      "잘못된 층수"
    );

  }


  // ==================== 골드 검증 ====================

  if (

    !Number.isSafeInteger(data.gold) ||

    data.gold < 0

  ) {

    return invalidSave(
      "잘못된 골드"
    );

  }


  // ==================== 리롤 횟수 검증 ====================

  if (

    !Number.isSafeInteger(data.rerollCount) ||

    data.rerollCount < 0

  ) {

    return invalidSave(
      "잘못된 리롤 횟수"
    );

  }


  // ==================== 패시브 포인트 검증 ====================

  if (

    !Number.isSafeInteger(data.passivePoints) ||

    data.passivePoints < 0

  ) {

    return invalidSave(
      "잘못된 패시브 포인트"
    );

  }


  // ==================== 패시브 저장 구조 검증 ====================

  if (

    !data.passives ||

    typeof data.passives !== "object" ||

    Array.isArray(data.passives)

  ) {

    return invalidSave(
      "잘못된 패시브 데이터"
    );

  }


  // ==================== 클래스별 패시브 검증 ====================

  const allowedPassives = new Set(

    CLASS_PASSIVES[data.classKey]

  );

  let spentPoints = 0;

  for (

    const [passiveId, level]

    of Object.entries(data.passives)

  ) {


    // 현재 클래스의 패시브인지 확인

    if (!allowedPassives.has(passiveId)) {

      return invalidSave(

        `허용되지 않은 패시브: ${passiveId}`

      );

    }


    // 패시브 레벨 검증

    if (

      !Number.isInteger(level) ||

      level < 1 ||

      level > MAX_PASSIVE_LEVEL

    ) {

      return invalidSave(

        `잘못된 패시브 레벨: ${passiveId}`

      );

    }


    // 사용한 패시브 포인트 계산

    spentPoints += level;

  }


  // ==================== 패시브 포인트 총량 검증 ====================

  // 전투 중에는 현재 층을 아직 클리어하지 않은 상태
  // 보상 및 상점 단계에서는 현재 층 클리어 완료 상태

  const clearedFloor =

    data.phase === "combat"

      ? data.floor - 1

      : data.floor;


  const earnedPoints =

    getEarnedPassivePoints(clearedFloor);


  // 사용한 포인트와 남은 포인트의 합이
  // 획득 가능한 총 포인트와 일치해야 함

  if (

    spentPoints + data.passivePoints !==

    earnedPoints

  ) {

    return invalidSave(

      `패시브 포인트 불일치: ` +

      `사용 ${spentPoints}, ` +

      `보유 ${data.passivePoints}, ` +

      `획득 가능 ${earnedPoints}`

    );

  }


  // ==================== 특수 아이템 검증 ====================

  if (data.items !== undefined) {

    if (

      !data.items ||

      typeof data.items !== "object" ||

      Array.isArray(data.items)

    ) {

      return invalidSave(
        "잘못된 아이템 데이터"
      );

    }


    for (

      const [itemId, count]

      of Object.entries(data.items)

    ) {


      // 아이템 종류 검증

      if (!SPECIAL_ITEM_IDS.has(itemId)) {

        return invalidSave(

          `존재하지 않는 아이템: ${itemId}`

        );

      }


      // 아이템 보유량 검증

      if (

        !Number.isSafeInteger(count) ||

        count < 1 ||

        count > MAX_ITEM_STACK

      ) {

        return invalidSave(

          `잘못된 아이템 개수: ${itemId}`

        );

      }

    }

  }


  // ==================== 플레이어 데이터 검증 ====================

  if (

    !data.player ||

    !data.player.base

  ) {

    return invalidSave(
      "플레이어 데이터 없음"
    );

  }


  // ==================== 플레이어 능력치 검증 ====================

  const stats = [

    "hp",

    "atk",

    "ap",

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


  // ==================== 필수 능력치 검증 ====================

  if (

    data.player.base.hp <= 0 ||

    data.player.base.spd <= 0

  ) {

    return invalidSave(
      "잘못된 기본 HP 또는 SPD"
    );

  }


  // ==================== 플레이어 최대 체력 계산 ====================

  const maxHp = getMaxHp(data);

  if (

    !Number.isFinite(maxHp) ||

    maxHp <= 0

  ) {

    return invalidSave(
      "잘못된 최대 체력"
    );

  }


  // ==================== 플레이어 현재 체력 검증 ====================

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

    return invalidSave(
      "잘못된 몬스터 체력"
    );

  }


  // ==================== 몬스터 공격력 검증 ====================

  if (

    !Number.isFinite(data.enemy.atk) ||

    data.enemy.atk < 0

  ) {

    return invalidSave(
      "잘못된 몬스터 공격력"
    );

  }


  // ==================== 몬스터 공격 속도 검증 ====================

  if (

    !Number.isFinite(data.enemy.spd) ||

    data.enemy.spd <= 0 ||

    data.enemy.spd > 3

  ) {

    return invalidSave(
      "잘못된 몬스터 공격 속도"
    );

  }


  // ==================== 몬스터 치명타 검증 ====================

  if (

    !Number.isFinite(data.enemy.crit) ||

    data.enemy.crit < 0 ||

    data.enemy.crit > 0.5

  ) {

    return invalidSave(
      "잘못된 몬스터 치명타 확률"
    );

  }


  // ==================== 전투 상태 검증 ====================

  // 전투 중에는 몬스터가 살아 있어야 함

  if (

    data.phase === "combat" &&

    data.enemy.currentHp <= 0

  ) {

    return invalidSave(
      "전투 중 몬스터 사망 상태"
    );

  }


  // 보상 및 상점 단계에서는 몬스터가 사망해야 함

  if (

    data.phase !== "combat" &&

    data.enemy.currentHp !== 0

  ) {

    return invalidSave(
      "클리어 후 몬스터 생존 상태"
    );

  }


  // ==================== 보상 데이터 검증 ====================

  if (

    !Array.isArray(data.rewards) ||

    data.rewards.length > 3

  ) {

    return invalidSave(
      "잘못된 보상 목록"
    );

  }


  // 보상 선택 단계에서는 3개의 보상이 필요함

  if (

    data.phase === "reward" &&

    data.rewards.length !== 3

  ) {

    return invalidSave(
      "보상 개수 불일치"
    );

  }


  // ==================== 모든 검증 통과 ====================

  return true;

}


// ==================== 게임 불러오기 ====================

router.get(

  "/api/save",

  requireLogin,

  async (req, res) => {

    try {

      const userId = req.session.user.id;


      // ==================== 저장 데이터 조회 ====================

      const [rows] = await db.execute(

        `
        SELECT save_data, updated_at
        FROM game_saves
        WHERE user_id = ?
        `,

        [userId]

      );

      res.set(
        "Cache-Control",
        "no-store"
      );


      // ==================== 저장 데이터 없음 ====================

      if (rows.length === 0) {

        return res.json({

          success: true,

          save: null

        });

      }


      // ==================== JSON 데이터 변환 ====================

      const row = rows[0];

      const saveData =

        typeof row.save_data === "string"

          ? JSON.parse(row.save_data)

          : row.save_data;


      // ==================== 저장 버전 확인 ====================

      // 이전 버전 데이터는 불러오지 않음
      // 기존 데이터는 DB에서 강제로 삭제하지 않음

      if (!saveData || saveData.version !== SAVE_VERSION) {

        return res.json({

          success: true,

          save: null,

          message:
            "이전 버전의 저장 데이터입니다. " +
            "새로운 도전을 시작해주세요."

        });

      }


      // ==================== 저장 데이터 검증 ====================

      if (!isValidSave(saveData)) {

        return res.json({

          success: true,

          save: null,

          message:
            "호환되지 않는 저장 데이터입니다."

        });

      }


      // ==================== 저장 데이터 반환 ====================

      return res.json({

        success: true,

        save: saveData,

        updatedAt: row.updated_at

      });

    } catch (error) {

      console.error(
        "게임 불러오기 오류:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "게임을 불러오지 못했습니다."

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


      // ==================== 저장 요청 확인 ====================

      console.log(

        `[게임 저장 요청] 사용자: ${userId}`

      );


      // ==================== 저장 데이터 검증 ====================

      if (!isValidSave(data)) {

        return res.status(400).json({

          success: false,

          message:
            "잘못된 저장 데이터입니다."

        });

      }


      // ==================== JSON 변환 ====================

      const saveData = JSON.stringify(data);


      // ==================== 데이터베이스 저장 ====================

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


      // ==================== 저장 성공 로그 ====================

      console.log(

        `[게임 저장 성공] ` +

        `사용자: ${userId}, ` +

        `층수: ${data.floor}, ` +

        `상태: ${data.phase}, ` +

        `버전: ${data.version}`

      );


      // ==================== 저장 결과 반환 ====================

      return res.json({

        success: true,

        message:
          "게임이 저장되었습니다."

      });

    } catch (error) {

      console.error(
        "게임 저장 오류:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "게임을 저장하지 못했습니다."

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


      // ==================== 사용자 진행 데이터 삭제 ====================

      await db.execute(

        `
        DELETE FROM game_saves
        WHERE user_id = ?
        `,

        [userId]

      );


      // ==================== 삭제 성공 로그 ====================

      console.log(

        `[게임 저장 삭제] 사용자: ${userId}`

      );


      // ==================== 삭제 결과 반환 ====================

      return res.json({

        success: true,

        message:
          "저장 데이터가 삭제되었습니다."

      });

    } catch (error) {

      console.error(
        "게임 저장 삭제 오류:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "저장 데이터를 삭제하지 못했습니다."

      });

    }

  }

);


// ==================== 라우터 내보내기 ====================

module.exports = router;
