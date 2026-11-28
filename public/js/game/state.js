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
  ITEM_CONFIG,
  createInitialItems,
  getItemEffects,
  getOwnedItems,
  getFloorItemBonuses,
  isValidItems
} from "./item.js";


// ==================== 게임 기본 설정 ====================

export const MAX_FLOOR = Infinity;
export const MAX_STAT_REROLLS = 3;
export const SAVE_VERSION = 3;

export const COMBAT_CONFIG = Object.freeze({
  lowHpThreshold: 0.33,
  baseCritMultiplier: 1.6,
  apScale: 100,
  maxDamageReduction: Infinity
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
    leaderboardSnapshot: null,
    rewards: [],
    rerollCount: 0,
    timer: null,
    lastPlayerAttack: 0,
    lastEnemyAttack: 0,
    statRerollCount: 0,

    // 관리자 전용 임시 능력치
    adminBaseCritMultiplier: null
  };
}

export const state = createInitialState();


// ==================== 게임 상태 초기화 ====================

export function resetState() {
  if (state.timer !== null) {
    clearInterval(state.timer);
  }

  Object.assign(state, createInitialState());

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


// ==================== 초기 스탯 리롤 ====================

export function canRerollStats() {
  return (
    state.phase === "rolling" &&
    state.statRerollCount < MAX_STAT_REROLLS
  );
}

export function rerollStats() {
  if (!canRerollStats()) {
    return false;
  }

  state.player = createPlayer(state.classKey);
  state.adminBaseCritMultiplier = null;
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

  state.enemy = createEnemy(state.floor);
  state.phase = "combat";

  return true;
}


// ==================== 플레이어 패시브 효과 ====================

export function getPlayerPassiveEffects(gameState = state) {
  return getPassiveEffects(
    gameState.classKey,
    gameState.passives
  );
}


// ==================== 최대 생명력 계산 ====================

export function getMaxHp(gameState = state) {
  if (!gameState.player) {
    return 0;
  }

  const baseHp = gameState.player.base.hp;
  const passives = getPlayerPassiveEffects(gameState);
  const items = getItemEffects(gameState.items);

  const floorBonus = getFloorItemBonuses(
    gameState.items,
    gameState.floor
  );

  // 최대 생명력 증가 및 감소 합연산
  const hpMultiplier =
    1 +
    passives.percentHp +
    items.percentHp -
    items.percentHpPenalty;

  if (hpMultiplier <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (baseHp + floorBonus.hp) *
      hpMultiplier *
      items.crownPrimary +
      1e-9
    )
  );
}


// ==================== 최대 생명력 변경 ====================

export function syncPlayerHp(beforeMaxHp, gameState = state) {
  if (!gameState.player) {
    return false;
  }

  const afterMaxHp = getMaxHp(gameState);

  // 최대 생명력 소진 시 즉사
  // 불사의 증표 미발동
  if (afterMaxHp <= 0) {
    gameState.player.hp = 0;
    gameState.phase = "dead";
    return false;
  }

  const hpGrowth = Math.max(
    0,
    afterMaxHp - beforeMaxHp
  );

  gameState.player.hp = Math.min(
    afterMaxHp,
    gameState.player.hp + hpGrowth
  );

  return true;
}


// ==================== 플레이어 최종 능력치 ====================

