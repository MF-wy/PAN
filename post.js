/**
 * post.js — Pet Share 貼文 / 留言 / 按讚模組
 * 負責：貼文建立、刪除、渲染貼文卡片、按讚、留言邏輯，與搜尋、排序
 */

let _postImageBase64 = '';

/**
 * 預覽使用者選擇的貼文圖片
 */
function previewPostImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (typeof Auth !== 'undefined' && typeof Auth.readFileAsBase64 === 'function') {
    Auth.readFileAsBase64(file, (base64) => {
      _postImageBase64 = base64;
      const previewImg = document.getElementById('postImagePreviewImg');
      const uploadArea = document.getElementById('imageUploadArea');
      const previewWrap = document.getElementById('postImagePreview');
      if (previewImg && uploadArea && previewWrap) {
        previewImg.src = base64;
        uploadArea.style.display = 'none';
        previewWrap.style.display = 'block';
      }
    });
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      _postImageBase64 = e.target.result;
      const previewImg = document.getElementById('postImagePreviewImg');
      const uploadArea = document.getElementById('imageUploadArea');
      const previewWrap = document.getElementById('postImagePreview');
      if (previewImg && uploadArea && previewWrap) {
        previewImg.src = e.target.result;
        uploadArea.style.display = 'none';
        previewWrap.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }
}

/** 移除已選擇的貼文圖片 */
function removePostImage() {
  _postImageBase64 = '';
  const postImage = document.getElementById('postImage');
  if (postImage) postImage.value = '';
  const uploadArea = document.getElementById('imageUploadArea');
  const previewWrap = document.getElementById('postImagePreview');
  if (uploadArea) uploadArea.style.display = 'block';
  if (previewWrap) previewWrap.style.display = 'none';
}

/** 清空整個發文表單 */
function clearPostForm() {
  const title = document.getElementById('postTitle');
  const content = document.getElementById('postContent');
  const tCount = document.getElementById('titleCount');
  const cCount = document.getElementById('contentCount');

  if (title) title.value = '';
  if (content) content.value = '';
  if (tCount) tCount.textContent = '0 / 60';
  if (cCount) cCount.textContent = '0 / 500';
  removePostImage();
}

/**
 * 進入發文頁時，更新作者資訊 & 登入狀態檢查
 */
function initPostPage() {
  const user = Storage.currentUser.get();
  const notice = document.getElementById('postLoginNotice');
  const formCard = document.getElementById('postFormCard');
  const authorInfo = document.getElementById('postAuthorInfo');

  if (!user) {
    if (notice) notice.style.display = 'block';
    if (authorInfo) authorInfo.style.display = 'none';
    document.querySelectorAll('.form-group, .form-actions').forEach(el => {
      el.style.display = 'none';
    });
    return;
  }

  if (notice) notice.style.display = 'none';
  if (authorInfo) authorInfo.style.display = 'flex';
  document.querySelectorAll('.form-group, .form-actions').forEach(el => {
    el.style.display = '';
  });

  const fa = document.getElementById('postFormAvatar');
  const fn = document.getElementById('postFormName');
  const fi = document.getElementById('postFormId');

  if (fa) fa.src = user.avatar;
  if (fn) fn.textContent = user.name;
  if (fi) fi.textContent = '@' + user.id;
}

/**
 * 提交貼文
 */
function submitPost() {
  const user = Storage.currentUser.get();
  if (!user) {
    UI.showToast('請先登入才能發文', 'error');
    setTimeout(() => { window.location.href = 'login.html'; }, 800);
    return;
  }

  const titleEl = document.getElementById('postTitle');
  const contentEl = document.getElementById('postContent');

  const title = titleEl ? titleEl.value.trim() : '';
  const content = contentEl ? contentEl.value.trim() : '';

  if (!title) {
    UI.showToast('請填寫貼文主題', 'error');
    if (titleEl) titleEl.focus();
    return;
  }
  if (!content) {
    UI.showToast('請填寫貼文內容', 'error');
    if (contentEl) contentEl.focus();
    return;
  }

  // 建立貼文物件
  const post = {
    id: 'post_' + Date.now(),
    authorId: user.id,
    title,
    content,
    image: _postImageBase64,
    createdAt: Date.now(),
  };

  Storage.posts.create(post);
  clearPostForm();

  // 顯示成功動畫
  UI.showSuccessOverlay('🎉 發布成功！', '你的貼文已成功分享到社群', () => {
    window.location.href = 'feed.html';
  });
}

/**
 * 切換按讚
 */
