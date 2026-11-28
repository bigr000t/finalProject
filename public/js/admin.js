"use strict";

import {
  state,
  isAdmin,
  getMaxHp,
  getPlayerStats,
  syncPlayerHp,
  COMBAT_CONFIG
} from "./game/state.js";

import {
  createEnemy
} from "./game/enemy.js";

import {
  stopBattle
} from "./game/battle.js";

import {
  DOM,
  renderAll,
  addLog
} from "./game/render.js";


// ==================== 관리자 설정 ====================

const ACTIVE_PHASES = [
  "combat",
  "reward",
  "shop"
];

const STAT_PHASES = [
  "rolling",
  ...ACTIVE_PHASES
];

const STAT_FIELDS = {
  hp: "adminHp",
  currentHp: "adminCurrentHp",
  atk: "adminAtk",
  ap: "adminAp",
  spd: "adminSpd",
  crit: "adminCrit",
  critDamage: "adminCritDamage"
};

let processing = false;


// ==================== 처리 결과 표시 ====================

function showMessage(message, error = false) {

  const element = document.getElementById(
    "adminMessage"
  );

  if (element) {
    element.textContent = message;
    element.dataset.error = String(error);
  }

}


// ==================== 관리자 서버 요청 ====================

async function requestAdmin(path, data) {

  const response = await fetch(
    `/api/admin/${path}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      credentials: "same-origin",

      body: JSON.stringify(data)
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {

    throw new Error(
      result.message ||
      "관리자 명령이 거부되었습니다."
    );

  }

  return result;

}


// ==================== 중복 명령 방지 ====================

function setProcessing(value) {

  processing = value;

  const panel = document.getElementById(
    "adminPanel"
  );

  if (!panel) {
    return;
  }

  panel.querySelectorAll("button").forEach(
    button => {
      button.disabled = value;
    }
  );

}


// ==================== 관리자 조작 가능 여부 ====================

function canUseAdmin(phases, canControl) {

  return (
    isAdmin() &&
    canControl() &&
    !!state.player &&
    state.player.hp > 0 &&
    phases.includes(state.phase)
  );

}


// ==================== 게임 상태 변경 확인 ====================

function captureRun() {

  return {
    player: state.player,
    floor: state.floor,
    phase: state.phase
  };

}

function isSameRun(snapshot) {

  return (
    state.player === snapshot.player &&
    state.floor === snapshot.floor &&
    state.phase === snapshot.phase
  );

}


// ==================== 관리자 층 이동 ====================

async function jumpFloor(
  canControl,
  onFloorChanged
) {

  if (
    processing ||
    !canUseAdmin(ACTIVE_PHASES, canControl)
  ) {

    showMessage(
      "능력치를 확정한 뒤 층을 이동할 수 있습니다.",
      true
    );

    return;

  }

  const input = document.getElementById(
    "adminFloor"
  );

  const floor = Number(input.value);

  if (
    !input.value.trim() ||
    !Number.isSafeInteger(floor) ||
    floor < 1 ||
    floor > 1000000
  ) {

    showMessage(
      "올바른 층수를 입력해주세요.",
      true
    );

    return;

  }

  const snapshot = captureRun();

  setProcessing(true);

  try {

    // 서버 관리자 권한 및 층수 검증

    const result = await requestAdmin(
      "floor",
      { floor }
    );

    if (
      !canUseAdmin(ACTIVE_PHASES, canControl) ||
      !isSameRun(snapshot)
    ) {

      throw new Error(
        "게임 상태가 변경되었습니다. 다시 시도해주세요."
      );

    }

    const beforeMaxHp = getMaxHp(state);

    // 실제 상태 변경 전 새로운 몬스터 생성

    const nextEnemy = createEnemy(result.floor);

    if (
      !nextEnemy ||
      !Number.isFinite(nextEnemy.maxHp) ||
      nextEnemy.maxHp <= 0 ||
      !Number.isFinite(nextEnemy.atk) ||
      nextEnemy.atk < 0 ||
      !Number.isFinite(nextEnemy.spd) ||
      nextEnemy.spd <= 0
    ) {

      throw new Error(
        "해당 층의 몬스터를 생성할 수 없습니다."
      );

    }

    // 임시 상태에서 최대 생명력 검증

    const candidate = {
      ...state,

      floor: result.floor,

      player: {
        ...state.player
      },

      enemy: nextEnemy
    };

    const nextMaxHp = getMaxHp(candidate);

    if (
      !Number.isFinite(nextMaxHp) ||
      nextMaxHp <= 0 ||
      !syncPlayerHp(beforeMaxHp, candidate)
    ) {

      throw new Error(
        "층 이동 후 최대 생명력이 유효하지 않습니다."
      );

    }


    // ==================== 기존 전투 종료 ====================

    stopBattle();


    // ==================== 새 층 적용 ====================

    state.floor = result.floor;

    state.enemy = nextEnemy;

    state.player.hp = candidate.player.hp;

    state.rewards = [];

    state.rerollCount = 0;

    state.lastPlayerAttack = 0;

    state.lastEnemyAttack = 0;

    state.phase = "combat";

    DOM.battleEffects?.replaceChildren();


    // ==================== 새 전투 시작 ====================

    addLog(
      `[관리자] ${state.floor}층으로 이동했습니다.`,
      "success"
    );

    onFloorChanged();

    showMessage(
      `${state.floor}층 이동 완료`
    );

  } catch (error) {

    console.error(
      "관리자 층 이동 오류:",
      error
    );

    showMessage(error.message, true);

  } finally {

    setProcessing(false);

  }

}


// ==================== 현재 능력치 불러오기 ====================

function loadCurrentStats(canControl) {

  if (
    processing ||
    !canUseAdmin(STAT_PHASES, canControl)
  ) {

    showMessage(
      "먼저 클래스를 선택해주세요.",
      true
    );

    return;

  }

  const base = state.player.base;

  const values = {
    hp: base.hp,

    currentHp: state.player.hp,

    atk: base.atk,

    ap: base.ap,

    spd: base.spd,

    crit: Number(
      (base.crit * 100).toFixed(6)
    ),

    critDamage: Number(
      (
        (
          state.adminBaseCritMultiplier ??
          COMBAT_CONFIG.baseCritMultiplier
        ) * 100
      ).toFixed(6)
    )
  };

  for (const [key, id] of Object.entries(STAT_FIELDS)) {

    document.getElementById(id).value =
      values[key];

  }

  showMessage(
    "현재 기본 능력치를 불러왔습니다."
  );

}


// ==================== 관리자 능력치 수정 ====================

async function applyStats(canControl) {

  if (
    processing ||
    !canUseAdmin(STAT_PHASES, canControl)
  ) {

    showMessage(
      "먼저 클래스를 선택해주세요.",
      true
    );

    return;

  }

  const stats = {};

  for (const [key, id] of Object.entries(STAT_FIELDS)) {

    const input = document.getElementById(id);

    if (input.value.trim() === "") {
      continue;
    }

    const value = Number(input.value);

    if (
      !Number.isFinite(value) ||
      !input.checkValidity()
    ) {

      showMessage(
        "능력치 입력값을 확인해주세요.",
        true
      );

      return;

    }

    stats[key] = value;

  }

  if (Object.keys(stats).length === 0) {

    showMessage(
      "수정할 능력치를 입력해주세요.",
      true
    );

    return;

  }

  const snapshot = captureRun();

  setProcessing(true);

  try {

    // 서버 관리자 권한 및 능력치 검증

    const result = await requestAdmin(
      "stats",
      stats
    );

    if (
      !canUseAdmin(STAT_PHASES, canControl) ||
      !isSameRun(snapshot)
    ) {

      throw new Error(
        "게임 상태가 변경되었습니다. 다시 시도해주세요."
      );

    }

    const approved = result.stats;

    const beforeMaxHp = getMaxHp(state);


    // ==================== 임시 능력치 구성 ====================

    const candidate = {

      ...state,

      player: {
        ...state.player,

        base: {
          ...state.player.base
        }
      }

    };

    for (const key of [
      "hp",
      "atk",
      "ap",
      "spd"
    ]) {

      if (approved[key] !== undefined) {

        candidate.player.base[key] =
          approved[key];

      }

    }


    // ==================== 치명타 확률 ====================

    if (approved.crit !== undefined) {

      candidate.player.base.crit =
        approved.crit / 100;

    }


    // ==================== 치명타 피해량 ====================

    if (approved.critDamage !== undefined) {

      candidate.adminBaseCritMultiplier =
        approved.critDamage / 100;

    }


    // ==================== 최대 생명력 검증 ====================

    const maxHp = getMaxHp(candidate);

    if (
      !Number.isFinite(maxHp) ||
      maxHp <= 0
    ) {

      throw new Error(
        "최종 최대 생명력이 유효하지 않습니다."
      );

    }


    // ==================== 현재 생명력 보정 ====================

    if (approved.currentHp !== undefined) {

      if (approved.currentHp > maxHp) {

        throw new Error(
          "현재 생명력은 최종 최대 생명력을 초과할 수 없습니다."
        );

      }

      candidate.player.hp =
        approved.currentHp;

    } else {

      syncPlayerHp(
        beforeMaxHp,
        candidate
      );

    }


    // ==================== 최종 능력치 검증 ====================

    const finalStats = getPlayerStats(candidate);

    const requiredStats = [
      "hp",
      "atk",
      "ap",
      "spd",
      "crit",
      "critMultiplier"
    ];

    if (
      !finalStats ||
      requiredStats.some(
        key => !Number.isFinite(finalStats[key])
      )
    ) {

      throw new Error(
        "최종 능력치 계산에 실패했습니다."
      );

    }


    // ==================== 능력치 적용 ====================

    Object.assign(
      state.player.base,
      candidate.player.base
    );

    state.player.hp =
      candidate.player.hp;

    state.adminBaseCritMultiplier =
      candidate.adminBaseCritMultiplier;


    // ==================== 화면 갱신 ====================

    renderAll();

    addLog(
      "[관리자] 능력치를 수정했습니다.",
      "success"
    );

    showMessage(
      "능력치 수정 완료"
    );

  } catch (error) {

    console.error(
      "관리자 능력치 수정 오류:",
      error
    );

    showMessage(error.message, true);

  } finally {

    setProcessing(false);

  }

}


// ==================== 관리자 이벤트 등록 ====================

export function bindAdminControls({
  canControl,
  onFloorChanged
}) {

  const panel = document.getElementById(
    "adminPanel"
  );

  if (!isAdmin() || !panel) {
    return;
  }

  document.getElementById(
    "adminJumpFloor"
  ).addEventListener("click", () => {

    jumpFloor(
      canControl,
      onFloorChanged
    );

  });

  document.getElementById(
    "adminLoadStats"
  ).addEventListener("click", () => {

    loadCurrentStats(canControl);

  });

  document.getElementById(
    "adminApplyStats"
  ).addEventListener("click", () => {

    applyStats(canControl);

  });

}
