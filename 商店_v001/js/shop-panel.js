/**
 * shop-panel.js
 * 图片驱动商城面板 - 背景图作为视觉底图，透明交互覆盖层 + 动态组件
 * 使用 <img> 标签作为底图，确保覆盖层精准对齐
 *
 * 参考图 2.png 布局（1376×768）：
 *   顶部 y=110-145：资源栏（Word Energy / Mastered Words / Level）
 *   左侧 x=0-600：商人角色区 + 左下角圆形头像框
 *   右侧 x=859-1243：石质面板 + 2×2 商品格子
 *     - 上行 y=230-350：左列 859-1003，右列 1098-1243
 *     - 下行 y=425-595：左列 859-1003，右列 1098-1243
 *
 * 坐标精算（基于像素亮度扫描）：
 *   列1 中心 62.4-72.9%  列2 中心 79.8-90.3%
 *   行1 中心 30.0-45.6%  行2 中心 55.3-77.5%
 *   商人头像圆心：x≈27.4%, y≈71.0%，直径≈18.5%
 */
class ShopPanel {
  constructor(container, npcConfig, shopData) {
    this.container = container;
    this.npcConfig = npcConfig;
    this.shopData = shopData;

    this._onBuyCallback = null;
    this._onCloseCallback = null;
    this._itemZones = [];
    this._activePopup = null;
    this._activeDialogue = null;

    this._build();
    this._bindKeyboard();
  }

  /**
   * 商品格子区域位置配置（相对于图片的百分比）
   * 2 列 × 2 行 = 4 个格子，精准覆盖背景图中的商品框架
   *
   * 基于 2.png (1376×768) 像素亮度扫描结果：
   *   列1 亮区：x=859-1003  → left=62.4%, width=10.5%
   *   列2 亮区：x=1098-1243 → left=79.8%, width=10.5%
   *   行1 亮区：y=230-350   → top=30.0%, height=15.6%
   *   行2 亮区：y=425-595   → top=55.3%, height=22.1%
   */
  static ITEM_ZONES = [
    { col: 0, row: 0, left: '62.4%', top: '30.0%', width: '10.5%', height: '15.6%' },
    { col: 1, row: 0, left: '79.8%', top: '30.0%', width: '10.5%', height: '15.6%' },
    { col: 0, row: 1, left: '62.4%', top: '55.3%', width: '10.5%', height: '22.1%' },
    { col: 1, row: 1, left: '79.8%', top: '55.3%', width: '10.5%', height: '22.1%' },
  ];

  // ==================== DOM 构建 ====================

  _build() {
    this.container.innerHTML = `
      <div class="shop-overlay" id="shop-overlay-bg">
        <div class="shop-panel" id="shop-panel-bg">

          <!-- 底图 - 2.png 中世纪暗黑奇幻RPG商城UI -->
          <img class="shop-bg-image" src="assets/shop/2.png?v=1" alt="商店" draggable="false">

          <!-- 交互覆盖层 -->
          <div class="shop-interactive-layer" id="shop-interactive-layer">

            <!-- 商人点击区域 -->
            <div class="merchant-zone" id="shop-merchant-zone" title="与商人对话"></div>

            <!-- 商人立绘 - 左下角NPC角色（独立图层，2D RPG立绘风格） -->
            <div class="merchant-portrait" id="shop-merchant-portrait">
              <img class="merchant-portrait-img" src="assets/merchant/merchant.png" alt="商人" draggable="false">
            </div>

            <!-- 资源数值覆盖层 -->
            <div class="resource-overlay res-energy" id="shop-energy-display">50</div>
            <div class="resource-overlay res-mastered" id="shop-words-display">12</div>

            <!-- 商品格子容器 -->
            <div id="shop-zones-container"></div>

            <!-- 关闭按钮覆盖层 -->
            <div class="close-zone" id="shop-close-zone" title="关闭商店"></div>

          </div>

        </div>
      </div>
    `;

    // 关闭按钮
    this.container.querySelector('#shop-close-zone').addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    // 点击遮罩关闭
    this.container.querySelector('#shop-overlay-bg').addEventListener('click', (e) => {
      if (e.target === this.container.querySelector('#shop-overlay-bg')) {
        this.hide();
      }
    });

    // 商人区域点击 → 对话
    this.container.querySelector('#shop-merchant-zone').addEventListener('click', (e) => {
      e.stopPropagation();
      this._closePopup();
      this._showMerchantDialogue();
    });

    // 点击覆盖层空白处关闭弹窗
    const layer = this.container.querySelector('#shop-interactive-layer');
    layer.addEventListener('click', (e) => {
      if (e.target === layer || e.target === this.container.querySelector('#shop-zones-container')) {
        this._closePopup();
        this._closeDialogue();
      }
    });

    this.container.style.display = 'none';
  }

  // ==================== 键盘绑定 ====================