function toggleLike(postId, btn) {
  const user = Storage.currentUser.get();
  if (!user) {
    UI.showToast('請先登入才能按讚 💕', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    return;
  }

  const liked = Storage.likes.toggle(postId, user.id);
  const countEl = btn.querySelector('.like-count');
  const iconEl = btn.querySelector('i');

  // 更新顯示
  const count = Storage.likes.getPostLikes(postId).length;
  if (countEl) countEl.textContent = count;

  // 樣式切換
  btn.classList.toggle('liked', liked);

  if (iconEl) {
    iconEl.className = liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    // 觸發心跳動畫
    iconEl.style.animation = 'none';
    iconEl.offsetHeight; // reflow
    if (liked) {
      iconEl.style.animation = 'heartBeat 0.35s ease';
      UI.showToast('❤️ 已按讚！', 'success');
    } else {
      UI.showToast('取消按讚', 'info');
    }
  }

  // 如果是在個人頁按讚，重新整理個人頁的獲讚統計
  if (typeof renderProfileInfo === 'function') {
    renderProfileInfo();
  }
}

/**
 * 切換留言區顯示
 */
function toggleComments(postId) {
  const section = document.getElementById('comments-' + postId);
  if (!section) return;
  section.classList.toggle('open');
}

/**
 * 點擊留言輸入框時檢查登入狀態
 */
function checkLoginForComment(el) {
  const user = Storage.currentUser.get();
  if (!user) {
    el.blur();
    if (confirm('是否已有平台帳號？\n請先登入或註冊才能留言。')) {
      window.location.href = 'login.html';
    }
  }
}

/**
 * 送出留言
 */
function submitComment(postId, btn) {
  const user = Storage.currentUser.get();
  if (!user) {
    if (confirm('是否已有平台帳號？\n請先登入或註冊才能留言。')) {
      window.location.href = 'login.html';
    }
    return;
  }

  const textarea = document.getElementById('commentInput-' + postId);
  const text = textarea ? textarea.value.trim() : '';

  if (!text) {
    UI.showToast('留言內容不能為空', 'error');
    return;
  }

  const comment = {
    id: 'cmt_' + Date.now(),
    authorId: user.id,
    text,
    createdAt: Date.now(),
  };

  Storage.comments.create(postId, comment);
  textarea.value = '';

  // 重新渲染留言區
  const listEl = document.getElementById('commentList-' + postId);
  if (listEl) {
    listEl.innerHTML = renderCommentItems(postId);
  }

  // 更新卡片上的留言計數
  const countEl = btn.closest('.post-card')?.querySelector('.comment-count');
  if (countEl) {
    countEl.textContent = Storage.comments.getByPostId(postId).length;
  }

  UI.showToast('留言成功 💬', 'success');
}

/**
 * 刪除貼文（僅限作者）
 */
function deletePost(postId, cardEl) {
  const user = Storage.currentUser.get();
  if (!user) return;

  if (!confirm('確定要刪除這篇貼文嗎？此動作無法復原。')) return;

  const success = Storage.posts.delete(postId, user.id);
  if (!success) {
    UI.showToast('刪除失敗', 'error');
    return;
  }

  // 動畫移除卡片
  cardEl.style.transition = 'opacity 0.3s, transform 0.3s';
  cardEl.style.opacity = '0';
  cardEl.style.transform = 'scale(0.92)';
  setTimeout(() => {
    cardEl.remove();
    UI.showToast('貼文已刪除', 'info');

    // 重新載入個人頁統計與貼文列表（若在個人頁）
    if (typeof renderProfileInfo === 'function') {
      renderProfileInfo();
    }
  }, 300);
}

/**
 * 格式化時間為「N 分鐘前」等相對時間
 */
function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days < 7) return `${days} 天前`;

  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 建立單一貼文卡片的 HTML 字串
 */
