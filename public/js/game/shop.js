"use strict";

import {
  getPassives,
  getPassive
} from "./class.js";

import {
  getMaxHp
} from "./state.js";

import {
  healPlayer,
  increaseStat
} from "./reward.js";


// ==================== 일반 상점 상품 데이터 ====================

export const SHOP_ITEMS = [

  {
    id: "heal1",
    title: "회복약",
    desc: "최대 HP의 20% 회복",
    type: "heal",
    amount: 0.2,
    cost: 3,
    scaling: true
  },

  {
    id: "bookHp",
    title: "생명 비급서",
    desc: "기본 HP +10",
    type: "stat",
    stat: "hp",
    amount: 10,
    cost: 800,
    scaling: false
  },

  {
    id: "bookAtk",
    title: "공격 비급서",
    desc: "기본 공격력 +2",
    type: "stat",
    stat: "atk",
    amount: 2,
    cost: 800,
    scaling: false
  },

  {
    id: "bookDef",
    title: "방어 비급서",
    desc: "기본 방어력 +2",
    type: "stat",
    stat: "def",
    amount: 2,
    cost: 800,
    scaling: false
  }

];


// ==================== 일반 상품 가격 계산 ====================

export function getItemCost(item, floor) {

  if (item.scaling) {

    return item.cost * floor;

  }

  return item.cost;

}


// ==================== 일반 상점 상품 조회 ====================

export function getShopItems(floor) {

  return SHOP_ITEMS.map(item => {

    return {

      ...item,

      cost: getItemCost(item, floor),

      scaling: false

    };

  });

}


// ==================== 일반 상품 구매 가능 여부 ====================

export function canBuyItem(state, itemId) {

  if (state.phase !== "shop") {

    return false;

  }

  const item = SHOP_ITEMS.find(item => {

    return item.id === itemId;

  });

  if (!item) {

    return false;

  }

  const cost = getItemCost(

    item,

    state.floor

  );

  return state.gold >= cost;

}


// ==================== 일반 상품 구매 ====================

export function buyItem(state, itemId) {

  if (!canBuyItem(state, itemId)) {

    return {

      success: false,

      message: "상품을 구매할 수 없습니다."

    };

  }

  const item = SHOP_ITEMS.find(item => {

    return item.id === itemId;

  });

  const cost = getItemCost(

    item,

    state.floor

  );

  switch (item.type) {

    case "heal": {

      const healed = healPlayer(

        state,

        item.amount

      );

      if (healed === 0) {

        return {

          success: false,

          message: "회복할 체력이 없습니다."

        };

      }

      break;

    }


    case "stat":

      increaseStat(

        state,

        item.stat,

        item.amount

      );

      break;


    default:

      return {

        success: false,

        message: "잘못된 상품 유형입니다."

      };

  }

  state.gold -= cost;

  return {

    success: true,

    cost,

    item,

    message: `${item.title} 구매 (-${cost}G)`

  };

}


// ==================== 패시브 보유 여부 ====================

export function hasPassive(state, passiveId) {

  if (!Array.isArray(state.passives)) {

    return false;

  }

  return state.passives.some(passive => {

    // 문자열 형태의 저장 데이터도 지원
    if (typeof passive === "string") {

      return passive === passiveId;

    }

    return passive?.id === passiveId;

  });

}


// ==================== 패시브 구매 가능 여부 ====================

export function canBuyPassive(state, passiveId) {

  if (

    state.phase !== "shop" ||

    !state.player ||

    !state.classKey

  ) {

    return false;

  }

  // 현재 클래스에 해당하는 패시브인지 확인
  const passive = getPassive(

    state.classKey,

    passiveId

  );

  if (!passive) {

    return false;

  }

  // 중복 구매 방지
  if (hasPassive(state, passiveId)) {

    return false;

  }

  // 보유 골드 확인
  return state.gold >= passive.cost;

}


// ==================== 패시브 구매 ====================

export function buyPassive(state, passiveId) {

  if (!canBuyPassive(state, passiveId)) {

    return {

      success: false,

      message: "패시브를 구매할 수 없습니다."

    };

  }

  const passive = getPassive(

    state.classKey,

    passiveId

  );


  // 구매 전 최대 체력 저장
  const beforeMaxHp = getMaxHp(state);


  // 골드 차감
  state.gold -= passive.cost;


  // 패시브 보유 목록에 추가
  // 기본 능력치는 직접 변경하지 않음
  state.passives.push({

    id: passive.id,

    name: passive.name

  });


  // 패시브 효과가 적용된 최대 체력
  const afterMaxHp = getMaxHp(state);


  // 최대 체력 증가분 계산
  const hpGrowth = Math.max(

    0,

    afterMaxHp - beforeMaxHp

  );


  // 최대 체력이 증가하면 현재 체력도 증가분만큼 회복
  state.player.hp = Math.min(

    afterMaxHp,

    state.player.hp + hpGrowth

  );


  // 패시브 구매 결과 반환
  return {

    success: true,

    cost: passive.cost,

    passive,

    hpGrowth,

    message:
      `${passive.name} 해금 (-${passive.cost}G)`

  };

}