export function getPlayerStats(gameState = state) {
  if (!gameState.player) {
    return null;
  }

  const base = gameState.player.base;
  const items = getItemEffects(gameState.items);
  const passives = getPlayerPassiveEffects(gameState);

  const floorBonus = getFloorItemBonuses(
    gameState.items,
    gameState.floor
  );

  // 오만의 왕관 배율
  const crownPrimary = items.crownPrimary;
  const crownSecondary = items.crownSecondary;

  // 최대 생명력
  const hp = getMaxHp(gameState);

  // 저체력 판정
  const isLowHp =
    hp > 0 &&
    gameState.player.hp / hp <=
      COMBAT_CONFIG.lowHpThreshold;


  // ==================== 공격력 ====================

  const rawAtk = Math.max(
    0,
    (base.atk + floorBonus.atk) *
    (
      1 +
      passives.percentAtk +
      items.percentAtk
    ) *
    (
      1 +
      (isLowHp ? passives.lowHpAtkBonus : 0)
    )
  );

  // 부러진 마검
  const convertedAtk = rawAtk * items.atkToApConversion;
  const convertedAp = convertedAtk * 1.5;

  const atkBeforeCrown = Math.max(
    0,
    rawAtk - convertedAtk
  );

  const atk = Math.max(
    0,
    Math.floor(
      atkBeforeCrown * crownPrimary + 1e-9
    )
  );


  // ==================== 주문력 ====================

  const ap = Math.max(
    0,
    Math.floor(
      (
        base.ap +
        (floorBonus.ap ?? 0) +
        Math.floor(atkBeforeCrown + 1e-9) *
          passives.atkToApRatio +
        convertedAp
      ) *
      (
        1 +
        passives.percentAp +
        items.percentAp
      ) *
      crownPrimary +
      1e-9
    )
  );

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
    (
      1 +
      items.percentSpd -
      items.percentSpdPenalty
    ) *
    crownSecondary
  );


  // ==================== 치명타 확률 ====================

  // 사냥하는 말벌
  const isEnemyLowHp =
    !!gameState.enemy &&
    gameState.enemy.maxHp > 0 &&
    gameState.enemy.currentHp > 0 &&
    gameState.enemy.currentHp /
      gameState.enemy.maxHp <=
        ITEM_CONFIG.huntingHpRatio;

  const lowEnemyHpCritBonus =
    isEnemyLowHp ? items.lowEnemyHpCritBonus : 0;

  const crit = Math.min(
    1,
    Math.max(
      0,
      (
        base.crit +
        items.crit +
        scaling * passives.apCritBonus +
        lowEnemyHpCritBonus -
        items.critPenalty
      ) *
      crownSecondary
    )
  );


  // ==================== 치명타 피해량 ====================

  const adminCritMultiplier =
    gameState.adminBaseCritMultiplier;

  const baseCritMultiplier =
    isAdmin() &&
    Number.isFinite(adminCritMultiplier) &&
    adminCritMultiplier >= 1
      ? adminCritMultiplier
      : COMBAT_CONFIG.baseCritMultiplier;

  const critMultiplier =
    (
      baseCritMultiplier +
      passives.critDamageBonus +
      items.critDamageBonus
    ) *
    crownSecondary;


  // ==================== 피해 증가 및 감소 ====================

  const damageReduction = Math.max(
    0,
    scaling * passives.apDamageReduction +
    (isLowHp ? passives.lowHpDamageReduction : 0) +
    items.damageReduction
  );

  const damageBonus = items.damageBonus;
  const damagePenalty = items.damagePenalty;

  const lowHpDamageBonus =
    isLowHp ? items.lowHpDamageBonus : 0;

  const fullHpDamageReduction =
    hp > 0 && gameState.player.hp >= hp
      ? items.fullHpDamageReduction
      : 0;

  const criticalDamageReduction =
    items.criticalDamageReduction;


  // ==================== 수호자의 망토 ====================

  const guardChance = Math.min(
    1,
    Math.max(0, items.guardChance)
  );

  const guardDamageReduction =
    ITEM_CONFIG.guardDamageReduction;


  // ==================== 패시브 효과 ====================

  // 도적 : 연격
  const extraAttackChance = Math.min(
    1,
    Math.max(0, passives.extraAttackChance)
  );

  // 전사 : 응징
  const counterDamage = Math.max(
    0,
    Math.floor(
      hp * passives.counterHpRatio +
      ap * passives.counterApRatio
    )
  );

  // 기본 공격 피해
  // 마법사 : ATK 40% + AP 50%
  const basicAttackDamage =
    gameState.classKey === "mage"
      ? atk * 0.4 + ap * 0.5
      : atk;

  // 전사 : 최후의 일격
  const attackExtraDamage = Math.max(
    0,
    Math.floor(
      isLowHp ? atk * passives.lowHpExtraDamage : 0
    )
  );

  // 마법사 : 마력 폭발
  const magicBurstDamage =
    gameState.classKey === "mage"
      ? Math.max(
          0,
          Math.floor(
            ap * (passives.attackApRatio ?? 0)
          )
        )
      : 0;

  const magicBurstHits =
    gameState.classKey === "mage"
      ? Math.min(
          6,
          Math.max(
            0,
            Math.floor(passives.attackApHits ?? 0)
          )
        )
      : 0;


  // ==================== 최종 능력치 반환 ====================

  return {
    hp,
    atk,
    ap,
    spd,
    crit,
    critMultiplier,

    // 기본 공격 및 패시브 피해
    basicAttackDamage,
    attackExtraDamage,
    magicBurstDamage,
    magicBurstHits,
    extraAttackChance,
    counterDamage,

    // 피해 증감
    damageReduction,
    damageBonus,
    damagePenalty,
    lowHpDamageBonus,
    fullHpDamageReduction,
    criticalDamageReduction,

    // 조건부 치명타 증가
    lowEnemyHpCritBonus,

    // 확률형 피해 감소
    guardChance,
    guardDamageReduction,

    // 부러진 마검
    convertedAtk,
    convertedAp,

    // 층수 비례 능력치
    floorBonus,

    // 오만의 왕관
    crownActive: items.crown > 0,
    crownCount: items.crownCount,
    crownPrimary,
    crownSecondary,

    // 조건부 효과 판정
    isLowHp,
    isEnemyLowHp
  };
}


