"use strict";

import {
  state as currentState,
  getMaxHp,
  syncPlayerHp
} from "./state.js";

import {
  ITEM_CONFIG,
  rollSpecialItem,
  getItem,
  getItemCount,
  getItemEffects,
  getItemEffectText,
  getFloorItemBonuses,
  getReflectionDamage,
  getCrownMultipliers,
  hasArroganceCrown,
  isItemDisabled,
  canAcquireItem,
  acquireItem
} from "./item.js";


// ==================== 비급서 성장 설정 ====================

export const BOOK_CONFIG = Object.freeze({

  floorInterval: 25,

  basePoints: 1,

  shopBasePoints: 1,

  pointsPerTier: 1,

  advancedMultiplier: 1.6,

  goldPerPoint: 400,

  hpPerPoint: 5,

  atkPerPoint: 1,

  apPerPoint: 1

});


// ==================== 비급서 성장 단계 ====================

export function getBookTier(floor) {

  const currentFloor = Math.max(
    1,
    Math.floor(floor)
  );

  return Math.floor(
    (currentFloor - 1) / BOOK_CONFIG.floorInterval
  );

}


// ==================== 비급서 포인트 계산 ====================

export function getBookPoints(
  floor,
  advanced = false,
  isShop = false
) {

  const tier = getBookTier(floor);

  const basePoints = isShop
    ? BOOK_CONFIG.shopBasePoints
    : BOOK_CONFIG.basePoints;

  const points =
    basePoints +
    tier * BOOK_CONFIG.pointsPerTier;

  return advanced
    ? Math.round(points * BOOK_CONFIG.advancedMultiplier)
    : points;

}


// ==================== 비급서 능력치 증가량 ====================

export function getBookAmount(
  floor,
  stat,
  advanced = false,
  isShop = false
) {

  const points = getBookPoints(
    floor,
    advanced,
    isShop
  );

  switch (stat) {

    case "hp":
      return points * BOOK_CONFIG.hpPerPoint;

    case "atk":
      return points * BOOK_CONFIG.atkPerPoint;

    case "ap":
      return points * BOOK_CONFIG.apPerPoint;

    default:
      throw new Error(
        "잘못된 비급서 능력치입니다."
      );

  }

}


// ==================== 비급서 가격 ====================

export function getBookCost(floor) {

  return (
    getBookPoints(floor, false, true) *
    BOOK_CONFIG.goldPerPoint
  );

}


// ==================== 비급서 설명 ====================

export function getBookDescription(
  floor,
  stat,
  advanced = false,
  isShop = false
) {

  const amount = getBookAmount(
    floor,
    stat,
    advanced,
    isShop
  );

  switch (stat) {

    case "hp":
      return `기본 HP +${amount}`;

    case "atk":
      return `기본 공격력 +${amount}`;

    case "ap":
      return `기본 주문력 +${amount}`;

    default:
      throw new Error(
        "잘못된 비급서 능력치입니다."
      );

  }

}


// ==================== 일반 보상 데이터 ====================

