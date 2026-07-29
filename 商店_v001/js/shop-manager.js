/**
 * shop-manager.js
 * ShopManager - 商店系统总管理器
 * 协调 NPC、商城面板、玩家数据之间的交互
 */
class ShopManager {
  /**
   * @param {object} options
   * @param {HTMLElement} options.npcContainer - NPC 容器
   * @param {HTMLElement} options.interactBtn - 交互按钮
   * @param {HTMLElement} options.shopPanelContainer - 商城面板容器
   * @param {function} options.getHeroPosition - 获取英雄位置的回调 () => {x, y}
   * @param {object} [options.npcConfig] - 可选：自定义 NPC 配置
   * @param {object} [options.sceneConfig] - 可选：自定义场景配置
   */
  constructor(options) {
    this.npcContainer = options.npcContainer;
    this.interactBtn = options.interactBtn;
    this.shopPanelContainer = options.shopPanelContainer;
    this.getHeroPosition = options.getHeroPosition;

    const npcConfig = options.npcConfig || GAME_DATA.npc;
    const sceneConfig = options.sceneConfig || GAME_DATA.scene;

    // 玩家数据
    this.playerEnergy = GAME_DATA.player.wordEnergy;
    this.ownedItems = [...GAME_DATA.player.inventory];
    this.wordsMastered = GAME_DATA.player.wordsMastered;
    this.level = GAME_DATA.player.level;

    // 初始化 NPC
    this.npc = new MerchantNPC(
      npcConfig,
      sceneConfig,
      this.npcContainer,
      this.interactBtn
    );

    // 初始化商城面板
    this.shopPanel = new ShopPanel(
      this.shopPanelContainer,
      GAME_DATA.npc,
      GAME_DATA.shopItems
    );

    // 绑定事件
    this._bindEvents();
  }

  // ==================== 事件绑定 ====================

  _bindEvents() {
    // NPC 交互 → 打开商城
    this.npc.onInteract(() => {
      this._openShop();
    });

    // 商城面板 → 购买
    this.shopPanel.onBuy((itemData) => {
      this._handlePurchase(itemData);
    });

    // 商城面板 → 关闭
    this.shopPanel.onClose(() => {
      this._closeShop();
    });
  }

  // ==================== 商店逻辑 ====================

  _openShop() {
    const playerStats = {
      wordsMastered: this.wordsMastered,
      level: this.level,
    };
    this.shopPanel.show(this.playerEnergy, this.ownedItems, playerStats);
  }

  _closeShop() {
    this.npc.onShopClose();
  }

  _handlePurchase(itemData) {
    // 检查是否已拥有
    if (this.ownedItems.includes(itemData.id)) {
      return;
    }

    // 检查能量是否足够
    if (this.playerEnergy < itemData.price) {
      this.shopPanel.showInsufficientEnergy();
      return;
    }

    // 执行购买：消耗能量
    this.playerEnergy -= itemData.price;

    // 单词加入词库
    this.ownedItems.push(itemData.id);
    this.wordsMastered += 1;

    // 更新面板 - 先刷新商品列表
    this.shopPanel.refreshItems(this.playerEnergy, this.ownedItems);

    // 播放能量减少动画
    this.shopPanel.updateEnergyOnly(this.playerEnergy);

    // 显示购买成功
    this.shopPanel.showPurchaseSuccess(itemData.name);

    // 高亮购买的商品格子
    this.shopPanel.highlightItem(itemData.id);

    // 触发购买成功事件（供外部监听）
    this._onPurchaseSuccess(itemData);
  }

  /**
   * 购买成功后的处理（可扩展）
   */
  _onPurchaseSuccess(itemData) {
    // 购买成功后的处理（可扩展）
    // 预留接口：可在此处触发外部事件通知
  }

  // ==================== 公共方法 ====================

  /**
   * 每帧更新
   */
  update() {
    const pos = this.getHeroPosition();
    this.npc.update(pos.x, pos.y);
  }

  /**
   * 获取玩家词汇能量
   */
  getPlayerEnergy() {
    return this.playerEnergy;
  }

  /**
   * 增加玩家词汇能量
   */
  addEnergy(amount) {
    this.playerEnergy += amount;
  }

  /**
   * 获取已拥有的道具列表
   */
  getOwnedItems() {
    return [...this.ownedItems];
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShopManager;
}