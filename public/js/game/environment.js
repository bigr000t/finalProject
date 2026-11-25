"use strict";


// ==================== 환경 효과 설정 ====================

const ENVIRONMENT_CONFIG = {

  dungeon: {
    type: "ember",
    count: 12
  },

  castle: {
    type: "dust",
    count: 16
  },

  wyvern: {
    type: "wind",
    count: 20
  },

  ruinedTower: {
    type: "debris",
    count: 14
  },

  magicTower: {
    type: "magic",
    count: 18
  },

  summit: {
    type: "storm",
    count: 20
  }

};


// ==================== 환경 상태 관리 ====================

let currentEnvironment = null;


// ==================== 무작위 수치 생성 ====================

function random(min, max) {

  return Math.random() * (max - min) + min;

}


// ==================== 층별 환경 조회 ====================

export function getEnvironmentType(floor) {

  const localFloor = ((floor - 1) % 200) + 1;

  if (localFloor === 100) {
    return "wyvern";
  }

  if (localFloor === 200) {
    return "summit";
  }

  if (localFloor < 50) {
    return "dungeon";
  }

  if (localFloor < 100) {
    return "castle";
  }

  if (localFloor < 150) {
    return "ruinedTower";
  }

  return "magicTower";

}


// ==================== 환경 효과 레이어 조회 ====================

function getEnvironmentLayer() {

  return document.getElementById(
    "environmentEffects"
  );

}


// ==================== 기존 환경 효과 제거 ====================

export function clearEnvironment() {

  const layer = getEnvironmentLayer();

  if (layer) {

    layer.replaceChildren();

    layer.removeAttribute("data-environment");

  }

  currentEnvironment = null;

}


// ==================== 환경 입자 생성 ====================

function createParticle(type) {

  const particle = document.createElement("span");

  particle.className =
    `environment-particle particle-${type}`;

  // 입자 위치
  particle.style.setProperty(
    "--x",
    `${random(0, 100)}%`
  );

  particle.style.setProperty(
    "--y",
    `${random(0, 100)}%`
  );

  // 입자 크기
  particle.style.setProperty(
    "--size",
    `${random(2, 6)}px`
  );

  // 애니메이션 지속 시간
  particle.style.setProperty(
    "--duration",
    `${random(4, 10)}s`
  );

  // 애니메이션 시작 지점 분산
  particle.style.setProperty(
    "--delay",
    `${random(-10, 0)}s`
  );

  // 입자 투명도
  particle.style.setProperty(
    "--opacity",
    random(0.15, 0.65).toFixed(2)
  );

  // 수평 이동 거리
  particle.style.setProperty(
    "--drift",
    `${random(-50, 50)}px`
  );

  return particle;

}


// ==================== 입자 일괄 생성 ====================

function createParticles(layer, type, count) {

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {

    fragment.appendChild(
      createParticle(type)
    );

  }

  layer.appendChild(fragment);

}


// ==================== 공통 환경 효과 생성 ====================

function createEffect(layer, className) {

  const effect = document.createElement("div");

  effect.className =
    `environment-effect ${className}`;

  layer.appendChild(effect);

  return effect;

}


// ==================== 지하 감옥 ====================

function createDungeon(layer) {

  const config = ENVIRONMENT_CONFIG.dungeon;

  // 불씨 생성
  createParticles(
    layer,
    config.type,
    config.count
  );

  // 횃불 조명 4개 생성
  for (let i = 1; i <= 4; i++) {

    createEffect(
      layer,
      `torch-glow torch-${i}`
    );

  }

}


// ==================== 버려진 성채 ====================

function createCastle(layer) {

  const config = ENVIRONMENT_CONFIG.castle;

  // 공중에 떠다니는 먼지
  createParticles(
    layer,
    config.type,
    config.count
  );

  // 지면 안개
  createEffect(
    layer,
    "castle-fog"
  );

}


// ==================== 비룡의 문 ====================

function createWyvernGate(layer) {

  const config = ENVIRONMENT_CONFIG.wyvern;

  // 강풍에 날리는 먼지
  createParticles(
    layer,
    config.type,
    config.count
  );

  // 강풍 효과
  createEffect(
    layer,
    "wind-gust"
  );

}


// ==================== 무너진 고탑 ====================

function createRuinedTower(layer) {

  const config = ENVIRONMENT_CONFIG.ruinedTower;

  // 바람에 날리는 작은 잔해
  createParticles(
    layer,
    config.type,
    config.count
  );

  // 먼지바람
  createEffect(
    layer,
    "ruined-dust"
  );

}


// ==================== 고대 마법탑 ====================

function createMagicTower(layer) {

  const config = ENVIRONMENT_CONFIG.magicTower;

  // 공중에 떠다니는 마력 입자
  createParticles(
    layer,
    config.type,
    config.count
  );

  // 푸른 마력 조명
  createEffect(
    layer,
    "magic-glow"
  );

}


// ==================== 탑의 정상 ====================

function createSummit(layer) {

  const config = ENVIRONMENT_CONFIG.summit;

  // 폭풍에 날리는 입자
  createParticles(
    layer,
    config.type,
    config.count
  );

  // 이동하는 구름
  createEffect(
    layer,
    "storm-cloud"
  );

  // 번개 섬광
  createEffect(
    layer,
    "lightning-flash"
  );

}


// ==================== 환경 생성 함수 연결 ====================

const ENVIRONMENT_CREATORS = {

  dungeon: createDungeon,

  castle: createCastle,

  wyvern: createWyvernGate,

  ruinedTower: createRuinedTower,

  magicTower: createMagicTower,

  summit: createSummit

};


// ==================== 환경 효과 출력 ====================

export function renderEnvironment(floor) {

  const layer = getEnvironmentLayer();

  if (!layer) {
    return;
  }

  if (
    !Number.isSafeInteger(floor) ||
    floor < 1
  ) {

    clearEnvironment();

    return;

  }

  // 모션 감소 설정 확인
  if (
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {

    clearEnvironment();

    return;

  }

  const environment = getEnvironmentType(floor);

  // 같은 환경이면 기존 애니메이션 유지
  if (currentEnvironment === environment) {

    return;

  }

  // 이전 환경 효과 제거
  clearEnvironment();

  // 새로운 환경 정보 저장
  currentEnvironment = environment;

  layer.dataset.environment = environment;

  // 해당 환경 생성
  const createEnvironment =
    ENVIRONMENT_CREATORS[environment];

  if (createEnvironment) {

    createEnvironment(layer);

  }

}