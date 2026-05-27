/**
 * storage.js — Pet Share 資料儲存模組
 * 使用 localStorage 模擬資料庫，提供統一的 CRUD 流程
 */

const Storage = {
  // ── Keys ──────────────────────────────────────────────────
  KEYS: {
    USERS:             'petshare_users',
    POSTS:             'petshare_posts',
    COMMENTS:          'petshare_comments',
    LIKES:             'petshare_likes',
    CURRENT_USER:      'petshare_currentUser',
    VERIFICATION_CODE: 'petshare_verificationCode',
  },

  // ── Generic helpers ────────────────────────────────────────
  /** 讀取 JSON 資料，失敗回傳預設值 */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  /** 寫入 JSON 資料 */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  // ── Users CRUD ─────────────────────────────────────────────
  users: {
    getAll() {
      return Storage.get(Storage.KEYS.USERS, {});
    },
    getById(id) {
      if (!id) return null;
      return Storage.users.getAll()[id] || null;
    },
    save(user) {
      const users = Storage.users.getAll();
      users[user.id] = user;
      return Storage.set(Storage.KEYS.USERS, users);
    },
    update(id, fields) {
      const users = Storage.users.getAll();
      if (!users[id]) return false;
      users[id] = { ...users[id], ...fields };
      return Storage.set(Storage.KEYS.USERS, users);
    },
    delete(id) {
      const users = Storage.users.getAll();
      if (!users[id]) return false;
      delete users[id];
      return Storage.set(Storage.KEYS.USERS, users);
    },
    count() {
      return Object.keys(Storage.users.getAll()).length;
    }
  },

  // ── Posts CRUD ─────────────────────────────────────────────
  posts: {
    getAll() {
      return Storage.get(Storage.KEYS.POSTS, []);
    },
    getById(id) {
      return Storage.posts.getAll().find(p => p.id === id) || null;
    },
    getByUser(userId) {
      return Storage.posts.getAll().filter(p => p.authorId === userId);
    },
    create(post) {
      const posts = Storage.posts.getAll();
      posts.unshift(post); // 最新貼文在最前
      return Storage.set(Storage.KEYS.POSTS, posts);
    },
    update(id, fields) {
      const posts = Storage.posts.getAll();
      const idx = posts.findIndex(p => p.id === id);
      if (idx === -1) return false;
      posts[idx] = { ...posts[idx], ...fields };
      return Storage.set(Storage.KEYS.POSTS, posts);
    },
    delete(postId, userId) {
      const posts = Storage.posts.getAll();
      const idx = posts.findIndex(p => p.id === postId && p.authorId === userId);
      if (idx === -1) return false;
      posts.splice(idx, 1);
      Storage.set(Storage.KEYS.POSTS, posts);

      // 同步刪除按讚與留言 (連帶刪除/Cascading delete)
      Storage.likes.deleteByPost(postId);
      Storage.comments.deleteByPost(postId);
      return true;
    },
    count() {
      return Storage.posts.getAll().length;
    }
  },

  // ── Comments CRUD ──────────────────────────────────────────
  comments: {
    getAll() {
      return Storage.get(Storage.KEYS.COMMENTS, {});
    },
    getByPostId(postId) {
      return Storage.comments.getAll()[postId] || [];
    },
    create(postId, comment) {
      const comments = Storage.comments.getAll();
      if (!comments[postId]) comments[postId] = [];
      comments[postId].push(comment);
      return Storage.set(Storage.KEYS.COMMENTS, comments);
    },
    update(postId, commentId, text) {
      const comments = Storage.comments.getAll();
      if (!comments[postId]) return false;
      const idx = comments[postId].findIndex(c => c.id === commentId);
      if (idx === -1) return false;
      comments[postId][idx].text = text;
      comments[postId][idx].updatedAt = Date.now();
      return Storage.set(Storage.KEYS.COMMENTS, comments);
    },
    delete(postId, commentId) {
      const comments = Storage.comments.getAll();
      if (!comments[postId]) return false;
      const idx = comments[postId].findIndex(c => c.id === commentId);
      if (idx === -1) return false;
      comments[postId].splice(idx, 1);
      return Storage.set(Storage.KEYS.COMMENTS, comments);
    },
    deleteByPost(postId) {
      const comments = Storage.comments.getAll();
      if (comments[postId]) {
        delete comments[postId];
        return Storage.set(Storage.KEYS.COMMENTS, comments);
      }
      return false;
    },
    count() {
      const comments = Storage.comments.getAll();
      return Object.values(comments).reduce((sum, arr) => sum + arr.length, 0);
    }
  },

  // ── Likes CRUD ─────────────────────────────────────────────
  likes: {
    getAll() {
      return Storage.get(Storage.KEYS.LIKES, {});
    },
    getPostLikes(postId) {
      return Storage.likes.getAll()[postId] || [];
    },
    hasLiked(postId, userId) {
      return Storage.likes.getPostLikes(postId).includes(userId);
    },
    toggle(postId, userId) {
      const likes = Storage.likes.getAll();
      if (!likes[postId]) likes[postId] = [];
      const idx = likes[postId].indexOf(userId);
      const isLiking = (idx === -1);

      if (isLiking) {
        likes[postId].push(userId); // 按讚
      } else {
        likes[postId].splice(idx, 1); // 取消讚
      }
      Storage.set(Storage.KEYS.LIKES, likes);
      return isLiking; // 回傳 true 代表按讚，false 代表取消讚
    },
    deleteByPost(postId) {
      const likes = Storage.likes.getAll();
      if (likes[postId]) {
        delete likes[postId];
        return Storage.set(Storage.KEYS.LIKES, likes);
      }
      return false;
    },
    count() {
      const likes = Storage.likes.getAll();
      return Object.values(likes).reduce((sum, arr) => sum + arr.length, 0);
    }
  },

  // ── Current User CRUD ──────────────────────────────────────
  currentUser: {
    get() {
      const userId = Storage.get(Storage.KEYS.CURRENT_USER, null);
      if (!userId) return null;
      return Storage.users.getById(userId);
    },
    set(userId) {
      return Storage.set(Storage.KEYS.CURRENT_USER, userId);
    },
    clear() {
      localStorage.removeItem(Storage.KEYS.CURRENT_USER);
    }
  },

  // ── Verification Code CRUD ─────────────────────────────────
  verificationCode: {
    get() {
      return Storage.get(Storage.KEYS.VERIFICATION_CODE, null);
    },
    set(data) {
      // data: { code: '123456', userId: 'mochi_mom', expiresAt: timestamp }
      return Storage.set(Storage.KEYS.VERIFICATION_CODE, data);
    },
    clear() {
      localStorage.removeItem(Storage.KEYS.VERIFICATION_CODE);
    }
  },

  // ── Seed Data ──────────────────────────────────────────────
  /** 初始化假資料 */
  seedIfEmpty() {
    if (Storage.posts.count() > 0) return; // 已有貼文就不重置

    // 假使用者
    const demo1 = {
      id: 'mochi_mom',
      name: '麻糬媽咪',
      password: 'demo123',
      avatar: Storage._demoAvatar('🐱'),
      bio: '家有三隻貓：麻糬、湯圓、紅豆 🐈',
      createdAt: Date.now() - 86400000 * 7,
    };
    const demo2 = {
      id: 'puppy_dad',
      name: '旺旺把拔',
      password: 'demo123',
      avatar: Storage._demoAvatar('🐶'),
      bio: '黃金獵犬 旺旺 的把拔，每天一起跑步！🐕',
      createdAt: Date.now() - 86400000 * 5,
    };
    const demo3 = {
      id: 'bunny_lover',
      name: '兔兔控',
      password: 'demo123',
      avatar: Storage._demoAvatar('🐰'),
      bio: '荷蘭侏儒兔 棉花糖 的奴隸 🐇',
      createdAt: Date.now() - 86400000 * 3,
    };
    [demo1, demo2, demo3].forEach(u => Storage.users.save(u));

    // 假貼文
    const seedPosts = [
      {
        id: 'post_seed_1',
        authorId: 'mochi_mom',
        title: '麻糬今天偷吃我的早餐😤',
        content: '每次煎蛋都要被他搶走一半！但看他那雙無辜大眼睛真的沒辦法罵他啊，誰叫他這麼可愛 🐱💕 今天還趁我不注意把培根叼走，真的是... 算了我愛他。',
        image: '',
        createdAt: Date.now() - 3600000 * 2,
      },
      {
        id: 'post_seed_2',
        authorId: 'puppy_dad',
        title: '旺旺第一次去海邊！🌊',
        content: '帶旺旺去墾丁玩，第一次看到海的他狂奔衝進海裡，整個濕透還覺得超開心！回程車上秒睡，現在正在沙發上打呼 😴 下次還要帶他去！',
        image: '',
        createdAt: Date.now() - 3600000 * 5,
      },
      {
        id: 'post_seed_3',
        authorId: 'bunny_lover',
        title: '棉花糖學會了翻滾！🐰',
        content: '訓練了兩個月的棉花糖今天終於學會翻滾指令啦！獎勵他一片木瓜，結果一邊吃一邊瞪我... 難道嫌太少嗎 哈哈哈，兔兔真的超有個性的！',
        image: '',
        createdAt: Date.now() - 3600000 * 8,
      },
      {
        id: 'post_seed_4',
        authorId: 'mochi_mom',
        title: '三貓大戰紙箱 📦',
        content: '買了一個新紙箱，三貓立刻開搶！麻糬直接霸佔、湯圓在旁邊虎視眈眈、紅豆在遠處裝作不在乎其實超想要 🤣 家裡最貴的玩具果然是紙箱！',
        image: '',
        createdAt: Date.now() - 86400000,
      },
    ];
    seedPosts.forEach(p => Storage.posts.create(p));

    // 假按讚
    Storage.likes.toggle('post_seed_1', 'puppy_dad');
    Storage.likes.toggle('post_seed_1', 'bunny_lover');
    Storage.likes.toggle('post_seed_2', 'mochi_mom');
    Storage.likes.toggle('post_seed_2', 'bunny_lover');
    Storage.likes.toggle('post_seed_3', 'mochi_mom');
    Storage.likes.toggle('post_seed_4', 'puppy_dad');

    // 假留言
    const ts = (ago) => Date.now() - ago;
    Storage.comments.create('post_seed_1', {
      id: 'cmt_1', authorId: 'puppy_dad',
      text: '哈哈哈旺旺也超愛搶我食物的！貓狗都一樣啦 🐶',
      createdAt: ts(1800000),
    });
    Storage.comments.create('post_seed_1', {
      id: 'cmt_2', authorId: 'bunny_lover',
      text: '麻糬好可愛！棉花糖就不搶東西，只搶我的注意力 XD',
      createdAt: ts(900000),
    });
    Storage.comments.create('post_seed_2', {
      id: 'cmt_3', authorId: 'mochi_mom',
      text: '旺旺太可愛了！下次帶貓咪也去玩好嗎 😄',
      createdAt: ts(3600000),
    });
  },

  /** 產生 SVG Data URI 作為預設頭貼 */
  _demoAvatar(emoji) {
    const colors = ['#e8c99a', '#f2a8b4', '#f9c9a8', '#d4a574', '#f4a862'];
    const bg = colors[Math.floor(Math.random() * colors.length)];
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
      <circle cx='40' cy='40' r='40' fill='${bg}'/>
      <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='36'>${emoji}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  },
};
