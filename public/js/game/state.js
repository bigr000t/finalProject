"use strict";

import {
  getClass,
  createPlayer,
  getPassiveEffects,
  getPassive,
  getPassiveLevel,
  MAX_PASSIVE_LEVEL
} from "./class.js";

import {
  createEnemy,
  MONSTERS,
  calculateEnemySpd,
  calculateEnemyCrit
} from "./enemy.js";

import {
  createInitialItems,
  getItemEffects,
  getFloorItemBonuses,
  isValidItems
} from "./item.js";


// ==================== 게임 기본 설정 ====================

export const MAX_FLOOR = Infinity;

export const MAX_STAT_REROLLS = 3;

export const SAVE_VERSION = 3;


// ==================== 전투 설정 ====================

// 임시 밸런스 설정: 테스트 후 조정
export const COMBAT_CONFIG = Object.freeze({
  lowHpThreshold: 0.33,
  baseCritMultiplier: 1.6,
  apScale: 100,
  maxDamageReduction: 0.8
});


// ==================== 주문력 점감 공식 ====================

export function apScaling(ap) {

  return ap / (ap + COMBAT_CONFIG.apScale);

}


// ==================== 게임 초기 상태 ====================

export function createInitialState() {

  return {

    version: SAVE_VERSION,

    phase: "setup",

    floor: 1,

    classKey: null,

    player: null,

    enemy: null,

    gold: 0,

    passivePoints: 0,

    passives: {},

    items: createInitialItems(),

    rewards: [],

    rerollCount: 0,

    timer: null,

    lastPlayerAttack: 0,

    lastEnemyAttack: 0,

    statRerollCount: 0

  };

}


// ==================== 공유 게임 상태 ====================

export const state = createInitialState();


// ==================== 게임 상태 초기화 ====================

export function resetState() {

  if (state.timer !== null) {

    clearInterval(state.timer);

  }

  Object.assign(
    state,
    createInitialState()
  );

  return state;

}


// ==================== 새로운 도전 생성 ====================

export function startNewRun(classKey) {

  if (state.phase !== "setup") {

    return false;

  }

  getClass(classKey);

  resetState();

  state.classKey = classKey;

  state.player = createPlayer(classKey);

  state.statRerollCount = 0;

  state.phase = "rolling";

  return state;

}


// ==================== 초기 스탯 리롤 가능 여부 ====================

export function canRerollStats() {

  return (

    state.phase === "rolling" &&

    state.statRerollCount < MAX_STAT_REROLLS

  );

}


// ==================== 초기 스탯 리롤 ====================

export function rerollStats() {

  if (!canRerollStats()) {

    return false;

  }

  state.player = createPlayer(
    state.classKey
  );

  state.statRerollCount++;

  return true;

}


// ==================== 초기 스탯 확정 ====================

export function confirmStats() {

  if (

    state.phase !== "rolling" ||

    !state.player

  ) {

    return false;

  }

  state.enemy = createEnemy(
    state.floor
  );

  state.phase = "combat";

  return true;

}


// ==================== 플레이어 패시브 효과 ====================

export function getPlayerPassiveEffects(
  gameState = state
) {

  return getPassiveEffects(

    gameState.classKey,

    gameState.passives

  );

}


// ==================== 플레이어 최대 체력 ====================

export function getMaxHp(gameState = state) {

  if (!gameState.player) {

    return 0;

  }

  const baseHp = gameState.player.base.hp;

  const passives = getPlayerPassiveEffects(
    gameState
  );

  const items = getItemEffects(
    gameState.items
  );

  const floorBonus = getFloorItemBonuses(

    gameState.items,

    gameState.floor

  );

  return Math.max(

    1,

    Math.floor(

      (baseHp + floorBonus.hp) *

      (1 + passives.percentHp) *

      (1 - items.percentHpPenalty)

    )

  );

}

// ==================== 플레이어 최종 능력치 ====================

