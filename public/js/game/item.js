"use strict";


// ==================== 특수 아이템 기본 설정 ====================

export const ITEM_CONFIG = {

  dropChance: 0.06,

  maxStack: 3,

  reviveHpRatio: 0.33,

  berserkerHpRatio: 0.33

};


// ==================== 특수 아이템 데이터 ====================

export const SPECIAL_ITEMS = [

  // ==================== 기존 특수 아이템 ====================

  {
    id: "vampireRing",

    name: "흡혈의 반지",

    emoji: "🩸",

    type: "lifesteal",

    values: [0, 0.06, 0.12, 0.18],

    description: "가한 피해량에 비례하여 체력을 회복합니다."
  },

  {
    id: "guardianAmulet",

    name: "수호의 부적",

    emoji: "📿",

    type: "criticalDamageReduction",

    values: [0, 0.10, 0.20, 0.30],

    description: "받는 치명타 피해량을 감소시킵니다."
  },

  {
    id: "thornGloves",

    name: "가시 장갑",

    emoji: "🧤",

    type: "reflection",

    values: [0, 16, 32, 64],

    description: "피격 시 몬스터에게 고정 피해를 줍니다."
  },

  {
    id: "immortalMark",

    name: "불사의 증표",

    emoji: "🔥",

    type: "revive",

    values: [0, 1, 2, 3],

    description: "사망 시 최대 체력의 33%로 소생하며 하나를 소모합니다."
  },

  {
    id: "goldenRing",

    name: "금사의 반지",

    emoji: "💍",

    type: "goldBonus",

    values: [0, 0.10, 0.20, 0.30],

    description: "골드 획득량이 증가합니다."
  },

  {
    id: "secondBlade",

    name: "두번째 칼날",

    emoji: "🗡️",

    type: "flatSpd",

    values: [0, 0.4, 0.8, 1.2],

    description: "공격 속도가 고정 수치만큼 증가합니다."
  },

  {
    id: "shiningBlade",

    name: "빛나는 칼날",

    emoji: "⚔️",

    type: "percentSpd",

    values: [0, 0.15, 0.30, 0.45],

    description: "공격 속도가 일정 비율만큼 증가합니다."
  },

  {
    id: "pointingFirefly",

    name: "가르키는 반딧불",

    emoji: "✨",

    type: "crit",

    values: [0, 0.03, 0.06, 0.09],

    description: "치명타 확률이 증가합니다."
  },

  {
    id: "guidingFirefly",

    name: "인도하는 반딧불",

    emoji: "🌟",

    type: "crit",

    values: [0, 0.04, 0.08, 0.12],

    description: "치명타 확률이 증가합니다."
  },


  // ==================== 조건부 특수 아이템 ====================

  {
    id: "berserkerHeart",

    name: "광전사의 심장",

    emoji: "❤️‍🔥",

    type: "lowHpDamageBonus",

    values: [0, 0.12, 0.24, 0.36],

    description: "현재 체력이 최대 체력의 33% 이하일 때 가하는 피해량이 증가합니다."
  },

  {
    id: "purityShield",

    name: "순결의 방패",

    emoji: "🛡️",

    type: "fullHpDamageReduction",

    values: [0, 0.12, 0.24, 0.36],

    description: "현재 체력이 최대 체력일 때 받는 피해량이 감소합니다."
  },


  // ==================== 최상급 비급서 ====================

  {
    id: "supremeHpBook",

    name: "최상급 생명력 비급서",

    emoji: "📕",

    type: "floorHp",

    values: [0, 0.4, 0.8, 1.2],

    description: "현재 층수에 비례하여 최대 체력이 증가합니다."
  },

  {
    id: "supremeAtkBook",

    name: "최상급 공격력 비급서",

    emoji: "📙",

    type: "floorAtk",

    values: [0, 0.08, 0.16, 0.24],

    description: "현재 층수에 비례하여 공격력이 증가합니다."
  },

  {
    id: "supremeDefBook",

    name: "최상급 방어력 비급서",

    emoji: "📘",

    type: "floorDef",

    values: [0, 0.08, 0.16, 0.24],

    description: "현재 층수에 비례하여 방어력이 증가합니다."
  },


  // ==================== 파밍 특수 아이템 ====================

  {
    id: "luckyDice",

    name: "행운의 주사위",

    emoji: "🎲",

    type: "dropChanceBonus",

    values: [0, 0.02, 0.04, 0.06],

    description: "특수 아이템의 등장 확률이 증가합니다."
  },


  // ==================== 능력치 교환 특수 아이템 ====================

  {
    id: "heavyArmor",

    name: "무거운 갑주",

    emoji: "🦺",

    type: "damageReduction",

    values: [0, 0.12, 0.24, 0.36],

    subEffects: [
      {
        type: "flatSpdPenalty",

        values: [0, 0.6, 1.2, 1.8]
      }
    ],

    description: "공격 속도가 감소하는 대신 받는 모든 피해량이 감소합니다."
  },

  {
    id: "blindSword",

    name: "맹목의 검",

    emoji: "⚔️",

    type: "damageBonus",

    values: [0, 0.24, 0.48, 0.72],

    subEffects: [
      {
        type: "critPenalty",

        values: [0, 0.17, 0.34, 0.51]
      }
    ],

    description: "치명타 확률이 감소하는 대신 가하는 피해량이 증가합니다."
  },

  {
    id: "madnessMask",

    name: "광기의 가면",

    emoji: "🎭",

    type: "crit",

    values: [0, 0.17, 0.34, 0.51],

    subEffects: [
      {
        type: "percentDefPenalty",

        values: [0, 0.24, 0.48, 0.72]
      }
    ],

    description: "방어력이 감소하는 대신 치명타 확률이 증가합니다."
  }

];


