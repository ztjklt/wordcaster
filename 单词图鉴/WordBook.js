/**
 * 言灵词典 — WordBook Component
 * 独立组件，可嵌入任意游戏场景
 * 保留参考HTML的中世纪魔法书视觉风格
 *
 * 用法:
 *   const wordBook = new WordBook({
 *     container: document.getElementById('game-scene'),
 *     dataUrl: 'assets/WordBook/word_data.json',
 *     onOpen: function() { },
 *     onClose: function() { }
 *   });
 */

var WordBook = (function() {
  'use strict';

  var PER_PAGE = 15;
  var LS_KEY = 'wordbook_unlock_status';

  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - 游戏场景容器
   * @param {string} [options.dataUrl] - 单词数据JSON路径
   * @param {Function} [options.onOpen] - 打开回调
   * @param {Function} [options.onClose] - 关闭回调
   */
  function WordBook(options) {
    if (!options || !options.container) {
      throw new Error('WordBook: container is required');
    }

    this.container = options.container;
    this.dataUrl = options.dataUrl || 'assets/WordBook/word_data.json';
    this.onOpen = options.onOpen || null;
    this.onClose = options.onClose || null;

    // 内部状态
    this._data = null;           // 完整数据 { categories: [...] }
    this._categories = [];       // 类别列表
    this._curCatIdx = 0;        // 当前类别索引
    this._curPage = 0;          // 当前页码 (0-based)
    this._searchQuery = '';      // 搜索关键词
    this._isOpen = false;        // 是否打开
    this._unlockStatus = {};     // 解锁状态 { "categoryKey_wordIdx": { unlocked: bool, stars: number } }
    this._particles = [];        // 粒子状态
    this._animFrame = null;      // 粒子动画帧

    // DOM 元素引用 (延迟创建)
    this._el = {};
    this._built = false;

    // 加载解锁状态
    this._loadProgress();

    // 自动加载数据
    this._loadData();
  }

  // ══════════════════════════════════════
  //  数据加载
  // ══════════════════════════════════════

  WordBook.prototype._loadData = function() {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.dataUrl, true);
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          self._data = JSON.parse(xhr.responseText);
          self._categories = self._data.categories || [];
          self._applyUnlockStatus();
          if (self._built) {
            self._renderAll();
          }
        } catch (e) {
          console.error('WordBook: Failed to parse word data', e);
        }
      }
    };
    xhr.onerror = function() {
      console.error('WordBook: Failed to load word data from', self.dataUrl);
    };
    xhr.send();
  };

  // ══════════════════════════════════════
  //  解锁状态管理
  // ══════════════════════════════════════

  WordBook.prototype._loadProgress = function() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        this._unlockStatus = JSON.parse(raw);
      }
    } catch (e) {
      this._unlockStatus = {};
    }
  };

  WordBook.prototype._saveProgress = function() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this._unlockStatus));
    } catch (e) {}
  };

  WordBook.prototype._makeKey = function(catIdx, wordIdx) {
    return catIdx + '_' + wordIdx;
  };

  WordBook.prototype.isUnlocked = function(catIdx, wordIdx) {
    var key = this._makeKey(catIdx, wordIdx);
    return !!(this._unlockStatus[key] && this._unlockStatus[key].unlocked);
  };

  WordBook.prototype.getStars = function(catIdx, wordIdx) {
    var key = this._makeKey(catIdx, wordIdx);
    var entry = this._unlockStatus[key];
    return entry ? (entry.stars || 0) : 0;
  };

  WordBook.prototype.unlockWord = function(catIdx, wordIdx, stars) {
    var key = this._makeKey(catIdx, wordIdx);
    this._unlockStatus[key] = {
      unlocked: true,
      stars: stars || 1,
      date: Date.now()
    };
    this._saveProgress();
    if (this._built && this._isOpen) {
      this._renderAll();
    }
  };

  WordBook.prototype._applyUnlockStatus = function() {
    var self = this;
    if (!this._categories) return;
    for (var ci = 0; ci < this._categories.length; ci++) {
      var words = this._categories[ci].words;
      for (var wi = 0; wi < words.length; wi++) {
        if (this.isUnlocked(ci, wi)) {
          words[wi].unlocked = true;
        }
      }
    }
  };

  WordBook.prototype._catProgress = function(catIdx) {
    var cat = this._categories[catIdx];
    var words = cat.words;
    var unlocked = 0;
    for (var i = 0; i < words.length; i++) {
      if (this.isUnlocked(catIdx, i)) unlocked++;
    }
    return { unlocked: unlocked, total: words.length };
  };

  WordBook.prototype._totalProgress = function() {
    var unlocked = 0, total = 0;
    for (var ci = 0; ci < this._categories.length; ci++) {
      var p = this._catProgress(ci);
      unlocked += p.unlocked;
      total += p.total;
    }
    return { unlocked: unlocked, total: total };
  };

  // ══════════════════════════════════════
  //  DOM 构建
  // ══════════════════════════════════════

  WordBook.prototype.build = function() {
    if (this._built) return;

    var container = this.container;
    var html = '';

    // === 魔法书入口图标 (右上角) ===
    html += '<div class="wb-icon-wrap" id="wbIcon">';
    html +=   '<svg class="wb-icon-svg" viewBox="0 0 52 44">';
    html +=     '<defs><filter id="wbGlow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    html +=     '<rect x="4" y="2" width="44" height="40" rx="3" fill="#5a3820" stroke="#3a2010" stroke-width="2"/>';
    html +=     '<rect x="6" y="4" width="40" height="36" rx="2" fill="#4a2810"/>';
    html +=     '<polygon points="4,2 14,2 4,12" fill="#8a7a60"/>';
    html +=     '<polygon points="48,2 38,2 48,12" fill="#8a7a60"/>';
    html +=     '<polygon points="4,42 14,42 4,32" fill="#8a7a60"/>';
    html +=     '<polygon points="48,42 38,42 48,32" fill="#8a7a60"/>';
    html +=     '<rect x="22" y="2" width="8" height="40" fill="#3a2010" rx="1"/>';
    html +=     '<rect x="24" y="2" width="4" height="40" fill="#4a3020"/>';
    html +=     '<circle cx="26" cy="22" r="10" fill="none" stroke="#c9a050" stroke-width="1.5" opacity="0.8" filter="url(#wbGlow)"/>';
    html +=     '<text x="26" y="26" text-anchor="middle" font-size="12" fill="#c9a050" font-family="Georgia,serif" filter="url(#wbGlow)">言</text>';
    html +=     '<rect x="44" y="16" width="6" height="10" rx="1" fill="#8a7a60" stroke="#5a4a30" stroke-width="1"/>';
    html +=   '</svg>';
    html +=   '<span class="wb-icon-label">言灵词典</span>';
    html += '</div>';

    // === 全屏覆盖层 ===
    html += '<div class="wb-overlay" id="wbOverlay">';

    // 粒子画布
    html +=   '<canvas class="wb-particles" id="wbParticles"></canvas>';

    // 环境光球
    html +=   '<div class="wb-orb o1"></div>';
    html +=   '<div class="wb-orb o2"></div>';

    // 顶部标题
    html +=   '<div class="wb-top-title">✦ 召 唤 法 典 ✦</div>';

    // 关闭按钮
    html +=   '<div class="wb-close-btn" id="wbCloseBtn">✕</div>';

    // 书本舞台
    html +=   '<div class="wb-book-stage">';
    html +=     '<div class="wb-book" id="wbBook">';

    // 书本封面
    html +=       '<div class="wb-book-cover"></div>';
    html +=       '<div class="wb-book-spine-edge"></div>';

    // 书页容器
    html +=       '<div class="wb-book-pages">';

    // 左页 - 目录
    html +=         '<div class="wb-page-left">';
    html +=           '<div class="wb-player-bar">';
    html +=             '<div class="wb-player-header">';
    html +=               '<span class="wb-player-avatar">🧙‍♂️</span>';
    html +=               '<div>';
    html +=                 '<div class="wb-player-name">召唤师</div>';
    html +=                 '<div class="wb-player-sub">Summoner</div>';
    html +=               '</div>';
    html +=             '</div>';
    html +=             '<div class="wb-player-stats" id="wbPlayerStats"></div>';
    html +=           '</div>';
    html +=           '<div class="wb-toc-header">';
    html +=             '<div class="wb-toc-title">📜 目 录</div>';
    html +=             '<div class="wb-toc-sub">Table of Contents</div>';
    html +=           '</div>';
    html +=           '<div class="wb-cat-list" id="wbCatList"></div>';
    html +=         '</div>';

    // 书脊
    html +=         '<div class="wb-spine">';
    html +=           '<div class="wb-spine-dot"></div>';
    html +=           '<div class="wb-spine-dot"></div>';
    html +=           '<div class="wb-spine-dot"></div>';
    html +=           '<div class="wb-spine-dot"></div>';
    html +=           '<div class="wb-spine-dot"></div>';
    html +=         '</div>';

    // 右页 - 单词网格
    html +=         '<div class="wb-page-right">';
    html +=           '<div class="wb-right-header">';
    html +=             '<div class="wb-right-title" id="wbRightTitle"></div>';
    html +=             '<div class="wb-right-sub" id="wbRightSub"></div>';
    html +=           '</div>';
    html +=           '<div class="wb-search-wrap">';
    html +=             '<input type="text" class="wb-search-input" id="wbSearch" placeholder="🔍 搜索...">';
    html +=             '<span class="wb-word-count" id="wbWordCount"></span>';
    html +=           '</div>';
    html +=           '<div class="wb-word-grid" id="wbWordGrid"></div>';
    html +=           '<div class="wb-page-nav" id="wbPageNav">';
    html +=             '<button class="wb-page-btn" id="wbPrevBtn">◀</button>';
    html +=             '<span class="wb-page-indicator" id="wbPageIndicator">1/3</span>';
    html +=             '<button class="wb-page-btn" id="wbNextBtn">▶</button>';
    html +=           '</div>';
    html +=         '</div>';

    html +=       '</div>'; // book-pages
    html +=     '</div>'; // book
    html +=   '</div>'; // book-stage

    // 详情弹窗
    html +=   '<div class="wb-modal-overlay" id="wbModalOverlay">';
    html +=     '<div class="wb-modal" id="wbModal">';
    html +=       '<button class="wb-modal-close" id="wbModalClose">✕</button>';
    html +=       '<div id="wbModalContent"></div>';
    html +=     '</div>';
    html +=   '</div>';

    html += '</div>'; // overlay

    // 插入到容器
    var temp = document.createElement('div');
    temp.innerHTML = html;
    while (temp.firstChild) {
      container.appendChild(temp.firstChild);
    }

    // 缓存DOM引用
    this._el.icon = document.getElementById('wbIcon');
    this._el.overlay = document.getElementById('wbOverlay');
    this._el.particles = document.getElementById('wbParticles');
    this._el.closeBtn = document.getElementById('wbCloseBtn');
    this._el.book = document.getElementById('wbBook');
    this._el.catList = document.getElementById('wbCatList');
    this._el.playerStats = document.getElementById('wbPlayerStats');
    this._el.rightTitle = document.getElementById('wbRightTitle');
    this._el.rightSub = document.getElementById('wbRightSub');
    this._el.search = document.getElementById('wbSearch');
    this._el.wordCount = document.getElementById('wbWordCount');
    this._el.wordGrid = document.getElementById('wbWordGrid');
    this._el.pageNav = document.getElementById('wbPageNav');
    this._el.prevBtn = document.getElementById('wbPrevBtn');
    this._el.nextBtn = document.getElementById('wbNextBtn');
    this._el.pageIndicator = document.getElementById('wbPageIndicator');
    this._el.modalOverlay = document.getElementById('wbModalOverlay');
    this._el.modal = document.getElementById('wbModal');
    this._el.modalClose = document.getElementById('wbModalClose');
    this._el.modalContent = document.getElementById('wbModalContent');

    // 绑定事件
    this._bindEvents();

    this._built = true;

    // 如果数据已加载，立即渲染
    if (this._data) {
      this._renderAll();
    }
  };

  // ══════════════════════════════════════
  //  事件绑定
  // ══════════════════════════════════════

  WordBook.prototype._bindEvents = function() {
    var self = this;

    // 图标点击 → 打开
    this._el.icon.addEventListener('click', function(e) {
      e.stopPropagation();
      self.open();
    });

    // 关闭按钮
    this._el.closeBtn.addEventListener('click', function() {
      self.close();
    });

    // 点击覆盖层空白处关闭
    this._el.overlay.addEventListener('click', function(e) {
      if (e.target === self._el.overlay) {
        self.close();
      }
    });

    // 搜索
    this._el.search.addEventListener('input', function() {
      self._searchQuery = this.value.trim().toLowerCase();
      self._curPage = 0;
      self._renderWordGrid();
    });

    // 翻页
    this._el.prevBtn.addEventListener('click', function() {
      if (self._curPage > 0) {
        self._curPage--;
        self._renderWordGrid();
      }
    });
    this._el.nextBtn.addEventListener('click', function() {
      var words = self._getFilteredWords();
      var totalPages = Math.ceil(words.length / PER_PAGE);
      if (self._curPage < totalPages - 1) {
        self._curPage++;
        self._renderWordGrid();
      }
    });

    // 弹窗关闭
    this._el.modalClose.addEventListener('click', function() {
      self._closeModal();
    });
    this._el.modalOverlay.addEventListener('click', function(e) {
      if (e.target === self._el.modalOverlay) {
        self._closeModal();
      }
    });

    // 键盘快捷键
    document.addEventListener('keydown', function(e) {
      if (!self._isOpen) return;
      if (e.key === 'Escape') {
        self.close();
      } else if (e.key === 'ArrowLeft' && !e.target.closest('input')) {
        if (self._curPage > 0) {
          self._curPage--;
          self._renderWordGrid();
        }
      } else if (e.key === 'ArrowRight' && !e.target.closest('input')) {
        var words = self._getFilteredWords();
        var totalPages = Math.ceil(words.length / PER_PAGE);
        if (self._curPage < totalPages - 1) {
          self._curPage++;
          self._renderWordGrid();
        }
      }
    });
  };

  // ══════════════════════════════════════
  //  打开 / 关闭
  // ══════════════════════════════════════

  WordBook.prototype.open = function() {
    if (this._isOpen) return;
    if (!this._built) this.build();

    this._isOpen = true;
    this._el.overlay.classList.add('open');

    // 重置动画
    var book = this._el.book;
    book.style.animation = 'none';
    book.offsetHeight; // reflow
    book.style.animation = '';

    // 渲染
    this._renderAll();

    // 粒子动画
    this._startParticles();

    // 回调
    if (this.onOpen) this.onOpen();
  };

  WordBook.prototype.close = function() {
    if (!this._isOpen) return;

    this._isOpen = false;
    this._el.overlay.classList.remove('open');
    this._closeModal();
    this._stopParticles();
    this._searchQuery = '';
    if (this._el.search) this._el.search.value = '';

    if (this.onClose) this.onClose();
  };

  WordBook.prototype.toggle = function() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  };

  // ══════════════════════════════════════
  //  渲染
  // ══════════════════════════════════════

  WordBook.prototype._renderAll = function() {
    this._renderPlayerStats();
    this._renderCatList();
    this._renderWordGrid();
  };

  // 玩家状态栏
  WordBook.prototype._renderPlayerStats = function() {
    if (!this._el.playerStats) return;
    var prog = this._totalProgress();
    this._el.playerStats.innerHTML =
      '<div class="wb-stat-row">' +
        '<span class="wb-stat-icon">⚡</span>' +
        '<span class="wb-stat-label">能量</span>' +
        '<span class="wb-stat-value" style="color:#7c3aed">100</span>' +
        '<span style="font-size:.35rem;color:#8b6914">/100</span>' +
      '</div>' +
      '<div class="wb-stat-row">' +
        '<span class="wb-stat-icon">📖</span>' +
        '<span class="wb-stat-label">单词</span>' +
        '<span class="wb-stat-value" style="color:#c9a84c">' + prog.unlocked + '</span>' +
        '<span style="font-size:.35rem;color:#8b6914">/' + prog.total + '</span>' +
      '</div>' +
      '<div class="wb-stat-row">' +
        '<span class="wb-stat-icon">❤️</span>' +
        '<span class="wb-stat-label">生命</span>' +
        '<span class="wb-stat-value" style="color:#dc2626">20</span>' +
        '<span style="font-size:.35rem;color:#8b6914">基地</span>' +
      '</div>' +
      '<div class="wb-stat-row">' +
        '<span class="wb-stat-icon">⭐</span>' +
        '<span class="wb-stat-label">等级</span>' +
        '<span class="wb-stat-value" style="color:#e8c547">1</span>' +
      '</div>';
  };

  // 类别列表 (左页)
  WordBook.prototype._renderCatList = function() {
    if (!this._el.catList || !this._categories) return;

    var self = this;
    var html = '';
    for (var i = 0; i < this._categories.length; i++) {
      var cat = this._categories[i];
      var prog = this._catProgress(i);
      var pct = prog.total > 0 ? Math.round(prog.unlocked / prog.total * 100) : 0;
      var activeClass = (i === this._curCatIdx) ? ' active' : '';

      html += '<div class="wb-cat-item' + activeClass + '" data-cat="' + i + '">';
      html +=   '<span class="wb-cat-emoji">' + this._escHtml(cat.emoji) + '</span>';
      html +=   '<div class="wb-cat-info">';
      html +=     '<div class="wb-cat-name">' + this._escHtml(cat.title) + '</div>';
      html +=     '<div class="wb-cat-desc">' + this._escHtml(cat.sub || '') + '</div>';
      html +=     '<div class="wb-cat-prog"><div class="wb-cat-prog-bar" style="width:' + pct + '%"></div></div>';
      html +=   '</div>';
      html +=   '<span class="wb-cat-arrow">▶</span>';
      html += '</div>';
    }

    this._el.catList.innerHTML = html;

    // 绑定类别点击
    var items = this._el.catList.querySelectorAll('.wb-cat-item');
    for (var j = 0; j < items.length; j++) {
      (function(idx) {
        items[j].addEventListener('click', function() {
          self._curCatIdx = idx;
          self._curPage = 0;
          self._searchQuery = '';
          if (self._el.search) self._el.search.value = '';
          self._renderAll();
        });
      })(j);
    }
  };

  // 单词网格 (右页)
  WordBook.prototype._renderWordGrid = function() {
    if (!this._el.wordGrid || !this._categories) return;

    var self = this;
    var cat = this._categories[this._curCatIdx];
    if (!cat) return;

    // 更新右侧标题
    if (this._el.rightTitle) {
      this._el.rightTitle.textContent = cat.emoji + ' ' + cat.title;
    }
    if (this._el.rightSub) {
      this._el.rightSub.innerHTML = cat.sub + ' · <span>' + this._catProgress(this._curCatIdx).unlocked + ' / ' + cat.words.length + ' 已解锁</span>';
    }

    // 获取过滤后的单词
    var words = this._getFilteredWords();
    var startIdx = this._curPage * PER_PAGE;
    var endIdx = Math.min(startIdx + PER_PAGE, words.length);
    var pageWords = words.slice(startIdx, endIdx);

    // 更新计数
    if (this._el.wordCount) {
      this._el.wordCount.textContent = words.length + ' 个单词';
    }

    // 渲染单词卡片
    var html = '';
    for (var i = 0; i < pageWords.length; i++) {
      var w = pageWords[i];
      var wordIdx = w._idx;
      var unlocked = this.isUnlocked(this._curCatIdx, wordIdx);
      var stars = this.getStars(this._curCatIdx, wordIdx);
      var cardClass = 'wb-word-card';
      if (unlocked) {
        cardClass += ' unlocked';
        if (stars >= 3) cardClass += ' perfect';
      } else {
        cardClass += ' locked';
      }

      html += '<div class="' + cardClass + '" data-word="' + wordIdx + '">';
      if (!unlocked) {
        html += '<span class="wb-lock-icon">🔒</span>';
      } else if (stars >= 3) {
        html += '<span class="wb-lock-icon">⭐</span>';
      }
      html +=   '<span class="wb-word-emoji">' + this._escHtml(w.emoji) + '</span>';
      html +=   '<span class="wb-word-en">' + this._escHtml(w.en) + '</span>';
      html +=   '<span class="wb-word-zh">' + this._escHtml(w.zh) + '</span>';
      html +=   '<span class="wb-word-cost">⚡ ' + (w.cost || 0) + '</span>';
      html += '</div>';
    }

    this._el.wordGrid.innerHTML = html;

    // 绑定单词点击
    var cards = this._el.wordGrid.querySelectorAll('.wb-word-card');
    for (var j = 0; j < cards.length; j++) {
      (function(wordIdx) {
        cards[j].addEventListener('click', function(e) {
          e.stopPropagation();
          self._showWordDetail(wordIdx);
        });
      })(pageWords[j]._idx);
    }

    // 翻页控制
    var totalPages = Math.ceil(words.length / PER_PAGE);
    if (this._el.pageIndicator) {
      this._el.pageIndicator.textContent = (this._curPage + 1) + ' / ' + Math.max(totalPages, 1);
    }
    if (this._el.prevBtn) {
      this._el.prevBtn.disabled = this._curPage <= 0;
    }
    if (this._el.nextBtn) {
      this._el.nextBtn.disabled = this._curPage >= totalPages - 1;
    }
    if (this._el.pageNav) {
      this._el.pageNav.style.display = totalPages > 1 ? 'flex' : 'none';
    }
  };

  // 获取过滤后的单词 (带原始索引)
  WordBook.prototype._getFilteredWords = function() {
    if (!this._categories || !this._categories[this._curCatIdx]) return [];
    var words = this._categories[this._curCatIdx].words;
    var q = this._searchQuery;

    var result = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!q || w.en.toLowerCase().indexOf(q) !== -1 || w.zh.indexOf(q) !== -1) {
        result.push({ _idx: i, en: w.en, zh: w.zh, emoji: w.emoji, cost: w.cost, effect: w.effect, type: w.type });
      }
    }
    return result;
  };

  // ══════════════════════════════════════
  //  单词详情弹窗
  // ══════════════════════════════════════

  WordBook.prototype._showWordDetail = function(wordIdx) {
    var cat = this._categories[this._curCatIdx];
    if (!cat) return;
    var w = cat.words[wordIdx];
    if (!w) return;

    var unlocked = this.isUnlocked(this._curCatIdx, wordIdx);
    var stars = this.getStars(this._curCatIdx, wordIdx);

    var html = '';

    // 如果未解锁，显示问号
    if (!unlocked) {
      html += '<div class="wb-detail-emoji">🔒</div>';
      html += '<div class="wb-detail-en">???</div>';
      html += '<div class="wb-detail-zh">未解锁</div>';
      html += '<div class="wb-detail-status locked">完成单词挑战以解锁此条目</div>';
    } else {
      html += '<div class="wb-detail-emoji">' + this._escHtml(w.emoji) + '</div>';
      html += '<div class="wb-detail-en">' + this._escHtml(w.en) + '</div>';
      html += '<div class="wb-detail-zh">' + this._escHtml(w.zh) + '</div>';

      // 星级
      html += '<div style="text-align:center;font-size:1.2rem;letter-spacing:3px;margin:4px 0">';
      for (var s = 0; s < 3; s++) {
        html += s < stars ? '⭐' : '☆';
      }
      html += '</div>';

      // 标签
      html += '<div class="wb-detail-tags">';
      html +=   '<span class="wb-detail-tag type">' + this._escHtml(w.type || '') + '</span>';
      html +=   '<span class="wb-detail-tag cost">⚡ ' + (w.cost || 0) + '</span>';
      html += '</div>';

      // 效果说明
      html += '<div class="wb-detail-effect">' + this._escHtml(w.effect || '') + '</div>';

      html += '<div class="wb-detail-status unlocked">✅ 已解锁</div>';
    }

    this._el.modalContent.innerHTML = html;
    this._el.modalOverlay.classList.add('open');
  };

  WordBook.prototype._closeModal = function() {
    this._el.modalOverlay.classList.remove('open');
  };

  // ══════════════════════════════════════
  //  粒子动画
  // ══════════════════════════════════════

  WordBook.prototype._startParticles = function() {
    var self = this;
    var canvas = this._el.particles;
    if (!canvas) return;

    var rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    var ctx = canvas.getContext('2d');

    // 初始化粒子
    this._particles = [];
    for (var i = 0; i < 30; i++) {
      this._particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.2,
        alpha: Math.random() * 0.5 + 0.1,
        flicker: Math.random() * Math.PI * 2
      });
    }

    var animate = function() {
      if (!self._isOpen) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < self._particles.length; i++) {
        var p = self._particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.flicker += 0.02;

        // 边界回弹
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        var alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.flicker));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201, 168, 76, ' + alpha + ')';
        ctx.fill();
      }

      self._animFrame = requestAnimationFrame(animate);
    };

    this._animFrame = requestAnimationFrame(animate);
  };

  WordBook.prototype._stopParticles = function() {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
    this._particles = [];
  };

  // ══════════════════════════════════════
  //  工具方法
  // ══════════════════════════════════════

  WordBook.prototype._escHtml = function(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  };

  /**
   * 销毁组件
   */
  WordBook.prototype.destroy = function() {
    this.close();
    this._stopParticles();

    var ids = ['wbIcon', 'wbOverlay'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
    this._built = false;
    this._el = {};
  };

  return WordBook;
})();