// ==================== 패시브 포인트 관리 ====================

export function getEarnedPassivePoints(clearedFloor) {
  if (
    !Number.isSafeInteger(clearedFloor) ||
    clearedFloor < 0
  ) {
    return 0;
  }

  const cycles = Math.floor(clearedFloor / 200);
  const remainder = clearedFloor % 200;

  const eliteFloors = [10, 50, 150, 190];

  return (
    cycles * 4 +
    eliteFloors.filter(
      floor => floor <= remainder
    ).length
  );
}


// ==================== 엘리트 패시브 포인트 지급 ====================

export function grantElitePassivePoint(gameState = state) {
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
  ).reduce((sum, level) => sum + level, 0);

  const earned = getEarnedPassivePoints(
    gameState.floor
  );

  const missing = Math.max(
    0,
    earned - spent - gameState.passivePoints
  );

  const granted = Math.min(1, missing);

  gameState.passivePoints += granted;

  return granted;
}


// ==================== 패시브 강화 가능 여부 ====================

export function canUpgradePassive(passiveId, gameState = state) {
  return (
    gameState.phase === "shop" &&
    !!gameState.player &&
    !!gameState.classKey &&
    gameState.passivePoints > 0 &&
    !!getPassive(gameState.classKey, passiveId) &&
    getPassiveLevel(
      gameState.passives,
      passiveId
    ) < MAX_PASSIVE_LEVEL
  );
}


// ==================== 패시브 강화 ====================

export function upgradePassive(passiveId, gameState = state) {
  if (!canUpgradePassive(passiveId, gameState)) {
    return false;
  }

  const beforeMaxHp = getMaxHp(gameState);

  const currentLevel = getPassiveLevel(
    gameState.passives,
    passiveId
  );

  gameState.passives[passiveId] = currentLevel + 1;
  gameState.passivePoints--;

  syncPlayerHp(beforeMaxHp, gameState);

  return true;
}


// ==================== 다음 층 진입 ====================

export function advanceFloor() {
  if (state.phase !== "shop") {
    return false;
  }

  if (
    !state.player ||
    state.player.hp <= 0 ||
    getMaxHp() <= 0
  ) {
    return false;
  }

  if (!Number.isSafeInteger(state.floor + 1)) {
    return false;
  }

  const beforeMaxHp = getMaxHp();
  const nextFloor = state.floor + 1;
  const nextEnemy = createEnemy(nextFloor);

  state.floor = nextFloor;
  state.rerollCount = 0;
  state.rewards = [];

  syncPlayerHp(beforeMaxHp, state);

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

  // 보상 획득으로 사망
  if (
    state.phase === "dead" &&
    state.enemy?.currentHp === 0
  ) {
    return state.floor;
  }

  // 일반 전투 사망
  return Math.max(0, state.floor - 1);
}


