"use strict";

import {
  state,
  resetState,
  startNewRun,
  rerollStats,
  confirmStats,
  advanceFloor,
  getHighestFloor,
  isLoggedIn,
  saveGame,
  loadGame,
  deleteSave
} from "./game/state.js";

import {
  getClass
} from "./game/class.js";

import {
  applyReward,
  rerollRewards
} from "./game/reward.js";

import {
  buyItem,
  buyPassive
} from "./game/shop.js";

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

import {
  saveRun
} from "./leaderboard.js";


// ==================== 게임 기본 설정 ====================

const AUTO_SAVE_INTERVAL = 5000;

let lastSaveTime = 0;

let finishing = false;

let initializing = true;

let abandoning = false;

const pendingSaves = new Set();

// ==================== 게임 자동 저장 ====================

async function autoSave(force = false) {

  if (abandoning || !isLoggedIn()) {
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

  addLog(
    `${classData.name} 클래스를 선택했습니다.`
  );

  addLog(
    "초기 능력치를 확정해주세요."
  );

  renderAll();

}




// ==================== 초기 스탯 리롤 ====================

function handleStatReroll() {

  if (!rerollStats()) {
    return;
  }

  addLog(
    "초기 능력치를 다시 추첨했습니다."
  );

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

      // ==================== 흡혈 ====================

      case "lifesteal":

        break;


      // ==================== 반사 피해 ====================

      case "reflection":

        break;


      // ==================== 불사의 증표 ====================

      case "revive":

        // 증표 소모 상태를 즉시 저장
        forceSave = true;

        break;


      case "win":

        battleEnded = true;

        renderAll();

        autoSave(true);


// ==================== 실시간 리더보드 갱신 ====================

if (isLoggedIn()) {

  const currentPlayer = state.player;

  saveRun(
    state.floor,
    state.classKey
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
      // ==================== 전투 종료 ====================

      case "lose":
      case "victory":

        battleEnded = true;

        finishRun();

        break;

    }

  }

  if (!battleEnded) {

    if (forceSave) {

      // 증표 소모 후 빌드 및 아이템 정보 갱신
      renderAll();

      autoSave(true);

    } else {

      // 일반 전투 화면 갱신
      renderCombat();

      autoSave();

    }

  }

}


// ==================== 보상 선택 ====================

// ==================== 보상 선택 ====================

function selectReward(rewardId) {

  if (state.phase !== "reward") {
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

    reward = applyReward(

      state,

      rewardId

    );

  } catch (error) {

    console.error(
      "보상 획득 오류:",
      error
    );

    addLog(

      error.message ||
      "보상 획득에 실패했습니다.",

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

      "success"

    );

  } else {

    // 기존 일반 보상 획득

    addLog(

      `${reward.title} 획득!`,

      "success"

    );

  }


  // ==================== 상점 단계 진입 ====================

  state.phase = "shop";

  state.rewards = [];

  renderAll();

  autoSave(true);

}


// ==================== 보상 리롤 ====================

function handleRewardReroll() {

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

  const result = buyItem(
    state,
    itemId
  );

  if (!result.success) {

    addLog(
      result.message,
      "danger"
    );

    return;

  }

  addLog(
    result.message,
    "success"
  );

  renderAll();

  autoSave(true);

}


// ==================== 패시브 구매 ====================

function handlePassivePurchase(passiveId) {

  const result = buyPassive(
    state,
    passiveId
  );

  if (!result.success) {

    addLog(
      result.message,
      "danger"
    );

    return;

  }

  addLog(
    result.message,
    "success"
  );

  renderAll();

  autoSave(true);

}


// ==================== 다음 층 진입 ====================

function handleNextFloor() {

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

  renderAll();

  DOM.restart.disabled = true;

  const highestFloor = getHighestFloor();

  const classKey = state.classKey;

  try {

    // 비로그인 사용자
    if (!isLoggedIn()) {

      renderSaveStatus(
        "로그인하면 도전 기록을 저장할 수 있습니다."
      );

      return;

    }

    renderSaveStatus(
      "도전 기록 저장 중..."
    );

    let message;

    // 1층에서 패배한 경우 기록하지 않음
    if (highestFloor > 0) {

      const result = await saveRun(
        highestFloor,
        classKey
      );

      message = result.message ||
    (
      result.success
        ? "도전 기록이 저장되었습니다."
        : "도전 기록 저장에 실패했습니다."
    );

  console.log(
    "[도전 기록 저장 결과]",
    result
);

    } else {

      message =
        "클리어한 층이 없어 기록하지 않습니다.";

    }

    // 종료된 도전의 진행 데이터 삭제
    const deleted = await deleteSave();

    if (!deleted) {

      message +=
        " 기존 진행 데이터 삭제에 실패했습니다.";

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


// ==================== 새로운 도전 ====================
// ==================== 도전 포기 ====================

async function abandonRun() {

  // 중복 실행 방지
  if (
    abandoning ||
    finishing ||
    initializing
  ) {
    return;
  }


  // 도전 포기 가능 상태 확인
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

    "능력치, 골드, 패시브, 특수 아이템이 초기화됩니다.\n" +

    "리더보드 최고 기록은 유지됩니다."

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


  // 전투 정지
  stopBattle();


  try {

    // 진행 중인 자동 저장 완료 대기
    await Promise.allSettled(
      [...pendingSaves]
    );


    // 로그인 사용자의 진행 데이터 삭제
    if (isLoggedIn()) {

      // 아직 반영되지 않은 최고 기록 저장 재시도
      const highestFloor = getHighestFloor();

      if (highestFloor > 0) {

        const result = await saveRun(
          highestFloor,
          state.classKey
        );

        if (!result.success) {

          throw new Error(
            result.message ||
            "최고 기록 저장에 실패했습니다."
          );

        }

      }


      // 현재 도전 저장 데이터 삭제
      const deleted = await deleteSave();

      if (!deleted) {

        throw new Error(
          "저장 데이터 삭제에 실패했습니다."
        );

      }

    }


    // 게임 상태 초기화
    resetState();


    // 기존 전투 로그 삭제
    clearLogs();


    // 남아 있는 전투 효과 제거
    DOM.battleEffects?.replaceChildren();


    // 저장 상태 초기화
    renderSaveStatus("");

    lastSaveTime = 0;


    // 클래스 선택 화면 복귀
    renderAll();


    addLog(

      "도전을 포기했습니다. 새로운 도전을 시작하세요.",

      "normal"

    );


    console.log(
      "[도전 포기] 초기화 완료"
    );


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

function restartGame() {

  if (finishing) {
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

  renderSaveStatus("");

  lastSaveTime = 0;

  renderAll();

}


// ==================== 선택 버튼 이벤트 처리 ====================

function handleChoiceClick(event) {

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

    case "buy-passive":

      handlePassivePurchase(id);

      break;

  }

}


// ==================== 이벤트 등록 ====================

function bindEvents() {

  // 클래스 선택
  DOM.classList.addEventListener(
    "click",
    event => {

      const button = event.target.closest(
        "button[data-class]"
      );

      if (!button) {
        return;
      }

      selectClass(button.dataset.class);

    }
  );

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

  // 패시브 상점
  DOM.passives.addEventListener(
    "click",
    handleChoiceClick
  );

  // 다음 층
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


// ==================== 저장된 게임 복구 ====================

async function restoreGame() {

  if (!isLoggedIn()) {
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

  renderAll();

  // 전투 도중 저장한 경우 전투 재개
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