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
"use strict";


// ==================== 설정 ====================

const ALLOWED_CLASSES = [
  "warrior",
  "rogue",
  "mage"
];

const CLASS_NAMES = {
  warrior: "전사",
  rogue: "도적",
  mage: "마법사",
  archive: "명예의 전당"
};

const STAT_LABELS = {
  maxHp: "최대 체력",
  atk: "공격력",
  ap: "주문력",
  spd: "공격 속도",
  crit: "치명타 확률",
  critDamage: "치명타 피해량"
};


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

const leaderboardTabs = document.querySelectorAll(
  "[data-leaderboard-class]"
);

const detailModal = document.getElementById(
  "leaderboardDetailModal"
);

const detailTitle = document.getElementById(
  "leaderboardDetailTitle"
);

const detailBody = document.getElementById(
  "leaderboardDetailBody"
);

const detailCloseButton = document.getElementById(
  "closeLeaderboardDetail"
);

const deleteButton = document.getElementById(
  "deleteLeaderboardRecord"
);


// ==================== 상태 관리 ====================

let currentClass = "warrior";

let latestRequestId = 0;

let latestDetailRequestId = 0;

let selectedRecordId = null;

let deletingRecord = false;


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


// ==================== DOM 생성 함수 ====================

function createElement(tag, className, text) {

  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;

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


// ==================== 탭 상태 갱신 ====================

function updateTabs() {

  leaderboardTabs.forEach((tab) => {

    const active =
      tab.dataset.leaderboardClass === currentClass;

    tab.classList.toggle(
      "active",
      active
    );

    tab.setAttribute(
      "aria-selected",
      String(active)
    );

  });

}


// ==================== 리더보드 탭 전환 ====================

function changeLeaderboardTab(className) {

  if (
    !ALLOWED_CLASSES.includes(className) &&
    className !== "archive"
  ) {
    return;
  }

  if (currentClass === className) {
    return;
  }

  closeDetail();

  currentClass = className;

  updateTabs();

  loadLeaderboard();

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


    // ==================== 순위 및 층수 ====================

    rank.textContent = index + 1;

    floor.textContent =
      `${record.highest_floor}층`;


    // ==================== 명예의 전당 ====================

    if (currentClass === "archive") {

      username.textContent = record.username;

    }


    // ==================== 일반 리더보드 ====================

    else {

      const nameButton = createElement(
        "button",
        "leaderboard-name-button",
        record.username
      );

      nameButton.type = "button";

      nameButton.title = "빌드 상세 보기";

      nameButton.addEventListener(
        "click",
        () => {

          openDetail(Number(record.id));

        }
      );

      username.appendChild(nameButton);

    }


    // ==================== 상위 3명 강조 ====================

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

  const requestedClass = currentClass;

  refreshButton.disabled = true;

  leaderboardStatus.textContent =
    "기록을 불러오는 중입니다.";

  renderMessage(
    "기록을 불러오는 중입니다."
  );


  try {

    const records = await request(
      `/api/leaderboard?class=${encodeURIComponent(requestedClass)}`
    );


    // 이전 요청 응답 무시

    if (
      requestId !== latestRequestId ||
      requestedClass !== currentClass
    ) {
      return false;
    }


    // 응답 검증

    if (!Array.isArray(records)) {

      throw new Error(
        "잘못된 리더보드 데이터입니다."
      );

    }


    // 리더보드 출력

    renderLeaderboard(records);

    leaderboardStatus.textContent =
      `${CLASS_NAMES[currentClass]} 리더보드가 갱신되었습니다.`;

    return true;


  } catch (error) {

    if (requestId !== latestRequestId) {
      return false;
    }

    console.error(
      "[리더보드 조회 실패]",
      error
    );

    renderMessage(error.message);

    leaderboardStatus.textContent =
      error.message;

    return false;


  } finally {

    if (requestId === latestRequestId) {

      refreshButton.disabled = false;

    }

  }

}


// ==================== 상세 보기 섹션 생성 ====================

function createDetailSection(title) {

  const section = createElement(
    "section",
    "leaderboard-detail-section"
  );

  const heading = createElement(
    "h3",
    "leaderboard-detail-heading",
    title
  );

  section.appendChild(heading);

  return section;

}


// ==================== 능력치 출력 형식 ====================

function formatStatValue(key, value) {

  if (value === null || value === undefined) {
    return "-";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  const formatted = number.toLocaleString(
    "ko-KR",
    {
      maximumFractionDigits: 2
    }
  );

  if (
    key === "crit" ||
    key === "critDamage"
  ) {

    return `${formatted}%`;

  }

  return formatted;

}


// ==================== 최종 능력치 출력 ====================

function renderFinalStats(stats) {

  const section = createDetailSection(
    "최종 능력치"
  );

  if (
    !stats ||
    typeof stats !== "object" ||
    Array.isArray(stats)
  ) {

    section.appendChild(
      createElement(
        "p",
        "leaderboard-detail-empty",
        "저장된 능력치 정보가 없습니다."
      )
    );

    return section;

  }

  const grid = createElement(
    "div",
    "leaderboard-stat-grid"
  );

  Object.entries(STAT_LABELS).forEach(
    ([key, label]) => {

      const stat = createElement(
        "div",
        "leaderboard-stat"
      );

      const statName = createElement(
        "span",
        "leaderboard-stat-name",
        label
      );

      const statValue = createElement(
        "strong",
        "leaderboard-stat-value",
        formatStatValue(
          key,
          stats[key]
        )
      );

      stat.append(
        statName,
        statValue
      );

      grid.appendChild(stat);

    }
  );

  section.appendChild(grid);

  return section;

}


// ==================== 오만의 왕관 판별 ====================

function isPrideCrown(item) {

  return item?.name === "오만의 왕관";

}


// ==================== 특수 아이템 정렬 ====================

function sortSpecialItems(items) {

  return [...items].sort((a, b) => {

    const priorityA =
      isPrideCrown(a) ? 0 : 1;

    const priorityB =
      isPrideCrown(b) ? 0 : 1;

    return priorityA - priorityB;

  });

}


// ==================== 특수 아이템 출력 ====================

function renderSpecialItems(items) {

  const section = createDetailSection(
    "획득 특수 아이템"
  );

  if (!Array.isArray(items)) {

    section.appendChild(
      createElement(
        "p",
        "leaderboard-detail-empty",
        "저장된 특수 아이템 정보가 없습니다."
      )
    );

    return section;

  }

  const validItems = items.filter((item) => {

    return (
      item &&
      typeof item.name === "string" &&
      Number(item.count) > 0
    );

  });

  if (validItems.length === 0) {

    section.appendChild(
      createElement(
        "p",
        "leaderboard-detail-empty",
        "획득한 특수 아이템이 없습니다."
      )
    );

    return section;

  }

  const list = createElement(
    "ul",
    "leaderboard-item-list"
  );

  const sortedItems =
    sortSpecialItems(validItems);

  sortedItems.forEach((item) => {

    const row = createElement(
      "li",
      "leaderboard-item"
    );


    // 오만의 왕관 강조

    if (isPrideCrown(item)) {

      row.classList.add(
        "leaderboard-item-pride-crown"
      );

    }


    // 아이템 이름

    const name = createElement(
      "span",
      "leaderboard-item-name",
      item.name
    );


    // 아이템 보유 스택

    const count = createElement(
      "span",
      "leaderboard-item-count",
      `×${item.count}`
    );

    row.append(
      name,
      count
    );

    list.appendChild(row);

  });

  section.appendChild(list);

  return section;

}


// ==================== 패시브 출력 ====================

function renderPassives(passives) {

  const section = createDetailSection(
    "해금한 패시브"
  );

  if (!Array.isArray(passives)) {

    section.appendChild(
      createElement(
        "p",
        "leaderboard-detail-empty",
        "저장된 패시브 정보가 없습니다."
      )
    );

    return section;

  }

  const unlockedPassives = passives.filter(
    (passive) => {

      return (
        passive &&
        typeof passive.name === "string" &&
        Number(passive.level) > 0
      );

    }
  );

  if (unlockedPassives.length === 0) {

    section.appendChild(
      createElement(
        "p",
        "leaderboard-detail-empty",
        "해금한 패시브가 없습니다."
      )
    );

    return section;

  }

  const list = createElement(
    "ul",
    "leaderboard-passive-list"
  );

  unlockedPassives.forEach((passive) => {

    const row = createElement(
      "li",
      "leaderboard-passive"
    );

    const name = createElement(
      "span",
      "leaderboard-passive-name",
      passive.name
    );

    const level = createElement(
      "span",
      "leaderboard-passive-level",
      `Lv.${passive.level}`
    );

    row.append(
      name,
      level
    );

    list.appendChild(row);

  });

  section.appendChild(list);

  return section;

}


// ==================== 상세 보기 출력 ====================

function renderDetail(record) {

  detailBody.replaceChildren();

  detailTitle.textContent =
    record.username;


  // ==================== 기록 요약 ====================

  const summary = createElement(
    "div",
    "leaderboard-detail-summary"
  );

  const className = createElement(
    "span",
    "leaderboard-detail-class",
    CLASS_NAMES[record.class_name] ||
    record.class_name
  );

  const floor = createElement(
    "strong",
    "leaderboard-detail-floor",
    `${record.highest_floor}층`
  );

  summary.append(
    className,
    floor
  );


  // ==================== 빌드 상세 정보 ====================

  detailBody.append(

    summary,

    renderFinalStats(
      record.final_stats
    ),

    renderSpecialItems(
      record.special_items
    ),

    renderPassives(
      record.passives
    )

  );


  // ==================== 삭제 권한 확인 ====================

  if (deleteButton) {

    deleteButton.hidden =
      record.can_delete !== true;

    deleteButton.disabled =
      deletingRecord;

  }

}


// ==================== 상세 보기 열기 ====================

async function openDetail(recordId) {

  if (currentClass === "archive") {
    return;
  }

  if (
    !Number.isSafeInteger(recordId) ||
    recordId < 1
  ) {
    return;
  }

  if (
    !detailModal ||
    !detailTitle ||
    !detailBody
  ) {

    console.error(
      "[상세 보기 오류] DOM 요소를 찾을 수 없습니다."
    );

    return;

  }

  const requestId =
    ++latestDetailRequestId;

  selectedRecordId = null;

  detailTitle.textContent =
    "도전 기록 상세 보기";

  detailBody.textContent =
    "빌드 정보를 불러오는 중입니다.";

  if (deleteButton) {

    deleteButton.hidden = true;

  }

  if (!detailModal.open) {

    detailModal.showModal();

  }


  try {

    const data = await request(
      `/api/runs/${recordId}`
    );


    // 이전 상세 보기 요청 응답 무시

    if (
      requestId !== latestDetailRequestId ||
      !detailModal.open ||
      currentClass === "archive"
    ) {
      return;
    }


    // 데이터 검증

    if (
      data?.success !== true ||
      !data.record
    ) {

      throw new Error(
        "빌드 정보를 불러오지 못했습니다."
      );

    }

    selectedRecordId = recordId;

    renderDetail(data.record);


  } catch (error) {

    if (
      requestId !== latestDetailRequestId
    ) {
      return;
    }

    console.error(
      "[상세 보기 조회 실패]",
      error
    );

    detailBody.textContent =
      error.message;

  }

}


// ==================== 상세 보기 닫기 ====================

function closeDetail() {

  ++latestDetailRequestId;

  selectedRecordId = null;

  if (deleteButton) {

    deleteButton.hidden = true;

  }

  if (detailModal?.open) {

    detailModal.close();

  }

}


// ==================== 기록 삭제 ====================

async function deleteRecord() {

  if (
    deletingRecord ||
    currentClass === "archive" ||
    !selectedRecordId ||
    !deleteButton ||
    deleteButton.hidden
  ) {
    return;
  }

  if (!isLoggedIn()) {

    alert("로그인이 필요합니다.");

    return;

  }

  const confirmed = window.confirm(

    "도전 기록을 삭제하시겠습니까?\n" +
    "삭제된 기록은 복구할 수 없습니다."

  );

  if (!confirmed) {
    return;
  }

  const recordId = selectedRecordId;

  deletingRecord = true;

  deleteButton.disabled = true;


  try {

    const data = await request(
      `/api/runs/${recordId}`,
      {
        method: "DELETE"
      }
    );

    if (data?.success !== true) {

      throw new Error(
        data?.message ||
        "기록 삭제에 실패했습니다."
      );

    }

    if (selectedRecordId === recordId) {

      closeDetail();

    }

    await loadLeaderboard();

    alert(
      data.message ||
      "기록이 삭제되었습니다."
    );


  } catch (error) {

    console.error(
      "[리더보드 삭제 실패]",
      error
    );

    alert(error.message);


  } finally {

    deletingRecord = false;

    deleteButton.disabled = false;

  }

}


// ==================== 도전 기록 저장 ====================

export async function saveRun(
  highestFloor,
  className,
  build
) {

  // ==================== 로그인 확인 ====================

  if (!isLoggedIn()) {

    return {
      success: false,
      message: "로그인이 필요합니다."
    };

  }


  // ==================== 층수 검증 ====================

  if (
    !Number.isSafeInteger(highestFloor) ||
    highestFloor < 1 ||
    highestFloor > 2147483647
  ) {

    return {
      success: false,
      message: "잘못된 클리어 층수입니다."
    };

  }


  // ==================== 클래스 검증 ====================

  if (!ALLOWED_CLASSES.includes(className)) {

    return {
      success: false,
      message: "잘못된 클래스 정보입니다."
    };

  }


  // ==================== 빌드 데이터 검증 ====================

  if (
    !build ||
    !build.final_stats ||
    typeof build.final_stats !== "object" ||
    Array.isArray(build.final_stats) ||
    !Array.isArray(build.special_items) ||
    !Array.isArray(build.passives)
  ) {

    return {
      success: false,
      message: "잘못된 빌드 정보입니다."
    };

  }


  // ==================== 서버 기록 저장 ====================

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

          class_name: className,

          final_stats: build.final_stats,

          special_items: build.special_items,

          passives: build.passives

        })

      }
    );

    if (data?.success !== true) {

      throw new Error(
        data?.message ||
        "기록 저장에 실패했습니다."
      );

    }


  } catch (error) {

    console.error(
      "[도전 기록 갱신 실패]",
      error
    );

    return {

      success: false,

      message: error.message

    };

  }


  // ==================== 최고 기록 경신 ====================

  if (data.updated) {

    console.log(
      `[최고 기록 경신] ${data.highest_floor}층`
    );

    const refreshed =
      await loadLeaderboard();

    return {

      success: true,

      updated: true,

      refreshed,

      message: refreshed

        ? data.message

        : "기록은 저장되었으나 순위 갱신에 실패했습니다."

    };

  }


  // ==================== 기존 최고 기록 유지 ====================

  return {

    success: true,

    updated: false,

    message: data.message

  };

}


// ==================== 탭 이벤트 등록 ====================

leaderboardTabs.forEach((tab) => {

  tab.addEventListener(
    "click",
    () => {

      changeLeaderboardTab(
        tab.dataset.leaderboardClass
      );

    }
  );

});


// ==================== 새로고침 이벤트 ====================

if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    () => {

      loadLeaderboard();

    }
  );

}


// ==================== 상세 보기 닫기 이벤트 ====================

if (detailCloseButton) {

  detailCloseButton.addEventListener(
    "click",
    closeDetail
  );

}


// ==================== ESC 및 배경 클릭 ====================

if (detailModal) {

  detailModal.addEventListener(
    "cancel",
    (event) => {

      event.preventDefault();

      closeDetail();

    }
  );

  detailModal.addEventListener(
    "click",
    (event) => {

      if (event.target === detailModal) {

        closeDetail();

      }

    }
  );

}


// ==================== 기록 삭제 이벤트 ====================

if (deleteButton) {

  deleteButton.addEventListener(
    "click",
    deleteRecord
  );

}


// ==================== 초기 실행 ====================

updateTabs();

loadLeaderboard();
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
