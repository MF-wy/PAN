/**
 * auth.js — Pet Share 驗證模組
 * 負責：登入、註冊、登出、密碼切換、註冊頭貼預覽、2FA 驗證流程管理
 */

const Auth = {
  regAvatarBase64: '',
  captchaTargetIndices: [],
  captchaData: {
    cat: { name: '貓咪', emojis: ['🐱', '🐈'] },
    dog: { name: '狗狗', emojis: ['🐶', '🐕'] },
    rabbit: { name: '兔子', emojis: ['🐰', '🐇'] },
    distractors: ['🐹', '🦊', '🐨', '🐼', '🐯', '🐻', '🦁', '🐸', '🐷', '🐔']
  },

  /**
   * 隨機產生圖片選取驗證碼 (Captcha)
   */
  generateCaptcha() {
    const categories = ['cat', 'dog', 'rabbit'];
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const targetInfo = Auth.captchaData[selectedCategory];

    const promptEl = document.getElementById('captchaPrompt');
    if (promptEl) promptEl.textContent = `請選取所有「${targetInfo.name}」`;

    // 隨機挑選 1 ~ 2 個位置作為目標動物
    const targetCount = Math.floor(Math.random() * 2) + 1; // 1 or 2
    const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = [...indices].sort(() => 0.5 - Math.random());
    const targetPos = shuffled.slice(0, targetCount);

    Auth.captchaTargetIndices = targetPos.sort((a, b) => a - b);

    const grid = document.getElementById('captchaGrid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 0; i < 9; i++) {
      const isTarget = targetPos.includes(i);
      let emoji = '';
      if (isTarget) {
        emoji = targetInfo.emojis[Math.floor(Math.random() * targetInfo.emojis.length)];
      } else {
        emoji = Auth.captchaData.distractors[Math.floor(Math.random() * Auth.captchaData.distractors.length)];
      }

      const item = document.createElement('div');
      item.className = 'captcha-item';
      item.dataset.index = i;
      item.textContent = emoji;
      item.addEventListener('click', () => {
        item.classList.toggle('selected');
      });
      grid.appendChild(item);
    }
  },

  /**
   * 密碼眼睛圖示切換
   */
  togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fa-solid fa-eye';
    }
  },

  /**
   * 註冊頁頭貼預覽
   */
  previewRegAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    Auth.readFileAsBase64(file, (base64) => {
      Auth.regAvatarBase64 = base64;
      const preview = document.getElementById('regAvatarPreview');
      const placeholder = document.getElementById('avatarPlaceholder');
      if (preview && placeholder) {
        preview.src = base64;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
      }
    });
  },

  /**
   * 顯示表單錯誤/成功訊息
   */
  showFormMsg(elId, msg, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = `form-msg ${type}`;
    el.style.display = 'block';
  },

  /**
   * 震動輸入框（代表錯誤）
   */
  shakeInput(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight; // 強制重繪
    el.style.animation = 'shakeX 0.4s ease';
  },

  /**
   * 將檔案轉換為 Base64 字串
   */
  readFileAsBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsDataURL(file);
  },

  // ── 登入流程 ────────────────────────────────────────────────
  login() {
    const idEl = document.getElementById('loginId');
    const pwEl = document.getElementById('loginPw');
    if (!idEl || !pwEl) return;

    const id = idEl.value.trim();
    const pw = pwEl.value;

    if (!id || !pw) {
      Auth.showFormMsg('loginError', '請填寫 ID 與密碼', 'error');
      return;
    }

    const user = Storage.users.getById(id);

    if (!user) {
      Auth.showFormMsg('loginError', '找不到此帳號，請確認 ID 是否正確', 'error');
      Auth.shakeInput('loginId');
      return;
    }

    if (user.password !== pw) {
      Auth.showFormMsg('loginError', '密碼錯誤，請再試一次', 'error');
      Auth.shakeInput('loginPw');
      return;
    }

    // 密碼驗證通過：啟動 2FA 模擬流程
    // 產生 6 位數驗證碼
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分鐘後過期

    // 將驗證碼與使用者資訊暫存至 localStorage
    Storage.verificationCode.set({
      code,
      userId: user.id,
      expiresAt
    });

    UI.showToast('驗證碼已生成，準備進行 2FA 驗證！ 🔑', 'success');
    UI.showLoading('模擬寄送雙重驗證信中...');

    // 跳轉至驗證頁
    setTimeout(() => {
      UI.hideLoading();
      window.location.href = 'verify.html';
    }, 800);
  },

  // ── 註冊流程 ────────────────────────────────────────────────
  register() {
    const idEl = document.getElementById('regId');
    const nameEl = document.getElementById('regName');
    const pwEl = document.getElementById('regPw');
    const pw2El = document.getElementById('regPw2');

    if (!idEl || !nameEl || !pwEl || !pw2El) return;

    const id = idEl.value.trim();
    const name = nameEl.value.trim();
    const pw = pwEl.value;
    const pw2 = pw2El.value;

    // 清除舊有狀態
    const errEl = document.getElementById('registerError');
    const sucEl = document.getElementById('registerSuccess');
    if (errEl) errEl.style.display = 'none';
    if (sucEl) sucEl.style.display = 'none';

    // 欄位檢核
    if (!id || !name || !pw || !pw2) {
      Auth.showFormMsg('registerError', '請填寫所有必填欄位', 'error');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(id)) {
      Auth.showFormMsg('registerError', 'ID 只能包含英文、數字、底線，長度 3–20', 'error');
      Auth.shakeInput('regId');
      return;
    }
    if (pw.length < 6) {
      Auth.showFormMsg('registerError', '密碼至少需要 6 個字元', 'error');
      Auth.shakeInput('regPw');
      return;
    }
    if (pw !== pw2) {
      Auth.showFormMsg('registerError', '兩次輸入密碼不一致', 'error');
      Auth.shakeInput('regPw2');
      return;
    }
    if (Storage.users.getById(id)) {
      Auth.showFormMsg('registerError', '此 ID 已被使用，請換一個', 'error');
      Auth.shakeInput('regId');
      return;
    }

    // 建立新使用者
    const newUser = {
      id,
      name,
      password: pw,
      avatar: Auth.regAvatarBase64 || Storage._demoAvatar('🐾'),
      bio: '這個人很懶，什麼都沒有留下...',
      createdAt: Date.now(),
    };

    Storage.users.save(newUser);

    Auth.showFormMsg('registerSuccess', '🎉 註冊成功！即將跳轉到登入頁面...', 'success');
    Auth.regAvatarBase64 = '';
    UI.showLoading('建立帳戶中...');

    setTimeout(() => {
      UI.hideLoading();
      window.location.href = 'login.html?regId=' + encodeURIComponent(id);
    }, 1800);
  },

  // ── 2FA 驗證流程 ───────────────────────────────────────────
  verify() {
    const codeEl = document.getElementById('verifyCode');
    if (!codeEl) return;

    const inputCode = codeEl.value.trim();
    const verifyData = Storage.verificationCode.get();

    if (!verifyData) {
      UI.showToast('驗證資料不存在或已失效，請重新登入', 'error');
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
      return;
    }

    // 1. 優先檢查圖片驗證碼 (Captcha)
    const selectedEls = document.querySelectorAll('.captcha-item.selected');
    const selectedIndices = Array.from(selectedEls).map(el => parseInt(el.dataset.index)).sort((a, b) => a - b);
    const targetIndices = Auth.captchaTargetIndices || [];

    const isCaptchaCorrect = (selectedIndices.length === targetIndices.length) && 
                             selectedIndices.every((val, i) => val === targetIndices[i]);

    if (!isCaptchaCorrect) {
      Auth.showFormMsg('verifyError', '圖片驗證選取錯誤，請再試一次！', 'error');
      Auth.shakeInput('captchaContainer');
      Auth.generateCaptcha(); // 驗證失敗自動刷新驗證圖片
      return;
    }

    // 2. 檢查 6 位數密碼
    if (!inputCode) {
      Auth.showFormMsg('verifyError', '請輸入驗證碼', 'error');
      return;
    }

    // 檢查過期
    if (Date.now() > verifyData.expiresAt) {
      Auth.showFormMsg('verifyError', '驗證碼已過期，請點擊「重新發送」', 'error');
      Auth.shakeInput('verifyCode');
      return;
    }

    // 檢查是否相符
    if (verifyData.code !== inputCode) {
      Auth.showFormMsg('verifyError', '驗證碼錯誤，請再試一次', 'error');
      Auth.shakeInput('verifyCode');
      return;
    }

    // 驗證成功，正式寫入登入 session
    Storage.currentUser.set(verifyData.userId);
    Storage.verificationCode.clear();

    const user = Storage.users.getById(verifyData.userId);
    UI.showToast(`驗證成功！歡迎回來，${user.name}！ 🐾`, 'success');
    UI.showLoading('安全驗證成功，登入中...');

    // 顯示成功動畫後，跳轉首頁
    setTimeout(() => {
      UI.hideLoading();
      UI.showSuccessOverlay('🎉 驗證成功！', '即將進入 Pet Share 社群...', () => {
        window.location.href = 'index.html';
      });
    }, 500);
  },

  /**
   * 重新發送驗證碼
   */
  resendCode() {
    const verifyData = Storage.verificationCode.get();
    if (!verifyData) {
      UI.showToast('無法重新發送，請先進行登入', 'error');
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
      return;
    }

    // 產生新驗證碼
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    Storage.verificationCode.set({
      code: newCode,
      userId: verifyData.userId,
      expiresAt
    });

    // 清空舊的錯誤訊息與輸入框，並重置重新生成 Captcha
    const errEl = document.getElementById('verifyError');
    if (errEl) errEl.style.display = 'none';
    const codeEl = document.getElementById('verifyCode');
    if (codeEl) codeEl.value = '';
    Auth.generateCaptcha(); // 重新產生驗證圖片

    UI.showToast('已重新產生驗證碼！ 📨', 'success');
    UI.showLoading('重新寄送驗證碼...');

    // 更新測試輔支 UI 上的文字（若有該區塊）
    const devCodeEl = document.getElementById('devCode');
    if (devCodeEl) {
      devCodeEl.textContent = newCode;
    }

    setTimeout(() => {
      UI.hideLoading();
    }, 600);
  },

  // ── 登出流程 ────────────────────────────────────────────────
  logout() {
    Storage.currentUser.clear();
    UI.updateNavAuth();
    UI.showToast('已登出，掰掰！ 👋', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  }
};

// ─────────────────────────────────────────────────────────────
// 注入震動動畫（用於登入錯誤震動提示）
// ─────────────────────────────────────────────────────────────
(function injectShakeAnim() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shakeX {
      0%,100%{transform:translateX(0)}
      15%{transform:translateX(-8px)}
      30%{transform:translateX(8px)}
      45%{transform:translateX(-6px)}
      60%{transform:translateX(6px)}
      75%{transform:translateX(-3px)}
      90%{transform:translateX(3px)}
    }
  `;
  document.head.appendChild(style);
})();