export const REWARDS = [

  // ==================== 회복약 ====================

  {
    id: "heal1",
    title: "회복약",
    desc: "최대 HP의 20% 회복",
    type: "heal",
    amount: 0.2
  },

  {
    id: "heal2",
    title: "상급 회복약",
    desc: "최대 HP의 40% 회복",
    type: "heal",
    amount: 0.4
  },

  {
    id: "heal3",
    title: "최상급 회복약",
    desc: "최대 HP의 70% 회복",
    type: "heal",
    amount: 0.7
  },


  // ==================== 일반 비급서 ====================

  {
    id: "bookHp",
    title: "생명 비급서",
    desc: getBookDescription(1, "hp"),
    type: "stat",
    stat: "hp",
    amount: getBookAmount(1, "hp"),
    advanced: false
  },

  {
    id: "bookAtk",
    title: "공격 비급서",
    desc: getBookDescription(1, "atk"),
    type: "stat",
    stat: "atk",
    amount: getBookAmount(1, "atk"),
    advanced: false
  },

  {
    id: "bookAp",
    title: "주문 비급서",
    desc: getBookDescription(1, "ap"),
    type: "stat",
    stat: "ap",
    amount: getBookAmount(1, "ap"),
    advanced: false
  },


  // ==================== 상급 비급서 ====================

  {
    id: "advancedBookHp",
    title: "상급 생명 비급서",
    desc: getBookDescription(1, "hp", true),
    type: "stat",
    stat: "hp",
    amount: getBookAmount(1, "hp", true),
    advanced: true
  },

  {
    id: "advancedBookAtk",
    title: "상급 공격 비급서",
    desc: getBookDescription(1, "atk", true),
    type: "stat",
    stat: "atk",
    amount: getBookAmount(1, "atk", true),
    advanced: true
  },

  {
    id: "advancedBookAp",
    title: "상급 주문 비급서",
    desc: getBookDescription(1, "ap", true),
    type: "stat",
    stat: "ap",
    amount: getBookAmount(1, "ap", true),
    advanced: true
  },


  // ==================== 골드 보상 ====================

  {
    id: "gold1",
    title: "골드 주머니",
    desc: "기본 지급 골드의 1배",
    type: "gold",
    amount: 1
  },

  {
    id: "gold2",
    title: "골드 상자",
    desc: "기본 지급 골드의 1.6배",
    type: "gold",
    amount: 1.6
  }

];


// ==================== 층수별 비급서 보상 생성 ====================

export function getScaledReward(reward, floor) {

  if (reward.type !== "stat") {

    return { ...reward };

  }

  return {

    ...reward,

    amount: getBookAmount(
      floor,
      reward.stat,
      reward.advanced
    ),

    desc: getBookDescription(
      floor,
      reward.stat,
      reward.advanced
    )

  };

}


// ==================== 층 클리어 기본 골드 ====================

export function getClearGold(floor, enemy = null) {

  const baseGold = floor * 5;

  // 보스 몬스터 : 기본 골드 3배

  if (enemy?.isBoss) {

    return baseGold * 3;

  }

  // 엘리트 몬스터 : 기본 골드 2배

  if (enemy?.isElite) {

    return baseGold * 2;

  }

  // 일반 몬스터 : 기본 골드 1배

  return baseGold;

}


// ==================== 최종 골드 획득량 계산 ====================

// 금사의 반지 효과 적용
// 오만의 왕관 보유 시 금사의 반지 효과 무효화

export function calculateGoldAmount(amount, items) {

  const effects = getItemEffects(items);

  return Math.floor(

    amount * (1 + effects.goldBonus) + 1e-9

  );

}


// ==================== 골드 지급 ====================

export function grantGold(state, amount) {

  const gold = calculateGoldAmount(
    amount,
    state.items
  );

  state.gold += gold;

  return gold;

}


// ==================== 표시용 숫자 변환 ====================

function formatRewardNumber(value, digits = 3) {

  return Number(
    Number(value).toFixed(digits)
  ).toString();

}


// ==================== 아이템 획득 후 상태 미리보기 ====================

// 실제 아이템 보유 상태를 수정하지 않고
// 임시 복사본에서 획득 결과를 계산

function previewItemAcquisition(items, itemId) {

  const previewItems = {

    ...(items ?? {})

  };

  const success = acquireItem(
    previewItems,
    itemId
  );

  return {

    success,

    items: previewItems

  };

}


// ==================== 오만의 왕관 보상 설명 ====================