function buildPostCard(post, compact = false) {
  const author = Storage.users.getById(post.authorId);
  const user = Storage.currentUser.get();
  const likes = Storage.likes.getPostLikes(post.id).length;
  const hasLiked = user ? Storage.likes.hasLiked(post.id, user.id) : false;
  const comments = Storage.comments.getByPostId(post.id);
  const isAuthor = user && user.id === post.authorId;

  const avatarSrc = author ? author.avatar : Storage._demoAvatar('👤');
  const authorName = author ? author.name : '未知使用者';
  const authorId = author ? author.id : 'unknown';

  const imageHtml = post.image
    ? `<img class="post-card-image" src="${post.image}" alt="post image" onclick="openLightbox('${post.id}')" />`
    : '';

  const deleteBtn = isAuthor
    ? `<button class="card-delete-btn" title="刪除貼文"
         onclick="deletePost('${post.id}', this.closest('.post-card'))">
         <i class="fa-solid fa-trash"></i>
       </button>`
    : '';

  const commentSection = compact ? '' : `
    <div class="comment-section" id="comments-${post.id}">
      ${buildCommentInputHtml(post.id)}
      <div class="comment-list" id="commentList-${post.id}">
        ${renderCommentItems(post.id)}
      </div>
    </div>
  `;

  const profileUrl = `profile.html?id=${authorId}`;

  return `
    <div class="post-card" id="card-${post.id}" data-post-id="${post.id}" data-created="${post.createdAt}" data-likes="${likes}">
      <div class="post-card-header">
        <a href="${profileUrl}">
          <img class="card-avatar" src="${avatarSrc}" alt="${authorName}" />
        </a>
        <div class="card-author-info">
          <a href="${profileUrl}" class="card-author-name">${escapeHtml(authorName)}</a>
          <span class="card-author-id">@${escapeHtml(authorId)}</span>
        </div>
        <span class="card-time">${formatRelativeTime(post.createdAt)}</span>
        ${deleteBtn}
      </div>
      ${imageHtml}
      <div class="post-card-body">
        <div class="post-card-title">${escapeHtml(post.title)}</div>
        <div class="post-card-content">${escapeHtml(post.content)}</div>
      </div>
      <div class="post-card-actions">
        <button class="action-btn like-btn ${hasLiked ? 'liked' : ''}"
          onclick="toggleLike('${post.id}', this)">
          <i class="fa-${hasLiked ? 'solid' : 'regular'} fa-heart"></i>
          <span class="like-count">${likes}</span>
        </button>
        <button class="action-btn comment-toggle-btn"
          onclick="toggleComments('${post.id}')">
          <i class="fa-regular fa-comment"></i>
          <span class="comment-count">${comments.length}</span>
        </button>
        <span style="flex:1"></span>
        <span style="font-size:0.75rem;color:var(--text-light)">🐾</span>
      </div>
      ${commentSection}
    </div>
  `;
}

/**
 * 建立留言輸入區 HTML
 */
function buildCommentInputHtml(postId) {
  const user = Storage.currentUser.get();
  const avatarSrc = user ? user.avatar : Storage._demoAvatar('👤');

  return `
    <div class="comment-input-wrap">
      <img class="comment-input-avatar" src="${avatarSrc}" alt="avatar" />
      <div class="comment-input-inner">
        <textarea
          class="comment-input"
          id="commentInput-${postId}"
          rows="2"
          placeholder="${user ? '留下你的留言...' : '登入後才能留言'}"
          onfocus="checkLoginForComment(this)"
        ></textarea>
        <button class="comment-send-btn"
          onclick="submitComment('${postId}', this)">
          <i class="fa-solid fa-paper-plane"></i> 送出
        </button>
      </div>
    </div>
  `;
}

/**
 * 渲染某貼文的留言列表 HTML 字串
 */
