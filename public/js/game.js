"use strict";

import {
  state,
  resetState,
  startNewRun,
  rerollStats,
  confirmStats,
  advanceFloor,
  getMaxHp,
  getHighestFloor,
  captureLeaderboardSnapshot,
  isLoggedIn,
  isAdmin,
  saveGame,
  loadGame,
  deleteSave,
  upgradePassive
} from "./game/state.js";

import {
  getClass,
  getPassive,
  getPassiveLevel,
  MAX_PASSIVE_LEVEL
} from "./game/class.js";

import {
  applyReward,
  rerollRewards
} from "./game/reward.js";

import { buyItem } from "./game/shop.js";

import {
  startBattle,
  stopBattle
} from "./game/battle.js";

import {
  DOM,
  renderAll,
  renderCombat,
  renderBattleEvent,
  renderSaveStatus,
  addLog,
  clearLogs
} from "./game/render.js";

import { saveRun } from "./leaderboard.js";


// ==================== 게임 기본 설정 ====================

const AUTO_SAVE_INTERVAL = 5000;

let lastSaveTime = 0;
let finishing = false;
let initializing = true;
let abandoning = false;

const pendingSaves = new Set();


// ==================== 게임 자동 저장 ====================

async function autoSave(force = false) {
  if (
    abandoning ||
    finishing ||
    !isLoggedIn() ||
    isAdmin()
  ) {
    return false;
  }

  const allowedPhases = [
    "combat",
    "reward",
    "shop"
  ];

  if (!allowedPhases.includes(state.phase)) {
    return false;
  }

  const now = Date.now();

  if (
    !force &&
    now - lastSaveTime < AUTO_SAVE_INTERVAL
  ) {
    return false;
  }

  lastSaveTime = now;

  const saveTask = saveGame();

  pendingSaves.add(saveTask);

  let success;

  try {
    success = await saveTask;
  } finally {
    pendingSaves.delete(saveTask);
  }

  if (!success) {
    console.error("자동 저장 실패");
  }

  return success;
}


// ==================== 클래스 선택 ====================

function selectClass(classKey) {
  if (
    initializing ||
    state.phase !== "setup"
  ) {
    return;
  }

  const result = startNewRun(classKey);

  if (!result) {
    return;
  }

  clearLogs();

  const classData = getClass(classKey);

  addLog(`${classData.name} 클래스를 선택했습니다.`);
  addLog("초기 능력치를 확정해주세요.");

  renderAll();
}


// ==================== 초기 스탯 리롤 ====================

function handleStatReroll() {
  if (!rerollStats()) {
    return;
  }

  addLog("초기 능력치를 다시 추첨했습니다.");

  renderAll();
}


// ==================== 초기 스탯 확정 ====================

function handleStatConfirm() {
  if (!confirmStats()) {
    return;
  }

  addLog(
    "초기 능력치가 확정되었습니다.",
    "success"
  );

  autoSave(true);

  beginCombat();
}


// ==================== 전투 시작 ====================

function beginCombat() {
  if (state.phase !== "combat") {
    return;
  }

  addLog(
    `${state.floor}층: ${state.enemy.name} 등장!`
  );

  renderAll();

  startBattle(handleBattleEvents);
}


// ==================== 전투 이벤트 처리 ====================