function getCrownRewardText(
  beforeItems,
  afterItems,
  itemId
) {

  const before = getCrownMultipliers(
    beforeItems
  );

  const after = getCrownMultipliers(
    afterItems
  );


  // ==================== 오만의 왕관 최초 획득 ====================

  if (itemId === "arroganceCrown") {

    return (

      "획득 즉시 최대 중첩" +

      " / 다른 모든 특수 아이템 효과 무효화" +

      " / 클래스 패시브 유지" +

      ` / 무효화 아이템 ${after.count}개` +

      ` / HP·ATK·AP ×${formatRewardNumber(after.primary)}` +

      ` / SPD·치확·치피 ×${formatRewardNumber(after.secondary)}`

    );

  }


  // ==================== 왕관 보유 중 다른 아이템 획득 ====================

  return (

    "오만의 왕관에 의해 기존 효과 무효화" +

    ` / 무효화 아이템 ${before.count} → ${after.count}개` +

    ` / HP·ATK·AP 배율 ${formatRewardNumber(before.primary)}` +

    ` → ${formatRewardNumber(after.primary)}` +

    ` / SPD·치확·치피 배율 ${formatRewardNumber(before.secondary)}` +

    ` → ${formatRewardNumber(after.secondary)}`

  );

}


// ==================== 특수 아이템 보상 생성 ====================

function createSpecialReward(item, items, floor) {

  const currentCount = getItemCount(
    items,
    item.id
  );


  // ==================== 아이템 획득 미리보기 ====================

  const preview = previewItemAcquisition(
    items,
    item.id
  );

  if (!preview.success) {

    throw new Error(
      "획득할 수 없는 특수 아이템입니다."
    );

  }

  const afterItems = preview.items;


  // ==================== 획득 후 보유 개수 ====================

  // 오만의 왕관은 acquireItem()에서
  // 즉시 3스택으로 처리

  const nextCount = getItemCount(
    afterItems,
    item.id
  );


  // ==================== 기본 아이템 효과 설명 ====================

  let effectText = getItemEffectText(
    item.id,
    nextCount
  );


  // ==================== 오만의 왕관 적용 ====================

  const crownActive = hasArroganceCrown(
    afterItems
  );

  if (crownActive) {

    effectText = getCrownRewardText(

      items,

      afterItems,

      item.id

    );

  } else {


    // ==================== 최상급 비급서 증가량 계산 ====================

    const beforeBonuses = getFloorItemBonuses(
      items,
      floor
    );

    const afterBonuses = getFloorItemBonuses(
      afterItems,
      floor
    );


    switch (item.id) {

      case "supremeHpBook":

        effectText +=
          ` / 현재 층 기준 HP +${
            afterBonuses.hp - beforeBonuses.hp
          }`;

        break;


      case "supremeAtkBook":

        effectText +=
          ` / 현재 층 기준 ATK +${
            afterBonuses.atk - beforeBonuses.atk
          }`;

        break;


      case "supremeApBook":

        effectText +=
          ` / 현재 층 기준 AP +${
            (afterBonuses.ap ?? 0) -
            (beforeBonuses.ap ?? 0)
          }`;

        break;


      // ==================== 가시 장갑 반사 피해 ====================

      case "thornGloves": {

        const beforeDamage = getReflectionDamage(
          items,
          floor
        );

        const afterDamage = getReflectionDamage(
          afterItems,
          floor
        );

        effectText +=

          ` / 현재 층 반사 피해 ${beforeDamage}` +

          ` → ${afterDamage}`;

        break;

      }


      // ==================== 축복받은 성배 ====================

      case "blessedChalice": {

        const effects = getItemEffects(
          afterItems
        );

        const healPercent =

          20 * (1 + effects.shopHealBonus);

        effectText +=

          ` / 상점 회복약: 최대 HP의 ` +

          `${formatRewardNumber(healPercent)}% 회복`;

        break;

      }

    }

  }


  // ==================== 보상 데이터 반환 ====================

  return {

    id: `special_${item.id}`,

    itemId: item.id,

    title: `${item.emoji} ${item.name}`,

    desc: `${effectText} (${currentCount} → ${nextCount}개)`,

    type: "special",

    currentCount,

    nextCount,

    effectText,

    // 왕관 관련 정보

    crownActive,

    disabled: isItemDisabled(
      afterItems,
      item.id
    )

  };

}


