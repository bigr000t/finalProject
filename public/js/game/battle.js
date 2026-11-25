"use strict";

import {
  state,
  getPlayerStats
} from "./state.js";

import {
  getClearGold,
  grantGold,
  drawRewards
} from "./reward.js";

import {
  ITEM_CONFIG,
  getItemEffects,
  consumeItem
} from "./item.js";


// ==================== 전투 기본 설정 ====================

export const BATTLE_CONFIG = {
  playerAttackInterval: 1000,
  enemyAttackInterval: 1400,
  enemyCritChance: 0.03,
  tickInterval: 80
};


// ==================== 전투 연출 설정 ====================

export const EFFECT_CONFIG = {
  attackDuration: 150,
  hitDuration: 180,
  criticalDuration: 250,
  deathDuration: 500
};


// ==================== 피해량 계산 ====================

export function calculateDamage(atk, def, critChance) {

  const chance = Math.min(
    1,
    Math.max(0, critChance)
  );

  const critical = Math.random() < chance;

  let damage;

  // 치명타는 방어력을 무시
  if (critical) {

    damage = Math.floor(atk);

  } else {

    damage = Math.floor(
      atk * (100 / (100 + def))
    );

  }

  return {
    damage: Math.max(1, damage),
    critical
  };

}


// ==================== 플레이어 공격 주기 ====================

export function getPlayerAttackInterval() {

  const stats = getPlayerStats();

  return BATTLE_CONFIG.playerAttackInterval / stats.spd;

}


// ==================== 몬스터 공격 주기 ====================

export function getEnemyAttackInterval() {

  const spd = state.enemy?.spd;

  if (!Number.isFinite(spd) || spd <= 0) {
    return BATTLE_CONFIG.enemyAttackInterval;
  }

  return 1000 / spd;

}


// ==================== 몬스터 치명타 확률 ====================

export function getEnemyCritChance() {

  const crit = state.enemy?.crit;

  if (!Number.isFinite(crit)) {
    return BATTLE_CONFIG.enemyCritChance;
  }

  return Math.min(
    0.5,
    Math.max(0, crit)
  );

}


// ==================== 공격 연출 정보 ====================

export function createAttackEffect(attacker, critical) {

  return {
    attacker,

    target: attacker === "player"
      ? "enemy"
      : "player",

    attackDuration: EFFECT_CONFIG.attackDuration,

    hitDuration: EFFECT_CONFIG.hitDuration,

    flash: true,

    shake: critical,

    shakeDuration: critical
      ? EFFECT_CONFIG.criticalDuration
      : 0
  };

}


// ==================== 흡혈의 반지 ====================

export function applyLifesteal(damage) {

  const effects = getItemEffects(state.items);

  if (effects.lifesteal <= 0 || damage <= 0) {
    return 0;
  }

  const stats = getPlayerStats();

  const beforeHp = state.player.hp;

  const healAmount = Math.floor(
    damage * effects.lifesteal
  );

  state.player.hp = Math.min(
    stats.hp,
    state.player.hp + healAmount
  );

  return state.player.hp - beforeHp;

}


// ==================== 가시 장갑 ====================

export function applyReflection() {

  const effects = getItemEffects(state.items);

  const damage = effects.reflection;

  if (damage <= 0) {
    return 0;
  }

  const beforeHp = state.enemy.currentHp;

  state.enemy.currentHp = Math.max(
    0,
    state.enemy.currentHp - damage
  );

  return beforeHp - state.enemy.currentHp;

}

// ==================== 전사 패시브 : 응징 ====================

export function applyCounterDamage() {

  const stats = getPlayerStats();

  const damage = stats.counterDamage;

  if (
    damage <= 0 ||
    state.enemy.currentHp <= 0
  ) {
    return 0;
  }

  const beforeHp = state.enemy.currentHp;

  // 몬스터의 방어력을 무시하는 고정 피해
  state.enemy.currentHp = Math.max(

    0,

    state.enemy.currentHp - damage

  );

  return beforeHp - state.enemy.currentHp;

}

// ==================== 불사의 증표 ====================

export function tryRevive() {

  if (
    state.phase !== "combat" ||
    !state.player ||
    state.player.hp > 0
  ) {
    return null;
  }

  const effects = getItemEffects(state.items);

  if (effects.revive <= 0) {
    return null;
  }

  const consumed = consumeItem(
    state.items,
    "immortalMark"
  );

  if (!consumed) {
    return null;
  }

  const stats = getPlayerStats();

  const reviveHp = Math.max(
    1,
    Math.floor(
      stats.hp * ITEM_CONFIG.reviveHpRatio
    )
  );

  state.player.hp = Math.min(
    stats.hp,
    reviveHp
  );

  const remaining = getItemEffects(
    state.items
  ).revive;

  return {
    type: "revive",
    target: "player",
    hp: state.player.hp,
    remaining,

    effect: {
      target: "player",
      animation: "revive",
      duration: 700
    },

    message:
      `불사의 증표 발동! ` +
      `HP ${state.player.hp}로 소생 ` +
      `(남은 증표: ${remaining}개)`
  };

}