function renderCommentItems(postId) {
  const comments = Storage.comments.getByPostId(postId);
  if (comments.length === 0) {
    return `<p class="no-comments">還沒有留言，快來說說話吧 💬</p>`;
  }

  return comments.map(cmt => {
    const author = Storage.users.getById(cmt.authorId);
    const avatarSrc = author ? author.avatar : Storage._demoAvatar('👤');
    const authorName = author ? author.name : '未知使用者';
    const authorId = author ? author.id : 'unknown';
    const profileUrl = `profile.html?id=${authorId}`;

    return `
      <div class="comment-item">
        <a href="${profileUrl}">
          <img class="comment-avatar" src="${avatarSrc}" alt="${escapeHtml(authorName)}" />
        </a>
        <div class="comment-bubble">
          <a href="${profileUrl}" class="comment-author">@${escapeHtml(authorId)}</a>
          <span class="comment-text">${escapeHtml(cmt.text)}</span>
          <span class="comment-time">${formatRelativeTime(cmt.createdAt)}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 渲染首頁的貼文網格（最新幾篇）
 */
function renderFeedGrid() {
  const container = document.getElementById('feedPostsGrid');
  if (!container) return;

  const posts = Storage.posts.getAll().slice(0, 6); // 最多顯示 6 篇
  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🐾</div>
        <p>還沒有貼文，成為第一個分享的人！</p>
        <a href="create.html" class="btn btn-primary">立即發文</a>
      </div>`;
    return;
  }

  container.innerHTML = posts.map(p => buildPostCard(p, true)).join('');
}

/**
 * 渲染分享區（所有貼文）
 */
function renderSharePage(posts) {
  const container = document.getElementById('sharePostsList');
  const emptyEl = document.getElementById('shareEmpty');
  if (!container) return;

  const allPosts = posts || Storage.posts.getAll();

  if (allPosts.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  container.innerHTML = allPosts.map(p => buildPostCard(p, false)).join('');
}

/**
 * 渲染個人頁的貼文
 */
function renderProfilePostsList(userId) {
  const container = document.getElementById('myPostsList');
  if (!container) return;

  const posts = Storage.posts.getByUser(userId);

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>此使用者目前沒有發過貼文</p>
        ${Storage.currentUser.get()?.id === userId ? '<a href="create.html" class="btn btn-primary">立即發文</a>' : ''}
      </div>`;
    return;
  }

  container.innerHTML = posts.map(p => buildPostCard(p, false)).join('');
}

// ─────────────────────────────────────────────────────────────
// 搜尋 & 排序
// ─────────────────────────────────────────────────────────────
let _currentSort = 'newest';

function filterPosts() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  const keyword = searchInput.value.trim().toLowerCase();
  const clearBtn = document.getElementById('clearSearch');
  if (clearBtn) clearBtn.style.display = keyword ? 'block' : 'none';

  let posts = Storage.posts.getAll();
  if (keyword) {
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(keyword) ||
      p.content.toLowerCase().includes(keyword)
    );
  }

  posts = applySort(posts, _currentSort);
  renderSharePage(posts);
}

function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('clearSearch');
  if (clearBtn) clearBtn.style.display = 'none';
  filterPosts();
}

function sortPosts(mode) {
  _currentSort = mode;
  const newestBtn = document.getElementById('sortNewest');
  const hotBtn = document.getElementById('sortHot');

  if (newestBtn) newestBtn.classList.toggle('active', mode === 'newest');
  if (hotBtn) hotBtn.classList.toggle('active', mode === 'hot');

  filterPosts();
}

function applySort(posts, mode) {
  if (mode === 'hot') {
    return [...posts].sort((a, b) =>
      Storage.likes.getPostLikes(b.id).length - Storage.likes.getPostLikes(a.id).length
    );
  }
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}

// ─────────────────────────────────────────────────────────────
// 圖片 Lightbox
// ─────────────────────────────────────────────────────────────
function openLightbox(postId) {
  const post = Storage.posts.getById(postId);
  if (!post || !post.image) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `<img src="${post.image}" alt="full image" />`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

// ─────────────────────────────────────────────────────────────
// 字元計數與拖曳
// ─────────────────────────────────────────────────────────────
function initCharCounts() {
  const titleEl = document.getElementById('postTitle');
  const contentEl = document.getElementById('postContent');

  if (titleEl) {
    titleEl.addEventListener('input', () => {
      const tc = document.getElementById('titleCount');
      if (tc) tc.textContent = `${titleEl.value.length} / 60`;
    });
  }
  if (contentEl) {
    contentEl.addEventListener('input', () => {
      const cc = document.getElementById('contentCount');
      if (cc) cc.textContent = `${contentEl.value.length} / 500`;
    });
  }
}

function initDragDrop() {
  const area = document.getElementById('imageUploadArea');
  if (!area) return;

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.style.borderColor = 'var(--milk-tea)';
    area.style.background = 'rgba(212,165,116,0.08)';
  });

  area.addEventListener('dragleave', () => {
    area.style.borderColor = '';
    area.style.background = '';
  });

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.style.borderColor = '';
    area.style.background = '';

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      UI.showToast('請上傳圖片檔案', 'error');
      return;
    }

    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.getElementById('postImage');
    if (input) {
      input.files = dt.files;
      previewPostImage({ target: { files: dt.files } });
    }
  });
}

// ─────────────────────────────────────────────────────────────
// HTML 安全跳脫
// ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────
// DOM載入後執行初始化
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 自動判斷目前所在頁面並載入對應初始化
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';

  if (page === 'index.html' || page === '') {
    renderFeedGrid();
  } else if (page === 'feed.html') {
    renderSharePage();
    // 綁定搜尋與排序
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', filterPosts);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') clearSearch();
      });
    }
    const newestBtn = document.getElementById('sortNewest');
    const hotBtn = document.getElementById('sortHot');
    const clearBtn = document.getElementById('clearSearch');
    if (newestBtn) newestBtn.addEventListener('click', () => sortPosts('newest'));
    if (hotBtn) hotBtn.addEventListener('click', () => sortPosts('hot'));
    if (clearBtn) clearBtn.addEventListener('click', clearSearch);
  } else if (page === 'create.html') {
    initPostPage();
    initCharCounts();
    initDragDrop();
    const clearBtn = document.querySelector('.form-actions button[onclick*="clearPostForm"]');
    if (clearBtn) {
      // 改為事件監聽
      clearBtn.setAttribute('onclick', '');
      clearBtn.addEventListener('click', clearPostForm);
    }
    const submitBtn = document.getElementById('submitPostBtn');
    if (submitBtn) {
      submitBtn.setAttribute('onclick', '');
      submitBtn.addEventListener('click', submitPost);
    }
  }
});
