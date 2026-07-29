/**
 * merchant-data.js
 * 移动商店系统 - 数据层
 * 所有游戏配置、商品数据、NPC信息集中管理
 */

const GAME_DATA = {
  // ==================== 玩家数据 ====================
  player: {
    wordEnergy: 50,        // 词汇能量（通过闯关获得）
    inventory: [],         // 已兑换的道具ID列表
    wordsMastered: 12,     // 已掌握单词总数（含初始词库）
    level: 3,              // 玩家等级
  },

  // ==================== NPC 配置 ====================
  npc: {
    name: '',
    title: '',
    image: 'assets/merchant/merchant.png',
    greeting: '欢迎！在知识的旅途上，或许你需要一些帮助...',
    purchaseSuccess: '明智的选择！',
    goodbye: '下次再见。',
    interactionRange: 120,  // 交互触发距离（像素）
  },

  // ==================== 移动商店配置 ====================
  mobileShop: {
    image: 'assets/shop/mobile_shop.png',
    displayWidth: 320,
    displayHeight: 200,
  },

  // ==================== 商城背景图 ====================
  shopBackground: {
    image: 'assets/shop/2.png',
    width: 1376,
    height: 768,
  },

  // ==================== 商品列表 ====================
  // 数据结构：{ id, name, description, price, effect, icon }
  // icon 为中世纪风格 SVG 图标（内联）
  // 后续可在此数组中增加更多商品
  shopItems: [
    {
      id: 'push',
      name: 'Push',
      description: '提供答题提示',
      price: 5,
      effect: 'hint',
      icon: 'push',
    },
    {
      id: 'reveal',
      name: 'Reveal',
      description: '显示答案线索',
      price: 10,
      effect: 'clue',
      icon: 'reveal',
    },
    {
      id: 'time_freeze',
      name: 'Time Freeze',
      description: '暂停答题时间',
      price: 15,
      effect: 'freeze',
      icon: 'freeze',
    },
    {
      id: 'revive',
      name: 'Revive',
      description: '失败后重新挑战',
      price: 20,
      effect: 'revive',
      icon: 'revive',
    },
  ],

  // ==================== 商品图标 SVG 定义 ====================
  // 中世纪魔法风格透明图标
  itemIcons: {
    // Push - 魔法提示/灯泡
    push: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow-push" cx="32" cy="28" r="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffe8a0" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#c9a050" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="24" fill="url(#glow-push)"/>
      <path d="M26 46 Q26 40 22 34 Q20 30 20 24 Q20 14 32 10 Q44 14 44 24 Q44 30 42 34 Q38 40 38 46 Z" fill="#e8d080" stroke="#8b6914" stroke-width="1.5"/>
      <path d="M28 50 Q32 54 36 50" fill="none" stroke="#8b6914" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="32" y1="16" x2="32" y2="22" stroke="#fff8e0" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="14" r="3" fill="#fff8e0" stroke="#c9a050" stroke-width="0.8"/>
      <line x1="24" y1="20" x2="28" y2="24" stroke="#fff8e0" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="40" y1="20" x2="36" y2="24" stroke="#fff8e0" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="5" fill="#ffe8a0" opacity="0.5"/>
    </svg>`,

    // Reveal - 魔法书/揭示
    reveal: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow-reveal" cx="32" cy="28" r="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#a0d8ff" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#5090c9" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="url(#glow-reveal)"/>
      <path d="M16 18 L32 22 L48 18 L48 44 L32 48 L16 44 Z" fill="#6b8e9a" stroke="#2a4a5a" stroke-width="1.5"/>
      <path d="M16 18 L32 22 L32 48 L16 44 Z" fill="#8aa8b8" opacity="0.6"/>
      <line x1="32" y1="22" x2="32" y2="48" stroke="#2a4a5a" stroke-width="1"/>
      <ellipse cx="32" cy="28" rx="8" ry="3" fill="none" stroke="#d0e8f0" stroke-width="1" opacity="0.6"/>
      <ellipse cx="32" cy="36" rx="8" ry="3" fill="none" stroke="#d0e8f0" stroke-width="1" opacity="0.4"/>
      <circle cx="32" cy="14" r="2" fill="#d0e8f0" opacity="0.6"/>
    </svg>`,

    // Time Freeze - 时钟/沙漏
    freeze: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow-freeze" cx="32" cy="32" r="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#a0e0ff" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#3080c0" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="24" fill="url(#glow-freeze)"/>
      <rect x="28" y="8" width="8" height="4" rx="1" fill="#8aa8c0" stroke="#4a6a8a" stroke-width="0.8"/>
      <rect x="28" y="52" width="8" height="4" rx="1" fill="#8aa8c0" stroke="#4a6a8a" stroke-width="0.8"/>
      <path d="M22 12 L28 22 Q32 20 36 22 L42 12 Z" fill="#c0d8e8" stroke="#4a6a8a" stroke-width="1.5"/>
      <path d="M22 52 L28 42 Q32 44 36 42 L42 52 Z" fill="#c0d8e8" stroke="#4a6a8a" stroke-width="1.5"/>
      <circle cx="32" cy="32" r="16" fill="none" stroke="#6a9ab8" stroke-width="2"/>
      <circle cx="32" cy="32" r="14" fill="#c0d8e8" opacity="0.3"/>
      <line x1="32" y1="32" x2="32" y2="22" stroke="#4a6a8a" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="32" y1="32" x2="38" y2="35" stroke="#4a6a8a" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="2" fill="#4a6a8a"/>
      <path d="M18 28 L22 30" stroke="#a0d0e8" stroke-width="1" opacity="0.5"/>
      <path d="M18 36 L22 34" stroke="#a0d0e8" stroke-width="1" opacity="0.5"/>
      <path d="M42 30 L46 28" stroke="#a0d0e8" stroke-width="1" opacity="0.5"/>
      <path d="M42 34 L46 36" stroke="#a0d0e8" stroke-width="1" opacity="0.5"/>
    </svg>`,

    // Revive - 生命水晶/复活
    revive: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow-revive" cx="32" cy="30" r="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffa0c0" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#c05080" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="url(#glow-revive)"/>
      <path d="M32 12 L36 22 L46 24 L38 34 L40 44 L32 38 L24 44 L26 34 L18 24 L28 22 Z" fill="#e898a8" stroke="#8a3858" stroke-width="1.2"/>
      <circle cx="32" cy="28" r="4" fill="#f8c8d8" opacity="0.5"/>
      <path d="M20 50 L26 44 L28 46 L22 52 Z" fill="#c0a0b0" opacity="0.4"/>
      <path d="M44 50 L38 44 L36 46 L42 52 Z" fill="#c0a0b0" opacity="0.4"/>
    </svg>`,
  },

  // ==================== NPC 状态枚举 ====================
  NPC_STATE: {
    IDLE: 'idle',
    PLAYER_NEAR: 'player_near',
    SHOP_OPEN: 'shop_open',
  },

  // ==================== 场景配置 ====================
  scene: {
    width: 1000,
    height: 600,
    npcX: 700,      // NPC X坐标
    npcY: 320,      // NPC Y坐标
    heroStartX: 100, // 英雄初始X坐标
    heroStartY: 400, // 英雄初始Y坐标
    heroSpeed: 8,    // 英雄移动速度
    heroSize: 40,    // 英雄尺寸
    npcSize: 128,    // NPC显示尺寸
  },
};

// 导出（兼容多种模块加载方式）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GAME_DATA;
}