function handleBattleEvents(events) {
  let battleEnded = false;
  let forceSave = false;

  for (const event of events) {
    if (!event) {
      continue;
    }

    renderBattleEvent(event);

    switch (event.type) {

      // 일반 전투 효과
      case "lifesteal":
      case "reflection":
      case "counterAttack":
      case "lastStrike":
      case "magicBurst":
      case "extraAttack":
      case "damageBonus":
      case "damagePenalty":
      case "damageReduction":
      case "guard":
      case "damageNullified":
        break;


      // 불사의 증표
      case "revive":
        forceSave = true;
        break;


      // ==================== 전투 승리 ====================

      case "win": {
        battleEnded = true;

        // 마지막 클리어 시점의 빌드 저장
        // 관리자는 스냅샷 및 리더보드 저장 제외
        const snapshot =
          isLoggedIn() && !isAdmin()
            ? captureLeaderboardSnapshot()
            : null;

        renderAll();

        autoSave(true);


        // ==================== 실시간 리더보드 갱신 ====================

        if (snapshot) {
          const currentPlayer = state.player;

          saveRun(
            snapshot.floor,
            snapshot.classKey,
            snapshot.build
          ).then(result => {

            if (!result.success) {
              console.warn(
                "최고 기록 갱신 실패:",
                result.message
              );

              return;
            }

            if (
              result.updated &&
              !abandoning &&
              state.player === currentPlayer
            ) {
              addLog(
                result.message,
                "success"
              );
            }

          }).catch(error => {
            console.error(
              "리더보드 갱신 오류:",
              error
            );
          });
        }

        break;
      }


      // ==================== 전투 종료 ====================

      case "lose":
      case "victory":
        battleEnded = true;

        if (
          event.type === "victory" &&
          isLoggedIn() &&
          !isAdmin()
        ) {
          captureLeaderboardSnapshot();
        }

        finishRun();

        break;
    }
  }


  // ==================== 전투 화면 갱신 ====================

  if (!battleEnded) {
    if (forceSave) {
      renderAll();
      autoSave(true);
    } else {
      renderCombat();
      autoSave();
    }
  }
}


// ==================== 최대 생명력 소진 처리 ====================

function handleFatalHpLoss() {
  if (!state.player) {
    return false;
  }

  if (
    state.phase !== "dead" &&
    getMaxHp(state) > 0
  ) {
    return false;
  }

  stopBattle();

  state.player.hp = 0;
  state.phase = "dead";
  state.rewards = [];

  addLog(
    "최대 생명력이 소진되어 사망했습니다.",
    "danger"
  );

  addLog(
    "불사의 증표로 소생할 수 없습니다.",
    "danger"
  );

  finishRun();

  return true;
}


// ==================== 보상 선택 ====================

function selectReward(rewardId) {
  if (
    initializing ||
    abandoning ||
    finishing ||
    state.phase !== "reward"
  ) {
    return;
  }

  // 실제 제시된 보상인지 확인
  const offered = state.rewards.some(
    reward => reward.id === rewardId
  );

  if (!offered) {
    return;
  }

  let reward;

  try {
    reward = applyReward(state, rewardId);

  } catch (error) {
    console.error("보상 획득 오류:", error);

    addLog(
      error.message || "보상 획득에 실패했습니다.",
      "danger"
    );

    return;
  }


  // ==================== 특수 아이템 획득 ====================

  if (reward.type === "special") {
    addLog(
      `[특수 아이템] ${reward.title} 획득!`,
      "success"
    );

    addLog(
      `보유 개수: ${reward.count}/3개`,
      "success"
    );

    addLog(
      `적용 효과: ${reward.effectText}`,
      reward.fatal ? "danger" : "success"
    );


    // 오만의 왕관 최초 획득
    if (reward.crownAcquired) {
      addLog(
        "오만의 왕관이 즉시 최대 중첩에 도달했습니다.",
        "success"
      );

      addLog(
        "다른 모든 특수 아이템의 효과가 무효화됩니다.",
        "normal"
      );

      addLog(
        "클래스 패시브는 정상적으로 유지됩니다.",
        "normal"
      );
    }


    // 오만의 왕관 보유 중 아이템 획득
    if (reward.disabled) {
      addLog(
        "획득한 아이템은 오만의 왕관 성장에 기여합니다.",
        "success"
      );
    }


    // 최대 생명력 변경 로그
    if (
      Number.isFinite(reward.beforeMaxHp) &&
      Number.isFinite(reward.afterMaxHp) &&
      reward.beforeMaxHp !== reward.afterMaxHp
    ) {
      const increased =
        reward.afterMaxHp > reward.beforeMaxHp;

      addLog(
        `최대 생명력: ${reward.beforeMaxHp}` +
        ` → ${reward.afterMaxHp}`,
        increased ? "success" : "danger"
      );
    }

  } else {

    // 일반 보상 획득
    addLog(
      `${reward.title} 획득!`,
      "success"
    );

  }


  // ==================== 최대 생명력 감소 즉사 ====================

  if (
    reward.fatal ||
    state.phase === "dead" ||
    getMaxHp(state) <= 0
  ) {
    handleFatalHpLoss();
    return;
  }


  // ==================== 상점 단계 진입 ====================

  state.phase = "shop";
  state.rewards = [];

  renderAll();

  autoSave(true);
}


