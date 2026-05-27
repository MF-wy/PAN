/**
 * ui.js — Pet Share 全域 UI 模組
 * 負責：主題切換、Navbar 狀態更新、Active Link 標記、Toast 提示、Modal 控制、成功動畫
 */

const UI = {
  toastTimer: null,

  /**
   * 初始化主題
   */
  initTheme() {
    const saved = localStorage.getItem('petshare_theme');
    const isDark = saved === 'dark';
    UI.applyDark(isDark, false);
  },

  /**
   * 切換深色 / 淺色模式
   */
  toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    UI.applyDark(!isDark, true);
  },

  /**
   * 套用主題
   */
  applyDark(dark, save) {
    document.body.classList.toggle('dark-mode', dark);
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    if (save) {
      localStorage.setItem('petshare_theme', dark ? 'dark' : 'light');
    }
  },

  /**
   * 更新 Navbar 登入狀態與連結
   */
  updateNavAuth() {
    const user = Storage.currentUser.get();

    const guestNav = document.getElementById('guestNav');
    const userNav = document.getElementById('userNav');
    const navProfileLink = document.getElementById('navProfileLink');
    const navAvatar = document.getElementById('navAvatar');
    const navUsername = document.getElementById('navUsername');

    if (user) {
      if (guestNav) guestNav.style.display = 'none';
      if (userNav) userNav.style.display = 'flex';
      if (navProfileLink) {
        navProfileLink.style.display = 'list-item';
        const a = navProfileLink.querySelector('a');
        if (a) a.href = `profile.html?id=${user.id}`;
      }

      if (navAvatar) navAvatar.src = user.avatar || Storage._demoAvatar('👤');
      if (navUsername) navUsername.textContent = user.name;
    } else {
      if (guestNav) guestNav.style.display = 'block';
      if (userNav) userNav.style.display = 'none';
      if (navProfileLink) navProfileLink.style.display = 'none';
    }
  },

  /**
   * 標示當前頁面在導覽列中的 Active 狀態
   */
  highlightActiveLink() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    let activeId = 'nav-home';
    if (page === 'feed.html') activeId = 'nav-feed';
    else if (page === 'create.html') activeId = 'nav-create';
    else if (page === 'profile.html') activeId = 'nav-profile';

    // 移除所有 active
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    const activeLink = document.getElementById(activeId);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  },

  /**
   * 切換行動版漢堡選單
   */
  toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    const hamburger = document.getElementById('hamburger');
    if (navLinks && hamburger) {
      navLinks.classList.toggle('open');
      hamburger.classList.toggle('active');
    }
  },

  /**
   * 顯示 Toast 通知
   */
  showToast(message, type = 'info', duration = 2800) {
    let toast = document.getElementById('toast');
    if (!toast) {
      // 動態建立 toast 元素（如果不存在的話）
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    if (UI.toastTimer) {
      clearTimeout(UI.toastTimer);
      toast.classList.remove('show');
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;

    // 強制重繪觸發動畫
    toast.offsetHeight;
    toast.classList.add('show');

    UI.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },

  /**
   * 開啟 Modal
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  },

  /**
   * 關閉 Modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  },

  /**
   * 顯示成功動畫並在延遲後執行 callback
   */
  showSuccessOverlay(title, msg, callback) {
    let overlay = document.getElementById('successOverlay');
    if (!overlay) {
      // 如果不存在則動態建立
      overlay = document.createElement('div');
      overlay.id = 'successOverlay';
      overlay.className = 'success-overlay';
      overlay.innerHTML = `
        <div class="success-content">
          <div class="success-anim">🎉</div>
          <h3 id="successTitle"></h3>
          <p id="successMsg"></p>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const tEl = document.getElementById('successTitle');
    const mEl = document.getElementById('successMsg');
    if (tEl) tEl.textContent = title;
    if (mEl) mEl.textContent = msg;

    overlay.classList.add('show');

    setTimeout(() => {
      overlay.classList.remove('show');
      if (typeof callback === 'function') callback();
    }, 1800);
  },

  /**
   * 顯示腳印脈動讀取遮罩
   */
  showLoading(text = '讀取中...') {
    let loader = document.getElementById('loadingOverlay');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'loadingOverlay';
      loader.className = 'loading-overlay';
      loader.innerHTML = `
        <div class="loading-spinner">
          <div class="paw-icon">🐾</div>
          <p id="loadingText">${text}</p>
        </div>
      `;
      document.body.appendChild(loader);
    } else {
      const textEl = document.getElementById('loadingText');
      if (textEl) textEl.textContent = text;
    }
    // 強制重繪
    loader.offsetHeight;
    loader.classList.add('show');
  },

  /**
   * 隱藏讀取遮罩
   */
  hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
      loader.classList.remove('show');
    }
  }
};

// ─────────────────────────────────────────────────────────────
// 全域事件初始化
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化資料與主題
  Storage.seedIfEmpty();
  UI.initTheme();
  UI.updateNavAuth();
  UI.highlightActiveLink();

  // 2. 綁定深色模式切換
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => UI.toggleTheme());
  }

  // 3. 綁定行動版選單
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => UI.toggleMobileMenu());
  }

  // 4. 點擊頭貼區域進入個人頁
  const navAvatarWrap = document.getElementById('navAvatarWrap');
  if (navAvatarWrap) {
    navAvatarWrap.addEventListener('click', () => {
      const user = Storage.currentUser.get();
      if (user) {
        window.location.href = `profile.html?id=${user.id}`;
      }
    });
  }

  // 5. 綁定登出按鈕
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof Auth !== 'undefined') {
        Auth.logout();
      } else {
        Storage.currentUser.clear();
        UI.updateNavAuth();
        UI.showToast('已登出 👋', 'info');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
      }
    });
  }

  // 6. 點擊 modal overlay 關閉 modal
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // 7. Navbar 滾動效果
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // 8. 防止所有 form submit 的預設行為
  document.addEventListener('submit', (e) => e.preventDefault());
});
