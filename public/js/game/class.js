"use strict";


// ==================== 초기 설정 ====================

export const INITIAL_STAT_POINTS = 12;

export const MAX_PASSIVE_LEVEL = 3;


// ==================== 클래스 데이터 ====================

export const CLASSES = {

  // ==================== 전사 ====================

  warrior: {

    name: "전사",

    image: "/images/class00.png",

    base: {
      hp: 200,
      atk: 16,
      ap: 10,
      spd: 1.0,
      crit: 0.1
    },

    passives: [

      {
        id: "warrior_iron_body",
        name: "강철의 육체",
        desc: "레벨당 최대 생명력 4% 증가",

        effects: [
          {
            type: "percentHp",
            amount: 0.04
          }
        ]
      },

      {
        id: "warrior_retribution",
        name: "응징",
        desc: "피격 시 최대 생명력과 주문력에 비례하는 반격 피해",

        effects: [
          {
            type: "counterHpRatio",
            amount: 0.005
          },
          {
            type: "counterApRatio",
            amount: 0.1
          }
        ]
      },

      {
        id: "warrior_indomitable",
        name: "불굴의 의지",
        desc: "주문력에 비례하여 받는 피해 감소",

        effects: [
          {
            type: "apDamageReduction",
            amount: 0.1
          }
        ]
      },

      {
        id: "warrior_berserk",
        name: "광전사의 투지",
        desc: "저체력 상태에서 공격력 증가 및 받는 피해 감소",

        effects: [
          {
            type: "lowHpAtkBonus",
            amount: 0.05
          },
          {
            type: "lowHpDamageReduction",
            amount: 0.03
          }
        ]
      },

      {
        id: "warrior_last_strike",
        name: "최후의 일격",
        desc: "저체력 상태에서 공격력에 비례하는 추가 피해",

        effects: [
          {
            type: "lowHpExtraDamage",
            amount: 0.1
          }
        ]
      }

    ]

  },


  // ==================== 도적 ====================

  rogue: {

    name: "도적",

    image: "/images/class01.png",

    base: {
      hp: 120,
      atk: 20,
      ap: 10,
      spd: 1.4,
      crit: 0.1
    },

    passives: [

      {
        id: "rogue_mastery",
        name: "전투 숙련",
        desc: "레벨당 공격력 4% 증가",

        effects: [
          {
            type: "percentAtk",
            amount: 0.04
          }
        ]
      },

      {
        id: "rogue_swiftness",
        name: "신속",
        desc: "레벨당 공격 속도 0.1 증가",

        effects: [
          {
            type: "flatSpd",
            amount: 0.1
          }
        ]
      },

      {
        id: "rogue_double_strike",
        name: "연격",
        desc: "레벨당 5%p 확률로 추가 공격",

        effects: [
          {
            type: "extraAttackChance",
            amount: 0.05
          }
        ]
      },

      {
        id: "rogue_weakness",
        name: "급소 포착",
        desc: "주문력에 비례하여 치명타 확률 증가",

        effects: [
          {
            type: "apCritBonus",
            amount: 0.1
          }
        ]
      },

      {
        id: "rogue_assassination",
        name: "암살",
        desc: "레벨당 치명타 피해 배율 0.1 증가",

        effects: [
          {
            type: "critDamageBonus",
            amount: 0.1
          }
        ]
      }

    ]

  },


  // ==================== 마법사 ====================

  mage: {

    name: "마법사",

    image: "/images/class02.png",

    base: {
      hp: 100,
      atk: 10,
      ap: 30,
      spd: 0.9,
      crit: 0.16
    },

    passives: [

      {
        id: "mage_amplification",
        name: "마력 증폭",
        desc: "레벨당 주문력 4% 증가",

        effects: [
          {
            type: "percentAp",
            amount: 0.04
          }
        ]
      },

      {
        id: "mage_enhancement",
        name: "마력 강화",
        desc: "레벨당 공격력 4% 증가",

        effects: [
          {
            type: "percentAtk",
            amount: 0.04
          }
        ]
      },

      {
        id: "mage_conversion",
        name: "마력 전환",
        desc: "레벨당 공격력의 10%만큼 주문력 증가",

        effects: [
          {
            type: "atkToApRatio",
            amount: 0.1
          }
        ]
      },

      {
        id: "mage_circulation",
        name: "마력 순환",
        desc: "주문력에 비례하여 공격 속도 증가",

        effects: [
          {
            type: "apSpdBonus",
            amount: 0.1
          }
        ]
      },

      {
        id: "mage_magic_burst",
        name: "마력 폭발",
        desc: "공격 시 레벨당 주문력의 10%만큼 추가 피해",

        effects: [
          {
            type: "attackApRatio",
            amount: 0.1
          }
        ]
      }

    ]

  }

};


