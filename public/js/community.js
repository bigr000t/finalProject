
"use strict";

// ==================== DOM 요소 ====================

const $ = id => document.getElementById(id);

const community = $("community");
const userId = Number(community.dataset.userId) || null;
const isAdmin = community.dataset.userRole === "admin";

const postList = $("postList");
const boardTabs = $("boardTabs");
const postForm = $("postForm");
const commentForm = $("commentForm");

const views = {
  list: $("postListView"),
  detail: $("postDetailView"),
  editor: $("postEditorView"),
  reports: $("reportListView")
};

// ==================== 상태 관리 ====================

let boards = [];
let boardId = 0;
let page = 1;
let search = "";
let searchType = "all";
let sort = "latest";

let currentPost = null;
let editingPost = null;
let reportPage = 1;

let currentView = "list";
let requestId = 0;


// ==================== 공통 함수 ====================

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function createButton(text, className, callback) {
  const button = createElement("button", className, text);
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function showMessage(element, message) {
  element.replaceChildren(
    createElement("p", "hint", message)
  );
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message || "요청 처리에 실패했습니다."
    );
  }

  if (data === null) {
    throw new Error("서버 응답을 확인할 수 없습니다.");
  }

  return { data, headers: response.headers };
}

function sendJSON(url, method, body) {
  return request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function runAction(button, callback) {
  if (button.disabled) return;

  button.disabled = true;

  try {
    await callback();
  } catch (err) {
    console.error(err);
    window.alert(err.message);
  } finally {
    button.disabled = false;
  }
}


// ==================== 화면 전환 ====================

function showView(name) {
  currentView = name;

  for (const [key, element] of Object.entries(views)) {
    if (element) element.hidden = key !== name;
  }

  return ++requestId;
}

function scrollToCommunity() {
  community.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderPagination(container, current, total, callback) {
  container.replaceChildren();

  if (total <= 1) return;

  const prev = createButton("이전", "", () => callback(current - 1));
  prev.disabled = current <= 1;
  container.appendChild(prev);

  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);

  for (let i = start; i <= end; i++) {
    const button = createButton(
      String(i),
      i === current ? "active" : "",
      () => callback(i)
    );

    if (i === current) {
      button.disabled = true;
      button.setAttribute("aria-current", "page");
    }

    container.appendChild(button);
  }

  const next = createButton("다음", "", () => callback(current + 1));
  next.disabled = current >= total;
  container.appendChild(next);
}


// ==================== 게시판 관리 ====================

function renderBoards() {
  boardTabs.replaceChildren();

  const items = [{ id: 0, name: "전체" }, ...boards];

  for (const board of items) {
    const button = createButton(
      board.name,
      board.id === boardId ? "active" : "",
      () => {
        boardId = board.id;
        page = 1;

        renderBoards();
        loadPosts();
      }
    );

    button.dataset.boardId = board.id;
    button.setAttribute(
      "aria-pressed",
      String(board.id === boardId)
    );

    boardTabs.appendChild(button);
  }
}

async function loadBoards() {
  const { data } = await request("/api/boards");

  boards = data;

  if (boardId && !boards.some(board => board.id === boardId)) {
    boardId = 0;
    page = 1;
  }

  renderBoards();
}

// ==================== 관리자 게시판 수정 ====================

function fillBoardEditForm() {
  if (!isAdmin || !$("adminEditBoard")) return;

  const id = Number($("adminEditBoard").value);
  const board = boards.find(item => item.id === id);

  if (!board) return;

  $("adminEditBoardName").value = board.name;
  $("adminEditBoardOrder").value = board.sort_order;

  $("adminEditBoardPermission").value =
    board.admin_only ? "admin" : "user";
}

function renderBoardEditOptions() {
  const select = $("adminEditBoard");

  if (!isAdmin || !select) return;

  const previousId = select.value;

  select.replaceChildren();

  for (const board of boards) {
    const option = createElement("option", "", board.name);
    option.value = board.id;
    select.appendChild(option);
  }

  if (boards.some(board => String(board.id) === previousId)) {
    select.value = previousId;
  }

  fillBoardEditForm();
}

$("adminEditBoard")?.addEventListener("change", fillBoardEditForm);

$("adminEditBoardForm")?.addEventListener("submit", event => {
  event.preventDefault();

  if (!isAdmin) return;

  const button = $("adminUpdateBoard");
  const message = $("adminEditBoardMessage");
  const id = Number($("adminEditBoard").value);

  const payload = {
    name: $("adminEditBoardName").value.trim(),
    sort_order: Number($("adminEditBoardOrder").value),
    admin_only:
      $("adminEditBoardPermission").value === "admin"
  };

  if (!window.confirm("게시판 설정을 변경하시겠습니까?")) {
    return;
  }

  runAction(button, async () => {
    message.textContent = "변경 중입니다.";
    message.dataset.error = "false";

    try {
      const { data } = await sendJSON(
        `/api/admin/boards/${id}`,
        "PATCH",
        payload
      );

      await loadBoards();

      if (currentView === "list") {
        await loadPosts();
      }

      message.textContent = data.message;

    } catch (err) {
      message.textContent = err.message;
      message.dataset.error = "true";
    }
  });
});

function renderBoardOptions(post = null) {
  const select = $("postBoard");

  select.replaceChildren();

  const available = post
    ? boards.filter(board => board.id === post.board_id)
    : boards.filter(board => isAdmin || !board.admin_only);

  for (const board of available) {
    const option = createElement("option", "", board.name);
    option.value = board.id;
    select.appendChild(option);
  }

  if (post) {
    select.value = post.board_id;
    select.disabled = true;
  } else {
    select.disabled = false;

    if (available.some(board => board.id === boardId)) {
      select.value = boardId;
    } else if (available.some(board => board.id === 1)) {
      select.value = 1;
    }
  }
}


// ==================== 게시글 목록 ====================

async function loadPosts() {
  const token = showView("list");

  currentPost = null;
  editingPost = null;

  showMessage(postList, "게시글을 불러오는 중입니다.");
  $("postPagination").replaceChildren();

  const params = new URLSearchParams({
    board_id: boardId,
    page,
    search,
    searchType,
    sort
  });

  try {
    const { data: posts, headers } =
      await request(`/api/posts?${params}`);

    if (token !== requestId) return;

    const total = Number(headers.get("X-Total-Count")) || 0;
    const totalPages = Number(headers.get("X-Total-Pages")) || 0;

    // 마지막 페이지의 게시글이 삭제된 경우
    if (page > Math.max(1, totalPages)) {
      page = Math.max(1, totalPages);
      return loadPosts();
    }

    $("postCount").textContent = `게시글 ${total}개`;
    postList.replaceChildren();

    if (!posts.length) {
      showMessage(
        postList,
        search ? "검색 결과가 없습니다." : "등록된 게시글이 없습니다."
      );
    }

    for (const post of posts) {
      const row = createButton(
        "",
        "post-list-row",
        () => showPost(post.id, true)
      );

      if (post.role === "admin") {
        row.classList.add("admin-post");
      }

      const board = createElement("span", "post-board", post.board_name);
      const title = createElement("span", "post-title", post.title);

      if (Number(post.comment_count) > 0) {
        title.appendChild(
          createElement(
            "span",
            "post-comment-count",
            ` [${post.comment_count}]`
          )
        );
      }

      const author = createElement(
        "span",
        "post-author",
        post.username
      );

      const likes = createElement("span", "post-likes", post.like_count);
      const date = createElement("span", "post-date", formatDate(post.created_at));

      row.append(board, title, author, likes, date);
      postList.appendChild(row);
    }

    renderPagination(
      $("postPagination"),
      page,
      totalPages,
      nextPage => {
        page = nextPage;
        loadPosts();
        scrollToCommunity();
      }
    );

  } catch (err) {
    if (token !== requestId) return;
    $("postCount").textContent = "게시글 조회 실패";
    showMessage(postList, err.message);
  }
}


// ==================== 게시글 상세보기 ====================

async function showPost(id, scroll = false) {
  const samePost =
    currentView === "detail" &&
    currentPost?.id === id;

  const draft = samePost
    ? $("commentContent")?.value || ""
    : "";

  const token = showView("detail");

  currentPost = null;

  showMessage($("postDetailContent"), "불러오는 중입니다.");
  $("postActions").replaceChildren();
  $("commentList").replaceChildren();
  $("commentCount").textContent = "0";

  if (commentForm) {
    commentForm.hidden = true;
    $("commentContent").value = draft;
  }

  if (scroll) scrollToCommunity();

  try {
    const [postResult, commentResult] = await Promise.all([
      request(`/api/posts/${id}`),
      request(`/api/posts/${id}/comments`)
    ]);

    if (token !== requestId) return;

    currentPost = postResult.data;

    renderPost(currentPost);
    renderComments(commentResult.data);

    if (commentForm) commentForm.hidden = false;

  } catch (err) {
    if (token !== requestId) return;

    currentPost = null;
    showMessage($("postDetailContent"), err.message);
  }
}

function renderPost(post) {
  const detail = $("postDetailContent");
  const actions = $("postActions");

  detail.replaceChildren();
  actions.replaceChildren();

  detail.classList.toggle("admin-post", post.role === "admin");

  const board = createElement("p", "post-board", post.board_name);
  const title = createElement("h3", "post-detail-title", post.title);

  const meta = createElement(
    "p",
    "post-meta",
    `${post.username} · ${formatDateTime(post.created_at)}`
  );

  const content = createElement("div", "post-content", post.content);

  detail.append(board, title, meta, content);

  // 추천 버튼
  const likeButton = createButton(
    `${post.liked_by_me ? "추천 취소" : "추천"} ${post.like_count}`,
    post.liked_by_me ? "active like-btn" : "like-btn",
    () => toggleLike(post, likeButton)
  );

  likeButton.disabled = !userId || userId === Number(post.user_id);
  actions.appendChild(likeButton);

  // 신고 버튼
  if (userId && userId !== Number(post.user_id)) {
    const reportButton = createButton(
      post.reported_by_me ? "신고 완료" : "신고",
      "report-btn",
      () => reportPost(post, reportButton)
    );

    reportButton.disabled = post.reported_by_me;
    actions.appendChild(reportButton);
  }

  // 게시글 수정
  if (post.can_edit) {
    actions.appendChild(
      createButton("수정", "", () => showPostForm(post))
    );
  }

  // 게시글 삭제
  if (post.can_delete) {
    const deleteButton = createButton(
      "삭제",
      "delete-btn",
      () => deletePost(post.id, deleteButton)
    );

    actions.appendChild(deleteButton);
  }
}


// ==================== 게시글 작성 및 수정 ====================

function showPostForm(post = null) {
  if (!userId || !postForm) return;

  if (postForm.querySelector('[type="submit"]').disabled) return;

  editingPost = post;

  renderBoardOptions(post);

  if (!$("postBoard").options.length) {
    window.alert("작성 가능한 게시판이 없습니다.");
    return;
  }

  showView("editor");

  $("postEditorTitle").textContent = post ? "게시글 수정" : "게시글 작성";
  $("postTitle").value = post?.title || "";
  $("postContent").value = post?.content || "";
  $("submitPost").textContent = post ? "수정 완료" : "등록";

  scrollToCommunity();
  $("postTitle").focus();
}

postForm?.addEventListener("submit", event => {
  event.preventDefault();

  const button = $("submitPost");
  const post = editingPost;
  const token = requestId;

  const payload = {
    board_id: Number($("postBoard").value),
    title: $("postTitle").value.trim(),
    content: $("postContent").value.trim()
  };

  runAction(button, async () => {
    const url = post ? `/posts/${post.id}/edit` : "/api/posts";
    const { data } = await sendJSON(url, "POST", payload);

    if (token !== requestId) return;

    postForm.reset();
    editingPost = null;

    if (!post) {
      boardId = payload.board_id;
      page = 1;
      search = "";
      searchType = "all";
      sort = "latest";

      $("searchKeyword").value = "";
      $("searchType").value = searchType;
      $("postSort").value = sort;

      renderBoards();
    }

    await showPost(post ? post.id : data.id, true);
  });
});


// ==================== 게시글 삭제 ====================

function deletePost(id, button) {
  if (!window.confirm("게시글을 삭제하시겠습니까?")) return;

  const token = requestId;

  runAction(button, async () => {
    await request(`/api/posts/${id}`, {
      method: "DELETE"
    });

    loadReportCount();

    if (token === requestId) {
      await loadPosts();
    }
  });
}


// ==================== 게시글 추천 ====================

function toggleLike(post, button) {
  const token = requestId;

  runAction(button, async () => {
    const { data } = await request(`/api/posts/${post.id}/like`, {
      method: post.liked_by_me ? "DELETE" : "POST"
    });

    if (token !== requestId) return;

    post.liked_by_me = data.liked;
    post.like_count = data.like_count;

    button.textContent =
      `${data.liked ? "추천 취소" : "추천"} ${data.like_count}`;

    button.classList.toggle("active", data.liked);
  });
}


// ==================== 게시글 신고 ====================

function reportPost(post, button) {
  const reason = window.prompt("신고 사유를 입력하세요. (최대 500자)");

  if (reason === null) return;

  if (!reason.trim() || reason.trim().length > 500) {
    window.alert("신고 사유는 1~500자로 입력해주세요.");
    return;
  }

  const token = requestId;

  runAction(button, async () => {
    await sendJSON(`/api/posts/${post.id}/report`, "POST", {
      reason: reason.trim()
    });

    loadReportCount();
    window.alert("신고가 관리자에게 접수되었습니다.");

    if (token !== requestId) return;

    post.reported_by_me = true;

    // 신고 완료 상태를 반영하여 버튼 재생성
    renderPost(post);
  });
}


// ==================== 댓글 목록 ====================

function renderComments(comments) {
  const list = $("commentList");

  list.replaceChildren();
  $("commentCount").textContent = comments.length;

  if (!comments.length) {
    showMessage(list, "등록된 댓글이 없습니다.");
    return;
  }

  for (const comment of comments) {
    const row = createElement("div", "comment-row");

    if (comment.role === "admin") {
      row.classList.add("admin-comment");
    }

    const header = createElement("div", "comment-header");

    const author = createElement(
      "strong",
      "comment-author",
      comment.username
    );

    const date = createElement(
      "span",
      "comment-date",
      formatDateTime(comment.created_at)
    );

    header.append(author, date);

    if (comment.can_delete) {
      const button = createButton(
        "삭제",
        "delete-btn",
        () => deleteComment(comment.id, button)
      );

      header.appendChild(button);
    }

    const content = createElement(
      "div",
      "comment-content",
      comment.content
    );

    row.append(header, content);
    list.appendChild(row);
  }
}


// ==================== 댓글 작성 ====================

commentForm?.addEventListener("submit", event => {
  event.preventDefault();

  if (!currentPost) return;

  const postId = currentPost.id;
  const input = $("commentContent");
  const content = input.value.trim();
  const button = commentForm.querySelector('[type="submit"]');
  const token = requestId;

  if (!content || content.length > 2000) {
    window.alert("댓글은 1~2000자로 작성해주세요.");
    return;
  }

  runAction(button, async () => {
    await sendJSON(`/api/posts/${postId}/comments`, "POST", {
      content
    });

    if (token !== requestId) return;

    if (input.value.trim() === content) {
      input.value = "";
    }

    await showPost(postId);
  });
});


// ==================== 댓글 삭제 ====================

function deleteComment(id, button) {
  if (!currentPost) return;
  if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

  const postId = currentPost.id;
  const token = requestId;

  runAction(button, async () => {
    await request(`/api/comments/${id}`, {
      method: "DELETE"
    });

    if (token === requestId) {
      await showPost(postId);
    }
  });
}


// ==================== 관리자 신고 건수 ====================

async function loadReportCount() {
  if (!isAdmin) return;

  try {
    const { data } = await request("/api/admin/reports/count");

    $("pendingReportCount").textContent = data.pending_count;
  } catch (err) {
    console.error("신고 건수 조회 오류:", err);
  }
}


// ==================== 관리자 신고 목록 ====================

async function loadReports() {
  if (!isAdmin) return;

  const token = showView("reports");
  const list = $("reportList");

  showMessage(list, "신고 내역을 불러오는 중입니다.");
  $("reportPagination").replaceChildren();

  const params = new URLSearchParams({
    status: $("reportStatus").value,
    page: reportPage
  });

  try {
    const { data } = await request(`/api/admin/reports?${params}`);

    if (token !== requestId) return;

    const totalPages = data.pagination.totalPages;

    if (reportPage > Math.max(1, totalPages)) {
      reportPage = Math.max(1, totalPages);
      return loadReports();
    }

    list.replaceChildren();

    if (!data.reports.length) {
      showMessage(list, "접수된 신고가 없습니다.");
    }

    const statusNames = {
      pending: "미처리",
      dismissed: "기각",
      resolved: "처리 완료"
    };

    for (const report of data.reports) {
      const row = createElement("article", "report-row");

      const title = createElement(
        "h4",
        "report-title",
        report.current_post_title || report.post_title
      );

      const status = createElement(
        "p",
        `report-status ${report.status}`,
        `상태: ${statusNames[report.status]}`
      );

      const author = createElement(
        "p",
        "report-meta",
        `작성자: ${report.post_username || "삭제된 게시글"}`
      );

      const reporter = createElement(
        "p",
        "report-meta",
        `신고자: ${report.reporter_username}`
      );

      const date = createElement(
        "p",
        "report-meta",
        `신고일: ${formatDateTime(report.created_at)}`
      );

      const reason = createElement(
        "div",
        "report-reason",
        `신고 사유: ${report.reason}`
      );

      row.append(title, status, author, reporter, date, reason);

      if (report.processed_at) {
        row.appendChild(
          createElement(
            "p",
            "report-meta",
            `처리일: ${formatDateTime(report.processed_at)}`
          )
        );
      }

      const actions = createElement("div", "report-actions");

      if (report.post_id) {
        actions.appendChild(
          createButton("원문 보기", "", () => {
            showPost(report.post_id, true);
          })
        );
      }

      if (report.status === "pending") {
        row.appendChild(
          createElement(
            "p",
            "report-meta",
            `해당 게시글의 미처리 신고: ${report.pending_report_count}건`
          )
        );

        const dismiss = createButton(
          "신고 기각",
          "",
          () => processReport(report.id, "dismiss", dismiss)
        );

        const remove = createButton(
          report.post_id ? "게시글 삭제" : "처리 완료",
          "delete-btn",
          () => processReport(report.id, "delete", remove)
        );

        actions.append(dismiss, remove);
      }

      row.appendChild(actions);
      list.appendChild(row);
    }

    renderPagination(
      $("reportPagination"),
      reportPage,
      totalPages,
      nextPage => {
        reportPage = nextPage;
        loadReports();
      }
    );

  } catch (err) {
    if (token !== requestId) return;
    showMessage(list, err.message);
  }
}


// ==================== 관리자 신고 처리 ====================

function processReport(id, action, button) {
  const message = action === "dismiss"
    ? "해당 신고를 기각하시겠습니까?"
    : "신고를 처리하시겠습니까? 게시글이 남아 있다면 삭제됩니다.";

  if (!window.confirm(message)) return;

  const token = requestId;

  runAction(button, async () => {
    const { data } = await sendJSON(
      `/api/admin/reports/${id}`,
      "PATCH",
      { action }
    );

    window.alert(data.message);
    loadReportCount();

    if (token === requestId) {
      await loadReports();
    }
  });
}


// ==================== 검색 및 정렬 ====================

$("postSearchForm").addEventListener("submit", event => {
  event.preventDefault();

  search = $("searchKeyword").value.trim();
  searchType = $("searchType").value;
  page = 1;

  loadPosts();
});

$("resetSearch").addEventListener("click", () => {
  $("searchKeyword").value = "";
  $("searchType").value = "all";

  search = "";
  searchType = "all";
  page = 1;

  loadPosts();
});

$("postSort").addEventListener("change", event => {
  sort = event.target.value;
  page = 1;

  loadPosts();
});


// ==================== 이벤트 등록 ====================

$("writePost")?.addEventListener("click", () => {
  showPostForm();
});

community.querySelectorAll(".community-back").forEach(button => {
  button.addEventListener("click", () => {
    loadPosts();
    scrollToCommunity();
  });
});

$("openReports")?.addEventListener("click", () => {
  reportPage = 1;
  loadReports();
  scrollToCommunity();
});

$("reportStatus")?.addEventListener("change", () => {
  reportPage = 1;
  loadReports();
});

// 관리자 패널에서 게시판을 생성하면 목록 갱신
document.addEventListener("community:boards-changed", async () => {
  try {
    await loadBoards();

    if (currentView === "list") {
      await loadPosts();
    }
  } catch (err) {
    window.alert(err.message);
  }
});


// ==================== 초기 실행 ====================

async function init() {
  try {
    await loadBoards();
    await loadPosts();
    loadReportCount();

  } catch (err) {
    showMessage(postList, err.message);
  }
}

init();
