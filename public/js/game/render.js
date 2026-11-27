"use strict";

import {
  getEnemyAttackInterval,
  getEnemyCritChance
} from "./battle.js";

import {
  state,
  getPlayerStats,
  getHighestFloor,
  MAX_STAT_REROLLS,
  canRerollStats,
  canUpgradePassive
} from "./state.js";

import {
  getClass,
  getPassives,
  getPassiveLevel,
  MAX_PASSIVE_LEVEL
} from "./class.js";

import {
  getRerollCost,
  canReroll,
  previewSpecialReward
} from "./reward.js";

import {
  getShopItems,
  canBuyItem
} from "./shop.js";

import {
  renderEnvironment
} from "./environment.js";

import {
  getOwnedItems,
  getItemEffects,
  getFloorItemBonuses,
  getSpecialItemDropChance,
  getReflectionDamage,
  getCrownMultipliers,
  ITEM_CONFIG
} from "./item.js";


// ==================== DOM 요소 ====================

function getElement(id) {
  return document.getElementById(id);
}

export const DOM = {
  floor: getElement("floor"),
  status: getElement("status"),
  money: getElement("money"),
  abandonRun: getElement("abandonRun"),

  playerAvatar: getElement("playerAvatar"),
  playerName: getElement("playerName"),
  playerHp: getElement("playerHp"),
  playerHpBar: getElement("playerHpBar"),
  playerStats: getElement("playerStats"),

  enemyAvatar: getElement("enemyAvatar"),
  enemyName: getElement("enemyName"),
  enemyHp: getElement("enemyHp"),
  enemyHpBar: getElement("enemyHpBar"),
  enemyStats: getElement("enemyStats"),

  logs: getElement("logs"),

  setup: getElement("setup"),
  classList: getElement("classList"),

  statPanel: getElement("statPanel"),
  statClassName: getElement("statClassName"),
  statPreview: getElement("statPreview"),
  statRerollStatus: getElement("statRerollStatus"),
  rerollStats: getElement("rerollStats"),
  confirmStats: getElement("confirmStats"),

  rewardPanel: getElement("rewardPanel"),
  rewards: getElement("rewards"),
  rerollRewards: getElement("rerollRewards"),

  progressPanel: getElement("progressPanel"),
  shopItems: getElement("shopItems"),
  passives: getElement("passives"),
  nextFloor: getElement("nextFloor"),

  gameOver: getElement("gameOver"),
  gameOverTitle: getElement("gameOverTitle"),
  result: getElement("result"),
  saveStatus: getElement("saveStatus"),
  restart: getElement("restart"),

  build: getElement("build"),

  battleEffects: getElement("battleEffects"),
  environmentEffects: getElement("environmentEffects")
};


// ==================== 연출 설정 ====================

const VISUAL_CONFIG = {
  attackDuration: 150,
  hitDuration: 180,
  shakeDuration: 250,

  enemySpawnDuration: 350,
  bossSpawnDuration: 800,

  enemyDeathDuration: 500,
  bossDeathDuration: 1000,
  playerDeathDuration: 600,

  attackDistance: 22,
  hitDistance: 12,
  spawnDistance: 55,

  magicBurstHitDuration: 100,

  guardDuration: 250
};


// ==================== 연출 상태 관리 ====================

const visualState = {
  enemyKey: null,
  playerDead: false,
  enemyDead: false
};

const activeAnimations = new WeakMap();


// ==================== 진행 상태 이름 ====================

const PHASE_NAMES = {
  setup: "준비",
  rolling: "스탯 선택",
  combat: "전투 중",
  reward: "보상 선택",
  shop: "성장 및 상점",
  dead: "도전 실패",
  victory: "탑 정복"
};


// ==================== 숫자 출력 ====================

function formatNumber(value) {
  return Number(value).toLocaleString("ko-KR");
}

function formatDecimal(value, digits = 3) {
  return Number(
    Number(value).toFixed(digits)
  ).toString();
}

function formatPercent(value, digits = 2) {
  return `${formatDecimal(value * 100, digits)}%`;
}

function formatPercentPoint(value, digits = 2) {
  return `${formatDecimal(value * 100, digits)}%p`;
}


// ==================== 패널 표시 ====================

function setVisible(element, visible) {
  if (!element) {
    return;
  }

  element.classList.toggle("hidden", !visible);
}


// ==================== 모션 감소 설정 ====================

function prefersReducedMotion() {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
}


// ==================== 애니메이션 관리 ====================

function stopAnimation(element) {
  if (!element) {
    return;
  }

  const animation = activeAnimations.get(element);

  if (animation) {
    animation.cancel();
    activeAnimations.delete(element);
  }
}

function playAnimation(element, frames, options) {
  if (!element) {
    return;
  }

  stopAnimation(element);

  const animation = element.animate(
    frames,
    options
  );

  activeAnimations.set(element, animation);

  if (options.fill !== "forwards") {
    animation.addEventListener("finish", () => {
      if (
        activeAnimations.get(element) === animation
      ) {
        activeAnimations.delete(element);
      }
    }, { once: true });
  }

  return animation;
}


// ==================== 캐릭터 연출 초기화 ====================

function resetAvatarVisual(element) {
  if (!element) {
    return;
  }

  stopAnimation(element);

  element.style.opacity = "";
  element.style.transform = "";
  element.style.filter = "";
}


// ==================== 화면 진동 ====================