// ==================== 가하는 피해 증가 ====================

export function applyDamageBonus(damage) {

  const stats = getPlayerStats();

  // 맹목의 검 : 상시 피해 증가

  const damageBonus =
    stats.damageBonus;


  // 광전사의 심장 : 체력 33% 이하

  const lowHpDamageBonus =
    stats.lowHpDamageBonus;


  // 서로 다른 피해 증가 효과는 합연산

  const finalDamage =

    damage *

    (
      1 +
      damageBonus +
      lowHpDamageBonus
    );


  return Math.max(

    1,

    Math.floor(finalDamage)

  );

}

// ==================== 받는 피해 감소 ====================

export function applyDamageReduction(
  damage,
  critical = false
) {

  const stats = getPlayerStats();

  const items = getItemEffects(
    state.items
  );


  // ==================== 상시 피해 감소 ====================

  // 불굴의 의지 + 무거운 갑주

  const reduction = Math.min(

    1,

    Math.max(
      0,
      stats.damageReduction
    )

  );


  // ==================== 순결의 방패 ====================

  // 현재 체력이 최대 체력일 때만 적용

  const fullHpReduction = Math.min(

    1,

    Math.max(
      0,
      stats.fullHpDamageReduction
    )

  );


  // ==================== 수호의 부적 ====================

  const criticalReduction = critical

    ? Math.min(

        1,

        Math.max(
          0,
          items.criticalDamageReduction
        )

      )

    : 0;


  // ==================== 최종 피해 계산 ====================

  // 서로 다른 피해 감소 효과는 곱연산

  const finalDamage =

    damage *

    (1 - reduction) *

    (1 - fullHpReduction) *

    (1 - criticalReduction);


  // 최소 피해량 1 유지

  return Math.max(

    1,

    Math.floor(finalDamage)

  );

}


// ==================== 마법사 패시브 : 마력 폭발 ====================

export function calculateCriticalExtraDamage(
  criticalDamage
) {

  const stats = getPlayerStats();

  if (stats.criticalExtraDamage <= 0) {
    return 0;
  }

  // 치명타 피해량의 일정 비율에
  // 몬스터 방어력을 적용
  return Math.max(
    0,

    Math.floor(
      criticalDamage *
      stats.criticalExtraDamage *
      (100 / (100 + state.enemy.def))
    )
  );

}


// ==================== 도적 패시브 : 연격 ====================

export function canExtraAttack() {

  const stats = getPlayerStats();

  if (stats.extraAttackChance <= 0) {
    return false;
  }

  if (state.enemy.currentHp <= 0) {
    return false;
  }

  return Math.random() < stats.extraAttackChance;

}


// ==================== 플레이어 공격 ====================

export function playerAttack(isExtraAttack = false) {

  if (

    state.phase !== "combat" ||

    !state.player ||

    !state.enemy ||

    state.player.hp <= 0 ||

    state.enemy.currentHp <= 0

  ) {

    return null;

  }


  // ==================== 최종 능력치 조회 ====================

  const stats = getPlayerStats();

  const result = calculateDamage(

    stats.atk,

    state.enemy.def,

    stats.crit

  );


  // ==================== 특수 아이템 피해 증가 ====================

  const originalDamage = result.damage;


  // 광전사의 심장 및 맹목의 검 적용

  result.damage = applyDamageBonus(
    originalDamage
  );


  const bonusDamage =

    result.damage - originalDamage;


  // ==================== 기본 공격 피해 ====================

  const beforeHp = state.enemy.currentHp;

  state.enemy.currentHp = Math.max(

    0,

    state.enemy.currentHp - result.damage

  );


  const actualDamage =

    beforeHp - state.enemy.currentHp;


  // ==================== 마력 폭발 ====================

  let magicBurstDamage = 0;

  if (

    result.critical &&

    stats.criticalExtraDamage > 0 &&

    state.enemy.currentHp > 0

  ) {

    const extraDamage =

      calculateCriticalExtraDamage(
        result.damage
      );


    const beforeExtraHp =
      state.enemy.currentHp;


    state.enemy.currentHp = Math.max(

      0,

      state.enemy.currentHp - extraDamage

    );


    magicBurstDamage =

      beforeExtraHp - state.enemy.currentHp;

  }


  // ==================== 흡혈 효과 ====================

  const healed = applyLifesteal(

    actualDamage + magicBurstDamage

  );


  // ==================== 공격 결과 ====================

  return {

    attacker: "player",

    target: state.enemy.name,

    damage: result.damage,

    originalDamage,

    bonusDamage,

    actualDamage,

    critical: result.critical,

    magicBurstDamage,

    isExtraAttack,

    healed,

    remainingHp: state.enemy.currentHp,

    defeated: state.enemy.currentHp === 0,

    effect: createAttackEffect(

      "player",

      result.critical

    )

  };

}