// ==================== 보상 리롤 ====================

function handleRewardReroll() {
  if (
    initializing ||
    abandoning ||
    finishing
  ) {
    return;
  }

  const result = rerollRewards(state);

  if (!result.success) {
    return;
  }

  addLog(result.message);

  renderAll();

  autoSave(true);
}


// ==================== 일반 상품 구매 ====================

function handleItemPurchase(itemId) {
  const result = buyItem(state, itemId);

  if (!result.success) {
    addLog(result.message, "danger");
    return;
  }

  addLog(result.message, "success");

  if (
    state.phase === "dead" ||
    getMaxHp(state) <= 0
  ) {
    handleFatalHpLoss();
    return;
  }

  renderAll();

  autoSave(true);
}


// ==================== 패시브 강화 ====================

function handlePassiveUpgrade(passiveId) {
  if (
    state.phase !== "shop" ||
    !state.player ||
    !state.classKey
  ) {
    return;
  }

  const passive = getPassive(
    state.classKey,
    passiveId
  );

  if (!passive) {
    addLog(
      "존재하지 않는 패시브입니다.",
      "danger"
    );

    return;
  }

  const beforeLevel = getPassiveLevel(
    state.passives,
    passiveId
  );

  // 최대 레벨 확인
  if (beforeLevel >= MAX_PASSIVE_LEVEL) {
    addLog(
      "이미 최대 레벨에 도달한 패시브입니다.",
      "danger"
    );

    return;
  }

  // 패시브 포인트 확인
  if (state.passivePoints <= 0) {
    addLog(
      "패시브 포인트가 부족합니다.",
      "danger"
    );

    return;
  }

  // 패시브 강화 적용
  const success = upgradePassive(
    passiveId,
    state
  );

  if (!success) {
    addLog(
      "패시브 강화에 실패했습니다.",
      "danger"
    );

    return;
  }

  const afterLevel = getPassiveLevel(
    state.passives,
    passiveId
  );

  addLog(
    `${passive.name} 강화! ` +
    `Lv.${beforeLevel} → Lv.${afterLevel}`,
    "success"
  );

  addLog(
    `남은 패시브 포인트: ${state.passivePoints}`,
    "normal"
  );

  // 최대 레벨 달성
  if (afterLevel >= MAX_PASSIVE_LEVEL) {
    addLog(
      `${passive.name} 최대 레벨 달성!`,
      "success"
    );
  }

  // 최대 생명력 소진 확인
  if (
    state.phase === "dead" ||
    getMaxHp(state) <= 0
  ) {
    handleFatalHpLoss();
    return;
  }

  renderAll();

  autoSave(true);
}


// ==================== 다음 층 진입 ====================

function handleNextFloor() {
  if (
    initializing ||
    abandoning ||
    finishing ||
    state.phase !== "shop"
  ) {
    return;
  }

  if (
    state.player &&
    getMaxHp(state) <= 0
  ) {
    handleFatalHpLoss();
    return;
  }

  if (!advanceFloor()) {
    return;
  }

  autoSave(true);

  beginCombat();
}


// ==================== 도전 종료 ====================