// ==================== 클래스 조회 ====================

export function getClass(classKey) {

  if (!Object.hasOwn(CLASSES, classKey)) {

    throw new Error(
      "존재하지 않는 클래스입니다."
    );

  }

  return CLASSES[classKey];

}


// ==================== 무작위 능력치 배분 ====================

export function randomStats() {

  const points = INITIAL_STAT_POINTS;

  const statTypes = [
    "hp",
    "atk",
    "ap"
  ];

  const result = {
    hp: 0,
    atk: 0,
    ap: 0
  };

  for (let i = 0; i < points; i++) {

    const index = Math.floor(
      Math.random() * statTypes.length
    );

    const stat = statTypes[index];

    result[stat]++;

  }

  return {
    hp: result.hp * 10,
    atk: result.atk,
    ap: result.ap
  };

}


// ==================== 플레이어 생성 ====================

export function createPlayer(classKey) {

  const classData = getClass(classKey);

  const roll = randomStats();

  const base = {

    ...classData.base,

    hp: classData.base.hp + roll.hp,

    atk: classData.base.atk + roll.atk,

    ap: classData.base.ap + roll.ap

  };

  return {
    base,
    hp: base.hp,
    roll
  };

}


// ==================== 패시브 목록 조회 ====================

export function getPassives(classKey) {

  return getClass(classKey).passives;

}


// ==================== 개별 패시브 조회 ====================

export function getPassive(classKey, passiveId) {

  const passives = getPassives(classKey);

  return passives.find(
    passive => passive.id === passiveId
  ) || null;

}


// ==================== 패시브 레벨 조회 ====================

export function getPassiveLevel(
  ownedPassives = {},
  passiveId
) {

  const level = ownedPassives?.[passiveId] ?? 0;

  if (!Number.isInteger(level)) {

    return 0;

  }

  return Math.max(
    0,
    Math.min(MAX_PASSIVE_LEVEL, level)
  );

}


// ==================== 초기 패시브 효과 ====================

export function createPassiveEffects() {

  return {

    // 공통 능력치

    percentHp: 0,

    percentAtk: 0,

    percentAp: 0,


    // 전사

    counterHpRatio: 0,

    counterApRatio: 0,

    apDamageReduction: 0,

    lowHpAtkBonus: 0,

    lowHpDamageReduction: 0,

    lowHpExtraDamage: 0,


    // 도적

    flatSpd: 0,

    extraAttackChance: 0,

    apCritBonus: 0,

    critDamageBonus: 0,


    // 마법사

    atkToApRatio: 0,

    apSpdBonus: 0,

    attackApRatio: 0

  };

}


// ==================== 전체 패시브 효과 계산 ====================

export function getPassiveEffects(
  classKey,
  ownedPassives = {}
) {

  const effects = createPassiveEffects();

  if (
    !classKey ||
    !Object.hasOwn(CLASSES, classKey) ||
    !ownedPassives ||
    typeof ownedPassives !== "object" ||
    Array.isArray(ownedPassives)
  ) {

    return effects;

  }

  const passives = getPassives(classKey);

  for (const passive of passives) {

    const level = getPassiveLevel(
      ownedPassives,
      passive.id
    );

    if (level === 0) {

      continue;

    }

    for (const effect of passive.effects) {

      if (!Object.hasOwn(effects, effect.type)) {

        continue;

      }

      effects[effect.type] += effect.amount * level;

    }

  }

  return effects;

}