// ==================== 몬스터 공격 ====================

export function enemyAttack() {

  if (
    state.phase !== "combat" ||
    !state.player ||
    !state.enemy ||
    state.player.hp <= 0 ||
    state.enemy.currentHp <= 0
  ) {
    return null;
  }

  const stats = getPlayerStats();

  const result = calculateDamage(
    state.enemy.atk,
    stats.def,
    getEnemyCritChance()
  );


  // ==================== 불굴의 의지 ====================

  const originalDamage = result.damage;

  const finalDamage = applyDamageReduction(
  originalDamage,
  result.critical
);

  const reducedDamage =
    originalDamage - finalDamage;


  // ==================== 플레이어 피격 ====================

  const beforeHp = state.player.hp;

  state.player.hp = Math.max(
    0,
    state.player.hp - finalDamage
  );

  const actualDamage =
    beforeHp - state.player.hp;


  // ==================== 가시 장갑 ====================

  const reflected = applyReflection();


  // ==================== 전사 패시브 : 응징 ====================

  const counterDamage = applyCounterDamage();


  // ==================== 불사의 증표 ====================

  const reviveEvent = state.player.hp === 0
    ? tryRevive()
    : null;


  // ==================== 공격 결과 ====================

  return {
    attacker: "enemy",

    target: "player",

    damage: finalDamage,

    originalDamage,

    reducedDamage,

    actualDamage,

    critical: result.critical,

    reflected,

    counterDamage,

    reviveEvent,

    remainingHp: state.player.hp,

    defeated: state.player.hp === 0,

    enemyDefeated: state.enemy.currentHp === 0,

    effect: createAttackEffect(
      "enemy",
      result.critical
    )
  };

}


// ==================== 전투 타이머 정지 ====================

export function stopBattle() {

  if (state.timer !== null) {

    clearInterval(state.timer);

    state.timer = null;

  }

}


// ==================== 전투 승리 ====================

export function winBattle() {

  if (
    state.phase !== "combat" ||
    !state.player ||
    !state.enemy ||
    state.enemy.currentHp !== 0 ||
    state.player.hp <= 0
  ) {
    return null;
  }

  stopBattle();

  const baseGold = getClearGold(state.floor);

  const gold = grantGold(
    state,
    baseGold
  );

  const bonusGold = gold - baseGold;

  state.rerollCount = 0;

  state.rewards = drawRewards(
    state.floor,
    3,
    state.items
  );

  state.phase = "reward";

  const message = bonusGold > 0

    ? `${state.floor}층 클리어! ` +
      `(+${gold}G, 금사의 반지 +${bonusGold}G)`

    : `${state.floor}층 클리어! (+${gold}G)`;

  return {
    type: "win",

    floor: state.floor,

    gold,

    baseGold,

    bonusGold,

    rewards: state.rewards,

    isBoss: state.enemy.isBoss ?? false,

    effect: {
      target: "enemy",
      animation: "death",
      duration: EFFECT_CONFIG.deathDuration
    },

    message
  };

}


// ==================== 전투 패배 ====================

export function loseBattle() {

  if (
    state.phase !== "combat" ||
    !state.player ||
    state.player.hp !== 0
  ) {
    return null;
  }

  stopBattle();

  state.phase = "dead";

  state.rewards = [];

  return {
    type: "lose",

    floor: state.floor,

    highestFloor: state.floor - 1,

    effect: {
      target: "player",
      animation: "death",
      duration: EFFECT_CONFIG.deathDuration
    },

    message: `${state.floor}층에서 쓰러졌습니다.`
  };

}


// ==================== 전투 종료 판정 ====================