function shakeArena(
  duration = VISUAL_CONFIG.shakeDuration,
  strength = 3
) {

  if (prefersReducedMotion()) {
    return;
  }

  const arena = document.querySelector(".fighters");

  playAnimation(
    arena,
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${-strength}px)` },
      { transform: `translateX(${strength}px)` },
      { transform: `translateX(${-strength / 2}px)` },
      { transform: `translateX(${strength / 2}px)` },
      { transform: "translateX(0)" }
    ],
    {
      duration,
      easing: "ease-out"
    }
  );
}


// ==================== 체력 바 출력 ====================

function renderHpBar(element, hp, maxHp) {

  const ratio = maxHp > 0
    ? hp / maxHp
    : 0;

  const percent = Math.min(
    100,
    Math.max(0, ratio * 100)
  );

  element.style.width = `${percent}%`;
}


// ==================== 기본 진행 정보 출력 ====================

export function renderProgress() {

  DOM.floor.textContent = `${state.floor}층`;

  DOM.status.textContent =
    PHASE_NAMES[state.phase] || "준비";

  DOM.money.textContent =
    `골드 ${formatNumber(state.gold)}G`;
}


// ==================== 클래스 이미지 ====================

const CLASS_IMAGES = {
  warrior: "/images/class00.png",
  rogue: "/images/class01.png",
  mage: "/images/class02.png"
};


// ==================== 몬스터 이미지 ====================

const ENEMY_IMAGES = {

  // 일반 몬스터

  skeleton: "/images/enemy00.png",
  slime: "/images/enemy01.png",
  guardDog: "/images/enemy02.png",
  skeletonArcher: "/images/enemy03.png",
  skeletonGuard: "/images/enemy04.png",
  eagle: "/images/enemy05.png",
  ghost: "/images/enemy06.png",
  skeletonKnight: "/images/enemy07.png",
  golem: "/images/enemy08.png",
  skeletonCrossbowman: "/images/enemy09.png",
  gargoyle: "/images/enemy10.png",
  griffin: "/images/enemy11.png",
  wraithAssassin: "/images/enemy12.png",

  // 엘리트 몬스터

  cerberus: "/images/elite00.png",
  kingSlime: "/images/elite01.png",
  boneWyvern: "/images/elite02.png",
  deathKnight: "/images/elite03.png",

  // 보스 몬스터

  wyvern: "/images/boss00.png",
  dragon: "/images/boss01.png"
};


// ==================== 층별 배경 조회 ====================

export function getBattleBackground(floor) {

  const localFloor = ((floor - 1) % 200) + 1;

  if (localFloor === 100) {
    return "bossground00.png";
  }

  if (localFloor === 200) {
    return "bossground01.png";
  }

  if (localFloor < 50) {
    return "background00.png";
  }

  if (localFloor < 100) {
    return "background01.png";
  }

  if (localFloor < 150) {
    return "background02.png";
  }

  return "background03.png";
}


// ==================== 전투 배경 출력 ====================

export function renderBackground() {

  const arena = document.querySelector(".fighters");

  if (!arena) {
    return;
  }

  const background = getBattleBackground(state.floor);

  if (arena.dataset.background === background) {
    return;
  }

  arena.dataset.background = background;

  arena.style.backgroundImage =
    `url('/images/${background}')`;
}


// ==================== 캐릭터 이미지 출력 ====================

function renderAvatar(
  element,
  image,
  name,
  fallback = ""
) {

  if (!element) {
    return;
  }

  if (!image) {
    element.textContent = fallback;
    return;
  }

  let sprite = element.querySelector(
    "img.battle-sprite"
  );

  if (!sprite) {

    sprite = document.createElement("img");

    sprite.className = "battle-sprite";
    sprite.draggable = false;

    element.replaceChildren(sprite);
  }

  if (sprite.getAttribute("src") !== image) {
    sprite.src = image;
  }

  sprite.alt = name;
}


// ==================== 전투 효과 팝업 ====================

function showDamagePopup(event) {

  const effects = DOM.battleEffects;

  if (!effects) {
    return;
  }

  let target;
  let text;
  let popupType = "";

  let offsetX = 0;
  let offsetY = 0;

  switch (event.type) {

    // ==================== 흡혈의 반지 ====================

    case "lifesteal":

      target = DOM.playerAvatar;
      text = `+${event.amount}`;
      popupType = "lifesteal";

      offsetX = -30;
      offsetY = -15;

      break;


    // ==================== 가시 장갑 ====================

    case "reflection":

      target = DOM.enemyAvatar;
      text = `반사 ${event.damage}`;
      popupType = "reflection";

      offsetX = 25;
      offsetY = -20;

      break;


    // ==================== 전사 : 응징 ====================

    case "counterAttack":

      target = DOM.enemyAvatar;
      text = `응징 ${event.damage}`;
      popupType = "counter-attack";

      offsetX = -35;
      offsetY = -35;

      break;


    // ==================== 전사 : 최후의 일격 ====================

    case "lastStrike":

      target = DOM.enemyAvatar;
      text = `격노 ${event.damage}`;
      popupType = "counter-attack";

      offsetX = 30;
      offsetY = -35;

      break;


    // ==================== 불사의 증표 ====================

    case "revive":

      target = DOM.playerAvatar;
      text = `소생 +${event.hp}`;
      popupType = "revive";

      offsetY = -35;

      break;


    // ==================== 피해 감소 ====================

    case "damageReduction":

      target = DOM.playerAvatar;
      text = `감소 ${event.amount}`;
      popupType = "reduction";

      offsetX = 35;
      offsetY = -20;

      break;


    // ==================== 수호자의 망토 ====================

    case "guard":

      target = DOM.playerAvatar;
      text = "방어!";
      popupType = "reduction guard";

      offsetX = -35;
      offsetY = -40;

      break;


    // ==================== 피해 무효화 ====================

    case "damageNullified":

      target = DOM.playerAvatar;
      text = "피해 무효";
      popupType = "reduction damage-nullified";

      offsetY = -65;

      break;


    // ==================== 도적 : 연격 ====================

    case "extraAttack":

      target = DOM.playerAvatar;
      text = "연격!";
      popupType = "extra-attack";

      offsetY = -35;

      break;


    // ==================== 마법사 : 마력 폭발 ====================

    case "magicBurst":

      target = DOM.enemyAvatar;
      text = `마력 ${event.damage}`;
      popupType = "magic-burst";

      offsetX = (event.hit ?? 1) % 2 === 1
        ? -48
        : 48;

      offsetY = -30 -
        Math.floor(((event.hit ?? 1) - 1) / 2) * 28;

      break;


    // ==================== 일반 공격 ====================

    default:

      target = event.attacker === "player"
        ? DOM.enemyAvatar
        : DOM.playerAvatar;

      text = event.critical
        ? `${event.damage}!`
        : `${event.damage}`;

      if (event.critical) {
        popupType = "critical";
      }

      if (event.isExtraAttack) {
        offsetX = -25;
        offsetY = 10;
      }

      break;
  }


  if (!target) {
    return;
  }

  const sprite = target.querySelector(
    ".battle-sprite"
  ) || target;

  const targetRect =
    sprite.getBoundingClientRect();

  const effectsRect =
    effects.getBoundingClientRect();

  const popup = document.createElement("div");

  popup.className = "damage-popup";

  // 여러 CSS 클래스 동시 적용 가능

  if (popupType) {
    popup.classList.add(
      ...popupType.split(" ").filter(Boolean)
    );
  }

  popup.textContent = text;

  popup.style.left = `${
    targetRect.left -
    effectsRect.left +
    targetRect.width / 2 +
    offsetX
  }px`;

  popup.style.top = `${
    targetRect.top -
    effectsRect.top +
    targetRect.height * 0.2 +
    offsetY
  }px`;

  effects.appendChild(popup);

  popup.addEventListener(
    "animationend",
    () => popup.remove(),
    { once: true }
  );

  setTimeout(
    () => popup.remove(),
    1200
  );
}


// ==================== 마력 폭발 연출 ====================

function playMagicBurstEffect(hitCount = 1) {

  if (prefersReducedMotion()) {
    return;
  }

  const target = DOM.enemyAvatar;

  if (!target || visualState.enemyDead) {
    return;
  }

  const count = Math.max(
    1,
    Math.min(6, Math.floor(hitCount))
  );

  const frames = [
    {
      filter: "none",
      transform: "translateX(0)"
    }
  ];


  // 타격 횟수만큼 점멸 및 넉백 연출 생성

  for (let i = 0; i < count; i++) {

    frames.push(
      {
        filter:
          "brightness(2) " +
          "drop-shadow(0 0 15px #ac68ff)",

        transform: "translateX(6px)"
      },
      {
        filter: "none",
        transform: "translateX(0)"
      }
    );
  }

  playAnimation(
    target,
    frames,
    {
      duration:
        VISUAL_CONFIG.magicBurstHitDuration * count,

      easing: "linear"
    }
  );
}


// ==================== 수호자의 망토 방어 연출 ====================

function playGuardEffect(event) {

  if (prefersReducedMotion()) {
    return;
  }

  const target = DOM.playerAvatar;

  if (!target || visualState.playerDead) {
    return;
  }

  playAnimation(
    target,
    [
      {
        filter: "none",
        transform: "translateX(0)"
      },
      {
        filter:
          "brightness(1.8) " +
          "drop-shadow(0 0 8px #75cfff) " +
          "drop-shadow(0 0 18px #427bdb)",

        transform: "translateX(-3px)"
      },
      {
        filter:
          "brightness(1.2) " +
          "drop-shadow(0 0 10px #75cfff)",

        transform: "translateX(0)"
      },
      {
        filter: "none",
        transform: "translateX(0)"
      }
    ],
    {
      duration:
        event.effect?.duration ||
        VISUAL_CONFIG.guardDuration,

      easing: "ease-out"
    }
  );
}


// ==================== 일반 공격 애니메이션 ====================

function playAttackEffect(event) {

  if (prefersReducedMotion()) {
    return;
  }

  const playerAttacks =
    event.attacker === "player";

  const attacker = playerAttacks
    ? DOM.playerAvatar
    : DOM.enemyAvatar;

  const target = playerAttacks
    ? DOM.enemyAvatar
    : DOM.playerAvatar;

  const attackerDead = playerAttacks
    ? visualState.playerDead
    : visualState.enemyDead;

  const targetDead = playerAttacks
    ? visualState.enemyDead
    : visualState.playerDead;

  const direction = playerAttacks ? 1 : -1;

  const effect = event.effect || {};


  // ==================== 공격자 전진 및 복귀 ====================

  if (!attackerDead) {

    playAnimation(
      attacker,
      [
        { transform: "translateX(0)" },
        {
          transform: `translateX(${
            direction * VISUAL_CONFIG.attackDistance
          }px)`
        },
        { transform: "translateX(0)" }
      ],
      {
        duration:
          effect.attackDuration ||
          VISUAL_CONFIG.attackDuration,

        easing: "ease-out"
      }
    );
  }


  // ==================== 피격 대상 넉백 및 점멸 ====================

  // 방어 발동 시 별도의 방어 애니메이션 사용
  // 피해 무효화 시 기존 피격 넉백을 생략

  if (
    !targetDead &&
    !event.guarded &&
    !event.damageNullified
  ) {

    playAnimation(
      target,
      [
        {
          transform: "translateX(0)",
          filter: "none"
        },
        {
          transform: `translateX(${
            direction * VISUAL_CONFIG.hitDistance
          }px)`,

          filter:
            "brightness(1.8) sepia(1) saturate(4)"
        },
        {
          transform: "translateX(0)",
          filter: "none"
        }
      ],
      {
        duration:
          effect.hitDuration ||
          VISUAL_CONFIG.hitDuration,

        easing: "ease-out"
      }
    );
  }


  // ==================== 치명타 화면 진동 ====================

  if (
    event.critical &&
    !event.damageNullified
  ) {

    shakeArena(
      effect.shakeDuration ||
      VISUAL_CONFIG.shakeDuration,
      3
    );
  }
}


// ==================== 일반 몬스터 등장 ====================

function playEnemySpawnEffect() {

  if (prefersReducedMotion()) {
    return;
  }

  playAnimation(
    DOM.enemyAvatar,
    [
      {
        opacity: 0,
        transform: `translateX(${
          VISUAL_CONFIG.spawnDistance
        }px)`
      },
      {
        opacity: 1,
        transform: "translateX(0)"
      }
    ],
    {
      duration:
        VISUAL_CONFIG.enemySpawnDuration,

      easing: "ease-out"
    }
  );
}


// ==================== 보스 몬스터 등장 ====================

function playBossSpawnEffect() {

  if (prefersReducedMotion()) {
    return;
  }

  playAnimation(
    DOM.enemyAvatar,
    [
      {
        opacity: 0,
        filter: "brightness(0.2)"
      },
      {
        opacity: 0.6,
        filter: "brightness(0.6)"
      },
      {
        opacity: 1,
        filter: "brightness(1)"
      }
    ],
    {
      duration:
        VISUAL_CONFIG.bossSpawnDuration,

      easing: "ease-in-out"
    }
  );

  shakeArena(650, 6);
}


// ==================== 몬스터 사망 ====================

function playEnemyDeathEffect() {

  if (visualState.enemyDead) {
    return;
  }

  visualState.enemyDead = true;

  const target = DOM.enemyAvatar;

  const isBoss = Boolean(state.enemy?.isBoss);

  if (prefersReducedMotion()) {

    stopAnimation(target);
    target.style.opacity = "0";

    return;
  }

  if (isBoss) {

    // 보스 사망 연출

    playAnimation(
      target,
      [
        {
          opacity: 1,
          transform: "translateY(0)",
          filter: "brightness(1)"
        },
        {
          opacity: 1,
          transform: "translateY(0)",
          filter:
            "brightness(2.5) sepia(1) saturate(5)"
        },
        {
          opacity: 0.6,
          transform: "translateY(8px)",
          filter: "brightness(0.6)"
        },
        {
          opacity: 0,
          transform: "translateY(20px)",
          filter: "brightness(0)"
        }
      ],
      {
        duration:
          VISUAL_CONFIG.bossDeathDuration,

        easing: "ease-in-out",
        fill: "forwards"
      }
    );

    shakeArena(800, 8);

  } else {

    // 일반 및 엘리트 몬스터 사망 연출

    playAnimation(
      target,
      [
        {
          opacity: 1,
          transform: "translateY(0)",
          filter: "none"
        },
        {
          opacity: 1,
          transform: "translateY(3px)",
          filter:
            "brightness(1.8) sepia(1) saturate(5)"
        },
        {
          opacity: 0,
          transform: "translateY(18px)",
          filter: "brightness(0.4)"
        }
      ],
      {
        duration:
          VISUAL_CONFIG.enemyDeathDuration,

        easing: "ease-out",
        fill: "forwards"
      }
    );
  }
}


// ==================== 플레이어 사망 ====================

function playPlayerDeathEffect() {

  if (visualState.playerDead) {
    return;
  }

  visualState.playerDead = true;

  const target = DOM.playerAvatar;

  if (prefersReducedMotion()) {

    stopAnimation(target);

    target.style.opacity = "0.65";

    target.style.transform =
      "translateY(12px) rotate(-75deg)";

    return;
  }

  playAnimation(
    target,
    [
      {
        opacity: 1,
        transform: "translateY(0) rotate(0deg)",
        filter: "none"
      },
      {
        opacity: 1,
        transform: "translateY(5px) rotate(-15deg)",
        filter:
          "brightness(1.6) sepia(1) saturate(4)"
      },
      {
        opacity: 0.65,

        transform:
          "translateY(12px) rotate(-75deg)",

        filter: "brightness(0.6)"
      }
    ],
    {
      duration:
        VISUAL_CONFIG.playerDeathDuration,

      easing: "ease-out",
      fill: "forwards"
    }
  );
}


// ==================== 불사의 증표 소생 연출 ====================

function playReviveEffect(event) {

  const target = DOM.playerAvatar;

  if (!target) {
    return;
  }

  resetAvatarVisual(target);

  visualState.playerDead = false;

  if (prefersReducedMotion()) {
    return;
  }

  playAnimation(
    target,
    [
      {
        opacity: 0.5,
        transform: "translateY(10px) rotate(-15deg)",
        filter: "brightness(0.6)"
      },
      {
        opacity: 1,
        transform: "translateY(0) rotate(0deg)",

        filter:
          "brightness(3) " +
          "sepia(1) " +
          "saturate(3) " +
          "drop-shadow(0 0 20px gold)"
      },
      {
        opacity: 1,
        transform: "translateY(-8px)",

        filter:
          "brightness(2) " +
          "drop-shadow(0 0 12px gold)"
      },
      {
        opacity: 1,
        transform: "translateY(0)",
        filter: "none"
      }
    ],
    {
      duration: event.effect?.duration || 700,

      easing: "ease-out"
    }
  );

  shakeArena(350, 3);
}


// ==================== 반격 및 반사 피해 연출 ====================

function playReflectionEffect() {

  if (prefersReducedMotion()) {
    return;
  }

  const target = DOM.enemyAvatar;

  if (!target || visualState.enemyDead) {
    return;
  }

  playAnimation(
    target,
    [
      {
        transform: "translateX(0)",
        filter: "none"
      },
      {
        transform: "translateX(8px)",

        filter:
          "brightness(2) " +
          "sepia(1) " +
          "saturate(3)"
      },
      {
        transform: "translateX(0)",
        filter: "none"
      }
    ],
    {
      duration: 180,

      easing: "ease-out"
    }
  );
}


// ==================== 사망 이벤트 처리 ====================

function playDeathEffect(event) {

  if (event.type === "lose") {

    playPlayerDeathEffect();

  } else if (event.type === "win") {

    playEnemyDeathEffect();
  }
}


// ==================== 플레이어 출력 ====================

export function renderPlayer() {

  if (!state.player) {

    resetAvatarVisual(DOM.playerAvatar);

    visualState.playerDead = false;

    DOM.playerAvatar.textContent = "🛡️";
    DOM.playerName.textContent = "도전자";
    DOM.playerHp.textContent = "HP —";

    DOM.playerStats.textContent =
      "ATK — / AP — / SPD — / CRIT —";

    renderHpBar(DOM.playerHpBar, 0, 0);

    return;
  }

  const classData = getClass(state.classKey);

  const stats = getPlayerStats();


  // 새로운 도전 시작 또는 생존 상태 복구

  if (
    visualState.playerDead &&
    state.player.hp > 0
  ) {

    resetAvatarVisual(DOM.playerAvatar);

    visualState.playerDead = false;
  }

  renderAvatar(
    DOM.playerAvatar,

    classData.image ||
      CLASS_IMAGES[state.classKey],

    classData.name,

    classData.emoji || "🛡️"
  );

  DOM.playerName.textContent =
    classData.name;

  DOM.playerHp.textContent =
    `HP ${formatNumber(state.player.hp)} / ` +
    `${formatNumber(stats.hp)}`;

  DOM.playerStats.textContent =
    `ATK ${formatNumber(stats.atk)} / ` +
    `AP ${formatNumber(stats.ap)} / ` +
    `SPD ${stats.spd.toFixed(2)} / ` +
    `CRIT ${formatPercent(stats.crit)} / ` +
    `CRIT DMG ${formatPercent(stats.critMultiplier)}`;

  renderHpBar(
    DOM.playerHpBar,
    state.player.hp,
    stats.hp
  );

  if (state.player.hp <= 0) {
    playPlayerDeathEffect();
  }
}


// ==================== 몬스터 출력 ====================

export function renderEnemy() {

  if (!state.enemy) {

    resetAvatarVisual(DOM.enemyAvatar);

    visualState.enemyKey = null;
    visualState.enemyDead = false;

    DOM.enemyAvatar.textContent = "🐺";

    DOM.enemyAvatar.classList.remove(
      "boss-avatar"
    );

    DOM.enemyName.textContent = "몬스터";
    DOM.enemyHp.textContent = "HP —";

    DOM.enemyStats.textContent =
      "ATK — / SPD — / CRIT —";

    renderHpBar(DOM.enemyHpBar, 0, 0);

    return;
  }

  const enemy = state.enemy;

  const enemyKey =
    `${state.floor}:${enemy.id || enemy.name}`;

  const isNewEnemy =
    visualState.enemyKey !== enemyKey ||
    (
      visualState.enemyDead &&
      enemy.currentHp > 0
    );

  if (isNewEnemy) {

    resetAvatarVisual(DOM.enemyAvatar);

    visualState.enemyKey = enemyKey;
    visualState.enemyDead = false;

    DOM.battleEffects?.replaceChildren();
  }

  renderAvatar(
    DOM.enemyAvatar,

    enemy.image ||
      ENEMY_IMAGES[enemy.id],

    enemy.name,

    enemy.emoji || "🐺"
  );


  // 보스 전용 CSS 클래스 유지

  DOM.enemyAvatar.classList.toggle(
    "boss-avatar",
    Boolean(enemy.isBoss)
  );

  DOM.enemyName.textContent =
    enemy.name;

  DOM.enemyHp.textContent =
    `HP ${formatNumber(enemy.currentHp)} / ` +
    `${formatNumber(enemy.maxHp)}`;

  const enemySpd =
    1000 / getEnemyAttackInterval();

  const enemyCrit =
    getEnemyCritChance();

  DOM.enemyStats.textContent =
    `ATK ${formatNumber(enemy.atk)} / ` +
    `SPD ${enemySpd.toFixed(2)} / ` +
    `CRIT ${formatPercent(enemyCrit)}`;

  renderHpBar(
    DOM.enemyHpBar,
    enemy.currentHp,
    enemy.maxHp
  );

  if (enemy.currentHp <= 0) {

    playEnemyDeathEffect();

    return;
  }


  // 엘리트는 일반 등장 연출 사용

  if (isNewEnemy) {

    if (enemy.isBoss) {

      playBossSpawnEffect();

    } else {

      playEnemySpawnEffect();
    }
  }
}


// ==================== 초기 스탯 출력 ====================

export function renderStatPreview() {

  DOM.statPreview.replaceChildren();

  if (
    state.phase !== "rolling" ||
    !state.player
  ) {
    return;
  }

  const classData = getClass(state.classKey);

  const base = classData.base;

  const rolled = state.player.base;

  DOM.statClassName.textContent =
    classData.name;

  const stats = [
    {
      name: "최대 생명력",
      base: base.hp,
      bonus: rolled.hp - base.hp,
      total: rolled.hp
    },
    {
      name: "공격력",
      base: base.atk,
      bonus: rolled.atk - base.atk,
      total: rolled.atk
    },
    {
      name: "주문력",
      base: base.ap,
      bonus: rolled.ap - base.ap,
      total: rolled.ap
    },
    {
      name: "공격 속도",
      base: base.spd.toFixed(2),
      bonus: 0,
      total: rolled.spd.toFixed(2)
    },
    {
      name: "치명타 확률",
      base: formatPercent(base.crit),
      bonus: 0,
      total: formatPercent(rolled.crit)
    }
  ];

  for (const stat of stats) {

    const row = document.createElement("tr");

    const values = [
      stat.name,
      stat.base,
      `+${stat.bonus}`,
      stat.total
    ];

    values.forEach((value, index) => {

      const cell = document.createElement("td");

      cell.textContent = value;

      if (index === 2 && stat.bonus > 0) {
        cell.classList.add("stat-bonus");
      }

      if (index === 3) {
        cell.classList.add("stat-total");
      }

      row.appendChild(cell);
    });

    DOM.statPreview.appendChild(row);
  }

  const remaining =
    MAX_STAT_REROLLS - state.statRerollCount;

  DOM.statRerollStatus.textContent =
    `남은 무료 리롤: ${remaining} / ${MAX_STAT_REROLLS}`;

  DOM.rerollStats.disabled =
    !canRerollStats();

  DOM.confirmStats.disabled = false;
}


// ==================== 공통 선택 버튼 생성 ====================

function createChoiceButton({
  title,
  desc,
  price = null,
  disabled = false,
  action,
  id
}) {

  const button = document.createElement("button");

  button.type = "button";
  button.className = "choice-card";

  button.dataset.action = action;
  button.dataset.id = id;

  button.disabled = disabled;

  const heading = document.createElement("strong");

  heading.textContent = title;

  const description = document.createElement("small");

  description.textContent = desc;

  button.append(
    heading,
    description
  );

  if (price !== null) {

    const cost = document.createElement("span");

    cost.className = "item-price";
    cost.textContent = price;

    button.appendChild(cost);
  }

  return button;
}


// ==================== 보상 출력 ====================

export function renderRewards() {

  DOM.rewards.replaceChildren();

  if (state.phase !== "reward") {
    return;
  }

  for (const reward of state.rewards) {

    const button = createChoiceButton({

      title: reward.title,

      desc: reward.desc,

      action: "reward",

      id: reward.id
    });


    // ==================== 특수 아이템 ====================

    if (reward.type === "special") {

      button.classList.add("special-reward");

      const label = document.createElement("span");

      label.className = "special-reward-label";
      label.textContent = "특수 아이템";

      button.prepend(label);


      // ==================== 상세 설명 출력 ====================

      const description = button.querySelector("small");

      if (description) {

        description.style.whiteSpace = "normal";
        description.style.lineHeight = "1.6";
        description.style.overflow = "visible";
        description.style.maxHeight = "none";
        description.style.display = "block";
      }


      // ==================== 아이템 획득 결과 미리보기 ====================

      const preview = previewSpecialReward(
        state,
        reward.itemId
      );


      // ==================== 오만의 왕관 ====================

      if (reward.itemId === "arroganceCrown") {

        button.classList.add("crown-reward");

        label.textContent = "특수 아이템 · 즉시 3중첩";

        label.style.color = "#e6bf65";

      } else if (preview?.disabled) {

        label.textContent = "왕관 성장 재료";

        label.style.color = "#e6bf65";
      }


      // ==================== 최대 생명력 변경 미리보기 ====================

      if (
        preview &&
        preview.hpDifference !== 0
      ) {

        const hpPreview = document.createElement("small");

        hpPreview.className = "reward-hp-preview";

        hpPreview.style.display = "block";

        hpPreview.style.marginTop = "6px";

        hpPreview.textContent =
          `최대 HP: ${formatNumber(preview.beforeMaxHp)}` +
          ` → ${formatNumber(preview.afterMaxHp)}`;

        hpPreview.style.color =
          preview.hpDifference > 0
            ? "#86c78b"
            : "#ef8080";

        button.appendChild(hpPreview);
      }


      // ==================== 즉사 경고 ====================

      if (preview?.fatal) {

        button.classList.add("fatal-reward");

        button.style.borderColor = "#d95050";

        const warning = document.createElement("small");

        warning.className = "fatal-reward-warning";

        warning.textContent =
          "⚠ 획득 즉시 사망합니다. 소생 불가.";

        warning.style.display = "block";
        warning.style.color = "#ff7777";
        warning.style.fontWeight = "bold";
        warning.style.marginTop = "6px";

        button.appendChild(warning);

        // 경고만 표시하고 선택 자체는 제한하지 않음
      }
    }

    DOM.rewards.appendChild(button);
  }

  const cost = getRerollCost(
    state.floor,
    state.rerollCount
  );

  DOM.rerollRewards.textContent =
    `보상 리롤 (${formatNumber(cost)}G)`;

  DOM.rerollRewards.disabled =
    !canReroll(state);
}


// ==================== 일반 상점 출력 ====================

export function renderShop() {

  DOM.shopItems.replaceChildren();

  if (state.phase !== "shop") {
    return;
  }

  const items = getShopItems(
    state.floor,
    state
  );

  const stats = getPlayerStats();

  for (const item of items) {

    const fullHp = (
      item.type === "heal" &&
      state.player.hp >= stats.hp
    );

    const button = createChoiceButton({

      title: item.title,

      desc: item.desc,

      price: `${formatNumber(item.cost)}G`,

      disabled:
        fullHp ||
        !canBuyItem(state, item.id),

      action: "buy-item",

      id: item.id
    });


    // ==================== 축복받은 성배 ====================

    if (
      item.type === "heal" &&
      item.bonusActive
    ) {

      const description = button.querySelector("small");

      if (description) {

        description.style.color = "#86c78b";

        description.style.whiteSpace = "normal";

        description.style.maxHeight = "none";
      }

      const bonusLabel = document.createElement("small");

      bonusLabel.textContent =
        "🏆 축복받은 성배 적용 중";

      bonusLabel.style.color = "#e6bf65";
      bonusLabel.style.display = "block";

      button.appendChild(bonusLabel);
    }

    DOM.shopItems.appendChild(button);
  }
}


// ==================== 패시브 효과 수치 계산 ====================

function getPassiveEffectText(passive, level) {

  if (level === 0) {
    return "미습득";
  }

  return passive.effects.map(effect => {

    // 배열 효과 : 레벨별 지정 수치
    // 마력 폭발 : 레벨과 관계없이 타격당 계수 유지
    // 일반 효과 : 레벨에 비례하여 증가

    const value = Array.isArray(effect.amounts)

      ? (effect.amounts[level - 1] ?? 0)

      : effect.type === "attackApRatio"

        ? effect.amount

        : effect.amount * level;

    const percent = Number(
      (value * 100).toFixed(2)
    );

    const decimal = Number(
      value.toFixed(3)
    );

    switch (effect.type) {

      // ==================== 공통 ====================

      case "percentHp":
        return `최대 생명력 +${percent}%`;

      case "percentAtk":
        return `공격력 +${percent}%`;

      case "percentAp":
        return `주문력 +${percent}%`;


      // ==================== 전사 ====================

      case "counterHpRatio":
        return `반격 피해: 최대 HP의 ${percent}%`;

      case "counterApRatio":
        return `반격 피해: AP의 ${percent}%`;

      case "apDamageReduction":
        return `피해 감소: 주문력 점감값 × ${percent}%`;

      case "lowHpAtkBonus":
        return `저체력 시 공격력 +${percent}%`;

      case "lowHpDamageReduction":
        return `저체력 시 피해 ${percent}% 감소`;

      case "lowHpExtraDamage":
        return `저체력 시 ATK의 ${percent}% 추가 피해`;


      // ==================== 도적 ====================

      case "flatSpd":
        return `공격 속도 +${decimal}`;

      case "extraAttackChance":
        return `추가 공격 확률 +${percent}%p`;

      case "apCritBonus":
        return `치명타 확률: 주문력 점감값 × ${percent}%p`;

      case "critDamageBonus":
        return `치명타 피해량 +${percent}%p`;


      // ==================== 마법사 ====================

      case "atkToApRatio":
        return `ATK의 ${percent}%만큼 AP 증가`;

      case "apSpdBonus":
        return `공격 속도: 주문력 점감값 × ${decimal}`;

      case "attackApRatio":
        return `타격당 AP의 ${percent}% 추가 피해`;

      case "attackApHits":
        return `추가 타격 ${value}회`;

      default:
        return "";
    }

  }).filter(Boolean).join(" / ");
}


// ==================== 패시브 효과 설명 ====================

function getPassiveDescription(passive, level = 0) {

  const lines = [
    passive.desc || "패시브 효과",

    `현재: ${getPassiveEffectText(passive, level)}`
  ];

  if (level < MAX_PASSIVE_LEVEL) {

    lines.push(
      `다음: ${getPassiveEffectText(passive, level + 1)}`
    );

  } else {

    lines.push("최대 강화 달성");
  }

  return lines.join("\n");
}


// ==================== 패시브 강화 UI ====================

export function renderPassives() {

  DOM.passives.replaceChildren();

  if (
    state.phase !== "shop" ||
    !state.player ||
    !state.classKey
  ) {
    return;
  }

  const passives = getPassives(state.classKey);


  // ==================== 보유 패시브 포인트 ====================

  const pointInfo = document.createElement("p");

  pointInfo.className = "passive-point-info";

  pointInfo.textContent =
    `보유 패시브 포인트: ${state.passivePoints}`;

  DOM.passives.appendChild(pointInfo);


  // ==================== 패시브 강화 목록 ====================

  for (const passive of passives) {

    const level = getPassiveLevel(
      state.passives,
      passive.id
    );

    const maxLevel = level >= MAX_PASSIVE_LEVEL;

    const button = createChoiceButton({

      title:
        `${passive.name} (${level}/${MAX_PASSIVE_LEVEL})`,

      desc:
        getPassiveDescription(passive, level),

      price:
        maxLevel
          ? "최대 레벨"
          : "패시브 포인트 1",

      disabled:
        maxLevel ||
        !canUpgradePassive(passive.id, state),

      action: "upgrade-passive",

      id: passive.id
    });

    if (level > 0) {
      button.classList.add("passive-learned");
    }

    if (maxLevel) {
      button.classList.add("owned");
    }

    const description = button.querySelector("small");

    if (description) {

      description.style.whiteSpace = "pre-line";

      description.style.lineHeight = "1.6";

      description.style.overflow = "visible";

      description.style.maxHeight = "none";

      description.style.display = "block";
    }

    DOM.passives.appendChild(button);
  }
}


// ==================== 특수 아이템 인벤토리 ====================

export function renderItems() {

  let inventory = document.getElementById(
    "specialItemInventory"
  );

  if (!inventory) {

    inventory = document.createElement("section");

    inventory.id = "specialItemInventory";

    inventory.className =
      "special-item-inventory";

    DOM.build.appendChild(inventory);
  }

  inventory.replaceChildren();

  if (!state.player) {
    return;
  }

  const items = getOwnedItems(state.items);

  const totalCount = items.reduce(
    (total, item) => total + item.count,
    0
  );

  const crown = getCrownMultipliers(
    state.items
  );

  const heading = document.createElement("h3");

  heading.className = "special-item-heading";

  heading.textContent =
    `특수 아이템 (${totalCount}개)`;

  inventory.appendChild(heading);


  // ==================== 오만의 왕관 요약 ====================

  if (crown.active) {

    const summary = document.createElement("div");

    summary.className = "crown-summary";

    summary.style.padding = "10px";
    summary.style.marginBottom = "12px";
    summary.style.border = "1px solid #b59449";
    summary.style.borderRadius = "6px";

    const title = document.createElement("strong");

    title.textContent = "👑 오만의 왕관";

    title.style.color = "#e6bf65";

    const description = document.createElement("small");

    description.style.display = "block";

    description.style.whiteSpace = "pre-line";

    description.style.lineHeight = "1.6";

    description.textContent = [

      `무효화된 아이템: ${crown.count}개`,

      `HP / ATK / AP ×${formatDecimal(crown.primary)}`,

      `SPD / 치확 / 치피 ×${formatDecimal(crown.secondary)}`,

      "클래스 패시브는 정상 적용됩니다."

    ].join("\n");

    summary.append(
      title,
      description
    );

    inventory.appendChild(summary);
  }


  // ==================== 보유 아이템이 없는 경우 ====================

  if (items.length === 0) {

    const empty = document.createElement("p");

    empty.className = "special-item-empty";

    empty.textContent =
      "보유한 특수 아이템이 없습니다.";

    inventory.appendChild(empty);

    return;
  }

  const list = document.createElement("div");

  list.className = "special-item-list";

  const floorBonus = getFloorItemBonuses(
    state.items,
    state.floor
  );

  const effects = getItemEffects(
    state.items
  );


  // ==================== 아이템 카드 생성 ====================

  for (const item of items) {

    const card = document.createElement("div");

    card.className = "special-item-card";

    if (item.count >= ITEM_CONFIG.maxStack) {

      card.classList.add("max-stack");
    }


    // ==================== 오만의 왕관 ====================

    if (item.id === "arroganceCrown") {

      card.classList.add("crown-item");

      card.style.borderColor = "#b59449";
    }


    // ==================== 무효화된 아이템 ====================

    if (item.disabled) {

      card.classList.add("disabled-item");

      card.style.opacity = "0.55";
    }


    // ==================== 아이템 아이콘 ====================

    const icon = document.createElement("span");

    icon.className = "special-item-icon";

    icon.textContent = item.emoji;

    if (item.disabled) {

      icon.style.filter = "grayscale(1)";
    }


    // ==================== 아이템 정보 ====================

    const info = document.createElement("div");

    info.className = "special-item-info";

    const name = document.createElement("strong");

    name.className = "special-item-name";

    name.textContent = item.name;

    if (item.disabled) {

      name.textContent += " [무효화]";
    }

    const effect = document.createElement("small");

    effect.className = "special-item-effect";

    let effectText = item.effectText;


    // ==================== 무효화된 아이템 설명 ====================

    if (item.disabled) {

      effectText =

        item.effectText.replace(/^\[무효화\]\s*/, "") +

        "\n왕관 성장에 기여하는 아이템 " +

        `${item.count}개`;

    } else {

      // ==================== 활성 아이템 효과 ====================

      switch (item.id) {

        case "supremeHpBook":

          effectText +=
            ` / 현재 HP +${floorBonus.hp}`;

          break;

        case "supremeAtkBook":

          effectText +=
            ` / 현재 ATK +${floorBonus.atk}`;

          break;

        case "supremeApBook":

          effectText +=
            ` / 현재 AP +${floorBonus.ap}`;

          break;


        // ==================== 가시 장갑 ====================

        case "thornGloves":

          effectText +=
            ` / 현재 반사 피해 ${
              getReflectionDamage(
                state.items,
                state.floor
              )
            }`;

          break;


        // ==================== 축복받은 성배 ====================

        case "blessedChalice":

          effectText +=

            ` / 상점 회복률 ${
              formatPercent(
                0.2 * (1 + effects.shopHealBonus)
              )
            }`;

          break;


        // ==================== 오만의 왕관 ====================

        case "arroganceCrown":

          effectText = [

            `무효화 아이템 ${crown.count}개`,

            `HP·ATK·AP ×${formatDecimal(crown.primary)}`,

            `SPD·치확·치피 ×${formatDecimal(crown.secondary)}`

          ].join(" / ");

          break;
      }
    }

    effect.textContent = effectText;

    effect.style.whiteSpace = "pre-line";

    effect.style.lineHeight = "1.5";

    info.append(
      name,
      effect
    );


    // ==================== 보유 개수 표시 ====================

    const stack = document.createElement("div");

    stack.className = "special-item-stack";

    const count = document.createElement("span");

    count.className = "special-item-count";

    count.textContent =
      `${item.count}/${ITEM_CONFIG.maxStack}`;


    // ==================== 보유 개수 표시용 칸 ====================

    const dots = document.createElement("div");

    dots.className = "special-item-dots";

    for (
      let i = 0;
      i < ITEM_CONFIG.maxStack;
      i++
    ) {

      const dot = document.createElement("span");

      dot.className = "special-item-dot";

      if (i < item.count) {

        dot.classList.add("filled");
      }

      dots.appendChild(dot);
    }

    stack.append(
      count,
      dots
    );

    card.append(
      icon,
      info,
      stack
    );

    list.appendChild(card);
  }

  inventory.appendChild(list);
}


// ==================== 현재 빌드 출력 ====================

export function renderBuild() {

  DOM.build.replaceChildren();

  if (!state.player) {

    DOM.build.textContent =
      "도전을 시작하면 표시됩니다.";

    return;
  }

  const base = state.player.base;

  const stats = getPlayerStats();

  const items = getItemEffects(state.items);

  const floorBonus = getFloorItemBonuses(
    state.items,
    state.floor
  );

  const classData = getClass(state.classKey);


  // ==================== 기본 능력치 ====================

  const lines = [

    `클래스: ${classData.name}`,

    `기본 HP: ${formatNumber(base.hp)}`,

    `최종 최대 HP: ${formatNumber(stats.hp)}`,

    `공격력: ${formatNumber(stats.atk)}`,

    `주문력: ${formatNumber(stats.ap)}`,

    `공격 속도: ${stats.spd.toFixed(2)}`,

    `치명타 확률: ${formatPercent(stats.crit)}`,

    `치명타 피해량: ${formatPercent(stats.critMultiplier)}`,

    `기본 공격 피해: ${formatNumber(
      Math.floor(stats.basicAttackDamage)
    )}`,

    `보유 골드: ${formatNumber(state.gold)}G`,

    `패시브 포인트: ${state.passivePoints}`
  ];


  // ==================== 마법사 기본 공격 공식 ====================

  if (state.classKey === "mage") {

    lines.push(
      "기본 공격 계수: ATK 40% + AP 50%"
    );
  }


  // ==================== 오만의 왕관 ====================

  if (stats.crownActive) {

    lines.push(

      `오만의 왕관: 무효화 아이템 ${stats.crownCount}개`,

      `HP / ATK / AP 배율: ×${
        formatDecimal(stats.crownPrimary)
      }`,

      `SPD / 치확 / 치피 배율: ×${
        formatDecimal(stats.crownSecondary)
      }`
    );
  }


  // ==================== 최대 생명력 증가 ====================

  if (items.percentHp > 0) {

    lines.push(
      `아이템 최대 생명력 증가: +${
        formatPercent(items.percentHp)
      }`
    );
  }


  // ==================== 공격력 증가 ====================

  if (items.percentAtk > 0) {

    lines.push(
      `아이템 공격력 증가: +${
        formatPercent(items.percentAtk)
      }`
    );
  }


  // ==================== 주문력 증가 ====================

  if (items.percentAp > 0) {

    lines.push(
      `아이템 주문력 증가: +${
        formatPercent(items.percentAp)
      }`
    );
  }


  // ==================== 공격 속도 증가 ====================

  if (items.flatSpd > 0) {

    lines.push(
      `고정 공격 속도 증가: +${
        formatDecimal(items.flatSpd)
      }`
    );
  }

  if (items.percentSpd > 0) {

    lines.push(
      `비율 공격 속도 증가: +${
        formatPercent(items.percentSpd)
      }`
    );
  }


  // ==================== 치명타 확률 증가 ====================

  if (items.crit > 0) {

    lines.push(
      `아이템 치명타 확률 증가: +${
        formatPercentPoint(items.crit)
      }`
    );
  }


  // ==================== 정밀한 말벌 ====================

  if (items.critDamageBonus > 0) {

    lines.push(
      `치명타 피해량 증가: +${
        formatPercentPoint(items.critDamageBonus)
      }`
    );
  }


  // ==================== 수호의 부적 ====================

  if (items.criticalDamageReduction > 0) {

    lines.push(
      `받는 치명타 피해 감소: ${
        formatPercent(items.criticalDamageReduction)
      }`
    );
  }


  // ==================== 도적 연격 ====================

  if (stats.extraAttackChance > 0) {

    lines.push(
      `추가 공격 확률: ${
        formatPercent(stats.extraAttackChance)
      }`
    );
  }


  // ==================== 흡혈의 반지 ====================

  if (items.lifesteal > 0) {

    lines.push(
      `기본 공격 흡혈률: ${
        formatPercent(items.lifesteal)
      }`
    );
  }


  // ==================== 가시 장갑 ====================

  if (
    items.reflection > 0 ||
    items.floorReflection > 0
  ) {

    lines.push(
      `피격 시 반사 피해: ${
        formatNumber(
          getReflectionDamage(
            state.items,
            state.floor
          )
        )
      }`
    );
  }


  // ==================== 불사의 증표 ====================

  if (items.revive > 0) {

    lines.push(
      `남은 소생 횟수: ${items.revive}회`
    );
  }


  // ==================== 금사의 반지 ====================

  if (items.goldBonus > 0) {

    lines.push(
      `골드 획득량 증가: +${
        formatPercent(items.goldBonus)
      }`
    );
  }


  // ==================== 축복받은 성배 ====================

  if (items.shopHealBonus > 0) {

    lines.push(

      `상점 회복약 효율: +${
        formatPercent(items.shopHealBonus)
      }`,

      `상점 회복약 회복률: ${
        formatPercent(
          0.2 * (1 + items.shopHealBonus)
        )
      }`
    );
  }


  // ==================== 최상급 비급서 ====================

  if (items.floorHp > 0) {

    lines.push(
      `층수 비례 HP 보너스: +${floorBonus.hp}`
    );
  }

  if (items.floorAtk > 0) {

    lines.push(
      `층수 비례 공격력: +${floorBonus.atk}`
    );
  }

  if (items.floorAp > 0) {

    lines.push(
      `층수 비례 주문력: +${floorBonus.ap}`
    );
  }


  // ==================== 특수 아이템 등장 확률 ====================

  const dropChance = getSpecialItemDropChance(
    state.items
  );

  lines.push(
    `일반 보상 슬롯별 특수 아이템 확률: ${
      formatPercent(dropChance)
    }`
  );


  // ==================== 능력치 교환 페널티 ====================

  if (items.flatSpdPenalty > 0) {

    lines.push(
      `고정 공격 속도 페널티: -${
        formatDecimal(items.flatSpdPenalty)
      }`
    );
  }

  if (items.percentSpdPenalty > 0) {

    lines.push(
      `공격 속도 비율 페널티: -${
        formatPercent(items.percentSpdPenalty)
      }`
    );
  }

  if (items.critPenalty > 0) {

    lines.push(
      `치명타 확률 페널티: -${
        formatPercentPoint(items.critPenalty)
      }`
    );
  }

  if (items.percentHpPenalty > 0) {

    lines.push(
      `최대 생명력 페널티: -${
        formatPercent(items.percentHpPenalty)
      }`
    );
  }

  if (items.damagePenalty > 0) {

    lines.push(
      `기본 공격 피해 페널티: -${
        formatPercent(items.damagePenalty)
      }`
    );
  }


  // ==================== 부러진 마검 ====================

  if (items.atkToApConversion > 0) {

    lines.push(
      `공격력 전환 비율: ${
        formatPercent(items.atkToApConversion)
      }`
    );

    lines.push(
      "전환된 공격력의 150%만큼 주문력 증가"
    );
  }


  // ==================== 빌드 정보 출력 ====================

  for (const line of lines) {

    const paragraph = document.createElement("p");

    paragraph.textContent = line;

    DOM.build.appendChild(paragraph);
  }


  // ==================== 실시간 능력치 참조 ====================

  const liveStats = {
    "최종 최대 HP:": "hp",
    "공격력:": "atk",
    "주문력:": "ap",
    "공격 속도:": "spd",
    "치명타 확률:": "crit",
    "치명타 피해량:": "critMultiplier",
    "기본 공격 피해:": "basicAttackDamage"
  };

  for (const paragraph of DOM.build.children) {

    for (const [label, key] of Object.entries(liveStats)) {

      if (paragraph.textContent.startsWith(label)) {

        paragraph.dataset.liveStat = key;
        paragraph.dataset.statLabel = label;

        break;
      }
    }
  }


  // ==================== 패시브 보유 현황 ====================

  const passiveSection = document.createElement("section");

  passiveSection.className = "passive-build-list";

  const passiveHeading = document.createElement("h3");

  passiveHeading.textContent = "클래스 패시브";

  passiveSection.appendChild(passiveHeading);

  for (const passive of classData.passives) {

    const level = getPassiveLevel(
      state.passives,
      passive.id
    );

    const paragraph = document.createElement("p");

    paragraph.textContent =
      `${passive.name}: ${level}/${MAX_PASSIVE_LEVEL}`;


    // ==================== 패시브 상세 설명 ====================

    const description = document.createElement("small");

    description.textContent =
      getPassiveDescription(passive, level);

    description.style.display = "block";

    description.style.whiteSpace = "pre-line";

    description.style.lineHeight = "1.6";

    description.style.marginTop = "6px";

    paragraph.appendChild(description);


    // ==================== 최대 강화 표시 ====================

    if (level === MAX_PASSIVE_LEVEL) {

      paragraph.className = "conditional-active";
    }

    passiveSection.appendChild(paragraph);
  }

  DOM.build.appendChild(passiveSection);


  // ==================== 조건부 효과 표시 영역 ====================

  const conditionalEffects = document.createElement("div");

  conditionalEffects.id = "conditionalEffects";

  DOM.build.appendChild(conditionalEffects);

  renderConditionalEffects();


  // ==================== 특수 아이템 인벤토리 ====================

  renderItems();
}


// ==================== 실시간 빌드 능력치 갱신 ====================

function renderLiveBuildStats() {

  if (!state.player || !DOM.build) {
    return;
  }

  const stats = getPlayerStats();

  const elements = DOM.build.querySelectorAll(
    "[data-live-stat]"
  );

  for (const element of elements) {

    const key = element.dataset.liveStat;

    const label = element.dataset.statLabel;

    const value = stats[key];

    if (!Number.isFinite(value)) {
      continue;
    }

    let text;

    switch (key) {

      case "spd":

        text = value.toFixed(2);

        break;

      case "crit":

      case "critMultiplier":

        text = formatPercent(value);

        break;

      default:

        text = formatNumber(
          Math.floor(value)
        );

        break;
    }

    const nextText = `${label} ${text}`;

    if (element.textContent !== nextText) {

      element.textContent = nextText;
    }
  }
}


// ==================== 조건부 효과 출력 ====================

export function renderConditionalEffects() {

  const container = document.getElementById(
    "conditionalEffects"
  );

  if (!container || !state.player) {
    return;
  }

  container.replaceChildren();

  const items = getItemEffects(state.items);

  const stats = getPlayerStats();

  function appendEffect(text, active = null) {

    const paragraph = document.createElement("p");

    paragraph.textContent = text;

    if (active !== null) {

      paragraph.className = active
        ? "conditional-active"
        : "conditional-inactive";
    }

    container.appendChild(paragraph);
  }


  // ==================== 피해 감소 ====================

  if (stats.damageReduction > 0) {

    appendEffect(
      `현재 기본 피해 감소: ${
        formatPercent(stats.damageReduction)
      }`
    );
  }


  // ==================== 기본 공격 피해 증가 ====================

  if (stats.damageBonus > 0) {

    appendEffect(
      `상시 기본 공격 피해 증가: ${
        formatPercent(stats.damageBonus)
      }`
    );
  }


  // ==================== 기본 공격 피해 최종 배율 ====================

  if (
    stats.damageBonus > 0 ||
    stats.lowHpDamageBonus > 0 ||
    stats.damagePenalty > 0
  ) {

    const damageMultiplier = Math.max(
      0,
      1 +
      stats.damageBonus +
      stats.lowHpDamageBonus -
      stats.damagePenalty
    );

    appendEffect(
      `현재 기본 공격 피해 배율: ×${
        formatDecimal(damageMultiplier)
      }`
    );
  }


  // ==================== 현재 피해 감소 합계 ====================

  const currentReduction =

    stats.damageReduction +

    stats.fullHpDamageReduction;

  if (
    currentReduction > 0 ||
    stats.guardChance > 0 ||
    stats.criticalDamageReduction > 0
  ) {

    appendEffect(
      `현재 일반 피격 피해 감소율: ${
        formatPercent(currentReduction)
      }`
    );

    appendEffect(
      `현재 치명타 피격 피해 감소율: ${
        formatPercent(
          currentReduction +
          stats.criticalDamageReduction
        )
      }`
    );
  }

  if (currentReduction >= 1) {

    appendEffect(
      "받는 피해 완전 무효화",
      true
    );
  }


  // ==================== 수호자의 망토 ====================

  if (stats.guardChance > 0) {

    appendEffect(

      `수호자의 망토: ${
        formatPercent(stats.guardChance)
      } 확률로 피해 감소율 +${
        formatPercentPoint(
          stats.guardDamageReduction
        )
      }`,

      true
    );
  }


  // ==================== 사냥하는 말벌 ====================

  if (items.lowEnemyHpCritBonus > 0) {

    const active =
      stats.lowEnemyHpCritBonus > 0;

    appendEffect(

      `사냥하는 말벌: 치명타 확률 +${
        formatPercentPoint(
          items.lowEnemyHpCritBonus
        )
      } ${
        active ? "[발동 중]" : "[대기 중]"
      }`,

      active
    );
  }


  // ==================== 부러진 마검 ====================

  if (items.atkToApConversion > 0) {

    appendEffect(

      `부러진 마검: ATK -${
        formatDecimal(stats.convertedAtk)
      } / AP 전환량 +${
        formatDecimal(stats.convertedAp)
      }`,

      true
    );
  }


  // ==================== 전사 : 응징 ====================

  if (stats.counterDamage > 0) {

    appendEffect(
      `응징 반격 피해: ${
        formatNumber(stats.counterDamage)
      }`
    );
  }


  // ==================== 전사 : 광전사의 투지 ====================

  if (
    state.classKey === "warrior" &&
    getPassiveLevel(
      state.passives,
      "warrior_berserk"
    ) > 0
  ) {

    const active = stats.isLowHp;

    appendEffect(

      `광전사의 투지: ${
        active ? "[발동 중]" : "[대기 중]"
      }`,

      active
    );
  }


  // ==================== 전사 : 최후의 일격 ====================

  if (
    state.classKey === "warrior" &&
    getPassiveLevel(
      state.passives,
      "warrior_last_strike"
    ) > 0
  ) {

    const active = stats.isLowHp;

    appendEffect(

      `최후의 일격: ${
        stats.attackExtraDamage
      } 추가 피해 ${
        active ? "[발동 중]" : "[대기 중]"
      }`,

      active
    );
  }


  // ==================== 마법사 : 마력 폭발 ====================

  if (
    state.classKey === "mage" &&
    stats.magicBurstHits > 0
  ) {

    const damage = stats.magicBurstDamage;

    const hits = stats.magicBurstHits;

    const totalDamage = damage * hits;

    appendEffect(

      `마력 폭발: ${
        formatNumber(damage)
      } 피해 × ${hits}회 ` +

      `(총 ${
        formatNumber(totalDamage)
      } 피해)`
    );
  }


  // ==================== 광전사의 심장 ====================

  if (items.lowHpDamageBonus > 0) {

    const active = stats.lowHpDamageBonus > 0;

    appendEffect(

      `광전사의 심장: 기본 공격 피해 +${
        formatPercent(items.lowHpDamageBonus)
      } ${
        active ? "[발동 중]" : "[대기 중]"
      }`,

      active
    );
  }


  // ==================== 순결의 방패 ====================

  if (items.fullHpDamageReduction > 0) {

    const active = stats.fullHpDamageReduction > 0;

    appendEffect(

      `순결의 방패: 피해 감소 ${
        formatPercent(items.fullHpDamageReduction)
      } ${
        active ? "[발동 중]" : "[대기 중]"
      }`,

      active
    );
  }
}


// ==================== 도전 결과 출력 ====================

export function renderResult() {

  if (state.phase === "victory") {

    DOM.gameOverTitle.textContent =
      "탑 정복 성공!";

    DOM.result.textContent =
      `${state.floor}층을 모두 클리어했습니다.`;

  } else if (state.phase === "dead") {

    DOM.gameOverTitle.textContent =
      "도전 실패";

    const stats = getPlayerStats();


    // ==================== 최대 생명력 감소 사망 ====================

    if (stats && stats.hp <= 0) {

      DOM.result.textContent =

        "최대 생명력이 소진되어 사망했습니다. " +

        `최종 기록: ${getHighestFloor()}층 클리어`;

    } else {

      DOM.result.textContent =

        `${state.floor}층에서 쓰러졌습니다. ` +

        `최종 기록: ${getHighestFloor()}층 클리어`;
    }
  }
}


// ==================== 저장 상태 출력 ====================

export function renderSaveStatus(message) {

  DOM.saveStatus.textContent = message;
}


// ==================== 진행 단계별 패널 출력 ====================

export function renderPanels() {

  // ==================== 도전 포기 버튼 ====================

  if (DOM.abandonRun) {

    const canAbandon = [
      "rolling",
      "combat",
      "reward",
      "shop"
    ].includes(state.phase);

    setVisible(
      DOM.abandonRun,
      canAbandon
    );
  }

  setVisible(
    DOM.setup,
    state.phase === "setup"
  );

  setVisible(
    DOM.statPanel,
    state.phase === "rolling"
  );

  setVisible(
    DOM.rewardPanel,
    state.phase === "reward"
  );

  setVisible(
    DOM.progressPanel,
    state.phase === "shop"
  );

  setVisible(
    DOM.gameOver,

    state.phase === "dead" ||
    state.phase === "victory"
  );

  DOM.nextFloor.disabled =
    state.phase !== "shop";
}


// ==================== 전투 로그 추가 ====================

export function addLog(
  message,
  type = "normal"
) {

  const paragraph = document.createElement("p");

  paragraph.textContent = message;

  paragraph.classList.add(
    "log-entry",
    `log-${type}`
  );

  DOM.logs.appendChild(paragraph);


  // 로그 최대 100개 유지

  while (DOM.logs.childElementCount > 100) {

    DOM.logs.firstElementChild.remove();
  }

  DOM.logs.scrollTop =
    DOM.logs.scrollHeight;
}


// ==================== 전투 로그 초기화 ====================

export function clearLogs() {

  DOM.logs.replaceChildren();
}


// ==================== 전투 이벤트 처리 ====================

export function renderBattleEvent(event) {

  if (!event) {
    return;
  }


  // ==================== 일반 공격 ====================

  if (event.type === "attack") {

    showDamagePopup(event);

    playAttackEffect(event);

    const attacker =
      event.attacker === "player"

        ? getClass(state.classKey).name

        : state.enemy.name;

    const critical = event.critical
      ? " [치명타]"
      : "";

    const extraAttack = event.isExtraAttack
      ? " [연격]"
      : "";

    const hunting = event.huntingBonusActive
      ? " [사냥하는 말벌]"
      : "";

    const guarded = event.guarded
      ? " [방어]"
      : "";

    addLog(

      `${attacker}: ${event.damage} 피해` +

      critical +
      extraAttack +
      hunting +
      guarded,

      event.critical
        ? "critical"
        : event.attacker
    );

    return;
  }


  // ==================== 특수 아이템 피해 증가 ====================

  if (event.type === "damageBonus") {

    addLog(
      event.message,
      "damage-bonus"
    );

    return;
  }


  // ==================== 기본 공격 피해 감소 ====================

  if (event.type === "damagePenalty") {

    addLog(
      event.message,
      "reduction"
    );

    return;
  }


  // ==================== 수호자의 망토 ====================

  if (event.type === "guard") {

    playGuardEffect(event);

    showDamagePopup(event);

    addLog(
      event.message,
      "reduction"
    );

    return;
  }


  // ==================== 피해 완전 무효화 ====================

  if (event.type === "damageNullified") {

    showDamagePopup(event);

    addLog(
      event.message,
      "reduction"
    );

    return;
  }


  // ==================== 흡혈의 반지 ====================

  if (event.type === "lifesteal") {

    showDamagePopup(event);

    addLog(
      event.message,
      "lifesteal"
    );

    return;
  }


  // ==================== 전사 : 응징 ====================

  if (event.type === "counterAttack") {

    showDamagePopup(event);

    playReflectionEffect();

    addLog(
      event.message,
      "counter-attack"
    );

    return;
  }


  // ==================== 전사 : 최후의 일격 ====================

  if (event.type === "lastStrike") {

    showDamagePopup(event);

    playReflectionEffect();

    addLog(
      event.message,
      "counter-attack"
    );

    return;
  }


  // ==================== 가시 장갑 ====================

  if (event.type === "reflection") {

    showDamagePopup(event);

    playReflectionEffect();

    addLog(
      event.message,
      "reflection"
    );

    return;
  }


  // ==================== 불사의 증표 ====================

  if (event.type === "revive") {

    playReviveEffect(event);

    showDamagePopup(event);

    addLog(
      event.message,
      "revive"
    );

    return;
  }


  // ==================== 피해 감소 ====================

  if (event.type === "damageReduction") {

    showDamagePopup(event);

    addLog(
      event.message,
      "reduction"
    );

    return;
  }


  // ==================== 도적 : 연격 ====================

  if (event.type === "extraAttack") {

    showDamagePopup(event);

    addLog(
      event.message,
      "extra-attack"
    );

    return;
  }


  // ==================== 마법사 : 마력 폭발 ====================

  if (event.type === "magicBurst") {

    // 개별 타격 피해 팝업 출력

    showDamagePopup(event);


    // 첫 번째 타격에서 전체 다단히트 연출 실행

    if ((event.hit ?? 1) === 1) {

      playMagicBurstEffect(
        event.hitCount ?? 1
      );
    }

    addLog(
      event.message,
      "magic-burst"
    );

    return;
  }


  // ==================== 승리 및 패배 ====================

  if (
    event.type === "win" ||
    event.type === "lose"
  ) {

    playDeathEffect(event);
  }


  // ==================== 결과 로그 ====================

  if (event.message) {

    addLog(

      event.message,

      event.type === "lose"
        ? "danger"
        : "success"
    );
  }
}


// ==================== 전투 화면 갱신 ====================

export function renderCombat() {

  renderBackground();

  renderEnvironment(state.floor);

  renderProgress();

  renderPlayer();

  renderEnemy();

  renderLiveBuildStats();

  renderConditionalEffects();
}


// ==================== 전체 화면 갱신 ====================

export function renderAll() {

  renderCombat();

  renderPanels();

  renderStatPreview();

  renderRewards();

  renderShop();

  renderPassives();

  renderBuild();

  renderResult();
}