// ==================== 리더보드 빌드 데이터 ====================

export function createLeaderboardBuild(gameState = state) {
  const stats = getPlayerStats(gameState);

  if (!stats || !gameState.classKey) {
    return null;
  }

  return {

    // 최종 능력치
    final_stats: {
      maxHp: stats.hp,
      atk: stats.atk,
      ap: stats.ap,
      spd: stats.spd,
      crit: stats.crit * 100,
      critDamage: stats.critMultiplier * 100
    },

    // 현재 보유한 특수 아이템
    special_items: getOwnedItems(gameState.items)
      .map(({ id, name, count }) => ({
        id,
        name,
        count
      })),

    // 해금한 패시브
    passives: getClass(gameState.classKey).passives
      .map(({ id, name }) => ({
        id,
        name,
        level: getPassiveLevel(gameState.passives, id)
      }))
      .filter(passive => passive.level > 0)

  };
}


// ==================== 리더보드 스냅샷 생성 ====================

export function captureLeaderboardSnapshot() {
  if (
    !state.player ||
    state.enemy?.currentHp !== 0
  ) {
    return null;
  }

  const floor = state.floor;

  if (!Number.isSafeInteger(floor) || floor < 1) {
    return null;
  }

  // 동일 층의 스냅샷은 덮어쓰지 않음
  if (state.leaderboardSnapshot?.floor === floor) {
    return state.leaderboardSnapshot;
  }

  const build = createLeaderboardBuild();

  if (!build) {
    return null;
  }

  state.leaderboardSnapshot = {
    floor,
    classKey: state.classKey,
    build
  };

  return state.leaderboardSnapshot;
}


// ==================== 리더보드 스냅샷 복원 ====================