export function getPlayerStats(gameState = state) {

  if (!gameState.player) {

    return null;

  }

  const base = gameState.player.base;


  // ==================== 특수 아이템 효과 ====================

  const items = getItemEffects(
    gameState.items
  );


  // ==================== 클래스 패시브 효과 ====================

  const passives = getPlayerPassiveEffects(
    gameState
  );


  // ==================== 층수 비례 능력치 ====================

  const floorBonus = getFloorItemBonuses(

    gameState.items,

    gameState.floor

  );


  // ==================== 최대 체력 ====================

  const hp = getMaxHp(gameState);


  // ==================== 저체력 판정 ====================

  const isLowHp =

    gameState.player.hp / hp <=

    COMBAT_CONFIG.lowHpThreshold;


  // ==================== 공격력 ====================

  // 공격력 증가 패시브 및 저체력 공격력 증가 적용

  const atk = Math.max(

    0,

    Math.floor(

      (base.atk + floorBonus.atk) *

      (1 + passives.percentAtk) *

      (1 + (

        isLowHp

          ? passives.lowHpAtkBonus

          : 0

      ))

    )

  );


  // ==================== 주문력 ====================

  // 공격력 비례 주문력 증가 적용
  // item.js 개편 전에는 AP 층수 보너스를 0으로 처리

  const ap = Math.max(

    0,

    Math.floor(

      (

        base.ap +

        (floorBonus.ap ?? 0) +

        atk * passives.atkToApRatio

      ) *

      (1 + passives.percentAp)

    )

  );


  // ==================== 주문력 점감 계수 ====================

  const scaling = apScaling(ap);


  // ==================== 공격 속도 ====================

  const spd = Math.max(

    0.1,

    (

      base.spd +

      items.flatSpd +

      passives.flatSpd +

      scaling * passives.apSpdBonus -

      items.flatSpdPenalty

    ) *

    (1 + items.percentSpd)

  );


  // ==================== 치명타 확률 ====================

  const crit = Math.min(

    1,

    Math.max(

      0,

      base.crit +

      items.crit +

      scaling * passives.apCritBonus -

      items.critPenalty

    )

  );


  // ==================== 치명타 피해 배율 ====================

  const critMultiplier =

    COMBAT_CONFIG.baseCritMultiplier +

    passives.critDamageBonus;


  // ==================== 받는 피해 감소 ====================

  // 서로 다른 피해 감소 효과는 곱연산

  const damageReduction = Math.min(

    COMBAT_CONFIG.maxDamageReduction,

    Math.max(

      0,

      1 -

      (1 - scaling * passives.apDamageReduction) *

      (1 - (

        isLowHp

          ? passives.lowHpDamageReduction

          : 0

      )) *

      (1 - items.damageReduction)

    )

  );


  // ==================== 가하는 피해 증가 ====================

  const damageBonus = Math.max(

    0,

    items.damageBonus

  );


  // ==================== 저체력 피해 증가 ====================

  const lowHpDamageBonus =

    isLowHp

      ? items.lowHpDamageBonus

      : 0;


  // ==================== 최대 체력 피해 감소 ====================

  const fullHpDamageReduction =

    gameState.player.hp >= hp

      ? items.fullHpDamageReduction

      : 0;


  // ==================== 추가 공격 확률 ====================

  const extraAttackChance = Math.min(

    1,

    Math.max(

      0,

      passives.extraAttackChance

    )

  );


  // ==================== 전사 패시브 : 응징 ====================

  // 최대 생명력 및 주문력 비례 반격 피해

  const counterDamage = Math.max(

    0,

    Math.floor(

      hp * passives.counterHpRatio +

      ap * passives.counterApRatio

    )

  );


  // ==================== 기본 공격 피해량 ====================

  // 전사 및 도적 : 공격력 100%
  // 마법사 : 주문력 80% + 공격력 20%

  const basicAttackDamage =

    gameState.classKey === "mage"

      ? ap * 0.8 + atk * 0.2

      : atk;


  // ==================== 패시브 추가 피해 ====================

  // 마법사 : 주문력 비례 추가 피해
  // 전사 : 저체력 시 공격력 비례 추가 피해

  const attackExtraDamage = Math.max(

    0,

    Math.floor(

      ap * passives.attackApRatio +

      (

        isLowHp

          ? atk * passives.lowHpExtraDamage

          : 0

      )

    )

  );


  // ==================== 최종 능력치 반환 ====================

  return {

    hp,

    atk,

    ap,

    spd,

    crit,

    critMultiplier,

    basicAttackDamage,

    attackExtraDamage,

    damageReduction,

    damageBonus,

    lowHpDamageBonus,

    fullHpDamageReduction,

    extraAttackChance,

    counterDamage,

    floorBonus,

    isLowHp

  };

}


// ==================== 패시브 포인트 관리 ====================

// 200층마다 엘리트 4종
// 10층, 50층, 150층, 190층

