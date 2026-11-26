"use strict";

import {
  healPlayer,
  increaseStat
} from "./reward.js";


// ==================== 일반 상점 상품 데이터 ====================

export const SHOP_ITEMS = [

  // ==================== 회복약 ====================

  {
    id: "heal1",
    title: "회복약",
    desc: "최대 HP의 20% 회복",
    type: "heal",
    amount: 0.2,
    cost: 3,
    scaling: true
  },


  // ==================== 생명 비급서 ====================

  {
    id: "bookHp",
    title: "생명 비급서",
    desc: "기본 HP +20",
    type: "stat",
    stat: "hp",
    amount: 20,
    cost: 800,
    scaling: false
  },


  // ==================== 공격 비급서 ====================

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


  // ==================== 주문 비급서 ====================

  {
    id: "bookAp",
    title: "주문 비급서",
    desc: "기본 주문력 +2",
    type: "stat",
    stat: "ap",
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

  if (

    state.phase !== "shop" ||

    !state.player ||

    state.player.hp <= 0

  ) {

    return false;

  }


  // ==================== 상품 조회 ====================

  const item = SHOP_ITEMS.find(item => {

    return item.id === itemId;

  });

  if (!item) {

    return false;

  }


  // ==================== 상품 가격 계산 ====================

  const cost = getItemCost(

    item,

    state.floor

  );


  // ==================== 보유 골드 확인 ====================

  return state.gold >= cost;

}


// ==================== 일반 상품 구매 ====================

export function buyItem(state, itemId) {


  // ==================== 구매 가능 여부 확인 ====================

  if (!canBuyItem(state, itemId)) {

    return {

      success: false,

      message: "상품을 구매할 수 없습니다."

    };

  }


  // ==================== 상품 조회 ====================

  const item = SHOP_ITEMS.find(item => {

    return item.id === itemId;

  });


  // ==================== 상품 가격 계산 ====================

  const cost = getItemCost(

    item,

    state.floor

  );


  // ==================== 상품 효과 적용 ====================

  switch (item.type) {


    // ==================== 회복약 구매 ====================

    case "heal": {

      const healed = healPlayer(

        state,

        item.amount

      );


      // 회복할 체력이 없다면 골드를 차감하지 않음

      if (healed === 0) {

        return {

          success: false,

          message: "회복할 체력이 없습니다."

        };

      }

      break;

    }


    // ==================== 비급서 구매 ====================

    case "stat":

      increaseStat(

        state,

        item.stat,

        item.amount

      );

      break;


    // ==================== 잘못된 상품 유형 ====================

    default:

      return {

        success: false,

        message: "잘못된 상품 유형입니다."

      };

  }


  // ==================== 골드 차감 ====================

  state.gold -= cost;


  // ==================== 구매 결과 반환 ====================

  return {

    success: true,

    cost,

    item,

    message: `${item.title} 구매 (-${cost}G)`

  };

}