// ==================== 특수 아이템 최대 생명력 미리보기 ====================

// render.js에서 보상 선택 시
// 최대 생명력 감소 및 즉사 여부를 표시하는 용도

export function previewSpecialReward(
  state,
  itemId
) {

  if (!state?.player) {

    return null;

  }

  const item = getItem(itemId);

  if (!item) {

    return null;

  }

  const preview = previewItemAcquisition(

    state.items,

    itemId

  );

  if (!preview.success) {

    return null;

  }


  // ==================== 기존 최대 생명력 ====================

  const beforeMaxHp = getMaxHp(state);


  // ==================== 획득 후 최대 생명력 ====================

  const previewState = {

    ...state,

    items: preview.items

  };

  const afterMaxHp = getMaxHp(
    previewState
  );


  // ==================== 미리보기 결과 ====================

  return {

    itemId,

    beforeMaxHp,

    afterMaxHp,

    hpDifference:
      afterMaxHp - beforeMaxHp,

    fatal:
      afterMaxHp <= 0,

    disabled: isItemDisabled(

      preview.items,

      itemId

    ),

    crown: getCrownMultipliers(
      preview.items
    )

  };

}


// ==================== 보상 무작위 추첨 ====================

export function drawRewards(
  floor,
  count = 3,
  items = currentState.items,
  enemy = currentState.enemy
) {

  // 보스 몬스터 : 특수 아이템 확정
  // 엘리트 몬스터 : 일반 확률 + 별도 패시브 포인트

  const forceSpecial = Boolean(
    enemy?.isBoss
  );


  // 보스의 획득 가능한 특수 아이템이 부족하면
  // 상급 비급서로 대체

  const pool = forceSpecial

    ? REWARDS.filter(
        reward => reward.id.startsWith("advancedBook")
      )

    : [...REWARDS];


  const result = [];

  const excludedItemIds = [];


  // ==================== 보상 개수 검증 ====================

  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > pool.length
  ) {

    throw new Error(
      "잘못된 보상 개수입니다."
    );

  }


  // ==================== 보상 추첨 ====================

  for (let i = 0; i < count; i++) {

    // ==================== 특수 아이템 추첨 ====================

    const specialItem = rollSpecialItem(
      items,
      excludedItemIds,
      forceSpecial
    );

    if (specialItem) {

      const reward = createSpecialReward(
        specialItem,
        items,
        floor
      );

      result.push(reward);

      excludedItemIds.push(
        specialItem.id
      );

      continue;

    }


    // ==================== 일반 보상 추첨 ====================

    const index = Math.floor(
      Math.random() * pool.length
    );

    const baseReward = pool.splice(index, 1)[0];

    // 현재 층수에 따른 비급서 성장량 반영

    const reward = getScaledReward(
      baseReward,
      floor
    );


    // ==================== 골드 보너스 효과 반영 ====================

    if (reward.type === "gold") {

      const baseGold =
        getClearGold(floor) * reward.amount;

      const gold = calculateGoldAmount(
        baseGold,
        items
      );

      reward.desc = `골드 +${gold}`;

    }

    result.push(reward);

  }

  return result;

}


// ==================== 상점 회복약 효율 계산 ====================

// 축복받은 성배는 상점 회복약에만 적용
// 오만의 왕관 보유 시 효과 무효화

export function getShopHealRatio(
  state,
  baseRatio = 0.2
) {

  const effects = getItemEffects(
    state.items
  );

  return baseRatio * (

    1 + effects.shopHealBonus

  );

}


// ==================== 체력 회복 ====================

