"use strict";


// ==================== DOM 요소 ====================

const leaderboardBody = document.getElementById(
  "leaderboardBody"
);

const leaderboardStatus = document.getElementById(
  "leaderboardStatus"
);

const refreshButton = document.getElementById(
  "refreshLeaderboard"
);

let latestRequestId = 0;


// ==================== 로그인 여부 확인 ====================

function isLoggedIn() {

  const userId = Number(
    document.body.dataset.userId
  );

  return (
    Number.isSafeInteger(userId) &&
    userId > 0
  );

}


// ==================== 공통 API 요청 ====================

async function request(url, options = {}) {

  const response = await fetch(url, {

    cache: "no-store",

    ...options

  });

  let data;

  try {

    data = await response.json();

  } catch {

    throw new Error(
      `서버 응답 오류 (HTTP ${response.status})`
    );

  }

  if (!response.ok) {

    throw new Error(

      data?.message ||
      `요청 처리 실패 (HTTP ${response.status})`

    );

  }

  return data;

}


// ==================== 상태 메시지 출력 ====================

function renderMessage(message) {

  const row = document.createElement("tr");

  const cell = document.createElement("td");

  cell.colSpan = 3;

  cell.textContent = message;

  row.appendChild(cell);

  leaderboardBody.replaceChildren(row);

}


// ==================== 리더보드 출력 ====================

function renderLeaderboard(records) {

  leaderboardBody.replaceChildren();

  if (records.length === 0) {

    renderMessage(
      "아직 등록된 도전 기록이 없습니다."
    );

    return;

  }

  records.forEach((record, index) => {

    const row = document.createElement("tr");

    const rank = document.createElement("td");

    const username = document.createElement("td");

    const floor = document.createElement("td");


    // 순위 및 사용자 정보
    rank.textContent = index + 1;

    username.textContent = record.username;

    floor.textContent =
      `${record.highest_floor}층`;


    // 상위 3명 강조
    if (index === 0) {

      row.classList.add("rank-first");

    } else if (index === 1) {

      row.classList.add("rank-second");

    } else if (index === 2) {

      row.classList.add("rank-third");

    }


    row.append(

      rank,

      username,

      floor

    );

    leaderboardBody.appendChild(row);

  });

}


// ==================== 리더보드 조회 ====================

export async function loadLeaderboard() {

  if (
    !leaderboardBody ||
    !leaderboardStatus ||
    !refreshButton
  ) {

    console.error(
      "[리더보드 오류] DOM 요소를 찾을 수 없습니다."
    );

    return false;

  }

  const requestId = ++latestRequestId;

  refreshButton.disabled = true;

  leaderboardStatus.textContent =
    "기록을 불러오는 중입니다.";


  try {

    console.log("[리더보드 조회 요청]");

    const records = await request(
      "/api/leaderboard",
      {
        method: "GET",
        cache: "no-store"
      }
    );


    // 이전 요청의 응답 무시
    if (requestId !== latestRequestId) {

      return false;

    }


    // 서버 응답 데이터 검증
    if (!Array.isArray(records)) {

      throw new Error(
        "잘못된 리더보드 데이터입니다."
      );

    }


    // 리더보드 갱신
    renderLeaderboard(records);

    leaderboardStatus.textContent =
      "리더보드가 갱신되었습니다.";

    console.log(
      "[리더보드 갱신 성공]",
      records
    );

    return true;


  } catch (err) {

    if (requestId !== latestRequestId) {

      return false;

    }

    console.error(

      "[리더보드 조회 실패]",

      err

    );

    leaderboardStatus.textContent =
      err.message;

    return false;


  } finally {

    if (requestId === latestRequestId) {

      refreshButton.disabled = false;

    }

  }

}


// ==================== 도전 기록 저장 ====================

// ==================== 도전 기록 갱신 ====================

export async function saveRun(
  highestFloor,
  className
) {

  // 로그인 여부 확인
  if (!isLoggedIn()) {

    return {

      success: false,

      message: "로그인이 필요합니다."

    };

  }


  // 층수 검증
  if (
    !Number.isSafeInteger(highestFloor) ||
    highestFloor < 1
  ) {

    return {

      success: false,

      message: "잘못된 클리어 층수입니다."

    };

  }


  // 클래스 검증
  if (
    !["warrior", "rogue", "mage"]
      .includes(className)
  ) {

    return {

      success: false,

      message: "잘못된 클래스 정보입니다."

    };

  }


  let data;

  try {

    data = await request(

      "/api/runs",

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json"

        },

        body: JSON.stringify({

          highest_floor: highestFloor,

          class_name: className

        })

      }

    );


    if (data?.success !== true) {

      throw new Error(
        data?.message || "기록 저장 실패"
      );

    }


  } catch (error) {

    console.error(
      "도전 기록 갱신 실패:",
      error
    );

    return {

      success: false,

      message: error.message

    };

  }


  // 최고 기록을 경신한 경우 리더보드 갱신
  if (data.updated) {

    console.log(
      `[최고 기록 경신] ${data.highest_floor}층`
    );

    const refreshed = await loadLeaderboard();

    return {

      success: true,

      updated: true,

      refreshed,

      message: refreshed

        ? data.message

        : "기록은 저장되었으나 순위 갱신에 실패했습니다."

    };

  }


  // 기존 최고 기록 유지
  return {

    success: true,

    updated: false,

    message: data.message

  };

}

// ==================== 이벤트 등록 ====================

if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    () => {
      loadLeaderboard();
    }
  );

}


// ==================== 초기 실행 ====================

loadLeaderboard();