export function getEarnedPassivePoints(clearedFloor) {

  if (

    !Number.isSafeInteger(clearedFloor) ||

    clearedFloor < 0

  ) {

    return 0;

  }

  const cycles = Math.floor(
    clearedFloor / 200
  );

  const remainder = clearedFloor % 200;

  const eliteFloors = [
    10,
    50,
    150,
    190
  ];

  return (

    cycles * 4 +

    eliteFloors.filter(

      floor => floor <= remainder

    ).length

  );

}


// ==================== 엘리트 패시브 포인트 지급 ====================

// 전투 승리 처리에서 호출
// 동일한 층에서 중복 호출해도 중복 적립되지 않음

export function grantElitePassivePoint(
  gameState = state
) {

  if (

    !gameState.enemy?.isElite ||

    gameState.enemy.currentHp !== 0 ||

    !gameState.player ||

    gameState.player.hp <= 0

  ) {

    return 0;

  }

  const spent = Object.values(

    gameState.passives

  ).reduce(

    (sum, level) => sum + level,

    0

  );

  const earned = getEarnedPassivePoints(
    gameState.floor
  );

  const missing = Math.max(

    0,

    earned - spent - gameState.passivePoints

  );

  const granted = Math.min(
    1,
    missing
  );

  gameState.passivePoints += granted;

  return granted;

}


// ==================== 패시브 강화 가능 여부 ====================

export function canUpgradePassive(

  passiveId,

  gameState = state

) {

  return (

    gameState.phase === "shop" &&

    !!gameState.player &&

    !!gameState.classKey &&

    gameState.passivePoints > 0 &&

    !!getPassive(

      gameState.classKey,

      passiveId

    ) &&

    getPassiveLevel(

      gameState.passives,

      passiveId

    ) < MAX_PASSIVE_LEVEL

  );

}


// ==================== 패시브 강화 ====================

export function upgradePassive(

  passiveId,

  gameState = state

) {

  if (!canUpgradePassive(passiveId, gameState)) {

    return false;

  }

  const beforeMaxHp = getMaxHp(
    gameState
  );

  const currentLevel = getPassiveLevel(

    gameState.passives,

    passiveId

  );

  gameState.passives[passiveId] =

    currentLevel + 1;

  gameState.passivePoints--;

  const afterMaxHp = getMaxHp(
    gameState
  );

  // 최대 체력이 증가하면 현재 체력도 증가

  gameState.player.hp = Math.min(

    afterMaxHp,

    gameState.player.hp +

    Math.max(

      0,

      afterMaxHp - beforeMaxHp

    )

  );

  return true;

}


// ==================== 다음 층 진입 ====================

export function advanceFloor() {

  if (state.phase !== "shop") {

    return false;

  }


  // 안전한 정수 범위 초과 방지

  if (

    !Number.isSafeInteger(state.floor + 1)

  ) {

    return false;

  }


  // 이전 층의 최대 체력 저장

  const beforeMaxHp = getMaxHp();


  // 다음 층의 몬스터 생성

  const nextFloor = state.floor + 1;

  const nextEnemy = createEnemy(nextFloor);


  // 다음 층 적용

  state.floor = nextFloor;

  state.rerollCount = 0;

  state.rewards = [];


  // ==================== 최대 체력 증가 처리 ====================

  const afterMaxHp = getMaxHp();

  const hpGrowth = Math.max(

    0,

    afterMaxHp - beforeMaxHp

  );


  // 증가한 최대 체력만큼 현재 체력도 증가

  state.player.hp = Math.min(

    afterMaxHp,

    state.player.hp + hpGrowth

  );


  // ==================== 다음 전투 준비 ====================

  state.enemy = nextEnemy;

  state.lastPlayerAttack = 0;

  state.lastEnemyAttack = 0;

  state.phase = "combat";

  return true;

}


// ==================== 최고 클리어 층수 ====================

export function getHighestFloor() {

  if (

    state.phase === "reward" ||

    state.phase === "shop" ||

    state.phase === "victory"

  ) {

    return state.floor;

  }

  return Math.max(

    0,

    state.floor - 1

  );

}


// ==================== 로그인 여부 ====================

export function isLoggedIn() {

  const userId = Number(

    document.body.dataset.userId

  );

  return (

    Number.isSafeInteger(userId) &&

    userId > 0

  );

}


// ==================== 저장용 게임 데이터 ====================

