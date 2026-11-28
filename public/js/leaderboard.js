"use strict";

// ==================== 설정 ====================

const ALLOWED_CLASSES = ["warrior", "rogue", "mage"];

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

const leaderboardBody = document.getElementById("leaderboardBody");
const leaderboardStatus = document.getElementById("leaderboardStatus");
const refreshButton = document.getElementById("refreshLeaderboard");
const leaderboardTabs = document.querySelectorAll("[data-leaderboard-class]");

const detailModal = document.getElementById("leaderboardDetailModal");
const detailTitle = document.getElementById("leaderboardDetailTitle");
const detailBody = document.getElementById("leaderboardDetailBody");
const detailCloseButton = document.getElementById("closeLeaderboardDetail");
const deleteButton = document.getElementById("deleteLeaderboardRecord");


// ==================== 상태 관리 ====================

let currentClass = "warrior";
let latestRequestId = 0;
let latestDetailRequestId = 0;
let selectedRecordId = null;
let deletingRecord = false;


// ==================== 공통 함수 ====================

function isLoggedIn() {
  const userId = Number(document.body.dataset.userId);
  return Number.isSafeInteger(userId) && userId > 0;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text != null) element.textContent = String(text);

  return element;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `요청 처리 실패 (HTTP ${response.status})`
    );
  }

  return data;
}

function renderMessage(message) {
  const row = document.createElement("tr");
  const cell = createElement("td", "", message);

  cell.colSpan = 3;
  row.appendChild(cell);
  leaderboardBody.replaceChildren(row);
}


// ==================== 리더보드 탭 ====================

function updateTabs() {
  leaderboardTabs.forEach(tab => {
    const active = tab.dataset.leaderboardClass === currentClass;

    tab.classList.toggle("active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
}

function changeLeaderboardTab(className) {
  if (
    !ALLOWED_CLASSES.includes(className) &&
    className !== "archive"
  ) return;

  if (currentClass === className) return;

  closeDetail();
  currentClass = className;

  updateTabs();
  loadLeaderboard();
}


// ==================== 리더보드 출력 ====================

function renderLeaderboard(records) {
  leaderboardBody.replaceChildren();

  const isArchive = currentClass === "archive";

  const detailHeader = document.getElementById(
    "leaderboardDetailHeader"
  );

  if (detailHeader) {
    detailHeader.textContent = isArchive ? "" : "상세 보기";
  }

  if (records.length === 0) {
    renderMessage("아직 등록된 도전 기록이 없습니다.");
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement("tr");

    // 순위
    const rank = createElement("td", "", index + 1);

    // 도전자 및 최고 층수
    const playerCell = document.createElement("td");

    const playerInfo = createElement(
      "div", "leaderboard-player-info"
    );

    playerInfo.append(
      createElement(
        "span",
        "leaderboard-player-name",
        record.username
      ),
      createElement(
        "span",
        "leaderboard-player-floor",
        `${record.highest_floor}층`
      )
    );

    playerCell.appendChild(playerInfo);

    // 상세 보기
    const detailCell = document.createElement("td");

    if (!isArchive) {
      const button = createElement(
        "button",
        "leaderboard-detail-button",
        "상세 보기"
      );

      button.type = "button";

      button.addEventListener("click", () => {
        openDetail(Number(record.id));
      });

      detailCell.appendChild(button);
    }

    // 상위 3명 강조
    const rankClasses = [
      "rank-first",
      "rank-second",
      "rank-third"
    ];

    if (index < 3) {
      row.classList.add(rankClasses[index]);
    }

    row.append(rank, playerCell, detailCell);
    leaderboardBody.appendChild(row);
  });
}


// ==================== 리더보드 조회 ====================

export async function loadLeaderboard() {
  if (!leaderboardBody || !leaderboardStatus || !refreshButton) {
    console.error("리더보드 DOM 요소를 찾을 수 없습니다.");
    return false;
  }

  const requestId = ++latestRequestId;
  const requestedClass = currentClass;

  refreshButton.disabled = true;
  leaderboardStatus.textContent = "기록을 불러오는 중입니다.";

  renderMessage("기록을 불러오는 중입니다.");

  try {
    const records = await request(
      `/api/leaderboard?class=${encodeURIComponent(requestedClass)}`
    );

    // 이전 요청의 응답 무시
    if (
      requestId !== latestRequestId ||
      requestedClass !== currentClass
    ) return false;

    if (!Array.isArray(records)) {
      throw new Error("잘못된 리더보드 데이터입니다.");
    }

    renderLeaderboard(records);

    leaderboardStatus.textContent =
      `${CLASS_NAMES[currentClass]} 기록이 갱신되었습니다.`;

    return true;

  } catch (error) {
    if (requestId !== latestRequestId) return false;

    console.error("리더보드 조회 실패:", error);

    renderMessage(error.message);
    leaderboardStatus.textContent = error.message;

    return false;

  } finally {
    if (requestId === latestRequestId) {
      refreshButton.disabled = false;
    }
  }
}


// ==================== 상세 보기 공통 ====================

function createDetailSection(title) {
  const section = createElement(
    "section",
    "leaderboard-detail-section"
  );

  section.appendChild(
    createElement("h3", "leaderboard-detail-heading", title)
  );

  return section;
}

function appendEmpty(section, message) {
  section.appendChild(
    createElement("p", "leaderboard-detail-empty", message)
  );

  return section;
}


// ==================== 최종 능력치 ====================

function formatStatValue(key, value) {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }

  const formatted = value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2
  });

  return ["crit", "critDamage"].includes(key)
    ? `${formatted}%`
    : formatted;
}