// ==================== 초기 아이템 보유 상태 ====================

export function createInitialItems() {

  return {};

}


// ==================== 아이템 조회 ====================

export function getItem(itemId) {

  return SPECIAL_ITEMS.find(

    item => item.id === itemId

  ) || null;

}


// ==================== 아이템 보유 개수 ====================

export function getItemCount(items, itemId) {

  if (!getItem(itemId)) {

    return 0;

  }

  const count = items?.[itemId] ?? 0;

  if (!Number.isSafeInteger(count)) {

    return 0;

  }

  return Math.min(

    ITEM_CONFIG.maxStack,

    Math.max(0, count)

  );

}


// ==================== 아이템 효과 수치 조회 ====================

export function getItemValue(items, itemId) {

  const item = getItem(itemId);

  if (!item) {

    return 0;

  }

  const count = getItemCount(

    items,

    itemId

  );

  return item.values[count];

}


// ==================== 아이템 획득 가능 여부 ====================

export function canAcquireItem(items, itemId) {

  if (!getItem(itemId)) {

    return false;

  }

  return (

    getItemCount(items, itemId) <
    ITEM_CONFIG.maxStack

  );

}


// ==================== 아이템 획득 ====================

export function acquireItem(items, itemId) {

  if (
    !items ||
    typeof items !== "object" ||
    Array.isArray(items)
  ) {

    return false;

  }

  if (!canAcquireItem(items, itemId)) {

    return false;

  }

  items[itemId] =

    getItemCount(items, itemId) + 1;

  return true;

}


// ==================== 아이템 소모 ====================

export function consumeItem(items, itemId) {

  if (
    !items ||
    typeof items !== "object" ||
    Array.isArray(items)
  ) {

    return false;

  }

  const count = getItemCount(

    items,

    itemId

  );

  if (count <= 0) {

    return false;

  }

  if (count === 1) {

    delete items[itemId];

  } else {

    items[itemId] = count - 1;

  }

  return true;

}


// ==================== 획득 가능한 아이템 목록 ====================

export function getAvailableItems(
  items,
  excludedIds = []
) {

  return SPECIAL_ITEMS.filter(item => {

    return (

      canAcquireItem(items, item.id) &&

      !excludedIds.includes(item.id)

    );

  });

}


// ==================== 특수 아이템 등장 확률 ====================

export function getSpecialItemDropChance(items) {

  const bonus = getItemValue(

    items,

    "luckyDice"

  );

  return Math.min(

    1,

    Math.max(

      0,

      ITEM_CONFIG.dropChance + bonus

    )

  );

}


// ==================== 특수 아이템 무작위 추첨 ====================

export function rollSpecialItem(

  items,

  excludedIds = [],

  forceSpecial = false

) {

  // 획득 가능한 아이템 조회
  const pool = getAvailableItems(

    items,

    excludedIds

  );

  if (pool.length === 0) {

    return null;

  }


  // ==================== 특수 아이템 등장 확률 ====================

  // 엘리트 및 보스는 확정 등장
  // 일반 몬스터는 행운의 주사위 효과 적용

  const dropChance = forceSpecial

    ? 1

    : getSpecialItemDropChance(items);


  // 보상 슬롯별 확률 판정
  if (Math.random() >= dropChance) {

    return null;

  }


  // 모든 특수 아이템의 등장 가중치는 동일
  const index = Math.floor(

    Math.random() * pool.length

  );

  return pool[index];

}


// ==================== 전체 아이템 효과 계산 ====================

