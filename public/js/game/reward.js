"use strict";

import {
  state as currentState,
  getMaxHp
} from "./state.js";

import {
  ITEM_CONFIG,
  rollSpecialItem,
  getItem,
  getItemCount,
  getItemEffects,
  getItemEffectText,
  getFloorItemBonuses,
  canAcquireItem,
  acquireItem
} from "./item.js";


// ==================== 일반 보상 데이터 ====================

export const REWARDS = [

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

    {
    id: "bookHp",
    title: "생명 비급서",
    desc: "기본 HP +10",
    type: "stat",
    stat: "hp",
    amount: 10
  },

  {
    id: "bookAtk",
    title: "공격 비급서",
    desc: "기본 공격력 +2",
    type: "stat",
    stat: "atk",
    amount: 2
  },

  {
    id: "bookDef",
    title: "방어 비급서",
    desc: "기본 방어력 +2",
    type: "stat",
    stat: "def",
    amount: 2
  },

  {
    id: "advancedBookHp",
    title: "상급 생명 비급서",
    desc: "기본 HP +20",
    type: "stat",
    stat: "hp",
    amount: 20
  },

  {
    id: "advancedBookAtk",
    title: "상급 공격 비급서",
    desc: "기본 공격력 +4",
    type: "stat",
    stat: "atk",
    amount: 4
  },

  {
    id: "advancedBookDef",
    title: "상급 방어 비급서",
    desc: "기본 방어력 +4",
    type: "stat",
    stat: "def",
    amount: 4
  },

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
    desc: "기본 지급 골드의 2배",
    type: "gold",
    amount: 2
  }

];


// ==================== 층 클리어 기본 골드 ====================

export function getClearGold(floor, enemy = null) {

  const baseGold = floor * 5;

  if (enemy?.isBoss) {

    return baseGold * 3;

  }

  if (enemy?.isElite) {

    return baseGold * 2;

  }

  return baseGold;

}


// ==================== 최종 골드 획득량 계산 ====================

export function calculateGoldAmount(
  amount,
  items
) {

  const effects = getItemEffects(items);

  return Math.floor(

    amount * (1 + effects.goldBonus)

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

// ==================== 특수 아이템 보상 생성 ====================

function createSpecialReward(item, items, floor) {

  const currentCount = getItemCount(
    items,
    item.id
  );

  const nextCount = Math.min(
    ITEM_CONFIG.maxStack,
    currentCount + 1
  );

  let effectText = getItemEffectText(
    item.id,
    nextCount
  );


  // ==================== 최상급 비급서 증가량 계산 ====================

  const beforeBonuses = getFloorItemBonuses(
    items,
    floor
  );

  const afterBonuses = getFloorItemBonuses(
    {
      ...items,
      [item.id]: nextCount
    },
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


    case "supremeDefBook":

      effectText +=
        ` / 현재 층 기준 DEF +${
          afterBonuses.def - beforeBonuses.def
        }`;

      break;

  }


  // ==================== 보상 데이터 반환 ====================

  return {

    id: `special_${item.id}`,

    itemId: item.id,

    title: `${item.emoji} ${item.name}`,

    desc: `${effectText} (${currentCount} → ${nextCount}개)`,

    type: "special",

    currentCount,

    nextCount

  };

}


// ==================== 보상 무작위 추첨 ====================

export function drawRewards(

  floor,

  count = 3,

  items = currentState.items,

  enemy = currentState.enemy

) {

  const forceSpecial = Boolean(

    enemy?.isBoss || enemy?.isElite

  );


  // 엘리트 및 보스 보상 대체용 상급 비급서

  const pool = forceSpecial

    ? REWARDS.filter(
        reward => reward.id.startsWith("advancedBook")
      )

    : [...REWARDS];


  const result = [];

  const excludedItemIds = [];


  if (

    !Number.isSafeInteger(count) ||

    count < 1 ||

    count > pool.length

  ) {

    throw new Error(
      "잘못된 보상 개수입니다."
    );

  }


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


      // 동일 특수 아이템 중복 등장 방지

      excludedItemIds.push(
        specialItem.id
      );

      continue;

    }


    // ==================== 일반 보상 추첨 ====================

    const index = Math.floor(

      Math.random() * pool.length

    );

    const reward = {

      ...pool.splice(index, 1)[0]

    };


    // 금사의 반지 효과 반영

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

// ==================== 체력 회복 ====================

export function healPlayer(state, ratio) {

  const maxHp = getMaxHp(state);

  const healAmount = Math.floor(

    maxHp * ratio

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
    "def",
    "spd",
    "crit"

  ];

  if (!allowedStats.includes(stat)) {

    throw new Error(
      "잘못된 능력치입니다."
    );

  }

  const beforeMaxHp = getMaxHp(state);

  state.player.base[stat] += amount;


  // 최대 체력 증가 시 증가분만큼 현재 체력도 증가

  if (stat === "hp") {

    const afterMaxHp = getMaxHp(state);

    const growth =

      afterMaxHp - beforeMaxHp;

    state.player.hp = Math.min(

      afterMaxHp,

      state.player.hp + growth

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

  if (!canAcquireItem(state.items, item.id)) {

    throw new Error(
      "최대 보유량에 도달한 아이템입니다."
    );

  }

  const success = acquireItem(

    state.items,

    item.id

  );

  if (!success) {

    throw new Error(
      "특수 아이템 획득에 실패했습니다."
    );

  }

  const count = getItemCount(

    state.items,

    item.id

  );

  return {

    ...reward,

    title: `${item.emoji} ${item.name}`,

    count,

    effectText: getItemEffectText(

      item.id,

      count

    )

  };

}


// ==================== 보상 적용 ====================

export function applyReward(state, rewardId) {

  // 보상 선택 단계 확인
  if (state.phase !== "reward") {

    throw new Error(
      "현재 보상을 선택할 수 없습니다."
    );

  }

  // 실제 등장한 보상인지 확인
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


  // ==================== 일반 보상 적용 ====================

  const reward = REWARDS.find(item => {

    return item.id === rewardId;

  });

  if (!reward) {

    throw new Error(
      "존재하지 않는 보상입니다."
    );

  }

  switch (reward.type) {

    case "heal":

      healPlayer(
        state,
        reward.amount
      );

      break;


    case "stat":

      increaseStat(

        state,

        reward.stat,

        reward.amount

      );

      break;


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

  const cost = getRerollCost(

    state.floor,

    state.rerollCount

  );

  state.gold -= cost;

  state.rerollCount++;

  // 리롤 시에도 특수 아이템 등장 가능
state.rewards = drawRewards(

  state.floor,

  3,

  state.items,

  state.enemy

  );

  return {

    success: true,

    cost,

    rewards: state.rewards,

    message: `보상 리롤 (-${cost}G)`

  };

}
