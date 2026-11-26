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
    desc: "기본 HP +20",
    type: "stat",
    stat: "hp",
    amount: 20
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
    id: "bookAp",
    title: "주문 비급서",
    desc: "기본 주문력 +2",
    type: "stat",
    stat: "ap",
    amount: 2
  },


  // ==================== 상급 비급서 ====================

  {
    id: "advancedBookHp",
    title: "상급 생명 비급서",
    desc: "기본 HP +40",
    type: "stat",
    stat: "hp",
    amount: 40
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
    id: "advancedBookAp",
    title: "상급 주문 비급서",
    desc: "기본 주문력 +4",
    type: "stat",
    stat: "ap",
    amount: 4
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
    desc: "기본 지급 골드의 2배",
    type: "gold",
    amount: 2
  }

];


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


    // 최상급 생명 비급서

    case "supremeHpBook":

      effectText +=

        ` / 현재 층 기준 HP +${

          afterBonuses.hp - beforeBonuses.hp

        }`;

      break;


    // 최상급 공격 비급서

    case "supremeAtkBook":

      effectText +=

        ` / 현재 층 기준 ATK +${

          afterBonuses.atk - beforeBonuses.atk

        }`;

      break;


    // 최상급 주문 비급서

    case "supremeApBook":

      effectText +=

        ` / 현재 층 기준 AP +${

          (afterBonuses.ap ?? 0) -

          (beforeBonuses.ap ?? 0)

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


  // ==================== 보스 특수 아이템 확정 ====================

  // 일반 몬스터 : 일반 확률
  // 엘리트 몬스터 : 일반 확률 + 별도 패시브 포인트
  // 보스 몬스터 : 특수 아이템 확정

  const forceSpecial = Boolean(

    enemy?.isBoss

  );


  // ==================== 보상 추첨 목록 ====================

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


    // ==================== 금사의 반지 효과 반영 ====================

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


  // ==================== 증가 가능한 능력치 ====================

  const allowedStats = [

    "hp",

    "atk",

    "ap",

    "spd",

    "crit"

  ];


  // ==================== 능력치 검증 ====================

  if (!allowedStats.includes(stat)) {

    throw new Error(

      "잘못된 능력치입니다."

    );

  }


  // 증가량 검증

  if (

    !Number.isFinite(amount) ||

    amount <= 0

  ) {

    throw new Error(

      "잘못된 능력치 증가량입니다."

    );

  }


  // ==================== 기존 최대 체력 저장 ====================

  const beforeMaxHp = getMaxHp(state);


  // ==================== 기본 능력치 증가 ====================

  state.player.base[stat] += amount;


  // ==================== 최대 체력 증가 처리 ====================

  // 생명 비급서 획득 시
  // 증가한 최대 체력만큼 현재 체력도 증가

  if (stat === "hp") {

    const afterMaxHp = getMaxHp(state);

    const growth = Math.max(

      0,

      afterMaxHp - beforeMaxHp

    );

    state.player.hp = Math.min(

      afterMaxHp,

      state.player.hp + growth

    );

  }

}


// ==================== 특수 아이템 보상 적용 ====================

function applySpecialReward(state, reward) {


  // ==================== 아이템 조회 ====================

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


  // ==================== 기존 최대 체력 저장 ====================

  const beforeMaxHp = getMaxHp(state);


  // ==================== 특수 아이템 획득 ====================

  const success = acquireItem(

    state.items,

    item.id

  );

  if (!success) {

    throw new Error(

      "특수 아이템 획득에 실패했습니다."

    );

  }


  // ==================== 최대 체력 증가 처리 ====================

  // 최상급 생명 비급서 등의 획득으로
  // 최대 체력이 증가하면 현재 체력도 증가

  const afterMaxHp = getMaxHp(state);

  const hpGrowth = Math.max(

    0,

    afterMaxHp - beforeMaxHp

  );

  state.player.hp = Math.min(

    afterMaxHp,

    state.player.hp + hpGrowth

  );


  // ==================== 현재 아이템 보유량 ====================

  const count = getItemCount(

    state.items,

    item.id

  );


  // ==================== 특수 아이템 보상 결과 ====================

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

  const reward = REWARDS.find(item => {

    return item.id === rewardId;

  });

  if (!reward) {

    throw new Error(

      "존재하지 않는 보상입니다."

    );

  }


  // ==================== 보상 유형별 적용 ====================

  switch (reward.type) {


    // ==================== 체력 회복 ====================

    case "heal":

      healPlayer(

        state,

        reward.amount

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


    // ==================== 잘못된 보상 ====================

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


  // ==================== 리롤 가능 여부 확인 ====================

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

  // 보스 몬스터의 특수 아이템 확정 보상은
  // 리롤 시에도 유지

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
