"use strict";

import {
  state as currentState,
  getMaxHp
} from "./state.js";

import {
  healPlayer,
  increaseStat,
  getBookAmount,
  getBookCost,
  getBookDescription,
  getShopHealRatio
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
    desc: getBookDescription(1, "hp", false, true),
    type: "stat",
    stat: "hp",
    amount: getBookAmount(1, "hp", false, true),
    cost: getBookCost(1)
  },

  // ==================== 공격 비급서 ====================

  {
    id: "bookAtk",
    title: "공격 비급서",
    desc: getBookDescription(1, "atk", false, true),
    type: "stat",
    stat: "atk",
    amount: getBookAmount(1, "atk", false, true),
    cost: getBookCost(1)
  },

  // ==================== 주문 비급서 ====================

  {
    id: "bookAp",
    title: "주문 비급서",
    desc: getBookDescription(1, "ap", false, true),
    type: "stat",
    stat: "ap",
    amount: getBookAmount(1, "ap", false, true),
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


// ==================== 표시용 숫자 변환 ====================

function formatShopNumber(value, digits = 2) {

  return Number(

    Number(value).toFixed(digits)

  ).toString();

}


// ==================== 층별 상품 데이터 생성 ====================

function getScaledShopItem(
  item,
  floor,
  gameState = currentState
) {

  const cost = getItemCost(
    item,
    floor
  );


  // ==================== 상점 비급서 ====================

  // 기존 비급서 성장량 및 가격 유지

  if (item.type === "stat") {

    return {

      ...item,

      amount: getBookAmount(
        floor,
        item.stat,
        false,
        true
      ),

      desc: getBookDescription(
        floor,
        item.stat,
        false,
        true
      ),

      cost

    };

  }


  // ==================== 상점 회복약 ====================

  // 축복받은 성배의 회복 효율 반영
  // 오만의 왕관 보유 시 성배 효과 무효화

  if (item.type === "heal") {

    const baseRatio = item.amount;

    const effectiveRatio = getShopHealRatio(

      gameState,

      baseRatio

    );


    // ==================== 회복률 계산 ====================

    const basePercent = baseRatio * 100;

    const effectivePercent = effectiveRatio * 100;

    const bonusPercent =

      (effectiveRatio - baseRatio) * 100;

    const bonusActive =

      effectiveRatio > baseRatio + 1e-9;


    // ==================== 상품 설명 ====================

    let desc =

      `최대 HP의 ${formatShopNumber(effectivePercent)}% 회복`;


    // 축복받은 성배 적용 여부 표시

    if (bonusActive) {

      desc +=

        ` (축복받은 성배 +${formatShopNumber(bonusPercent)}%p)`;

    }


    // ==================== 회복약 데이터 반환 ====================

    return {

      ...item,

      // 기본 회복률 유지
      // 실제 구매 시 healPlayer()에서 성배 적용
      // 중복 적용 방지

      amount: baseRatio,

      baseRatio,

      effectiveRatio,

      basePercent,

      effectivePercent,

      bonusPercent,

      bonusActive,

      desc,

      cost

    };

  }


  // ==================== 기타 상품 ====================

  return {

    ...item,

    cost

  };

}


// ==================== 전체 상점 상품 조회 ====================

export function getShopItems(
  floor,
  gameState = currentState
) {

  return SHOP_ITEMS.map(

    item => getScaledShopItem(
      item,
      floor,
      gameState
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

  const maxHp = getMaxHp(state);

  if (maxHp <= 0) {

    return false;

  }


  // ==================== 회복약 구매 가능 여부 ====================

  if (
    item.type === "heal" &&
    state.player.hp >= maxHp
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

    state.floor,

    state

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

  const maxHp = getMaxHp(state);

  if (maxHp <= 0) {

    return {

      success: false,

      message: "최대 생명력이 소진되었습니다."

    };

  }


  if (
    item.type === "heal" &&
    state.player.hp >= maxHp
  ) {

    return {

      success: false,

      message: "이미 최대 체력입니다."

    };

  }


  let message = "";


  // ==================== 회복약 구매 결과 ====================

  let healed = 0;

  let bonusHealed = 0;


  // ==================== 상품 효과 적용 ====================

  switch (item.type) {


    // ==================== 회복약 ====================

    case "heal": {


      // ==================== 구매 전 현재 체력 ====================

      const beforeHp = state.player.hp;


      // ==================== 성배 미적용 회복량 ====================

      const normalHealAmount = Math.floor(

        maxHp * item.amount + 1e-9

      );


      // 최대 생명력을 초과하는 회복량 제외

      const normalHealed = Math.min(

        maxHp - beforeHp,

        normalHealAmount

      );


      // ==================== 실제 회복 효과 적용 ====================

      // 세 번째 매개변수 true:
      // 상점 회복약으로 판정하여 축복받은 성배 적용

      // item.amount는 기본 회복률 0.2 유지
      // item.effectiveRatio를 전달하면 중복 적용되므로 주의

      healed = healPlayer(

        state,

        item.amount,

        true

      );


      if (healed <= 0) {

        return {

          success: false,

          message: "회복할 체력이 없습니다."

        };

      }


      // ==================== 성배 추가 회복량 ====================

      bonusHealed = Math.max(

        0,

        healed - normalHealed

      );


      // ==================== 구매 메시지 ====================

      message =

        `${item.title} 구매: HP +${healed}`;


      // 실제 추가 회복이 발생한 경우에만 표시

      if (bonusHealed > 0) {

        message +=

          ` (축복받은 성배 +${bonusHealed})`;

      }

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

  // 축복받은 성배는 회복 효율에만 영향
  // 상품 가격에는 영향 없음

  state.gold -= cost;


  // ==================== 구매 결과 반환 ====================

  return {

    success: true,

    item,

    cost,

    healed,

    bonusHealed,

    message: `${message} (-${cost}G)`

  };

}
