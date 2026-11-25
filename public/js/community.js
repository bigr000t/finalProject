
"use strict";

// ==================== DOM 요소 ====================

const postList = document.getElementById("postList");
const writePost = document.getElementById("writePost");

const modal = document.getElementById("postModal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closePostModal");

const userId = Number(document.body.dataset.userId) || null;


// ==================== 공통 함수 ====================

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function formatDate(value) {
  const date = new Date(value);

  return date.toLocaleDateString("ko-KR");
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "요청 처리에 실패했습니다."
    );
  }

  return data;
}


// ==================== 팝업 관리 ====================

function openModal(title) {
  modalTitle.textContent = title;
  modalContent.replaceChildren();

  if (!modal.open) {
    modal.showModal();
  }
}

function hideModal() {
  modal.close();
  modalContent.replaceChildren();
}


// ==================== 게시글 목록 조회 ====================

async function loadPosts() {
  try {
    const posts = await request("/api/posts");

    postList.replaceChildren();

    if (posts.length === 0) {
      postList.appendChild(
        createElement(
          "p",
          "empty-posts",
          "등록된 게시글이 없습니다."
        )
      );

      return;
    }

    for (const post of posts) {
      const row = createElement(
        "button",
        "post-list-row"
      );

      row.type = "button";

      const title = createElement(
        "span",
        "post-title",
        post.title
      );

      const author = createElement(
        "span",
        "post-author",
        post.username
      );

      const date = createElement(
        "span",
        "post-date",
        formatDate(post.created_at)
      );

      row.append(title, author, date);

      row.addEventListener("click", () => {
        showPost(post.id);
      });

      postList.appendChild(row);
    }

  } catch (err) {
    console.error("게시글 목록 조회 오류:", err);

    postList.replaceChildren(
      createElement(
        "p",
        "empty-posts",
        err.message
      )
    );
  }
}


// ==================== 게시글 상세 조회 ====================

let detailRequestId = 0;

async function showPost(id) {
  const requestId = ++detailRequestId;

  openModal("게시글 조회");

  modalContent.appendChild(
    createElement("p", "hint", "불러오는 중입니다.")
  );

  try {
    const post = await request(`/api/posts/${id}`);

    if (requestId !== detailRequestId || !modal.open) {
      return;
    }

    modalTitle.textContent = post.title;
    modalContent.replaceChildren();

    // 작성자 및 작성일
    const meta = createElement(
      "p",
      "post-meta",
      `${post.username} · ${formatDate(post.created_at)}`
    );

    // 게시글 본문
    const content = createElement(
      "div",
      "post-content",
      post.content
    );

    modalContent.append(meta, content);

    // 작성자 본인에게만 수정 및 삭제 버튼 표시
    if (userId === Number(post.user_id)) {
      const actions = createElement(
        "div",
        "modal-actions"
      );

      const editButton = createElement(
        "button",
        "primary",
        "수정"
      );

      const deleteButton = createElement(
        "button",
        "delete-btn",
        "삭제"
      );

      editButton.type = "button";
      deleteButton.type = "button";

      editButton.addEventListener("click", () => {
        showPostForm(post);
      });

      deleteButton.addEventListener("click", () => {
        deletePost(post.id, deleteButton);
      });

      actions.append(editButton, deleteButton);
      modalContent.appendChild(actions);
    }

  } catch (err) {
    if (requestId !== detailRequestId || !modal.open) {
      return;
    }

    modalContent.replaceChildren(
      createElement("p", "hint", err.message)
    );
  }
}


// ==================== 작성 및 수정 폼 ====================

function showPostForm(post = null) {
  if (!userId) {
    return;
  }

  const isEdit = post !== null;

  openModal(
    isEdit ? "게시글 수정" : "게시글 작성"
  );

  const form = createElement(
    "form",
    "modal-form"
  );

  // 제목
  const titleLabel = createElement(
    "label",
    null,
    "제목"
  );

  const titleInput = document.createElement("input");

  titleInput.type = "text";
  titleInput.name = "title";
  titleInput.id = "postTitleInput";
  titleInput.maxLength = 200;
  titleInput.required = true;
  titleInput.placeholder = "제목을 입력하세요.";
  titleInput.value = isEdit ? post.title : "";

  titleLabel.htmlFor = titleInput.id;

  // 본문
  const contentLabel = createElement(
    "label",
    null,
    "내용"
  );

  const contentInput = document.createElement("textarea");

  contentInput.name = "content";
  contentInput.id = "postContentInput";
  contentInput.rows = 8;
  contentInput.required = true;
  contentInput.placeholder = "내용을 입력하세요.";
  contentInput.value = isEdit ? post.content : "";

  contentLabel.htmlFor = contentInput.id;

  // 상태 메시지
  const status = createElement("p", "hint", "");

  status.setAttribute("aria-live", "polite");

  // 제출 버튼
  const submitButton = createElement(
    "button",
    "primary",
    isEdit ? "수정 완료" : "작성 완료"
  );

  submitButton.type = "submit";

  form.append(
    titleLabel,
    titleInput,
    contentLabel,
    contentInput,
    status,
    submitButton
  );

  // 폼 제출
  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (submitButton.disabled) {
      return;
    }

    submitButton.disabled = true;
    status.textContent = "저장 중입니다.";

    try {
      const url = isEdit
        ? `/posts/${post.id}/edit`
        : "/posts";

      await request(url, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          title: titleInput.value.trim(),
          content: contentInput.value.trim()
        })
      });

      if (modalContent.contains(form)) {
        hideModal();
      }

      await loadPosts();

    } catch (err) {
      status.textContent = err.message;

    } finally {
      submitButton.disabled = false;
    }
  });

  modalContent.appendChild(form);
  titleInput.focus();
}


// ==================== 게시글 삭제 ====================

async function deletePost(id, button) {
  if (!window.confirm("게시글을 삭제하시겠습니까?")) {
    return;
  }

  button.disabled = true;

  try {
    await request(`/posts/${id}/delete`, {
      method: "POST"
    });

    if (modalContent.contains(button)) {
      hideModal();
    }

    await loadPosts();

  } catch (err) {
    window.alert(err.message);

  } finally {
    button.disabled = false;
  }
}


// ==================== 이벤트 등록 ====================

if (writePost) {
  writePost.addEventListener("click", () => {
    showPostForm();
  });
}

closeModal.addEventListener("click", hideModal);

modal.addEventListener("close", () => {
  detailRequestId++;
});


// ==================== 초기 실행 ====================

loadPosts();