export function getItemEffects(items) {

  const effects = {

    // 기존 아이템 효과
    lifesteal: 0,

    reflection: 0,

    revive: 0,

    goldBonus: 0,

    flatSpd: 0,

    percentSpd: 0,

    crit: 0,

    criticalDamageReduction: 0,


    // 조건부 피해량 증가 및 감소
    lowHpDamageBonus: 0,

    fullHpDamageReduction: 0,


    // 최상급 비급서
    floorHp: 0,

    floorAtk: 0,

    floorDef: 0,


    // 특수 아이템 등장 확률 증가
    dropChanceBonus: 0,


    // 능력치 교환 효과
    damageBonus: 0,

    damageReduction: 0,

    flatSpdPenalty: 0,

    critPenalty: 0,

    percentDefPenalty: 0

  };


  for (const item of SPECIAL_ITEMS) {

    const count = getItemCount(

      items,

      item.id

    );

    if (count === 0) {

      continue;

    }


    // 기본 효과 합산
    if (Object.hasOwn(effects, item.type)) {

      effects[item.type] += item.values[count];

    }


    // 추가 효과 합산
    if (Array.isArray(item.subEffects)) {

      for (const subEffect of item.subEffects) {

        if (
          !Object.hasOwn(
            effects,
            subEffect.type
          )
        ) {

          continue;

        }

        effects[subEffect.type] +=

          subEffect.values[count];

      }

    }

  }

  return effects;

}


// ==================== 층수 비례 능력치 계산 ====================

export function getFloorItemBonuses(
  items,
  floor = 1
) {

  const effects = getItemEffects(items);

  const currentFloor =

    Number.isSafeInteger(floor) && floor >= 1

      ? floor

      : 1;

  return {

    hp: Math.floor(

      currentFloor * effects.floorHp

    ),

    atk: Math.floor(

      currentFloor * effects.floorAtk

    ),

    def: Math.floor(

      currentFloor * effects.floorDef

    )

  };

}


// ==================== 아이템 효과 설명 ====================

export function getItemEffectText(itemId, count) {

  const item = getItem(itemId);

  if (!item) {

    return "";

  }

  const stack = Number.isSafeInteger(count)

    ? Math.min(

        ITEM_CONFIG.maxStack,

        Math.max(0, count)

      )

    : 0;


  const value = item.values[stack];

  const percent = Math.round(value * 100);


  // ==================== 능력치 교환형 아이템 ====================

  switch (item.id) {

    case "heavyArmor":

      return (

        `공격 속도 -${item.subEffects[0].values[stack].toFixed(1)}` +

        ` / 받는 모든 피해 ${percent}% 감소`

      );

    case "blindSword":

      return (

        `치명타 확률 -${Math.round(item.subEffects[0].values[stack] * 100)}%p` +

        ` / 가하는 피해 +${percent}%`

      );

    case "madnessMask":

      return (

        `방어력 -${Math.round(item.subEffects[0].values[stack] * 100)}%` +

        ` / 치명타 확률 +${percent}%p`

      );

  }


  // ==================== 일반 특수 아이템 ====================

  switch (item.type) {

    case "lifesteal":

      return `흡혈률 ${percent}%`;

    case "reflection":

      return `피격 시 고정 피해 ${value}`;

    case "revive":

      return `최대 체력 33%로 소생 (${value}회)`;

    case "goldBonus":

      return `골드 획득량 +${percent}%`;

    case "flatSpd":

      return `공격 속도 +${value.toFixed(1)}`;

    case "percentSpd":

      return `공격 속도 +${percent}%`;

    case "crit":

      return `치명타 확률 +${percent}%p`;

    case "criticalDamageReduction":

      return `받는 치명타 피해 ${percent}% 감소`;


    // ==================== 조건부 특수 아이템 ====================

    case "lowHpDamageBonus":

      return `체력 33% 이하일 때 가하는 피해 +${percent}%`;

    case "fullHpDamageReduction":

      return `최대 체력 상태에서 받는 피해 ${percent}% 감소`;


    // ==================== 최상급 비급서 ====================

    case "floorHp":

      return `최대 체력 +(현재 층수 × ${value})`;

    case "floorAtk":

      return `공격력 +(현재 층수 × ${value})`;

    case "floorDef":

      return `방어력 +(현재 층수 × ${value})`;


    // ==================== 파밍 특수 아이템 ====================

    case "dropChanceBonus":

      return `특수 아이템 등장 확률 +${percent}%p`;


    default:

      return "";

  }

}


// ==================== 보유 아이템 목록 조회 ====================

export function getOwnedItems(items) {

  return SPECIAL_ITEMS

    .filter(item => {

      return getItemCount(items, item.id) > 0;

    })

    .map(item => {

      const count = getItemCount(

        items,

        item.id

      );

      return {

        ...item,

        count,

        maxStack: ITEM_CONFIG.maxStack,

        value: item.values[count],

        effectText: getItemEffectText(

          item.id,

          count

        )

      };

    });

}


// ==================== 아이템 저장 데이터 검증 ====================

export function isValidItems(items) {

  if (
    !items ||
    typeof items !== "object" ||
    Array.isArray(items)
  ) {

    return false;

  }

  for (const [itemId, count] of Object.entries(items)) {

    if (!getItem(itemId)) {

      return false;

    }

    if (
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > ITEM_CONFIG.maxStack
    ) {

      return false;

    }

  }

  return true;

}