function normalizeLeaderboardSnapshot(snapshot, data) {
  if (
    !snapshot ||
    snapshot.classKey !== data.classKey
  ) {
    return null;
  }

  const floor =
    data.phase === "combat"
      ? data.floor - 1
      : data.floor;

  if (
    !Number.isSafeInteger(snapshot.floor) ||
    snapshot.floor !== floor ||
    floor < 1
  ) {
    return null;
  }

  const build = snapshot.build;

  if (
    !build ||
    !build.final_stats ||
    !Array.isArray(build.special_items) ||
    !Array.isArray(build.passives)
  ) {
    return null;
  }

  const keys = [
    "maxHp",
    "atk",
    "ap",
    "spd",
    "crit",
    "critDamage"
  ];

  if (!keys.every(key =>
    Number.isFinite(build.final_stats[key]) &&
    build.final_stats[key] >= 0
  )) {
    return null;
  }

  return snapshot;
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


// ==================== 관리자 여부 ====================

export function isAdmin() {
  return (
    typeof document !== "undefined" &&
    document.body?.dataset.userRole === "admin"
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

    // 마지막 클리어 시점의 빌드
    leaderboardSnapshot: state.leaderboardSnapshot,

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

    name: monster?.name ?? enemy.name,
    image: monster?.image ?? enemy.image,

    isBoss:
      enemy.isBoss ??
      monster?.isBoss ??
      false,

    isElite:
      enemy.isElite ??
      monster?.isElite ??
      false,

    spd: enemy.spd ?? calculateEnemySpd(
      monster?.spd ?? (1000 / 1400),
      floor
    ),

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

  // 저장 버전
  if (data.version !== SAVE_VERSION) {
    return false;
  }

  // 층수
  if (
    !Number.isSafeInteger(data.floor) ||
    data.floor < 1
  ) {
    return false;
  }

  // 골드
  if (
    !Number.isSafeInteger(data.gold) ||
    data.gold < 0
  ) {
    return false;
  }

  // 보상 리롤 횟수
  if (
    !Number.isSafeInteger(data.rerollCount) ||
    data.rerollCount < 0
  ) {
    return false;
  }

  // 진행 상태
  const allowedPhases = [
    "combat",
    "reward",
    "shop"
  ];

  if (!allowedPhases.includes(data.phase)) {
    return false;
  }

  // 클래스
  let classData;

  try {
    classData = getClass(data.classKey);
  } catch {
    return false;
  }

  // 패시브 및 보상
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

  const allowedPassives = new Set(
    classData.passives.map(passive => passive.id)
  );

  let spentPoints = 0;

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

  const clearedFloor =
    data.phase === "combat"
      ? data.floor - 1
      : data.floor;

  // 패시브 포인트 총량
  if (
    spentPoints + data.passivePoints !==
    getEarnedPassivePoints(clearedFloor)
  ) {
    return false;
  }

  // 특수 아이템
  if (
    data.items !== undefined &&
    !isValidItems(data.items)
  ) {
    return false;
  }

  // 플레이어 데이터
  if (!data.player || !data.player.base) {
    return false;
  }

  const stats = ["hp", "atk", "ap", "spd", "crit"];

  for (const stat of stats) {
    if (
      !Number.isFinite(data.player.base[stat]) ||
      data.player.base[stat] < 0
    ) {
      return false;
    }
  }

  if (
    data.player.base.hp <= 0 ||
    data.player.base.spd <= 0
  ) {
    return false;
  }

  // 최대 생명력
  const maxHp = getMaxHp(data);

  if (
    !Number.isFinite(maxHp) ||
    maxHp <= 0
  ) {
    return false;
  }

  // 현재 생명력
  if (
    !Number.isFinite(data.player.hp) ||
    data.player.hp <= 0 ||
    data.player.hp > maxHp
  ) {
    return false;
  }

  // 몬스터 데이터
  const enemy = normalizeEnemyData(
    data.enemy,
    data.floor
  );

  if (!enemy) {
    return false;
  }

  // 몬스터 생명력
  if (
    !Number.isFinite(enemy.maxHp) ||
    !Number.isFinite(enemy.currentHp) ||
    enemy.maxHp <= 0 ||
    enemy.currentHp < 0 ||
    enemy.currentHp > enemy.maxHp
  ) {
    return false;
  }

  // 몬스터 공격력
  if (
    !Number.isFinite(enemy.atk) ||
    enemy.atk < 0
  ) {
    return false;
  }

  // 몬스터 공격 속도
  if (
    !Number.isFinite(enemy.spd) ||
    enemy.spd <= 0 ||
    enemy.spd > 3
  ) {
    return false;
  }

  // 몬스터 치명타 확률
  if (
    !Number.isFinite(enemy.crit) ||
    enemy.crit < 0 ||
    enemy.crit > 0.5
  ) {
    return false;
  }

  // 전투 중 몬스터 생존 확인
  if (
    data.phase === "combat" &&
    enemy.currentHp <= 0
  ) {
    return false;
  }

  // 보상 및 상점 단계 몬스터 사망 확인
  if (
    (
      data.phase === "reward" ||
      data.phase === "shop"
    ) &&
    enemy.currentHp !== 0
  ) {
    return false;
  }

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

    leaderboardSnapshot: normalizeLeaderboardSnapshot(
      data.leaderboardSnapshot,
      data
    ),

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
  if (!isLoggedIn() || isAdmin()) {
    return false;
  }

  const data = createSaveData();

  if (!isValidSave(data)) {
    return false;
  }

  // 호출 시점의 상태 고정
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
      console.error("게임 저장 실패:", error);
      return false;
    }
  });
}


// ==================== 서버에서 게임 불러오기 ====================

export async function loadGame() {
  if (!isLoggedIn() || isAdmin()) {
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
    console.error("게임 불러오기 실패:", error);
    return false;
  }
}


// ==================== 서버 저장 데이터 삭제 ====================

export async function deleteSave() {
  if (!isLoggedIn() || isAdmin()) {
    return false;
  }

  return queueSaveRequest(async () => {
    try {
      const response = await fetch("/api/save", {
        method: "DELETE"
      });

      return response.ok;

    } catch (error) {
      console.error("저장 데이터 삭제 실패:", error);
      return false;
    }
  });
}