export function createSaveData() {

  return {

    version: state.version,

    phase: state.phase,

    floor: state.floor,

    classKey: state.classKey,

    player: state.player,

    enemy: state.enemy,

    gold: state.gold,

    passivePoints: state.passivePoints,

    passives: { ...state.passives },

    items: state.items,

    rewards: state.rewards,

    rerollCount: state.rerollCount

  };

}


// ==================== 몬스터 데이터 복원 ====================

function normalizeEnemyData(enemy, floor) {

  if (!enemy || typeof enemy !== "object") {

    return null;

  }

  const monster = MONSTERS.find(

    monster => monster.id === enemy.id

  );

  return {

    ...enemy,


    // 최신 몬스터 이름 우선 적용

    name: monster?.name ?? enemy.name,


    // 최신 몬스터 이미지 우선 적용

    image: monster?.image ?? enemy.image,


    // 보스 여부 복원

    isBoss:

      enemy.isBoss ??

      monster?.isBoss ??

      false,


    // 엘리트 여부 복원

    isElite:

      enemy.isElite ??

      monster?.isElite ??

      false,


    // 공격 속도 복원

    spd: enemy.spd ?? calculateEnemySpd(

      monster?.spd ?? (1000 / 1400),

      floor

    ),


    // 치명타 확률 복원

    crit: enemy.crit ?? calculateEnemyCrit(

      monster?.crit ?? 0.03,

      floor

    )

  };

}


// ==================== 저장 데이터 유효성 확인 ====================

export function isValidSave(data) {

  if (!data || typeof data !== "object") {

    return false;

  }


  // ==================== 저장 버전 검증 ====================

  if (data.version !== SAVE_VERSION) {

    return false;

  }


  // ==================== 기본 진행 데이터 검증 ====================

  // 층수 검증

  if (

    !Number.isSafeInteger(data.floor) ||

    data.floor < 1

  ) {

    return false;

  }


  // 골드 검증

  if (

    !Number.isSafeInteger(data.gold) ||

    data.gold < 0

  ) {

    return false;

  }


  // 보상 리롤 횟수 검증

  if (

    !Number.isSafeInteger(data.rerollCount) ||

    data.rerollCount < 0

  ) {

    return false;

  }


  // 저장 가능한 진행 상태

  const allowedPhases = [

    "combat",

    "reward",

    "shop"

  ];

  if (!allowedPhases.includes(data.phase)) {

    return false;

  }


  // ==================== 클래스 검증 ====================

  let classData;

  try {

    classData = getClass(data.classKey);

  } catch {

    return false;

  }


  // ==================== 패시브 및 보상 데이터 검증 ====================

  if (

    !data.passives ||

    typeof data.passives !== "object" ||

    Array.isArray(data.passives) ||

    !Array.isArray(data.rewards) ||

    !Number.isSafeInteger(data.passivePoints) ||

    data.passivePoints < 0

  ) {

    return false;

  }


  // 현재 클래스가 강화 가능한 패시브

  const allowedPassives = new Set(

    classData.passives.map(

      passive => passive.id

    )

  );

  let spentPoints = 0;


  // 패시브 종류 및 레벨 검증

  for (const [id, level] of Object.entries(data.passives)) {

    if (

      !allowedPassives.has(id) ||

      !Number.isInteger(level) ||

      level < 1 ||

      level > MAX_PASSIVE_LEVEL

    ) {

      return false;

    }

    spentPoints += level;

  }


  // 현재 클리어한 층수 확인

  const clearedFloor =

    data.phase === "combat"

      ? data.floor - 1

      : data.floor;


  // 사용한 포인트 + 남은 포인트가
  // 획득 가능한 포인트와 일치하는지 검증

  if (

    spentPoints + data.passivePoints !==

    getEarnedPassivePoints(clearedFloor)

  ) {

    return false;

  }


  // ==================== 특수 아이템 데이터 검증 ====================

  if (

    data.items !== undefined &&

    !isValidItems(data.items)

  ) {

    return false;

  }


  // ==================== 플레이어 데이터 검증 ====================

  if (!data.player || !data.player.base) {

    return false;

  }

  const stats = [

    "hp",

    "atk",

    "ap",

    "spd",

    "crit"

  ];

  for (const stat of stats) {

    if (

      !Number.isFinite(data.player.base[stat]) ||

      data.player.base[stat] < 0

    ) {

      return false;

    }

  }


  // 플레이어 필수 능력치 검증

  if (

    data.player.base.hp <= 0 ||

    data.player.base.spd <= 0

  ) {

    return false;

  }


  // 패시브 효과가 적용된 최대 체력

  const maxHp = getMaxHp(data);


  // 플레이어 현재 체력 검증

  if (

    !Number.isFinite(data.player.hp) ||

    data.player.hp <= 0 ||

    data.player.hp > maxHp

  ) {

    return false;

  }


  // ==================== 몬스터 데이터 검증 ====================

  const enemy = normalizeEnemyData(

    data.enemy,

    data.floor

  );

  if (!enemy) {

    return false;

  }


  // 몬스터 체력 검증

  if (

    !Number.isFinite(enemy.maxHp) ||

    !Number.isFinite(enemy.currentHp) ||

    enemy.maxHp <= 0 ||

    enemy.currentHp < 0 ||

    enemy.currentHp > enemy.maxHp

  ) {

    return false;

  }


  // 몬스터 공격력 검증

  if (

    !Number.isFinite(enemy.atk) ||

    enemy.atk < 0

  ) {

    return false;

  }


  // 몬스터 공격 속도 검증

  if (

    !Number.isFinite(enemy.spd) ||

    enemy.spd <= 0 ||

    enemy.spd > 3

  ) {

    return false;

  }


  // 몬스터 치명타 확률 검증

  if (

    !Number.isFinite(enemy.crit) ||

    enemy.crit < 0 ||

    enemy.crit > 0.5

  ) {

    return false;

  }


  // ==================== 전투 상태 검증 ====================

  // 전투 중에는 몬스터가 살아 있어야 함

  if (

    data.phase === "combat" &&

    enemy.currentHp <= 0

  ) {

    return false;

  }


  // 보상 및 상점 단계에서는 몬스터가 사망해야 함

  if (

    (

      data.phase === "reward" ||

      data.phase === "shop"

    ) &&

    enemy.currentHp !== 0

  ) {

    return false;

  }


  // ==================== 모든 검증 통과 ====================

  return true;

}