async function finishRun() {
  if (finishing) {
    return;
  }

  if (
    state.phase !== "dead" &&
    state.phase !== "victory"
  ) {
    return;
  }

  finishing = true;

  stopBattle();

  DOM.restart.disabled = true;

  try {
    renderAll();


    // 관리자 기록 저장 제외
    if (isAdmin()) {
      renderSaveStatus(
        "관리자 계정의 도전 기록은 저장되지 않습니다."
      );

      return;
    }


    // 마지막으로 클리어한 층과 빌드
    const highestFloor = getHighestFloor();
    const snapshot = state.leaderboardSnapshot;


    // 비로그인 사용자
    if (!isLoggedIn()) {
      renderSaveStatus(
        "로그인하면 도전 기록을 저장할 수 있습니다."
      );

      return;
    }


    // 기존 자동 저장 완료 대기
    await Promise.allSettled([...pendingSaves]);

    renderSaveStatus("도전 기록 저장 중...");

    let message;


    // ==================== 도전 기록 저장 ====================

    if (
      highestFloor > 0 &&
      snapshot?.floor === highestFloor
    ) {
      const result = await saveRun(
        snapshot.floor,
        snapshot.classKey,
        snapshot.build
      );

      message = result.message || (
        result.success
          ? "도전 기록이 저장되었습니다."
          : "도전 기록 저장에 실패했습니다."
      );

      console.log(
        "[도전 기록 저장 결과]",
        result
      );

    } else if (highestFloor > 0) {

      message =
        "클리어 당시의 빌드 정보가 없어 기록하지 않습니다.";

    } else {

      message =
        "클리어한 층이 없어 기록하지 않습니다.";

    }


    // 종료된 도전 저장 데이터 삭제
    const deleted = await deleteSave();

    if (!deleted) {
      message += " 기존 진행 데이터 삭제에 실패했습니다.";
    }

    renderSaveStatus(message);

  } catch (error) {

    console.error(
      "도전 종료 처리 오류:",
      error
    );

    renderSaveStatus(
      "도전 기록 처리 중 오류가 발생했습니다."
    );

  } finally {

    finishing = false;

    DOM.restart.disabled = false;

  }
}


// ==================== 도전 포기 ====================

async function abandonRun() {
  if (
    abandoning ||
    finishing ||
    initializing
  ) {
    return;
  }

  const allowedPhases = [
    "rolling",
    "combat",
    "reward",
    "shop"
  ];

  if (!allowedPhases.includes(state.phase)) {
    return;
  }

  // 사용자 확인
  const confirmed = window.confirm(
    "현재 도전을 포기하시겠습니까?\n\n" +
    "능력치, 골드, 패시브 레벨, 패시브 포인트, " +
    "특수 아이템이 초기화됩니다.\n" +
    (
      isAdmin()
        ? "관리자 기록은 저장되지 않습니다."
        : "리더보드 최고 기록은 유지됩니다."
    )
  );

  if (!confirmed) {
    return;
  }

  abandoning = true;

  const previousPhase = state.phase;
  const gameSection = document.getElementById("game");

  // 게임 조작 잠금
  if (gameSection) {
    gameSection.inert = true;
  }

  stopBattle();

  try {

    // 진행 중인 자동 저장 완료 대기
    await Promise.allSettled([...pendingSaves]);


    // ==================== 일반 사용자 기록 처리 ====================

    if (isLoggedIn() && !isAdmin()) {
      const highestFloor = getHighestFloor();
      const snapshot = state.leaderboardSnapshot;

      // 마지막 클리어 당시의 빌드로 저장
      if (
        highestFloor > 0 &&
        snapshot?.floor === highestFloor
      ) {
        const result = await saveRun(
          snapshot.floor,
          snapshot.classKey,
          snapshot.build
        );

        if (!result.success) {
          throw new Error(
            result.message ||
            "최고 기록 저장에 실패했습니다."
          );
        }
      }

      // 현재 진행 데이터 삭제
      const deleted = await deleteSave();

      if (!deleted) {
        throw new Error(
          "저장 데이터 삭제에 실패했습니다."
        );
      }
    }


    // ==================== 게임 상태 초기화 ====================

    resetState();

    clearLogs();

    DOM.battleEffects?.replaceChildren();

    renderSaveStatus("");

    lastSaveTime = 0;

    renderAll();

    addLog(
      "도전을 포기했습니다. 새로운 도전을 시작하세요.",
      "normal"
    );

    console.log("[도전 포기] 초기화 완료");

  } catch (error) {

    console.error(
      "도전 포기 처리 오류:",
      error
    );

    alert(
      "도전 포기에 실패했습니다.\n" +
      error.message
    );

    // 실패 시 기존 전투 재개
    if (
      previousPhase === "combat" &&
      state.phase === "combat"
    ) {
      startBattle(handleBattleEvents);
    }

    renderAll();

  } finally {

    abandoning = false;

    if (gameSection) {
      gameSection.inert = false;
    }

  }
}