export function healPlayer(
  state,
  ratio,
  isShop = false
) {

  if (

    !state?.player ||

    state.player.hp <= 0 ||

    !Number.isFinite(ratio) ||

    ratio <= 0

  ) {

    return 0;

  }


  // ==================== 최대 생명력 확인 ====================

  const maxHp = getMaxHp(state);

  if (maxHp <= 0) {

    return 0;

  }


  // ==================== 축복받은 성배 ====================

  // 상점 회복약인 경우에만 회복 효율 증가

  const healRatio = isShop

    ? getShopHealRatio(state, ratio)

    : ratio;


  // ==================== 회복량 계산 ====================

  const healAmount = Math.floor(

    maxHp * healRatio + 1e-9

  );

  const before = state.player.hp;

  state.player.hp = Math.min(
    maxHp,
    state.player.hp + healAmount
  );

  return state.player.hp - before;

}


// ==================== 능력치 증가 ====================

export function increaseStat(
  state,
  stat,
  amount
) {

  const allowedStats = [
    "hp",
    "atk",
    "ap",
    "spd",
    "crit"
  ];


  if (!allowedStats.includes(stat)) {

    throw new Error(
      "잘못된 능력치입니다."
    );

  }


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    throw new Error(
      "잘못된 능력치 증가량입니다."
    );

  }


  // ==================== 플레이어 상태 검증 ====================

  if (
    !state.player ||
    state.player.hp <= 0
  ) {

    throw new Error(
      "능력치를 증가시킬 수 없는 상태입니다."
    );

  }


  // ==================== 기존 최대 체력 저장 ====================

  const beforeMaxHp = getMaxHp(state);


  // ==================== 기본 능력치 증가 ====================

  // 일반 비급서는 오만의 왕관과 관계없이
  // 기본 능력치를 정상적으로 증가시킴

  state.player.base[stat] += amount;


  // ==================== 최대 생명력 변경 처리 ====================

  // 생명 비급서 획득 시 증가한 최대 체력만큼
  // 현재 체력도 증가

  if (stat === "hp") {

    syncPlayerHp(

      beforeMaxHp,

      state

    );

  }

}


// ==================== 특수 아이템 보상 적용 ====================

function applySpecialReward(state, reward) {

  const item = getItem(reward.itemId);

  if (!item) {

    throw new Error(
      "존재하지 않는 특수 아이템입니다."
    );

  }


  // ==================== 최대 보유량 확인 ====================

  if (!canAcquireItem(state.items, item.id)) {

    throw new Error(
      "최대 보유량에 도달한 아이템입니다."
    );

  }


  // ==================== 획득 전 아이템 및 능력치 저장 ====================

  const beforeItems = {

    ...state.items

  };

  const beforeMaxHp = getMaxHp(state);


  // ==================== 특수 아이템 획득 ====================

  // 오만의 왕관은 최초 획득 즉시 3스택
  // 그 외 아이템은 일반적으로 1스택 증가

  const success = acquireItem(
    state.items,
    item.id
  );

  if (!success) {

    throw new Error(
      "특수 아이템 획득에 실패했습니다."
    );

  }


  // ==================== 최대 생명력 변경 처리 ====================

  // 증가한 최대 생명력만큼 현재 생명력 증가
  // 감소한 경우 현재 생명력은 새 최대값으로 제한
  // 최대 생명력이 0 이하가 되면 즉시 사망
  // 불사의 증표는 발동하지 않음

  const survived = syncPlayerHp(

    beforeMaxHp,

    state

  );


  // ==================== 현재 최대 생명력 ====================

  const afterMaxHp = getMaxHp(state);


  // ==================== 현재 아이템 보유량 ====================

  const count = getItemCount(
    state.items,
    item.id
  );


  // ==================== 현재 아이템 효과 ====================

  let effectText = getItemEffectText(

    item.id,

    count,

    state.items

  );


  // ==================== 오만의 왕관 효과 ====================

  const crownActive = hasArroganceCrown(
    state.items
  );

  if (crownActive) {

    effectText = getCrownRewardText(

      beforeItems,

      state.items,

      item.id

    );

  }


  // ==================== 최대 생명력 감소 사망 ====================

  if (!survived) {

    effectText +=

      " / 최대 생명력 0 이하로 사망";

    state.rewards = [];

  }


  // ==================== 특수 아이템 보상 결과 ====================

  return {

    ...reward,

    title: `${item.emoji} ${item.name}`,

    count,

    effectText,


    // 생명력 변경 정보

    beforeMaxHp,

    afterMaxHp,

    hpDifference:
      afterMaxHp - beforeMaxHp,


    // 즉사 여부

    fatal:
      !survived,


    // 오만의 왕관 관련 정보

    crownActive,

    crownAcquired:
      item.id === "arroganceCrown",

    crown: getCrownMultipliers(
      state.items
    ),

    disabled: isItemDisabled(

      state.items,

      item.id

    )

  };

}


