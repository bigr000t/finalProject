"use strict";


// ==================== 초기 능력치 설정 ====================

export const INITIAL_STAT_POINTS = 12;


// ==================== 패시브 가격 설정 ====================

export const PASSIVE_COSTS = {

  tier1: 1600,

  tier2: 4800,

  tier3: 24000

};


// ==================== 클래스 데이터 ====================

export const CLASSES = {

  // ==================== 전사 ====================

  warrior: {

    name: "전사",

    image: "/images/class00.png",

    base: {
      hp: 150,
      atk: 16,
      def: 18,
      spd: 1.0,
      crit: 0.1
    },

    passives: [

      {
        id: "warrior_iron_body",

        name: "강철의 육체",

        cost: PASSIVE_COSTS.tier1,

        desc: "최대 체력 6%, 총 방어력 6% 증가",

        effects: [
          {
            type: "percentHp",
            amount: 0.06
          },
          {
            type: "percentDef",
            amount: 0.06
          }
        ]
      },

      {
        id: "warrior_retribution",

        name: "응징",

        cost: PASSIVE_COSTS.tier2,

        desc:
          "피격 시 최대 체력의 3%와 " +
          "최종 방어력의 15%만큼 고정 피해",

        effects: [
          {
            type: "counterHpRatio",
            amount: 0.03
          },
          {
            type: "counterDefRatio",
            amount: 0.15
          }
        ]
      },

      {
        id: "warrior_indomitable",

        name: "불굴의 의지",

        cost: PASSIVE_COSTS.tier3,

        desc: "받는 모든 공격 피해 16% 감소",

        effects: [
          {
            type: "damageReduction",
            amount: 0.16
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
      hp: 85,
      atk: 20,
      def: 10,
      spd: 1.4,
      crit: 0.1
    },

    passives: [

      {
        id: "rogue_swiftness",

        name: "신속",

        cost: PASSIVE_COSTS.tier1,

        desc: "총 공격 속도 0.6 증가",

        effects: [
          {
            type: "flatSpd",
            amount: 0.6
          }
        ]
      },

      {
        id: "rogue_mastery",

        name: "전투 숙련",

        cost: PASSIVE_COSTS.tier2,

        desc: "최대 체력 4%, 공격력 4% 증가",

        effects: [
          {
            type: "percentHp",
            amount: 0.04
          },
          {
            type: "percentAtk",
            amount: 0.04
          }
        ]
      },

      {
        id: "rogue_double_strike",

        name: "연격",

        cost: PASSIVE_COSTS.tier3,

        desc: "공격 시 15% 확률로 추가 공격",

        effects: [
          {
            type: "extraAttackChance",
            amount: 0.15
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
      hp: 70,
      atk: 27,
      def: 10,
      spd: 0.9,
      crit: 0.16
    },

    passives: [

      {
        id: "mage_concentration",

        name: "마력 집중",

        cost: PASSIVE_COSTS.tier1,

        desc: "치명타 확률 16%p 증가",

        effects: [
          {
            type: "flatCrit",
            amount: 0.16
          }
        ]
      },

      {
        id: "mage_amplification",

        name: "마력 증폭",

        cost: PASSIVE_COSTS.tier2,

        desc: "총 공격력 6% 증가",

        effects: [
          {
            type: "percentAtk",
            amount: 0.06
          }
        ]
      },

      {
        id: "mage_magic_burst",

        name: "마력 폭발",

        cost: PASSIVE_COSTS.tier3,

        desc:
          "치명타 피해량의 24%만큼 추가 피해 " +
          "(적 방어력 적용)",

        effects: [
          {
            type: "criticalExtraDamage",
            amount: 0.24
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

    "def"

  ];

  const result = {

    hp: 0,

    atk: 0,

    def: 0

  };

  for (let i = 0; i < points; i++) {

    const index = Math.floor(

      Math.random() * statTypes.length

    );

    const stat = statTypes[index];

    result[stat]++;

  }

  return {

    hp: result.hp * 5,

    atk: result.atk,

    def: result.def

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

    def: classData.base.def + roll.def

  };

  return {

    base,

    hp: base.hp,

    roll

  };

}


// ==================== 클래스 패시브 목록 조회 ====================

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


// ==================== 초기 패시브 효과 ====================

export function createPassiveEffects() {
  return {
    percentHp: 0,
    percentAtk: 0,
    percentDef: 0,
    percentSpd: 0,
    flatSpd: 0,
    flatCrit: 0,
    damageReduction: 0,
    extraAttackChance: 0,
    criticalExtraDamage: 0,
    counterHpRatio: 0,
    counterDefRatio: 0
  };
}


// ==================== 전체 패시브 효과 계산 ====================

export function getPassiveEffects(
  classKey,
  ownedPassives = []
) {

  const effects = createPassiveEffects();

  if (
    !classKey ||
    !Object.hasOwn(CLASSES, classKey) ||
    !Array.isArray(ownedPassives)
  ) {
    return effects;
  }

  const passives = getPassives(classKey);

  const ownedIds = new Set(
    ownedPassives.map(passive => {
      return typeof passive === "string"
        ? passive
        : passive?.id;
    })
  );

  for (const passive of passives) {

    if (!ownedIds.has(passive.id)) {
      continue;
    }

    for (const effect of passive.effects) {

      if (!Object.hasOwn(effects, effect.type)) {
        continue;
      }

      effects[effect.type] += effect.amount;

    }

  }

  return effects;
}
