/**
 * profile.js — Pet Share 個人頁面模組
 * 負責：載入指定 ID 的使用者資料、統計數據、切換自己與他人頁面的 UI 狀態、更換頭貼與編輯簡介
 */

const Profile = {
  targetUserId: '',
  isOwnProfile: false,

  /**
   * 初始化個人頁面
   */
  init() {
    const params = new URLSearchParams(window.location.search);
    let id = params.get('id');
    const currentUser = Storage.currentUser.get();

    // 如果沒有傳入 id
    if (!id) {
      if (currentUser) {
        // 若已登入，導向自己的個人頁
        window.location.href = `profile.html?id=${currentUser.id}`;
        return;
      } else {
        // 若未登入，提示並導向登入頁
        UI.showToast('請先登入才能查看個人頁面', 'info');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
      }
    }

    // 取得目標使用者資料
    const targetUser = Storage.users.getById(id);
    if (!targetUser) {
      UI.showToast('找不到該使用者！', 'error');
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);
      return;
    }

    Profile.targetUserId = id;
    Profile.isOwnProfile = currentUser && (currentUser.id === id);

    // 渲染 UI 狀態
    Profile.renderProfileInfo(targetUser);
    Profile.renderUIControls();

    // 渲染該使用者的貼文列表
    if (typeof renderProfilePostsList === 'function') {
      renderProfilePostsList(id);
    }
  },

  /**
   * 渲染個人頁基本資訊與獲讚數
   */
  renderProfileInfo(user) {
    const avatarEl = document.getElementById('profileAvatar');
    const nameEl = document.getElementById('profileName');
    const idEl = document.getElementById('profileId');
    const bioEl = document.getElementById('profileBio');
    const postCountEl = document.getElementById('profilePostCount');
    const likeCountEl = document.getElementById('profileLikeCount');

    if (avatarEl) avatarEl.src = user.avatar || Storage._demoAvatar('👤');
    if (nameEl) nameEl.textContent = user.name;
    if (idEl) idEl.textContent = '@' + user.id;
    if (bioEl) bioEl.textContent = user.bio || '這個人很懶，什麼都沒有留下...';

    // 計算貼文總數與獲讚總數
    const posts = Storage.posts.getByUser(user.id);
    const totalLikes = posts.reduce((sum, p) => sum + Storage.likes.getPostLikes(p.id).length, 0);

    if (postCountEl) postCountEl.textContent = posts.length;
    if (likeCountEl) likeCountEl.textContent = totalLikes;
  },

  /**
   * 調整「編輯按鈕」與「換頭貼按鈕」顯示狀態
   */
  renderUIControls() {
    const editBtn = document.getElementById('editProfileBtn');
    const returnBtn = document.getElementById('returnToFeedBtn');
    const editAvatarBtn = document.querySelector('.edit-avatar-btn');
    const myPostsHeader = document.getElementById('profilePostsHeader');

    if (Profile.isOwnProfile) {
      // 自己的頁面：顯示編輯與頭貼編輯
      if (editBtn) editBtn.style.display = 'inline-flex';
      if (returnBtn) returnBtn.style.display = 'none';
      if (editAvatarBtn) editAvatarBtn.style.display = 'flex';
      if (myPostsHeader) myPostsHeader.textContent = '📝 我的貼文';
    } else {
      // 他人的頁面：顯示返回分享區，隱藏編輯功能
      if (editBtn) editBtn.style.display = 'none';
      if (returnBtn) returnBtn.style.display = 'inline-flex';
      if (editAvatarBtn) editAvatarBtn.style.display = 'none';
      if (myPostsHeader) {
        const user = Storage.users.getById(Profile.targetUserId);
        myPostsHeader.textContent = `📝 ${user ? user.name : '此使用者'} 的貼文`;
      }
    }
  },

  /**
   * 開啟編輯資料 Modal
   */
  openEdit() {
    if (!Profile.isOwnProfile) return;
    const currentUser = Storage.currentUser.get();
    if (!currentUser) return;

    const nameInput = document.getElementById('editName');
    const bioTextarea = document.getElementById('editBio');

    if (nameInput) nameInput.value = currentUser.name;
    if (bioTextarea) bioTextarea.value = currentUser.bio || '';

    UI.openModal('editProfileModal');
  },

  /**
   * 儲存個人資料
   */
  save() {
    if (!Profile.isOwnProfile) return;

    const nameInput = document.getElementById('editName');
    const bioTextarea = document.getElementById('editBio');

    const name = nameInput ? nameInput.value.trim() : '';
    const bio = bioTextarea ? bioTextarea.value.trim() : '';

    if (!name) {
      UI.showToast('名稱不能為空', 'error');
      return;
    }

    Storage.users.update(Profile.targetUserId, { name, bio });

    // 更新導覽列與個人頁顯示
    UI.updateNavAuth();
    const updatedUser = Storage.users.getById(Profile.targetUserId);
    Profile.renderProfileInfo(updatedUser);

    UI.closeModal('editProfileModal');
    UI.showToast('個人資料已更新 ✨', 'success');
  },

  /**
   * 更換頭貼
   */
  updateAvatar(event) {
    if (!Profile.isOwnProfile) return;

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      Storage.users.update(Profile.targetUserId, { avatar: base64 });

      // 更新畫面
      const avatarEl = document.getElementById('profileAvatar');
      if (avatarEl) avatarEl.src = base64;
      UI.updateNavAuth();
      UI.showToast('頭貼已更新！', 'success');
    };
    reader.readAsDataURL(file);
  }
};

// 全域掛載以供 HTML 按鈕調用
window.renderProfileInfo = () => {
  const user = Storage.users.getById(Profile.targetUserId);
  if (user) {
    Profile.renderProfileInfo(user);
  }
};

// DOM 載入後執行
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const page = path.split('/').pop();

  if (page === 'profile.html') {
    Profile.init();

    // 綁定編輯按鈕事件
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
      editBtn.addEventListener('click', Profile.openEdit);
    }

    // 綁定 Modal 儲存按鈕
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', Profile.save);
    }

    // 綁定 Modal 取消與關閉按鈕
    const closeBtns = document.querySelectorAll('[onclick*="closeModal(\'editProfileModal\')"]');
    closeBtns.forEach(btn => {
      btn.setAttribute('onclick', '');
      btn.addEventListener('click', () => UI.closeModal('editProfileModal'));
    });

    // 綁定頭貼上傳變更
    const avatarInput = document.getElementById('editAvatarInput');
    if (avatarInput) {
      avatarInput.addEventListener('change', Profile.updateAvatar);
    }
  }
});
