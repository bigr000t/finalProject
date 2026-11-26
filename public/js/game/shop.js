"use strict";

import {
  getMaxHp
} from "./state.js";

import {
  healPlayer,
  increaseStat,
  getBookAmount,
  getBookCost,
  getBookDescription
} from "./reward.js";


// ==================== 상점 설정 ====================

export const SHOP_ITEMS = [

  // ==================== 회복약 ====================

  {
    id: "heal",
    title: "회복약",
    desc: "최대 HP의 20% 회복",
    type: "heal",
    amount: 0.2,
    costMultiplier: 3
  },


  // ==================== 생명 비급서 ====================

  {
    id: "bookHp",
    title: "생명 비급서",
    desc: getBookDescription(1, "hp"),
    type: "stat",
    stat: "hp",
    amount: getBookAmount(1, "hp"),
    cost: getBookCost(1)
  },


  // ==================== 공격 비급서 ====================

  {
    id: "bookAtk",
    title: "공격 비급서",
    desc: getBookDescription(1, "atk"),
    type: "stat",
    stat: "atk",
    amount: getBookAmount(1, "atk"),
    cost: getBookCost(1)
  },


  // ==================== 주문 비급서 ====================

  {
    id: "bookAp",
    title: "주문 비급서",
    desc: getBookDescription(1, "ap"),
    type: "stat",
    stat: "ap",
    amount: getBookAmount(1, "ap"),
    cost: getBookCost(1)
  }

];


// ==================== 상점 상품 조회 ====================

function getShopItem(itemId) {

  return SHOP_ITEMS.find(

    item => item.id === itemId

  ) || null;

}


// ==================== 상품 가격 계산 ====================

export function getItemCost(item, floor) {

  // 상품 ID로 호출하는 경우에도 대응

  if (typeof item === "string") {

    item = getShopItem(item);

  }


  if (!item) {

    throw new Error(
      "존재하지 않는 상점 상품입니다."
    );

  }


  switch (item.type) {

    // ==================== 회복약 ====================

    case "heal":

      return Math.max(

        1,

        Math.floor(
          floor * item.costMultiplier
        )

      );


    // ==================== 비급서 ====================

    case "stat":

      return getBookCost(floor);


    default:

      throw new Error(
        "잘못된 상점 상품 유형입니다."
      );

  }

}


// ==================== 층별 상품 데이터 생성 ====================

function getScaledShopItem(item, floor) {

  const cost = getItemCost(
    item,
    floor
  );


  // 비급서 능력치와 가격 성장

  if (item.type === "stat") {

    return {

      ...item,

      amount: getBookAmount(
        floor,
        item.stat
      ),

      desc: getBookDescription(
        floor,
        item.stat
      ),

      cost

    };

  }


  // 회복약 등 기존 상품

  return {

    ...item,

    cost

  };

}


// ==================== 전체 상점 상품 조회 ====================

export function getShopItems(floor) {

  return SHOP_ITEMS.map(

    item => getScaledShopItem(
      item,
      floor
    )

  );

}


// ==================== 상품 구매 가능 여부 ====================

export function canBuyItem(state, itemId) {

  if (
    !state ||
    state.phase !== "shop" ||
    !state.player ||
    state.player.hp <= 0
  ) {

    return false;

  }


  // ==================== 상품 조회 ====================

  const item = getShopItem(itemId);

  if (!item) {

    return false;

  }


  // ==================== 상품 가격 계산 ====================

  const cost = getItemCost(
    item,
    state.floor
  );


  // ==================== 보유 골드 확인 ====================

  if (state.gold < cost) {

    return false;

  }


  // ==================== 최대 체력 확인 ====================

  if (
    item.type === "heal" &&
    state.player.hp >= getMaxHp(state)
  ) {

    return false;

  }

  return true;

}


// ==================== 상품 구매 ====================

export function buyItem(state, itemId) {

  // ==================== 구매 가능 상태 확인 ====================

  if (
    !state ||
    state.phase !== "shop" ||
    !state.player ||
    state.player.hp <= 0
  ) {

    return {

      success: false,

      message: "현재 상점을 이용할 수 없습니다."

    };

  }


  // ==================== 상품 조회 ====================

  const baseItem = getShopItem(itemId);

  if (!baseItem) {

    return {

      success: false,

      message: "존재하지 않는 상품입니다."

    };

  }


  // ==================== 층별 상품 정보 계산 ====================

  const item = getScaledShopItem(

    baseItem,

    state.floor

  );


  const cost = item.cost;


  // ==================== 보유 골드 확인 ====================

  if (state.gold < cost) {

    return {

      success: false,

      message: "골드가 부족합니다."

    };

  }


  // ==================== 최대 체력 확인 ====================

  if (
    item.type === "heal" &&
    state.player.hp >= getMaxHp(state)
  ) {

    return {

      success: false,

      message: "이미 최대 체력입니다."

    };

  }


  let message = "";


  // ==================== 상품 효과 적용 ====================

  switch (item.type) {


    // ==================== 회복약 ====================

    case "heal": {

      const healed = healPlayer(

        state,

        item.amount

      );


      if (healed <= 0) {

        return {

          success: false,

          message: "회복할 체력이 없습니다."

        };

      }


      message =
        `${item.title} 구매: HP +${healed}`;

      break;

    }


    // ==================== 비급서 ====================

    case "stat": {

      increaseStat(

        state,

        item.stat,

        item.amount

      );


      const statNames = {

        hp: "최대 생명력",

        atk: "공격력",

        ap: "주문력"

      };


      const statName =
        statNames[item.stat] || item.stat;


      message =

        `${item.title} 구매: ` +

        `${statName} +${item.amount}`;

      break;

    }


    // ==================== 잘못된 상품 ====================

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

    item,

    cost,

    message: `${message} (-${cost}G)`

  };

}