function renderFinalStats(stats) {
  const section = createDetailSection("최종 능력치");

  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    return appendEmpty(section, "저장된 능력치 정보가 없습니다.");
  }

  const grid = createElement("div", "leaderboard-stat-grid");

  for (const [key, label] of Object.entries(STAT_LABELS)) {
    const stat = createElement("div", "leaderboard-stat");

    stat.append(
      createElement("span", "leaderboard-stat-name", label),
      createElement(
        "strong",
        "leaderboard-stat-value",
        formatStatValue(key, stats[key])
      )
    );

    grid.appendChild(stat);
  }

  section.appendChild(grid);

  return section;
}


// ==================== 오만의 왕관 판별 ====================

function isPrideCrown(item) {
  return (
    item?.id === "arroganceCrown" ||
    item?.name === "오만의 왕관"
  );
}


// ==================== 특수 아이템 ====================

function renderSpecialItems(items) {
  const section = createDetailSection("획득 특수 아이템");

  if (!Array.isArray(items)) {
    return appendEmpty(section, "저장된 특수 아이템 정보가 없습니다.");
  }

  const ownedItems = items.filter(item =>
    item &&
    typeof item.name === "string" &&
    Number(item.count) > 0
  );

  if (ownedItems.length === 0) {
    return appendEmpty(section, "획득한 특수 아이템이 없습니다.");
  }

  // 오만의 왕관을 항상 첫 번째로 표시
  ownedItems.sort((a, b) =>
    Number(isPrideCrown(b)) - Number(isPrideCrown(a))
  );

  const list = createElement("ul", "leaderboard-item-list");

  for (const item of ownedItems) {
    const row = createElement("li", "leaderboard-item");

    if (isPrideCrown(item)) {
      row.classList.add("leaderboard-item-pride-crown");
    }

    row.append(
      createElement("span", "leaderboard-item-name", item.name),
      createElement("span", "leaderboard-item-count", `×${item.count}`)
    );

    list.appendChild(row);
  }

  section.appendChild(list);

  return section;
}


// ==================== 해금한 패시브 ====================

function renderPassives(passives) {
  const section = createDetailSection("해금한 패시브");

  if (!Array.isArray(passives)) {
    return appendEmpty(section, "저장된 패시브 정보가 없습니다.");
  }

  const unlocked = passives.filter(passive =>
    passive &&
    typeof passive.name === "string" &&
    Number(passive.level) > 0
  );

  if (unlocked.length === 0) {
    return appendEmpty(section, "해금한 패시브가 없습니다.");
  }

  const list = createElement("ul", "leaderboard-passive-list");

  for (const passive of unlocked) {
    const row = createElement("li", "leaderboard-passive");

    row.append(
      createElement("span", "leaderboard-passive-name", passive.name),
      createElement("span", "leaderboard-passive-level", `Lv.${passive.level}`)
    );

    list.appendChild(row);
  }

  section.appendChild(list);

  return section;
}


// ==================== 상세 보기 출력 ====================

function renderDetail(record) {
  detailTitle.textContent = record.username;

  const summary = createElement("div", "leaderboard-detail-summary");

  summary.append(
    createElement(
      "span",
      "leaderboard-detail-class",
      CLASS_NAMES[record.class_name] || record.class_name
    ),
    createElement(
      "strong",
      "leaderboard-detail-floor",
      `${record.highest_floor}층`
    )
  );

  detailBody.replaceChildren(
    summary,
    renderFinalStats(record.final_stats),
    renderSpecialItems(record.special_items),
    renderPassives(record.passives)
  );

  // 본인 또는 관리자에게만 삭제 버튼 표시
  if (deleteButton) {
    deleteButton.hidden = record.can_delete !== true;
    deleteButton.disabled = deletingRecord;
  }
}