// ==================== 보상 적용 ====================

export function applyReward(state, rewardId) {

  // ==================== 보상 선택 단계 확인 ====================

  if (state.phase !== "reward") {

    throw new Error(
      "현재 보상을 선택할 수 없습니다."
    );

  }


  // ==================== 실제 등장한 보상인지 확인 ====================

  const selectedReward = state.rewards.find(
    reward => reward.id === rewardId
  );

  if (!selectedReward) {

    throw new Error(
      "선택할 수 없는 보상입니다."
    );

  }


  // ==================== 특수 아이템 적용 ====================

  if (selectedReward.type === "special") {

    return applySpecialReward(
      state,
      selectedReward
    );

  }


  // ==================== 일반 보상 조회 ====================

  const baseReward = REWARDS.find(
    item => item.id === rewardId
  );

  if (!baseReward) {

    throw new Error(
      "존재하지 않는 보상입니다."
    );

  }


  // 현재 층수 기준으로 비급서 증가량 재계산

  const reward = getScaledReward(
    baseReward,
    state.floor
  );


  // ==================== 보상 유형별 적용 ====================

  switch (reward.type) {

    // ==================== 체력 회복 ====================

    case "heal":

      // 보상 회복약에는 축복받은 성배 미적용

      healPlayer(
        state,
        reward.amount,
        false
      );

      break;


    // ==================== 능력치 증가 ====================

    case "stat":

      increaseStat(
        state,
        reward.stat,
        reward.amount
      );

      break;


    // ==================== 골드 지급 ====================

    case "gold":

      grantGold(
        state,
        getClearGold(state.floor) *
        reward.amount
      );

      break;


    default:

      throw new Error(
        "잘못된 보상 유형입니다."
      );

  }

  return reward;

}


// ==================== 리롤 비용 계산 ====================

export function getRerollCost(
  floor,
  rerollCount
) {

  return Math.max(
    1,
    Math.floor(
      floor *
      Math.pow(
        rerollCount + 1,
        1.2
      )
    )
  );

}


// ==================== 리롤 가능 여부 ====================

export function canReroll(state) {

  if (state.phase !== "reward") {

    return false;

  }

  const cost = getRerollCost(
    state.floor,
    state.rerollCount
  );

  return state.gold >= cost;

}


// ==================== 보상 리롤 ====================

export function rerollRewards(state) {

  if (!canReroll(state)) {

    return {

      success: false,

      message: "보상을 리롤할 수 없습니다."

    };

  }


  // ==================== 리롤 비용 계산 ====================

  const cost = getRerollCost(
    state.floor,
    state.rerollCount
  );


  // ==================== 새로운 보상 추첨 ====================

  const rewards = drawRewards(
    state.floor,
    3,
    state.items,
    state.enemy
  );


  // ==================== 골드 차감 ====================

  state.gold -= cost;


  // ==================== 리롤 횟수 증가 ====================

  state.rerollCount++;


  // ==================== 신규 보상 적용 ====================

  state.rewards = rewards;


  // ==================== 리롤 결과 반환 ====================

  return {

    success: true,

    cost,

    rewards: state.rewards,

    message: `보상 리롤 (-${cost}G)`

  };

}