function checkBattleEnd(events) {

  // 플레이어 사망 우선 확인
  if (state.player.hp <= 0) {

    const reviveEvent = tryRevive();

    if (reviveEvent) {

      events.push(reviveEvent);

    } else {

      const event = loseBattle();

      if (event) {
        events.push(event);
      }

      return true;

    }

  }

  // 몬스터 사망 확인
  if (state.enemy.currentHp <= 0) {

    const event = winBattle();

    if (event) {
      events.push(event);
    }

    return true;

  }

  return false;

}


// ==================== 플레이어 공격 이벤트 생성 ====================

function appendPlayerAttackEvents(events, result) {

  if (!result) {
    return;
  }

  // 일반 공격 또는 연격 공격
  events.push({
    type: "attack",
    ...result
  });

  // 특수 아이템 피해 증가

  if (result.bonusDamage > 0) {

    events.push({

      type: "damageBonus",

      target: "enemy",

      amount: result.bonusDamage,

      message:

        `피해 증가 효과: ${result.bonusDamage} 추가 피해`

    });

  }

  // 마법사 추가 피해
  if (result.magicBurstDamage > 0) {

    events.push({
      type: "magicBurst",

      target: "enemy",

      damage: result.magicBurstDamage,

      message:
        `마력 폭발: ${result.magicBurstDamage} 추가 피해`
    });

  }


  // 흡혈 회복
  if (result.healed > 0) {

    events.push({
      type: "lifesteal",

      target: "player",

      amount: result.healed,

      message:
        `흡혈의 반지: HP +${result.healed}`
    });

  }

}


// ==================== 몬스터 공격 이벤트 생성 ====================

function appendEnemyAttackEvents(events, result) {

  if (!result) {
    return;
  }

  events.push({
    type: "attack",
    ...result
  });


  // 전사 피해 감소
  if (result.reducedDamage > 0) {

    events.push({
      type: "damageReduction",

      target: "player",

      amount: result.reducedDamage,

      message:
        `피해 감소 효과: ${result.reducedDamage} 피해 감소`
    });

  }


  // 가시 장갑
  if (result.reflected > 0) {

    events.push({
      type: "reflection",

      target: "enemy",

      damage: result.reflected,

      message:
        `가시 장갑: ${result.reflected} 고정 피해`
    });

  }

  // ==================== 전사 패시브 : 응징 ====================

  if (result.counterDamage > 0) {

    events.push({

      type: "counterAttack",

      target: "enemy",

      damage: result.counterDamage,

      message:
        `응징: ${result.counterDamage} 고정 피해`

    });

  }

  // 불사의 증표
  if (result.reviveEvent) {

    events.push(
      result.reviveEvent
    );

  }

}


// ==================== 전투 1회 판정 ====================

export function battleTick(now = performance.now()) {

  const events = [];

  if (
    state.phase !== "combat" ||
    !state.player ||
    !state.enemy
  ) {
    return events;
  }


  // ==================== 기존 종료 조건 확인 ====================

  if (checkBattleEnd(events)) {
    return events;
  }


  // ==================== 플레이어 공격 ====================

  const playerInterval = getPlayerAttackInterval();

  if (
    now - state.lastPlayerAttack >= playerInterval
  ) {

    state.lastPlayerAttack = now;

    const result = playerAttack();

    appendPlayerAttackEvents(
      events,
      result
    );

    if (checkBattleEnd(events)) {
      return events;
    }


    // ==================== 도적 연격 ====================

    if (result && canExtraAttack()) {

      events.push({
        type: "extraAttack",

        target: "enemy",

        message: "연격 발동! 추가 공격!"
      });

      // 추가 공격은 연격을 재발동시키지 않음
      const extraResult = playerAttack(true);

      appendPlayerAttackEvents(
        events,
        extraResult
      );

      if (checkBattleEnd(events)) {
        return events;
      }

    }

  }


  // ==================== 몬스터 공격 ====================

  const enemyInterval = getEnemyAttackInterval();

  if (
    now - state.lastEnemyAttack >= enemyInterval
  ) {

    state.lastEnemyAttack = now;

    const result = enemyAttack();

    appendEnemyAttackEvents(
      events,
      result
    );

    if (checkBattleEnd(events)) {
      return events;
    }

  }

  return events;

}


// ==================== 전투 시작 및 재개 ====================

export function startBattle(onEvents = () => {}) {

  if (
    state.phase !== "combat" ||
    !state.player ||
    !state.enemy
  ) {
    return false;
  }

  stopBattle();

  const now = performance.now();

  state.lastPlayerAttack = now;

  state.lastEnemyAttack = now;

  state.timer = setInterval(() => {

    const events = battleTick();

    if (events.length > 0) {

      onEvents(events);

    }

  }, BATTLE_CONFIG.tickInterval);

  return true;

}