// ==================== 저장 데이터 복원 ====================

export function restoreState(data) {

  if (!isValidSave(data)) {

    return false;

  }

  const enemy = normalizeEnemyData(

    data.enemy,

    data.floor

  );

  resetState();

  Object.assign(state, {

    version: data.version,

    phase: data.phase,

    floor: data.floor,

    classKey: data.classKey,

    player: data.player,

    enemy,

    gold: data.gold,

    passivePoints: data.passivePoints,

    passives: { ...data.passives },

    items: data.items

      ? { ...data.items }

      : createInitialItems(),

    rewards: data.rewards,

    rerollCount: data.rerollCount

  });

  return true;

}


// ==================== 저장 요청 순서 관리 ====================

let saveQueue = Promise.resolve();

function queueSaveRequest(task) {

  const request = saveQueue.then(task);

  saveQueue = request.catch(() => {});

  return request;

}


// ==================== 서버에 게임 저장 ====================

export async function saveGame() {

  if (!isLoggedIn()) {

    return false;

  }

  const data = createSaveData();

  if (!isValidSave(data)) {

    return false;

  }


  // 호출 시점의 상태를 고정

  const body = JSON.stringify(data);

  return queueSaveRequest(async () => {

    try {

      const response = await fetch("/api/save", {

        method: "POST",

        headers: {

          "Content-Type": "application/json"

        },

        body

      });

      return response.ok;

    } catch (error) {

      console.error(

        "게임 저장 실패:",

        error

      );

      return false;

    }

  });

}


// ==================== 서버에서 게임 불러오기 ====================

export async function loadGame() {

  if (!isLoggedIn()) {

    return false;

  }

  try {

    await saveQueue;

    const response = await fetch("/api/save", {

      cache: "no-store"

    });

    if (!response.ok) {

      return false;

    }

    const result = await response.json();

    if (!result.save) {

      return false;

    }

    return restoreState(result.save);

  } catch (error) {

    console.error(

      "게임 불러오기 실패:",

      error

    );

    return false;

  }

}


// ==================== 서버 저장 데이터 삭제 ====================

export async function deleteSave() {

  if (!isLoggedIn()) {

    return false;

  }

  return queueSaveRequest(async () => {

    try {

      const response = await fetch("/api/save", {

        method: "DELETE"

      });

      return response.ok;

    } catch (error) {

      console.error(

        "저장 데이터 삭제 실패:",

        error

      );

      return false;

    }

  });

}
