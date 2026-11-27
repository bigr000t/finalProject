"use strict";

import {
  state,
  getPlayerStats,
  COMBAT_CONFIG,
  grantElitePassivePoint
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

// 일반 공격: 기본 피해량
// 치명타: 기본 피해량 * 치명타 배율

export function calculateDamage(
  baseDamage,
  critChance = 0,
  critMultiplier = COMBAT_CONFIG.baseCritMultiplier
) {

  const chance = Math.min(
    1,
    Math.max(0, critChance)
  );

  const critical = Math.random() < chance;

  const damage = Math.floor(
    baseDamage * (
      critical
        ? critMultiplier
        : 1
    )
  );

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

// 기본 공격의 실제 피해량에만 적용
// 반격 및 패시브 추가 피해는 흡혈 제외

export function applyLifesteal(damage) {

  const effects = getItemEffects(state.items);

  if (
    effects.lifesteal <= 0 ||
    damage <= 0 ||
    !state.player ||
    state.player.hp <= 0
  ) {

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

  if (
    damage <= 0 ||
    state.enemy.currentHp <= 0
  ) {

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

// 최대 생명력과 주문력에 비례하는 반격 피해
// 치명타 및 흡혈 미적용

export function applyCounterDamage() {

  if (state.classKey !== "warrior") {

    return 0;

  }

  const stats = getPlayerStats();

  const damage = stats.counterDamage;

  if (
    damage <= 0 ||
    state.enemy.currentHp <= 0
  ) {

    return 0;

  }

  const beforeHp = state.enemy.currentHp;

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

// 맹목의 검 및 광전사의 심장
// 기본 공격 피해 증가 효과는 합연산

export function applyDamageBonus(damage) {

  const stats = getPlayerStats();

  const damageBonus = stats.damageBonus;

  const lowHpDamageBonus = stats.lowHpDamageBonus;

  const finalDamage =
    damage * (
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

// 패시브 및 특수 아이템의 피해 감소 효과
// 서로 다른 효과는 곱연산
// 최종 피해 감소 상한 적용

export function applyDamageReduction(
  damage,
  critical = false
) {

  const stats = getPlayerStats();

  const items = getItemEffects(
    state.items
  );


  // ==================== 기본 피해 감소 ====================

  // 불굴의 의지, 광전사의 투지, 무거운 갑주

  const reduction = Math.min(
    1,
    Math.max(
      0,
      stats.damageReduction
    )
  );


  // ==================== 순결의 방패 ====================

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


  // ==================== 최종 피해 감소율 ====================

  const totalReduction = Math.min(
    COMBAT_CONFIG.maxDamageReduction,
    Math.max(
      0,
      1 -
      (1 - reduction) *
      (1 - fullHpReduction) *
      (1 - criticalReduction)
    )
  );


  // ==================== 최종 피해량 ====================

  const finalDamage =
    damage * (1 - totalReduction);

  return Math.max(
    1,
    Math.floor(finalDamage)
  );

}


// ==================== 전사 패시브 : 최후의 일격 ====================

// 저체력 시 공격력 비례 추가 피해
// 치명타, 흡혈 및 아이템 피해 증가 미적용

export function calculatePassiveExtraDamage() {

  const stats = getPlayerStats();

  if (!stats) {

    return 0;

  }

  return Math.max(
    0,
    Math.floor(
      stats.attackExtraDamage
    )
  );

}


// ==================== 마법사 패시브 : 마력 폭발 ====================

// 타격당 주문력 10%의 추가 피해
// 레벨별 추가 타격 횟수 : 1 / 3 / 6회
// 치명타, 흡혈 및 아이템 피해 증가 미적용

export function applyMagicBurst(stats = getPlayerStats()) {

  const hits = [];

  if (
    state.classKey !== "mage" ||
    state.phase !== "combat" ||
    !state.player ||
    state.player.hp <= 0 ||
    !state.enemy ||
    state.enemy.currentHp <= 0 ||
    !stats
  ) {

    return hits;

  }


  // ==================== 타격당 피해량 ====================

  const damage = Math.max(
    0,
    Math.floor(stats.magicBurstDamage ?? 0)
  );


  // ==================== 최대 추가 타격 횟수 ====================

  const hitCount = Math.min(
    6,
    Math.max(
      0,
      Math.floor(stats.magicBurstHits ?? 0)
    )
  );

  if (damage <= 0 || hitCount <= 0) {

    return hits;

  }


  // ==================== 다단히트 처리 ====================

  for (let i = 0; i < hitCount; i++) {

    // 몬스터 사망 시 남은 공격 중단

    if (state.enemy.currentHp <= 0) {

      break;

    }

    const beforeHp = state.enemy.currentHp;

    state.enemy.currentHp = Math.max(
      0,
      state.enemy.currentHp - damage
    );

    const actualDamage =
      beforeHp - state.enemy.currentHp;


    // ==================== 개별 타격 결과 기록 ====================

    hits.push({

      hit: i + 1,

      damage: actualDamage,

      remainingHp: state.enemy.currentHp,

      defeated: state.enemy.currentHp === 0

    });

  }

  return hits;

}


// ==================== 도적 패시브 : 연격 ====================

export function canExtraAttack() {

  if (
    state.classKey !== "rogue" ||
    !state.player ||
    state.player.hp <= 0 ||
    !state.enemy ||
    state.enemy.currentHp <= 0
  ) {

    return false;

  }

  const stats = getPlayerStats();

  if (stats.extraAttackChance <= 0) {

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


  // ==================== 기본 공격 계산 ====================

  // 전사 및 도적 : 공격력 100%
  // 마법사 : 공격력 40% + 주문력 50%

  const result = calculateDamage(
    stats.basicAttackDamage,
    stats.crit,
    stats.critMultiplier
  );


  // ==================== 특수 아이템 피해 증가 ====================

  const originalDamage = result.damage;

  result.damage = applyDamageBonus(
    originalDamage
  );

  const bonusDamage =
    result.damage - originalDamage;


  // ==================== 기본 공격 피해 적용 ====================

  const beforeHp = state.enemy.currentHp;

  state.enemy.currentHp = Math.max(
    0,
    state.enemy.currentHp - result.damage
  );

  const actualDamage =
    beforeHp - state.enemy.currentHp;


  // ==================== 패시브 추가 피해 ====================

  let passiveExtraDamage = 0;

  let magicBurstDamage = 0;

  let magicBurstHits = [];

  let lastStrikeDamage = 0;


  // ==================== 전사 : 최후의 일격 ====================

  if (
    state.classKey === "warrior" &&
    stats.attackExtraDamage > 0 &&
    state.enemy.currentHp > 0
  ) {

    const extraDamage =
      calculatePassiveExtraDamage();

    const beforeExtraHp =
      state.enemy.currentHp;

    state.enemy.currentHp = Math.max(
      0,
      state.enemy.currentHp - extraDamage
    );

    lastStrikeDamage =
      beforeExtraHp - state.enemy.currentHp;

    passiveExtraDamage += lastStrikeDamage;

  }


  // ==================== 마법사 : 마력 폭발 ====================

  if (
    state.classKey === "mage" &&
    state.enemy.currentHp > 0
  ) {

    magicBurstHits = applyMagicBurst(stats);

    magicBurstDamage = magicBurstHits.reduce(

      (sum, hit) => sum + hit.damage,

      0

    );

    passiveExtraDamage += magicBurstDamage;

  }


  // ==================== 흡혈 효과 ====================

  // 기본 공격으로 입힌 실제 피해만 적용

  const healed = applyLifesteal(
    actualDamage
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

    passiveExtraDamage,

    magicBurstDamage,

    magicBurstHits,

    lastStrikeDamage,

    totalDamage: actualDamage + passiveExtraDamage,

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


  // ==================== 몬스터 공격 피해 계산 ====================

  const result = calculateDamage(
    state.enemy.atk,
    getEnemyCritChance(),
    COMBAT_CONFIG.baseCritMultiplier
  );


  // ==================== 피해 감소 효과 ====================

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


  // ==================== 골드 보상 ====================

  const baseGold = getClearGold(
    state.floor,
    state.enemy
  );

  const gold = grantGold(
    state,
    baseGold
  );

  const bonusGold = gold - baseGold;


  // ==================== 엘리트 패시브 포인트 ====================

  const passivePointsGranted = state.enemy.isElite
    ? grantElitePassivePoint(state)
    : 0;


  // ==================== 보상 선택지 ====================

  state.rerollCount = 0;

  state.rewards = drawRewards(
    state.floor,
    3,
    state.items,
    state.enemy
  );

  state.phase = "reward";


  // ==================== 클리어 메시지 ====================

  let message = bonusGold > 0
    ? `${state.floor}층 클리어! ` +
      `(+${gold}G, 금사의 반지 +${bonusGold}G)`
    : `${state.floor}층 클리어! (+${gold}G)`;

  if (passivePointsGranted > 0) {

    message +=
      ` / 패시브 포인트 +${passivePointsGranted}`;

  }


  // ==================== 전투 승리 결과 ====================

  return {

    type: "win",

    floor: state.floor,

    gold,

    baseGold,

    bonusGold,

    passivePointsGranted,

    rewards: state.rewards,

    isBoss: state.enemy.isBoss ?? false,

    isElite: state.enemy.isElite ?? false,

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


  // ==================== 플레이어 사망 우선 확인 ====================

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


  // ==================== 몬스터 사망 확인 ====================

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


  // ==================== 기본 공격 또는 연격 ====================

  events.push({

    type: "attack",

    ...result

  });


  // ==================== 특수 아이템 피해 증가 ====================

  if (result.bonusDamage > 0) {

    events.push({

      type: "damageBonus",

      target: "enemy",

      amount: result.bonusDamage,

      message:
        `피해 증가 효과: ${result.bonusDamage} 추가 피해`

    });

  }


  // ==================== 마법사 : 마력 폭발 ====================

  // 타격마다 별도의 이벤트 생성

  for (const hit of result.magicBurstHits ?? []) {

    events.push({

      type: "magicBurst",

      target: "enemy",

      damage: hit.damage,

      hit: hit.hit,

      hitCount: result.magicBurstHits.length,

      remainingHp: hit.remainingHp,

      defeated: hit.defeated,

      message:
        `마력 폭발 (${hit.hit}타): ` +
        `${hit.damage} 추가 피해`

    });

  }


  // ==================== 전사 : 최후의 일격 ====================

  if (result.lastStrikeDamage > 0) {

    events.push({

      type: "lastStrike",

      target: "enemy",

      damage: result.lastStrikeDamage,

      message:
        `최후의 일격: ${result.lastStrikeDamage} 추가 피해`

    });

  }


  // ==================== 흡혈 회복 ====================

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


  // ==================== 몬스터 기본 공격 ====================

  events.push({

    type: "attack",

    ...result

  });


  // ==================== 피해 감소 ====================

  if (result.reducedDamage > 0) {

    events.push({

      type: "damageReduction",

      target: "player",

      amount: result.reducedDamage,

      message:
        `피해 감소 효과: ${result.reducedDamage} 피해 감소`

    });

  }


  // ==================== 가시 장갑 ====================

  if (result.reflected > 0) {

    events.push({

      type: "reflection",

      target: "enemy",

      damage: result.reflected,

      message:
        `가시 장갑: ${result.reflected} 반사 피해`

    });

  }


  // ==================== 전사 패시브 : 응징 ====================

  if (result.counterDamage > 0) {

    events.push({

      type: "counterAttack",

      target: "enemy",

      damage: result.counterDamage,

      message:
        `응징: ${result.counterDamage} 반격 피해`

    });

  }


  // ==================== 불사의 증표 ====================

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


    // ==================== 도적 패시브 : 연격 ====================

    if (result && canExtraAttack()) {

      events.push({

        type: "extraAttack",

        target: "enemy",

        message: "연격 발동! 추가 공격!"

      });


      // 추가 공격은 연격을 다시 발동시키지 않음

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
