# merchant-shop - 移动商店系统模块

## 一、模块功能

中世纪暗黑奇幻风格的 Word Energy 移动商店系统。玩家在游戏中靠近商人 NPC 后点击交互按钮打开商城，使用 Word Energy 兑换道具，道具效果由主项目逻辑实现。

**核心功能：**

- **NPC 交互系统**：商人 NPC 在场景中处于待机状态，玩家靠近时显示交互按钮，点击后打开商城
- **Word Energy 兑换系统**：4 种商品，每种消耗不同数量的 Word Energy 进行兑换
- **图片驱动商城 UI**：以中世纪风格背景图为底图，透明覆盖层实现交互功能区域，商品区域使用精准坐标定位
- **商人立绘展示**：独立图层显示完整上半身，商城打开时淡入动画，购买成功时反馈动画
- **商品详情弹窗**：点击商品格子弹出详情（名称、效果、价格、兑换按钮），购买状态实时更新

**4 种商品：**

| 商品 | 效果 | 价格 |
|------|------|------|
| Push | 提供答题提示 | 5 Word Energy |
| Reveal | 显示答案线索 | 10 Word Energy |
| Time Freeze | 暂停答题时间 | 15 Word Energy |
| Revive | 失败后重新挑战 | 20 Word Energy |

---

## 二、文件结构

```
merchant-shop/
├── merchant-shop.html          # 入口页面（演示用，可独立运行）
├── README.md                   # 本文档
├── assets/
│   ├── merchant/
│   │   └── merchant.png        # 商人角色透明 PNG（上半身立绘）
│   └── shop/
│       ├── 2.png               # 商城背景图（1376×768，中世纪风格）
│       └── mobile_shop.png     # 场景中移动商店小车图片
├── css/
│   └── merchant-shop.css       # 商城全部样式
│       ├── 游戏场景基础样式
│       ├── NPC 交互按钮样式
│       ├── 商城面板 & 遮罩
│       ├── 商人立绘 & 动画
│       ├── 商品格子 & 悬停/拥有状态
│       ├── 资源数值覆盖层
│       ├── 商品详情弹窗
│       ├── 商人对话弹窗
│       └── Toast 提示 & 购买动画
└── js/
    ├── merchant-data.js        # 数据层
    │   ├── GAME_DATA.player          - 玩家初始数据
    │   ├── GAME_DATA.npc             - NPC 配置（图片、对话、交互距离）
    │   ├── GAME_DATA.mobileShop      - 移动商店图片配置
    │   ├── GAME_DATA.shopBackground  - 商城背景图配置
    │   ├── GAME_DATA.shopItems       - 商品列表（4 种商品）
    │   ├── GAME_DATA.itemIcons       - 商品 SVG 图标定义
    │   ├── GAME_DATA.NPC_STATE       - NPC 状态枚举
    │   └── GAME_DATA.scene           - 场景坐标配置
    ├── merchant-npc.js         # NPC 组件
    │   └── MerchantNPC 类 - 状态机、距离检测、交互触发
    ├── shop-panel.js           # 商城面板组件
    │   └── ShopPanel 类 - 图片驱动 UI、商品格子渲染、详情弹窗、动画
    └── shop-manager.js         # 商城总管理器
        └── ShopManager 类 - 协调 NPC/面板/玩家数据，购买逻辑
```

---

## 三、如何接入主项目

### 3.1 文件复制

将以下文件复制到主项目对应目录：

```
assets/merchant/merchant.png    → 主项目 assets/merchant/merchant.png
assets/shop/2.png               → 主项目 assets/shop/2.png
assets/shop/mobile_shop.png     → 主项目 assets/shop/mobile_shop.png
css/merchant-shop.css           → 主项目 css/merchant-shop.css
js/merchant-data.js             → 主项目 js/merchant-data.js
js/merchant-npc.js              → 主项目 js/merchant-npc.js
js/shop-panel.js                → 主项目 js/shop-panel.js
js/shop-manager.js              → 主项目 js/shop-manager.js
```

### 3.2 引入依赖

在主项目的 HTML 入口文件中添加：

```html
<!-- 商城样式 -->
<link rel="stylesheet" href="css/merchant-shop.css">

<!-- 商城脚本（按顺序加载） -->
<script src="js/merchant-data.js"></script>
<script src="js/merchant-npc.js"></script>
<script src="js/shop-panel.js"></script>
<script src="js/shop-manager.js"></script>
```

**依赖顺序说明：**
- `merchant-data.js` 必须最先加载（定义全局 `GAME_DATA` 对象）
- `merchant-npc.js` 和 `shop-panel.js` 无相互依赖，可并行
- `shop-manager.js` 必须最后加载（依赖 `MerchantNPC` 和 `ShopPanel`）

### 3.3 初始化 ShopManager