// ==================== 상세 보기 열기 ====================

async function openDetail(recordId) {
  if (currentClass === "archive") return;

  if (!Number.isSafeInteger(recordId) || recordId < 1) {
    return;
  }

  if (!detailModal || !detailTitle || !detailBody) {
    console.error("상세 보기 DOM 요소를 찾을 수 없습니다.");
    return;
  }

  const requestId = ++latestDetailRequestId;

  selectedRecordId = null;

  detailTitle.textContent = "도전 기록 상세 보기";
  detailBody.textContent = "빌드 정보를 불러오는 중입니다.";

  if (deleteButton) deleteButton.hidden = true;

  if (!detailModal.open) {
    detailModal.showModal();
  }

  try {
    const data = await request(`/api/runs/${recordId}`);

    if (
      requestId !== latestDetailRequestId ||
      !detailModal.open ||
      currentClass === "archive"
    ) return;

    if (data?.success !== true || !data.record) {
      throw new Error("빌드 정보를 불러오지 못했습니다.");
    }

    selectedRecordId = recordId;

    renderDetail(data.record);

  } catch (error) {
    if (requestId !== latestDetailRequestId) return;

    console.error("상세 보기 조회 실패:", error);

    detailBody.textContent = error.message;
  }
}


// ==================== 상세 보기 닫기 ====================

function closeDetail() {
  ++latestDetailRequestId;

  selectedRecordId = null;

  if (deleteButton) deleteButton.hidden = true;

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
  ) return;

  if (!isLoggedIn()) {
    alert("로그인이 필요합니다.");
    return;
  }

  const confirmed = window.confirm(
    "도전 기록을 삭제하시겠습니까?\n" +
    "삭제된 기록은 복구할 수 없습니다."
  );

  if (!confirmed) return;

  const recordId = selectedRecordId;

  deletingRecord = true;
  deleteButton.disabled = true;

  try {
    const data = await request(`/api/runs/${recordId}`, {
      method: "DELETE"
    });

    if (data?.success !== true) {
      throw new Error(data?.message || "기록 삭제에 실패했습니다.");
    }

    if (selectedRecordId === recordId) {
      closeDetail();
    }

    await loadLeaderboard();

    alert(data.message || "기록이 삭제되었습니다.");

  } catch (error) {
    console.error("리더보드 삭제 실패:", error);

    alert(error.message);

  } finally {
    deletingRecord = false;
    deleteButton.disabled = false;
  }
}


// ==================== 도전 기록 저장 ====================

export async function saveRun(highestFloor, className, build) {
  if (!isLoggedIn()) {
    return {
      success: false,
      message: "로그인이 필요합니다."
    };
  }

  // 관리자 기록 등록 방지
  if (document.body.dataset.userRole === "admin") {
    return {
      success: false,
      message: "관리자 기록은 저장되지 않습니다."
    };
  }

  // 층수 검증
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

  // 클래스 검증
  if (!ALLOWED_CLASSES.includes(className)) {
    return {
      success: false,
      message: "잘못된 클래스 정보입니다."
    };
  }

  // 빌드 데이터 검증
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

  try {
    const data = await request("/api/runs", {
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
    });

    if (data?.success !== true) {
      throw new Error(data?.message || "기록 저장 실패");
    }

    // 최고 기록을 경신한 경우
    if (data.updated) {
      console.log(`[최고 기록 경신] ${data.highest_floor}층`);

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

  } catch (error) {
    console.error("도전 기록 갱신 실패:", error);

    return {
      success: false,
      message: error.message
    };
  }
}


// ==================== 이벤트 등록 ====================

leaderboardTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    changeLeaderboardTab(tab.dataset.leaderboardClass);
  });
});

refreshButton?.addEventListener("click", loadLeaderboard);

detailCloseButton?.addEventListener("click", closeDetail);

deleteButton?.addEventListener("click", deleteRecord);

if (detailModal) {
  // ESC 키로 닫기
  detailModal.addEventListener("cancel", event => {
    event.preventDefault();
    closeDetail();
  });

  // 팝업 외부 클릭 시 닫기
  detailModal.addEventListener("click", event => {
    if (event.target !== detailModal) return;

    const rect = detailModal.getBoundingClientRect();

    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      closeDetail();
    }
  });
}


// ==================== 초기 실행 ====================

updateTabs();
loadLeaderboard();
