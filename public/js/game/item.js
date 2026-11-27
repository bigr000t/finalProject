"use strict";


// ==================== 특수 아이템 기본 설정 ====================

export const ITEM_CONFIG = {
  dropChance: 0.06,
  maxStack: 3,
  reviveHpRatio: 0.33,
  berserkerHpRatio: 0.33,
  huntingHpRatio: 0.33,
  guardDamageReduction: 0.32,

  // 오만의 왕관
  crownBaseMultiplier: 1.16,
  crownPrimaryCoefficient: 0.04,
  crownSecondaryCoefficient: 0.024
};


// ==================== 특수 아이템 데이터 ====================

export const SPECIAL_ITEMS = [

  // ==================== 기본 특수 아이템 ====================

  {
    id: "vampireRing",
    name: "흡혈의 반지",
    emoji: "🩸",
    type: "lifesteal",
    values: [0, 0.036, 0.072, 0.108],
    description: "기본 공격으로 가한 실제 피해량에 비례하여 체력을 회복합니다."
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

    subEffects: [
      {
        type: "floorReflection",
        values: [0, 0.32, 0.64, 0.96]
      }
    ],

    description: "피격 시 고정 피해와 현재 층수에 비례한 추가 피해를 몬스터에게 줍니다."
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
    values: [0, 0.24, 0.48, 0.72],
    description: "공격 속도가 고정 수치만큼 증가합니다."
  },

  {
    id: "thirdBlade",
    name: "세번째 칼날",
    emoji: "🗡️",
    type: "flatSpd",
    values: [0, 0.12, 0.24, 0.36],
    description: "공격 속도가 고정 수치만큼 증가합니다."
  },

  {
    id: "shiningBlade",
    name: "빛나는 칼날",
    emoji: "⚔️",
    type: "percentSpd",
    values: [0, 0.12, 0.24, 0.36],
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

  {
    id: "precisionHornet",
    name: "정밀한 말벌",
    emoji: "🐝",
    type: "critDamageBonus",
    values: [0, 0.16, 0.32, 0.48],
    description: "치명타 피해량이 증가합니다."
  },

  {
    id: "crystalHeart",
    name: "크리스탈 하트",
    emoji: "💎",
    type: "percentHp",
    values: [0, 0.06, 0.12, 0.18],
    description: "최대 생명력이 증가합니다."
  },


  // ==================== 조건부 특수 아이템 ====================

  {
    id: "berserkerHeart",
    name: "광전사의 심장",
    emoji: "❤️‍🔥",
    type: "lowHpDamageBonus",
    values: [0, 0.16, 0.32, 0.48],
    description: "현재 체력이 최대 체력의 33% 이하일 때 기본 공격 피해량이 증가합니다."
  },

  {
    id: "purityShield",
    name: "순결의 방패",
    emoji: "🛡️",
    type: "fullHpDamageReduction",
    values: [0, 0.08, 0.16, 0.24],
    description: "현재 체력이 최대 체력일 때 받는 피해량이 감소합니다."
  },

  {
    id: "huntingHornet",
    name: "사냥하는 말벌",
    emoji: "🐝",
    type: "lowEnemyHpCritBonus",
    values: [0, 0.12, 0.24, 0.36],
    description: "몬스터의 현재 체력이 최대 체력의 33% 이하일 때 치명타 확률이 증가합니다."
  },

  {
    id: "guardianCloak",
    name: "수호자의 망토",
    emoji: "🧥",
    type: "guardChance",
    values: [0, 0.09, 0.18, 0.27],
    description: "피격 시 일정 확률로 해당 공격의 피해량을 32% 감소시킵니다."
  },


  // ==================== 최상급 비급서 ====================

  {
    id: "supremeHpBook",
    name: "최상급 생명력 비급서",
    emoji: "📕",
    type: "floorHp",
    values: [0, 0.30, 0.60, 0.90],
    description: "현재 층수에 비례하여 최대 체력이 증가합니다."
  },

  {
    id: "supremeAtkBook",
    name: "최상급 공격력 비급서",
    emoji: "📙",
    type: "floorAtk",
    values: [0, 0.06, 0.12, 0.18],
    description: "현재 층수에 비례하여 공격력이 증가합니다."
  },

  {
    id: "supremeApBook",
    name: "최상급 주문력 비급서",
    emoji: "📘",
    type: "floorAp",
    values: [0, 0.06, 0.12, 0.18],
    description: "현재 층수에 비례하여 주문력이 증가합니다."
  },


  // ==================== 파밍 및 경제 특수 아이템 ====================

  {
    // 기존 저장 데이터 호환을 위해 ID 유지
    id: "luckyDice",
    name: "은사의 반지",
    emoji: "💍",
    type: "dropChanceBonus",
    values: [0, 0.02, 0.04, 0.06],
    description: "특수 아이템의 등장 확률이 증가합니다."
  },

  {
    id: "blessedChalice",
    name: "축복받은 성배",
    emoji: "🏆",
    type: "shopHealBonus",
    values: [0, 0.20, 0.40, 0.60],
    description: "상점에서 구매하는 회복약의 회복 효율이 증가합니다."
  },


  // ==================== 능력치 교환 특수 아이템 ====================

  {
    id: "heavyArmor",
    name: "무거운 갑주",
    emoji: "🦺",
    type: "percentHp",
    values: [0, 0.18, 0.36, 0.54],

    subEffects: [
      {
        type: "percentSpdPenalty",
        values: [0, 0.15, 0.30, 0.45]
      }
    ],

    description: "공격 속도가 감소하는 대신 최대 생명력이 증가합니다."
  },

  {
    id: "blindSword",
    name: "맹목의 검",
    emoji: "⚔️",
    type: "damageBonus",
    values: [0, 0.20, 0.40, 0.60],

    subEffects: [
      {
        type: "critPenalty",
        values: [0, 0.16, 0.32, 0.48]
      }
    ],

    description: "치명타 확률이 감소하는 대신 기본 공격 피해량이 증가합니다."
  },

  {
    id: "madnessMask",
    name: "광기의 가면",
    emoji: "🎭",
    type: "crit",
    values: [0, 0.16, 0.32, 0.48],

    subEffects: [
      {
        type: "percentHpPenalty",
        values: [0, 0.125, 0.25, 0.375]
      }
    ],

    description: "최대 생명력이 감소하는 대신 치명타 확률이 증가합니다."
  },

  {
    id: "brokenMagicSword",
    name: "부러진 마검",
    emoji: "🗡️",
    type: "atkToApConversion",
    values: [0, 0.12, 0.24, 0.36],

    description: "공격력이 감소하는 대신 감소한 공격력의 150%만큼 주문력이 증가합니다."
  },

  {
    id: "recklessBlade",
    name: "경솔한 칼날",
    emoji: "⚔️",
    type: "percentSpd",
    values: [0, 0.24, 0.48, 0.72],

    subEffects: [
      {
        type: "damagePenalty",
        values: [0, 0.16, 0.32, 0.48]
      }
    ],

    description: "기본 공격 피해량이 감소하는 대신 공격 속도가 증가합니다."
  },

  {
    id: "forbiddenGrimoire",
    name: "금단의 마도서",
    emoji: "📖",
    type: "percentAp",
    values: [0, 0.16, 0.32, 0.48],

    subEffects: [
      {
        type: "percentHpPenalty",
        values: [0, 0.125, 0.25, 0.375]
      }
    ],

    description: "최대 생명력이 감소하는 대신 주문력이 증가합니다."
  },

  {
    id: "bloodthirstySword",
    name: "피에 굶주린 검",
    emoji: "🗡️",
    type: "percentAtk",
    values: [0, 0.16, 0.32, 0.48],

    subEffects: [
      {
        type: "percentHpPenalty",
        values: [0, 0.125, 0.25, 0.375]
      }
    ],

    description: "최대 생명력이 감소하는 대신 공격력이 증가합니다."
  },


  // ==================== 특수 성장 아이템 ====================

  {
    id: "arroganceCrown",
    name: "오만의 왕관",
    emoji: "👑",
    type: "crown",
    values: [0, 1, 1, 1],

    // 획득 즉시 최대 중첩
    instantMaxStack: true,

    description: "다른 모든 특수 아이템의 효과를 무효화합니다. 모든 능력치가 16% 증가하며, 무효화된 아이템 하나당 최대 생명력·공격력·주문력의 배율이 0.04, 공격 속도·치명타 확률·치명타 피해량의 배율이 0.024 증가합니다."
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


// ==================== 오만의 왕관 보유 여부 ====================

export function hasArroganceCrown(items) {

  return getItemCount(
    items,
    "arroganceCrown"
  ) > 0;

}


// ==================== 아이템 무효화 여부 ====================

export function isItemDisabled(items, itemId) {

  if (!hasArroganceCrown(items)) {
    return false;
  }

  if (itemId === "arroganceCrown") {
    return false;
  }

  return getItemCount(items, itemId) > 0;

}


// ==================== 무효화된 아이템 개수 ====================

export function getDisabledItemCount(items) {

  if (!hasArroganceCrown(items)) {
    return 0;
  }

  let count = 0;

  for (const item of SPECIAL_ITEMS) {

    if (item.id === "arroganceCrown") {
      continue;
    }

    count += getItemCount(
      items,
      item.id
    );

  }

  return count;

}


// ==================== 오만의 왕관 배율 ====================

export function getCrownMultipliers(items) {

  if (!hasArroganceCrown(items)) {

    return {
      active: false,
      count: 0,
      primary: 1,
      secondary: 1
    };

  }

  const count = getDisabledItemCount(items);

  return {

    active: true,

    count,

    // HP / ATK / AP
    primary:
      ITEM_CONFIG.crownBaseMultiplier +
      count * ITEM_CONFIG.crownPrimaryCoefficient,

    // SPD / CRIT / CRIT DAMAGE
    secondary:
      ITEM_CONFIG.crownBaseMultiplier +
      count * ITEM_CONFIG.crownSecondaryCoefficient

  };

}


// ==================== 아이템 효과 수치 조회 ====================

export function getItemValue(items, itemId) {

  const item = getItem(itemId);

  if (!item) {
    return 0;
  }

  // 왕관 보유 시 다른 아이템 효과 무효화
  if (isItemDisabled(items, itemId)) {
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

  // 왕관은 최초 한 번만 획득 가능
  if (itemId === "arroganceCrown") {

    return !hasArroganceCrown(items);

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

  const item = getItem(itemId);


  // ==================== 즉시 최대 중첩 ====================

  if (item.instantMaxStack) {

    items[itemId] = ITEM_CONFIG.maxStack;

    return true;

  }


  // ==================== 일반 아이템 획득 ====================

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

  // 왕관 자체는 소모 불가
  if (itemId === "arroganceCrown") {
    return false;
  }

  // 무효화된 아이템은 효과 발동 및 소모 불가
  if (isItemDisabled(items, itemId)) {
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

  // 왕관 보유 시 은사의 반지 효과도 무효화
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


  // ==================== 획득 가능한 아이템 조회 ====================

  const pool = getAvailableItems(
    items,
    excludedIds
  );

  if (pool.length === 0) {
    return null;
  }


  // ==================== 특수 아이템 등장 확률 ====================

  // 보스 : 확정 등장
  // 일반 및 엘리트 : 일반 등장 확률
  // 은사의 반지 효과는 일반 확률에 적용

  const dropChance = forceSpecial
    ? 1
    : getSpecialItemDropChance(items);


  // ==================== 보상 슬롯별 확률 판정 ====================

  if (Math.random() >= dropChance) {
    return null;
  }


  // ==================== 특수 아이템 선택 ====================

  // 모든 특수 아이템의 등장 가중치는 동일

  const index = Math.floor(
    Math.random() * pool.length
  );

  return pool[index];

}


// ==================== 전체 아이템 효과 계산 ====================

export function getItemEffects(items) {

  const effects = {


    // ==================== 기본 아이템 효과 ====================

    lifesteal: 0,

    reflection: 0,

    floorReflection: 0,

    revive: 0,

    goldBonus: 0,

    flatSpd: 0,

    percentSpd: 0,

    crit: 0,

    critDamageBonus: 0,

    criticalDamageReduction: 0,

    percentHp: 0,

    percentAtk: 0,

    percentAp: 0,


    // ==================== 조건부 효과 ====================

    lowHpDamageBonus: 0,

    fullHpDamageReduction: 0,

    lowEnemyHpCritBonus: 0,

    guardChance: 0,


    // ==================== 최상급 비급서 ====================

    floorHp: 0,

    floorAtk: 0,

    floorAp: 0,


    // ==================== 파밍 및 경제 효과 ====================

    dropChanceBonus: 0,

    shopHealBonus: 0,


    // ==================== 능력치 교환 효과 ====================

    damageBonus: 0,

    damagePenalty: 0,

    damageReduction: 0,

    // 기존 코드 호환을 위해 유지
    flatSpdPenalty: 0,

    percentSpdPenalty: 0,

    critPenalty: 0,

    percentHpPenalty: 0,

    atkToApConversion: 0,


    // ==================== 오만의 왕관 ====================

    crown: 0,

    crownCount: 0,

    crownPrimary: 1,

    crownSecondary: 1

  };


  // ==================== 오만의 왕관 적용 ====================

  // 왕관이 존재하면 다른 아이템 효과를 합산하지 않음
  // 다른 아이템의 이로운 효과와 페널티 모두 무효화

  if (hasArroganceCrown(items)) {

    const crown = getCrownMultipliers(items);

    effects.crown = 1;

    effects.crownCount = crown.count;

    effects.crownPrimary = crown.primary;

    effects.crownSecondary = crown.secondary;

    return effects;

  }


  // ==================== 보유 아이템 효과 계산 ====================

  for (const item of SPECIAL_ITEMS) {

    const count = getItemCount(
      items,
      item.id
    );

    if (count === 0) {
      continue;
    }


    // ==================== 기본 효과 합산 ====================

    if (Object.hasOwn(effects, item.type)) {

      effects[item.type] += item.values[count];

    }


    // ==================== 추가 효과 합산 ====================

    if (Array.isArray(item.subEffects)) {

      for (const subEffect of item.subEffects) {

        if (!Object.hasOwn(
          effects,
          subEffect.type
        )) {
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

    // 최상급 생명력 비급서
    hp: Math.floor(
      currentFloor * effects.floorHp + 1e-9
    ),

    // 최상급 공격력 비급서
    atk: Math.floor(
      currentFloor * effects.floorAtk + 1e-9
    ),

    // 최상급 주문력 비급서
    ap: Math.floor(
      currentFloor * effects.floorAp + 1e-9
    )

  };

}


// ==================== 반사 피해 계산 ====================

export function getReflectionDamage(
  items,
  floor = 1
) {

  const effects = getItemEffects(items);

  const currentFloor =
    Number.isSafeInteger(floor) && floor >= 1
      ? floor
      : 1;

  return Math.max(
    0,
    Math.floor(
      effects.reflection +
      currentFloor * effects.floorReflection +
      1e-9
    )
  );

}


// ==================== 아이템 효과 표시용 수치 ====================

function formatItemNumber(value, digits = 3) {

  return Number(
    Number(value).toFixed(digits)
  ).toString();

}


function formatItemPercent(value) {

  return formatItemNumber(
    value * 100,
    3
  );

}


// ==================== 아이템 효과 설명 ====================

export function getItemEffectText(
  itemId,
  count,
  items = null
) {

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

  const percent = formatItemPercent(value);


  // ==================== 특수 처리 아이템 ====================

  switch (item.id) {


    // ==================== 오만의 왕관 ====================

    case "arroganceCrown": {

      if (items && hasArroganceCrown(items)) {

        const crown = getCrownMultipliers(items);

        return (
          `무효화된 아이템 ${crown.count}개` +
          ` / HP·ATK·AP ×${formatItemNumber(crown.primary)}` +
          ` / SPD·치확·치피 ×${formatItemNumber(crown.secondary)}`
        );

      }

      return (
        "다른 특수 아이템 효과 무효화" +
        " / 기본 능력치 배율 1.16" +
        " / 아이템당 HP·ATK·AP 배율 +0.04" +
        " / SPD·치확·치피 배율 +0.024"
      );

    }


    // ==================== 가시 장갑 ====================

    case "thornGloves":

      return (
        `피격 시 피해 ${value}` +
        ` + (현재 층수 × ${
          formatItemNumber(
            item.subEffects[0].values[stack]
          )
        })`
      );


    // ==================== 무거운 갑주 ====================

    case "heavyArmor":

      return (
        `최대 생명력 +${percent}%` +
        ` / 공격 속도 -${
          formatItemPercent(
            item.subEffects[0].values[stack]
          )
        }%`
      );


    // ==================== 맹목의 검 ====================

    case "blindSword":

      return (
        `치명타 확률 -${
          formatItemPercent(
            item.subEffects[0].values[stack]
          )
        }%p` +
        ` / 기본 공격 피해 +${percent}%`
      );


    // ==================== 광기의 가면 ====================

    case "madnessMask":

      return (
        `최대 생명력 -${
          formatItemPercent(
            item.subEffects[0].values[stack]
          )
        }%` +
        ` / 치명타 확률 +${percent}%p`
      );


    // ==================== 부러진 마검 ====================

    case "brokenMagicSword":

      return (
        `공격력 -${percent}%` +
        " / 감소한 공격력의 150%만큼 주문력 증가"
      );


    // ==================== 경솔한 칼날 ====================

    case "recklessBlade":

      return (
        `공격 속도 +${percent}%` +
        ` / 기본 공격 피해 -${
          formatItemPercent(
            item.subEffects[0].values[stack]
          )
        }%`
      );


    // ==================== 금단의 마도서 ====================

    case "forbiddenGrimoire":

      return (
        `최대 생명력 -${
          formatItemPercent(
            item.subEffects[0].values[stack]
          )
        }%` +
        ` / 주문력 +${percent}%`
      );


    // ==================== 피에 굶주린 검 ====================

    case "bloodthirstySword":

      return (
        `최대 생명력 -${
          formatItemPercent(
            item.subEffects[0].values[stack]
          )
        }%` +
        ` / 공격력 +${percent}%`
      );

  }


  // ==================== 일반 특수 아이템 ====================

  switch (item.type) {

    case "lifesteal":

      return `기본 공격 흡혈률 ${percent}%`;


    case "reflection":

      return `피격 시 고정 피해 ${value}`;


    case "revive":

      return `최대 체력 33%로 소생 (${value}회)`;


    case "goldBonus":

      return `골드 획득량 +${percent}%`;


    case "flatSpd":

      return (
        `공격 속도 +${formatItemNumber(value)}`
      );


    case "percentSpd":

      return `공격 속도 +${percent}%`;


    case "crit":

      return `치명타 확률 +${percent}%p`;


    case "critDamageBonus":

      return `치명타 피해량 +${percent}%p`;


    case "criticalDamageReduction":

      return `받는 치명타 피해 ${percent}% 감소`;


    case "percentHp":

      return `최대 생명력 +${percent}%`;


    case "percentAtk":

      return `공격력 +${percent}%`;


    case "percentAp":

      return `주문력 +${percent}%`;


    // ==================== 조건부 특수 아이템 ====================

    case "lowHpDamageBonus":

      return (
        `체력 33% 이하일 때 기본 공격 피해 +${percent}%`
      );


    case "fullHpDamageReduction":

      return (
        `최대 체력 상태에서 받는 피해 ${percent}% 감소`
      );


    case "lowEnemyHpCritBonus":

      return (
        `적 체력 33% 이하일 때 치명타 확률 +${percent}%p`
      );


    case "guardChance":

      return (
        `피격 시 ${percent}% 확률로 해당 피해 32% 감소`
      );


    // ==================== 최상급 비급서 ====================

    case "floorHp":

      return (
        `최대 체력 +(현재 층수 × ${formatItemNumber(value)})`
      );


    case "floorAtk":

      return (
        `공격력 +(현재 층수 × ${formatItemNumber(value)})`
      );


    case "floorAp":

      return (
        `주문력 +(현재 층수 × ${formatItemNumber(value)})`
      );


    // ==================== 파밍 및 경제 아이템 ====================

    case "dropChanceBonus":

      return (
        `특수 아이템 등장 확률 +${percent}%p`
      );


    case "shopHealBonus":

      return (
        `상점 회복약 회복 효율 +${percent}%`
      );


    default:

      return "";

  }

}


// ==================== 보유 아이템 목록 조회 ====================

export function getOwnedItems(items) {

  return SPECIAL_ITEMS

    .filter(item => {

      return getItemCount(
        items,
        item.id
      ) > 0;

    })

    .map(item => {

      const count = getItemCount(
        items,
        item.id
      );

      const disabled = isItemDisabled(
        items,
        item.id
      );

      const effectText = getItemEffectText(
        item.id,
        count,
        items
      );

      return {

        ...item,

        count,

        maxStack: ITEM_CONFIG.maxStack,

        // 원래 아이템 효과
        value: item.values[count],

        // 현재 적용되는 실제 효과
        activeValue: disabled
          ? 0
          : item.values[count],

        // 왕관에 의해 무효화되었는지 여부
        disabled,

        // 무효화 상태 UI 표시
        effectText: disabled
          ? `[무효화] ${effectText}`
          : effectText

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

    // 왕관은 항상 최대 중첩 상태여야 함
    if (
      itemId === "arroganceCrown" &&
      count !== ITEM_CONFIG.maxStack
    ) {
      return false;
    }

  }

  return true;

}