在主项目游戏初始化代码中，创建 `ShopManager` 实例：

```javascript
const shopManager = new ShopManager({
  npcContainer: document.getElementById('npc-container'),       // NPC 容器 DOM
  interactBtn: document.getElementById('interact-btn'),          // 交互按钮 DOM
  shopPanelContainer: document.getElementById('shop-panel-container'), // 商城面板容器 DOM
  getHeroPosition: () => ({ x: hero.x, y: hero.y }),            // 获取玩家坐标的回调
  npcConfig: GAME_DATA.npc,      // 可选：NPC 配置（默认使用 GAME_DATA.npc）
  sceneConfig: GAME_DATA.scene,  // 可选：场景配置（默认使用 GAME_DATA.scene）
});
```

### 3.4 接入游戏循环

在游戏主循环中调用 `update()`：

```javascript
function gameLoop() {
  // ... 主项目其他逻辑 ...
  shopManager.update(); // 每帧检测 NPC 交互距离
  requestAnimationFrame(gameLoop);
}
```

### 3.5 接入 Word Energy 系统

ShopManager 提供以下公共接口供主项目调用：

```javascript
// 获取当前能量
const energy = shopManager.getPlayerEnergy();

// 增加能量（玩家闯关后调用）
shopManager.addEnergy(amount);

// 获取已拥有道具列表
const owned = shopManager.getOwnedItems();
```

---

## 四、需要哪些资源

### 4.1 必备图片资源

| 文件 | 用途 | 尺寸 | 格式 |
|------|------|------|------|
| `assets/merchant/merchant.png` | 商人角色立绘 | 原始素材 | 透明 PNG |
| `assets/shop/2.png` | 商城背景图 | 1376×768 | PNG |
| `assets/shop/mobile_shop.png` | 场景中移动商店小车 | 原始素材 | 透明 PNG |

### 4.2 商品图标

商品图标使用内联 SVG（定义在 `merchant-data.js` 的 `GAME_DATA.itemIcons` 中），无需额外图片文件。

### 4.3 无外部依赖

本模块为纯原生 JavaScript，不依赖任何第三方库或框架。

---

## 五、需要修改哪些入口文件

### 5.1 主项目 HTML 文件

需要在主项目 HTML 中：

1. **添加商城容器 DOM**（3 个元素）：
```html
<div id="npc-container"></div>           <!-- NPC 容器 -->
<button id="interact-btn">交互</button>  <!-- 交互按钮 -->
<div id="shop-panel-container"></div>    <!-- 商城面板容器 -->
```

2. **引入 CSS 和 JS**（见 3.2 节）

3. **初始化 ShopManager**（见 3.3 节）

4. **在游戏循环中调用 `shopManager.update()`**（见 3.4 节）

### 5.2 主项目数据层

如果需要与主项目共享 Word Energy 数据，修改 `merchant-data.js` 中的 `GAME_DATA.player` 初始值，或在初始化后将 ShopManager 的 `playerEnergy` 与主项目数据同步。

### 5.3 场景坐标适配

如果主项目场景尺寸与当前配置不同，需要调整 `GAME_DATA.scene` 中的：
- `npcX` / `npcY`：NPC 在场景中的坐标
- `heroStartX` / `heroStartY`：玩家初始坐标
- `heroSpeed` / `heroSize`：玩家移动速度/尺寸
- `npcSize`：NPC 显示尺寸

---

## 六、技术架构说明

### 6.1 模块依赖关系

```
merchant-data.js (GAME_DATA)
       │
       ├──→ merchant-npc.js  (MerchantNPC)
       │         │
       │         └──→ 状态机：IDLE → PLAYER_NEAR → SHOP_OPEN
       │
       ├──→ shop-panel.js  (ShopPanel)
       │         │
       │         ├── 图片驱动 UI：<img> 底图 + 透明覆盖层
       │         ├── 商品格子：精准坐标定位（百分比）
       │         ├── 商人立绘：独立图层，淡入/购买反馈动画
       │         └── 详情弹窗 & 对话弹窗
       │
       └──→ shop-manager.js  (ShopManager)
                 │
                 ├── 协调 NPC + Panel
                 ├── 购买逻辑：能量检查 → 扣除 → 入库
                 └── 公共接口：getPlayerEnergy / addEnergy / getOwnedItems
```

### 6.2 商城 UI 坐标系统

商城面板使用"图片驱动 UI"模式：背景图为视觉底图，交互组件通过百分比坐标精准覆盖在对应位置。商品格子坐标基于背景图 `2.png`（1376×768）的像素亮度扫描结果。

### 6.3 不修改的内容

- 商城背景图（`2.png`）不修改
- 商人角色素材（`merchant.png`）不修改
- 商品 SVG 图标不修改
- 商品兑换逻辑不修改
- NPC 交互流程不修改