  _bindKeyboard() {
    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        if (this._activeDialogue) {
          this._closeDialogue();
        } else if (this._activePopup) {
          this._closePopup();
        } else {
          this.hide();
        }
      }
    };
  }

  // ==================== 公共方法 ====================

  show(playerEnergy, ownedItems, playerStats) {
    document.addEventListener('keydown', this._keyHandler);
    this.container.style.display = 'flex';

    this._updateStats(playerEnergy, playerStats);
    this._renderItemZones(playerEnergy, ownedItems);

    // 重置面板动画
    const panel = this.container.querySelector('.shop-panel');
    if (panel) {
      panel.style.animation = 'none';
      void panel.offsetWidth;
      panel.style.animation = '';
    }

    // 重置商人头像动画
    const portrait = this.container.querySelector('#shop-merchant-portrait');
    if (portrait) {
      portrait.classList.remove('purchase-success');
      portrait.style.animation = 'none';
      void portrait.offsetWidth;
      portrait.style.animation = '';
    }
  }

  hide() {
    document.removeEventListener('keydown', this._keyHandler);
    this._closePopup();
    this._closeDialogue();
    this.container.style.display = 'none';
    if (this._onCloseCallback) {
      this._onCloseCallback();
    }
  }

  // ==================== 商人对话 ====================

  _showMerchantDialogue() {
    this._closeDialogue();

    const dialogue = document.createElement('div');
    dialogue.className = 'merchant-dialogue';

    dialogue.innerHTML = `
      <div class="dialogue-text">${this.npcConfig.greeting}</div>
      <div class="dialogue-actions">
        <button class="dialogue-btn dialogue-btn-close">关闭</button>
      </div>
    `;

    dialogue.querySelector('.dialogue-btn-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this._closeDialogue();
    });

    const layer = this.container.querySelector('#shop-interactive-layer');
    layer.appendChild(dialogue);
    this._activeDialogue = dialogue;

    setTimeout(() => {
      this._dialogueOutsideHandler = (e) => {
        if (this._activeDialogue && !this._activeDialogue.contains(e.target)) {
          this._closeDialogue();
        }
      };
      document.addEventListener('click', this._dialogueOutsideHandler);
    }, 0);
  }

  _closeDialogue() {
    if (this._activeDialogue) {
      this._activeDialogue.remove();
      this._activeDialogue = null;
    }
    if (this._dialogueOutsideHandler) {
      document.removeEventListener('click', this._dialogueOutsideHandler);
      this._dialogueOutsideHandler = null;
    }
  }

  // ==================== 商品格子渲染 ====================

  _renderItemZones(playerEnergy, ownedItems) {
    const zonesContainer = this.container.querySelector('#shop-zones-container');
    zonesContainer.innerHTML = '';
    this._itemZones = [];

    const count = Math.min(this.shopData.length, ShopPanel.ITEM_ZONES.length);

    for (let i = 0; i < count; i++) {
      const itemData = this.shopData[i];
      const zone = ShopPanel.ITEM_ZONES[i];
      const owned = ownedItems.includes(itemData.id);

      const zoneEl = document.createElement('div');
      zoneEl.className = 'item-zone';
      zoneEl.dataset.itemId = itemData.id;
      zoneEl.dataset.index = i;
      zoneEl.style.left = zone.left;
      zoneEl.style.top = zone.top;
      zoneEl.style.width = zone.width;
      zoneEl.style.height = zone.height;

      if (owned) {
        zoneEl.classList.add('owned');
      }

      // 商品图标 - 中世纪魔法风格 SVG
      const iconContainer = document.createElement('div');
      iconContainer.className = 'item-icon';
      // 从 GAME_DATA 获取 SVG 图标
      if (typeof GAME_DATA !== 'undefined' && GAME_DATA.itemIcons && GAME_DATA.itemIcons[itemData.icon]) {
        iconContainer.innerHTML = GAME_DATA.itemIcons[itemData.icon];
      }
      zoneEl.appendChild(iconContainer);

      // 商品名称
      const nameLabel = document.createElement('div');
      nameLabel.className = 'item-name';
      nameLabel.textContent = itemData.name;
      zoneEl.appendChild(nameLabel);

      // 效果描述
      const descLabel = document.createElement('div');
      descLabel.className = 'item-description';
      descLabel.textContent = itemData.description;
      zoneEl.appendChild(descLabel);

      // 价格标签
      const priceLabel = document.createElement('div');
      priceLabel.className = 'item-price';
      priceLabel.innerHTML = `${itemData.price} <span class="price-icon">◆</span>`;
      zoneEl.appendChild(priceLabel);

      zoneEl.title = owned
        ? `${itemData.name}（已拥有）`
        : `${itemData.name} - ${itemData.price} 能量`;

      // 点击商品格子 → 弹出详情
      zoneEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeDialogue();
        this._showItemPopup(itemData, playerEnergy, owned, zoneEl);
      });

      zonesContainer.appendChild(zoneEl);
      this._itemZones.push({ el: zoneEl, data: itemData });
    }
  }

  // ==================== 商品详情弹窗 ====================

  _showItemPopup(itemData, playerEnergy, owned, anchorEl) {
    this._closePopup();

    const canAfford = playerEnergy >= itemData.price;

    const popup = document.createElement('div');
    popup.className = 'item-detail-popup';

    // 定位在锚点元素右侧
    const anchorRect = anchorEl.getBoundingClientRect();
    const layerRect = this.container.querySelector('#shop-interactive-layer').getBoundingClientRect();
    const popupLeft = anchorRect.right - layerRect.left + 10;
    const popupTop = anchorRect.top - layerRect.top;

    const estimatedWidth = 180;
    let finalLeft = popupLeft;
    if (popupLeft + estimatedWidth > layerRect.width) {
      finalLeft = anchorRect.left - layerRect.left - estimatedWidth - 10;
    }

    popup.style.left = finalLeft + 'px';
    popup.style.top = popupTop + 'px';

    popup.innerHTML = `
      <div class="item-popup-label">名称</div>
      <div class="item-popup-name">${itemData.name}</div>
      <div class="item-popup-label">效果</div>
      <div class="item-popup-effect">${itemData.description}</div>
      <div class="item-popup-divider"></div>
      <div class="item-popup-price">
        <span class="popup-price-icon">◆</span> ${itemData.price} Word Energy
      </div>
      ${owned
        ? '<div class="item-popup-owned">已拥有</div>'
        : `<button class="item-popup-buy-btn ${!canAfford ? 'btn-disabled' : ''}"
            ${!canAfford ? 'disabled' : ''}>
            ${!canAfford ? '能量不足' : '兑换'}
          </button>`
      }
    `;

    if (!owned) {
      const buyBtn = popup.querySelector('.item-popup-buy-btn');
      if (buyBtn && canAfford) {
        buyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this._onBuyCallback) {
            this._onBuyCallback(itemData);
          }
          this._closePopup();
        });
      }
    }

    const layer = this.container.querySelector('#shop-interactive-layer');
    layer.appendChild(popup);
    this._activePopup = popup;

    setTimeout(() => {
      this._popupOutsideHandler = (e) => {
        if (this._activePopup && !this._activePopup.contains(e.target)) {
          this._closePopup();
        }
      };
      document.addEventListener('click', this._popupOutsideHandler);
    }, 0);
  }

  _closePopup() {
    if (this._activePopup) {
      this._activePopup.remove();
      this._activePopup = null;
    }
    if (this._popupOutsideHandler) {
      document.removeEventListener('click', this._popupOutsideHandler);
      this._popupOutsideHandler = null;
    }
  }

  // ==================== 资源更新 ====================

  _updateStats(playerEnergy, playerStats) {
    const energyEl = this.container.querySelector('#shop-energy-display');
    if (energyEl) {
      energyEl.textContent = playerEnergy;
    }

    if (playerStats) {
      const wordsEl = this.container.querySelector('#shop-words-display');
      if (wordsEl && playerStats.wordsMastered !== undefined) {
        wordsEl.textContent = playerStats.wordsMastered;
      }
    }
  }

  updateEnergyOnly(playerEnergy) {
    const energyEl = this.container.querySelector('#shop-energy-display');
    if (energyEl) {
      energyEl.classList.remove('energy-decrease');
      void energyEl.offsetWidth;
      energyEl.classList.add('energy-decrease');
      energyEl.textContent = playerEnergy;
    }
  }

  // ==================== 公共接口 ====================

  refreshItems(playerEnergy, ownedItems) {
    this._renderItemZones(playerEnergy, ownedItems);
  }

  showPurchaseSuccess(itemName) {
    this._showToast(`获得 ${itemName}`);
    // 购买成功 → 商人头像轻微变化
    this._animateMerchantPurchase();
  }

  showInsufficientEnergy() {
    this._showToast('能量不足', true);
  }

  _showToast(message, isWarning) {
    const oldToast = this.container.querySelector('.purchase-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'purchase-toast';
    if (isWarning) {
      toast.style.borderColor = '#aa4444';
      toast.style.color = '#000';
      toast.style.boxShadow = '0 0 24px rgba(170, 68, 68, 0.4)';
    }
    toast.textContent = message;
    const layer = this.container.querySelector('#shop-interactive-layer');
    layer.appendChild(toast);

    toast.addEventListener('animationend', () => toast.remove());
  }

  highlightItem(itemId) {
    const zone = this.container.querySelector(`.item-zone[data-item-id="${itemId}"]`);
    if (zone) {
      zone.classList.add('purchase-glow');
      zone.addEventListener('animationend', () => {
        zone.classList.remove('purchase-glow');
      }, { once: true });
    }
  }

  // ==================== 商人头像动画 ====================

  _animateMerchantPurchase() {
    const portrait = this.container.querySelector('#shop-merchant-portrait');
    if (!portrait) return;

    portrait.classList.add('purchase-success');
    // 动画结束后移除
    portrait.addEventListener('animationend', () => {
      portrait.classList.remove('purchase-success');
    }, { once: true });
  }

  // ==================== 事件回调 ====================

  onBuy(callback) {
    this._onBuyCallback = callback;
  }

  onClose(callback) {
    this._onCloseCallback = callback;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShopPanel;
}