// ==================== 새로운 도전 ====================

function restartGame() {
  if (finishing || abandoning) {
    return;
  }

  if (
    state.phase !== "dead" &&
    state.phase !== "victory"
  ) {
    return;
  }

  stopBattle();

  resetState();

  clearLogs();

  DOM.battleEffects?.replaceChildren();

  renderSaveStatus("");

  lastSaveTime = 0;

  renderAll();
}


// ==================== 선택 버튼 이벤트 ====================

function handleChoiceClick(event) {
  if (
    initializing ||
    abandoning ||
    finishing
  ) {
    return;
  }

  const button = event.target.closest(
    "button[data-action]"
  );

  if (!button || button.disabled) {
    return;
  }

  const action = button.dataset.action;
  const id = button.dataset.id;

  switch (action) {

    case "reward":
      selectReward(id);
      break;

    case "buy-item":
      handleItemPurchase(id);
      break;

    case "upgrade-passive":
      handlePassiveUpgrade(id);
      break;

  }
}


// ==================== 이벤트 등록 ====================

function bindEvents() {

  // 클래스 선택
  DOM.classList.addEventListener("click", event => {
    const button = event.target.closest(
      "button[data-class]"
    );

    if (!button || button.disabled) {
      return;
    }

    selectClass(button.dataset.class);
  });

  // 초기 스탯 리롤
  DOM.rerollStats.addEventListener(
    "click",
    handleStatReroll
  );

  // 초기 스탯 확정
  DOM.confirmStats.addEventListener(
    "click",
    handleStatConfirm
  );

  // 보상 선택
  DOM.rewards.addEventListener(
    "click",
    handleChoiceClick
  );

  // 보상 리롤
  DOM.rerollRewards.addEventListener(
    "click",
    handleRewardReroll
  );

  // 일반 상점
  DOM.shopItems.addEventListener(
    "click",
    handleChoiceClick
  );

  // 패시브 강화
  DOM.passives.addEventListener(
    "click",
    handleChoiceClick
  );

  // 다음 층 진입
  DOM.nextFloor.addEventListener(
    "click",
    handleNextFloor
  );

  // 새로운 도전
  DOM.restart.addEventListener(
    "click",
    restartGame
  );

  // 도전 포기
  DOM.abandonRun?.addEventListener(
    "click",
    abandonRun
  );
}


// ==================== 관리자 모드 초기화 ====================

async function initializeAdmin() {
  if (!isAdmin()) {
    return;
  }

  const { bindAdminControls } = await import(
    "./admin.js"
  );

  bindAdminControls({

    canControl: () => (
      !initializing &&
      !abandoning &&
      !finishing
    ),

    onFloorChanged: beginCombat

  });
}


// ==================== 저장된 게임 복구 ====================

async function restoreGame() {
  if (!isLoggedIn() || isAdmin()) {
    return false;
  }

  const restored = await loadGame();

  if (!restored) {
    return false;
  }

  addLog(
    "저장된 도전을 불러왔습니다.",
    "success"
  );

  addLog(
    `현재 진행 층수: ${state.floor}층`
  );

  if (state.passivePoints > 0) {
    addLog(
      `보유 패시브 포인트: ${state.passivePoints}`
    );
  }

  renderAll();

  // 전투 도중 저장한 경우
  if (state.phase === "combat") {
    beginCombat();
  }

  return true;
}


// ==================== 게임 초기화 ====================

async function initializeGame() {
  renderAll();

  const classButtons =
    DOM.classList.querySelectorAll("button");

  classButtons.forEach(button => {
    button.disabled = true;
  });

  try {

    await restoreGame();

    await initializeAdmin();

  } catch (error) {

    console.error(
      "게임 초기화 오류:",
      error
    );

  } finally {

    initializing = false;

    bindEvents();

    classButtons.forEach(button => {
      button.disabled = false;
    });

    renderAll();

  }
}


// ==================== 게임 실행 ====================

initializeGame();
