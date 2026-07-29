/**
 * merchant-npc.js
 * MerchantNPC - 商店老板 NPC 组件
 * 管理 NPC 状态机、玩家靠近检测、交互触发
 */
class MerchantNPC {
  /**
   * @param {object} config - NPC 配置（来自 GAME_DATA.npc）
   * @param {object} sceneConfig - 场景配置（来自 GAME_DATA.scene）
   * @param {HTMLElement} container - NPC 容器 DOM 元素
   * @param {HTMLElement} interactBtn - 交互按钮 DOM 元素
   */
  constructor(config, sceneConfig, container, interactBtn) {
    this.config = config;
    this.sceneConfig = sceneConfig;
    this.container = container;
    this.interactBtn = interactBtn;

    // 状态
    this._state = GAME_DATA.NPC_STATE.IDLE;
    this._onInteractCallback = null;

    // 初始化 DOM
    this._initDOM();
    // 初始状态
    this._enterState(this._state);
  }

  // ==================== 公共属性 ====================

  get state() {
    return this._state;
  }

  get x() {
    return this.sceneConfig.npcX;
  }

  get y() {
    return this.sceneConfig.npcY;
  }

  // ==================== DOM 初始化 ====================

  _initDOM() {
    // NPC 图片
    this.imgEl = document.createElement('img');
    this.imgEl.src = this.config.image;
    this.imgEl.alt = 'NPC';
    this.imgEl.className = 'npc-sprite';
    this.imgEl.style.width = this.sceneConfig.npcSize + 'px';
    this.imgEl.style.height = 'auto';
    this.imgEl.style.position = 'absolute';
    this.imgEl.style.left = '0px';
    this.imgEl.style.bottom = '0px';
    this.imgEl.style.imageRendering = 'auto';
    this.container.appendChild(this.imgEl);

    // 交互按钮初始隐藏
    this.interactBtn.style.display = 'none';
  }

  // ==================== 状态机 ====================

  _enterState(newState) {
    this._state = newState;

    switch (newState) {
      case GAME_DATA.NPC_STATE.IDLE:
        this.container.classList.remove('npc-interactable');
        this.interactBtn.style.display = 'none';
        break;

      case GAME_DATA.NPC_STATE.PLAYER_NEAR:
        this.container.classList.add('npc-interactable');
        this.interactBtn.style.display = 'flex';
        break;

      case GAME_DATA.NPC_STATE.SHOP_OPEN:
        this.interactBtn.style.display = 'none';
        break;
    }
  }

  // ==================== 玩家检测 ====================

  /**
   * 检测玩家是否在交互范围内
   * @param {number} heroX - 玩家中心 X
   * @param {number} heroY - 玩家中心 Y
   * @returns {boolean} 是否在范围内
   */
  isPlayerInRange(heroX, heroY) {
    const npcCenterX = this.x;
    const npcCenterY = this.y;
    const dx = heroX - npcCenterX;
    const dy = heroY - npcCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.config.interactionRange;
  }

  /**
   * 每帧更新：检测玩家位置，切换状态
   * @param {number} heroX - 玩家中心 X
   * @param {number} heroY - 玩家中心 Y
   */
  update(heroX, heroY) {
    // 如果商店已打开，不检测
    if (this._state === GAME_DATA.NPC_STATE.SHOP_OPEN) {
      return;
    }

    const inRange = this.isPlayerInRange(heroX, heroY);

    if (inRange && this._state === GAME_DATA.NPC_STATE.IDLE) {
      this._enterState(GAME_DATA.NPC_STATE.PLAYER_NEAR);
    } else if (!inRange && this._state === GAME_DATA.NPC_STATE.PLAYER_NEAR) {
      this._enterState(GAME_DATA.NPC_STATE.IDLE);
    }
  }

  // ==================== 交互 ====================

  /**
   * 注册交互回调
   * @param {function} callback - 点击交互时触发
   */
  onInteract(callback) {
    this._onInteractCallback = callback;
    this.interactBtn.addEventListener('click', () => {
      if (this._state === GAME_DATA.NPC_STATE.PLAYER_NEAR) {
        this._enterState(GAME_DATA.NPC_STATE.SHOP_OPEN);
        if (this._onInteractCallback) {
          this._onInteractCallback();
        }
      }
    });
  }

  /**
   * 关闭商店后恢复 NPC 状态
   */
  onShopClose() {
    this._enterState(GAME_DATA.NPC_STATE.IDLE);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MerchantNPC;
}