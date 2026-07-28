import type { ArenaId } from '../arena/BattleContent';

export type CommandEffectType =
  | 'damage'
  | 'heal'
  | 'shield'
  | 'stun'
  | 'time'
  | 'platform'
  | 'teleport'
  | 'hint'
  | 'score'
  | 'projectile'
  | 'shockwave'
  | 'moving-platform'
  | 'mist'
  | 'regen'
  | 'path'
  | 'special';

export interface CommandBlockEffect {
  type: CommandEffectType;
  preset: string;
  value?: number;
  durationMs?: number;
  hits?: number;
}

export type CommandSoundProfile = 'metal' | 'mystic' | 'nature' | 'water' | 'electric' | 'food' | 'paper' | 'transit';

export interface CommandWordVisual {
  color: number;
  cast: string;
  soundProfile: CommandSoundProfile;
}

export interface CommandWordDefinition {
  id: string;
  arenaId: ArenaId;
  word: string;
  chinese: string;
  pronunciation: string;
  clueZh: string;
  emoji?: string;
  transparentAsset?: string;
  effectId: string;
  effect: CommandBlockEffect;
  effectLabel: string;
  visual: CommandWordVisual;
}

interface WordOptions {
  pronunciation: string;
  emoji: string;
  effect: CommandBlockEffect;
  effectLabel: string;
  color: number;
  sound: CommandSoundProfile;
}

const word = (
  arenaId: ArenaId,
  id: string,
  chinese: string,
  clueZh: string,
  options: WordOptions,
): CommandWordDefinition => ({
  id: `${arenaId}:${id}`,
  arenaId,
  word: id,
  chinese,
  pronunciation: options.pronunciation,
  clueZh,
  emoji: options.emoji,
  effectId: `${arenaId}.${id}`,
  effect: options.effect,
  effectLabel: options.effectLabel,
  visual: {
    color: options.color,
    cast: `${arenaId}.${id}.cast`,
    soundProfile: options.sound,
  },
});

const effect = (
  type: CommandEffectType,
  preset: string,
  value?: number,
  durationMs?: number,
  hits?: number,
): CommandBlockEffect => ({ type, preset, value, durationMs, hits });

export const COMMAND_BLOCK_WORDS: readonly CommandWordDefinition[] = [
  word('neon-shrine', 'sword', '剑', '战斗用的锋利武器', { pronunciation: '/sɔːrd/', emoji: '⚔️', effect: effect('damage', 'arc-slash', 34), effectLabel: '剑气横斩', color: 0x79f7e1, sound: 'metal' }),
  word('neon-shrine', 'shield', '盾牌', '用来抵挡攻击的装备', { pronunciation: '/ʃiːld/', emoji: '🛡️', effect: effect('shield', 'solid-guard', undefined, undefined, 2), effectLabel: '抵挡两次攻击', color: 0x73cfff, sound: 'metal' }),
  word('neon-shrine', 'bell', '铃铛', '摇响后会发出清脆声音', { pronunciation: '/bel/', emoji: '🔔', effect: effect('stun', 'bell-wave', undefined, 3200), effectLabel: '铃声震慑', color: 0xffd86b, sound: 'mystic' }),
  word('neon-shrine', 'gate', '鸟居', '穿过它可以到达另一边', { pronunciation: '/ɡeɪt/', emoji: '⛩️', effect: effect('teleport', 'torii-shift'), effectLabel: '鸟居换位', color: 0xc68cff, sound: 'mystic' }),
  word('neon-shrine', 'charm', '护符', '带来短暂守护的符纸', { pronunciation: '/tʃɑːrm/', emoji: '🧿', effect: effect('shield', 'charm-aegis', undefined, 6000, 3), effectLabel: '御守庇护', color: 0xff9cc7, sound: 'paper' }),
  word('neon-shrine', 'lantern', '灯笼', '夜里提供光亮的物件', { pronunciation: '/ˈlæntərn/', emoji: '🏮', effect: effect('hint', 'lantern-light', undefined, 4500), effectLabel: '照亮音标与释义', color: 0xff9d58, sound: 'mystic' }),
  word('neon-shrine', 'moon', '月亮', '夜空中明亮的天体', { pronunciation: '/muːn/', emoji: '🌙', effect: effect('projectile', 'moon-slow', 48, 10000), effectLabel: '月华减速飞弹', color: 0x9ebdff, sound: 'mystic' }),
  word('neon-shrine', 'fox', '狐狸', '神社传说中的灵巧动物', { pronunciation: '/fɒks/', emoji: '🦊', effect: effect('special', 'fox-decoy', undefined, 5200), effectLabel: '召唤诱敌狐影', color: 0xffb36b, sound: 'nature' }),
  word('neon-shrine', 'fan', '折扇', '挥动后可以掀起强风', { pronunciation: '/fæn/', emoji: '🪭', effect: effect('projectile', 'fan-reflect'), effectLabel: '反弹当前飞弹', color: 0x8effdc, sound: 'paper' }),
  word('neon-shrine', 'drum', '太鼓', '敲击后发出低沉鼓声', { pronunciation: '/drʌm/', emoji: '🥁', effect: effect('shockwave', 'drum-blast', 22, 2800), effectLabel: '太鼓冲击波', color: 0xff6f79, sound: 'metal' }),

  word('moon-bamboo', 'bamboo', '竹子', '竹林里高而中空的植物', { pronunciation: '/bæmˈbuː/', emoji: '🎋', effect: effect('platform', 'bamboo-lift', undefined, 8500), effectLabel: '升起垂直竹台', color: 0x82f1b6, sound: 'nature' }),
  word('moon-bamboo', 'leaf', '叶子', '植物进行光合作用的部分', { pronunciation: '/liːf/', emoji: '🍃', effect: effect('time', 'leaf-tailwind', 3500), effectLabel: '叶风延长时间', color: 0x9cf08d, sound: 'nature' }),
  word('moon-bamboo', 'umbrella', '雨伞', '下雨时撑在头顶', { pronunciation: '/ʌmˈbrelə/', emoji: '☂️', effect: effect('shield', 'rain-canopy', undefined, 8000, 2), effectLabel: '展开方向雨幕', color: 0x87bfff, sound: 'water' }),
  word('moon-bamboo', 'bridge', '桥', '帮助人跨过河流', { pronunciation: '/brɪdʒ/', emoji: '🌉', effect: effect('platform', 'wide-bridge', undefined, 10000), effectLabel: '搭起横向浮桥', color: 0xb2d8ff, sound: 'water' }),
  word('moon-bamboo', 'chair', '椅子', '坐下休息的家具', { pronunciation: '/tʃeər/', emoji: '🪑', effect: effect('moving-platform', 'following-chair', undefined, 7500), effectLabel: '召唤跟随踏板', color: 0xe0bd83, sound: 'nature' }),
  word('moon-bamboo', 'box', '箱子', '可以收纳东西的容器', { pronunciation: '/bɒks/', emoji: '📦', effect: effect('special', 'wild-box'), effectLabel: '触发随机战场事件', color: 0xd7a36c, sound: 'paper' }),
  word('moon-bamboo', 'rock', '岩石', '坚硬而沉重的石块', { pronunciation: '/rɒk/', emoji: '🪨', effect: effect('damage', 'falling-rock', 28), effectLabel: '落石冲击', color: 0xb7b9c3, sound: 'nature' }),
  word('moon-bamboo', 'frog', '青蛙', '喜欢雨水、擅长跳跃', { pronunciation: '/frɒɡ/', emoji: '🐸', effect: effect('heal', 'frog-hop', 24), effectLabel: '蛙跃治愈', color: 0x6eea83, sound: 'nature' }),
  word('moon-bamboo', 'firefly', '萤火虫', '夜间发出微光的小昆虫', { pronunciation: '/ˈfaɪərflaɪ/', emoji: '✨', effect: effect('hint', 'firefly-guide', 2500, 5200), effectLabel: '照亮未激活言灵', color: 0xeaff78, sound: 'nature' }),
  word('moon-bamboo', 'boat', '小船', '可以载人渡过水面', { pronunciation: '/boʊt/', emoji: '🚣', effect: effect('moving-platform', 'river-boat', undefined, 9000), effectLabel: '召唤横向渡船', color: 0x72ddeb, sound: 'water' }),

  word('cyber-market', 'bottle', '瓶子', '装水或饮料的容器', { pronunciation: '/ˈbɒtəl/', emoji: '🧴', effect: effect('damage', 'bottle-throw', 24), effectLabel: '投掷瓶击', color: 0x73e9ff, sound: 'electric' }),
  word('cyber-market', 'cabinet', '柜子', '带门的收纳家具', { pronunciation: '/ˈkæbɪnət/', emoji: '🗄️', effect: effect('special', 'supply-cabinet'), effectLabel: '开启补给柜', color: 0x9eaaff, sound: 'metal' }),
  word('cyber-market', 'box', '箱子', '装货物的方形容器', { pronunciation: '/bɒks/', emoji: '📦', effect: effect('special', 'market-mystery-box'), effectLabel: '开启霓虹盲盒', color: 0xff78d1, sound: 'paper' }),
  word('cyber-market', 'noodles', '面条', '夜市里热腾腾的食物', { pronunciation: '/ˈnuːdəlz/', emoji: '🍜', effect: effect('regen', 'noodle-regen', 6, 4800), effectLabel: '热食持续恢复', color: 0xffb05f, sound: 'food' }),
  word('cyber-market', 'coin', '硬币', '可以用来交换商品', { pronunciation: '/kɔɪn/', emoji: '🪙', effect: effect('score', 'coin-jackpot', 180), effectLabel: '霓虹金币加分', color: 0xffdb67, sound: 'metal' }),
  word('cyber-market', 'basket', '篮子', '带提手的装物容器', { pronunciation: '/ˈbɑːskɪt/', emoji: '🧺', effect: effect('projectile', 'basket-catch'), effectLabel: '捕获并转化飞弹', color: 0xd9ad73, sound: 'paper' }),
  word('cyber-market', 'lantern', '灯笼', '摊位上发光的装饰', { pronunciation: '/ˈlæntərn/', emoji: '🏮', effect: effect('hint', 'neon-lantern', undefined, 3600), effectLabel: '扫描剩余言灵', color: 0xff5fa3, sound: 'electric' }),
  word('cyber-market', 'fish', '鱼', '市场常见的水生动物', { pronunciation: '/fɪʃ/', emoji: '🐟', effect: effect('special', 'fish-slip', undefined, 3000), effectLabel: '让对手滑倒', color: 0x62d8ff, sound: 'water' }),
  word('cyber-market', 'sign', '招牌', '显示店铺信息的发光牌', { pronunciation: '/saɪn/', emoji: '🪧', effect: effect('damage', 'neon-chain', 30), effectLabel: '释放连锁电击', color: 0x78fff1, sound: 'electric' }),
  word('cyber-market', 'steam', '蒸汽', '热食周围升起的水汽', { pronunciation: '/stiːm/', emoji: '♨️', effect: effect('mist', 'steam-cloak', undefined, 5000), effectLabel: '进入蒸汽无敌', color: 0xd8f7ff, sound: 'water' }),

  word('sunrise-kitchen', 'cup', '杯子', '用来喝水的容器', { pronunciation: '/kʌp/', emoji: '☕', effect: effect('heal', 'cup-sip', 18), effectLabel: '立即饮水恢复', color: 0xffcf8f, sound: 'food' }),
  word('sunrise-kitchen', 'plate', '盘子', '盛放食物的餐具', { pronunciation: '/pleɪt/', emoji: '🍽️', effect: effect('special', 'plate-combo'), effectLabel: '提升连击得分', color: 0xd8edff, sound: 'food' }),
  word('sunrise-kitchen', 'spoon', '勺子', '舀取食物的小餐具', { pronunciation: '/spuːn/', emoji: '🥄', effect: effect('time', 'spoon-time', 3000), effectLabel: '舀回三秒时间', color: 0xdce6f2, sound: 'metal' }),
  word('sunrise-kitchen', 'pan', '平底锅', '煎炒食物的炊具', { pronunciation: '/pæn/', emoji: '🍳', effect: effect('damage', 'pan-smash', 30), effectLabel: '平底锅重击', color: 0xff9a61, sound: 'metal' }),
  word('sunrise-kitchen', 'kettle', '水壶', '烧开热水的器具', { pronunciation: '/ˈketəl/', emoji: '🫖', effect: effect('projectile', 'kettle-clear'), effectLabel: '蒸汽清除飞弹', color: 0xbfe8e8, sound: 'water' }),
  word('sunrise-kitchen', 'fridge', '冰箱', '让食物保持低温', { pronunciation: '/frɪdʒ/', emoji: '🧊', effect: effect('stun', 'fridge-freeze', undefined, 4000), effectLabel: '冰冻对手', color: 0x8bdcff, sound: 'electric' }),
  word('sunrise-kitchen', 'apple', '苹果', '红色或绿色的常见水果', { pronunciation: '/ˈæpəl/', emoji: '🍎', effect: effect('regen', 'apple-vitality', 5, 5000), effectLabel: '活力持续恢复', color: 0xff6675, sound: 'food' }),
  word('sunrise-kitchen', 'table', '桌子', '摆放餐具和食物的家具', { pronunciation: '/ˈteɪbəl/', emoji: '🍽️', effect: effect('platform', 'dining-table', undefined, 9000), effectLabel: '升起宽餐桌', color: 0xd5a36d, sound: 'nature' }),
  word('sunrise-kitchen', 'knife', '餐刀', '切开食材的锋利工具', { pronunciation: '/naɪf/', emoji: '🔪', effect: effect('damage', 'knife-flurry', 36), effectLabel: '连续刀光斩击', color: 0xf0f5ff, sound: 'metal' }),
  word('sunrise-kitchen', 'cake', '蛋糕', '庆祝时分享的甜点', { pronunciation: '/keɪk/', emoji: '🍰', effect: effect('regen', 'cake-combo-guard', 4, 6000), effectLabel: '恢复并守护连击', color: 0xff9ed5, sound: 'food' }),

  word('cozy-study', 'book', '书', '由很多页面组成的读物', { pronunciation: '/bʊk/', emoji: '📖', effect: effect('hint', 'book-lesson', undefined, 6500), effectLabel: '展开音标与中文', color: 0xf5d58a, sound: 'paper' }),
  word('cozy-study', 'lamp', '台灯', '书桌上提供光线', { pronunciation: '/læmp/', emoji: '💡', effect: effect('hint', 'study-lamp', 1800, 4200), effectLabel: '聚光并延长时间', color: 0xffe576, sound: 'electric' }),
  word('cozy-study', 'computer', '电脑', '用来学习和工作的电子设备', { pronunciation: '/kəmˈpjuːtər/', emoji: '💻', effect: effect('stun', 'computer-lock', undefined, 3500), effectLabel: '锁定对手系统', color: 0x78b7ff, sound: 'electric' }),
  word('cozy-study', 'phone', '手机', '可以通信的便携设备', { pronunciation: '/foʊn/', emoji: '📱', effect: effect('time', 'phone-pause', 4000), effectLabel: '暂停并补回时间', color: 0x9d8cff, sound: 'electric' }),
  word('cozy-study', 'clock', '时钟', '显示当前时间', { pronunciation: '/klɒk/', emoji: '🕰️', effect: effect('time', 'clock-rewind', 5000), effectLabel: '时间回拨五秒', color: 0xe3b978, sound: 'metal' }),
  word('cozy-study', 'window', '窗户', '让光和空气进入房间', { pronunciation: '/ˈwɪndoʊ/', emoji: '🪟', effect: effect('shield', 'window-light', undefined, 5500, 1), effectLabel: '窗光抵挡攻击', color: 0xb8e6ff, sound: 'mystic' }),
  word('cozy-study', 'desk', '书桌', '学习时使用的桌子', { pronunciation: '/desk/', emoji: '🗃️', effect: effect('platform', 'stable-desk', undefined, 10000), effectLabel: '生成稳定书桌', color: 0xb98d62, sound: 'nature' }),
  word('cozy-study', 'chair', '椅子', '坐着阅读的家具', { pronunciation: '/tʃeər/', emoji: '🪑', effect: effect('moving-platform', 'rolling-chair', undefined, 8000), effectLabel: '召唤可移动座椅', color: 0xc39b70, sound: 'nature' }),
  word('cozy-study', 'pencil', '铅笔', '书写和绘画的工具', { pronunciation: '/ˈpensəl/', emoji: '✏️', effect: effect('path', 'pencil-line', undefined, 8500), effectLabel: '画出临时通路', color: 0xffd55f, sound: 'paper' }),
  word('cozy-study', 'globe', '地球仪', '展示世界地理的球体', { pronunciation: '/ɡloʊb/', emoji: '🌍', effect: effect('projectile', 'globe-orbit'), effectLabel: '扭转飞弹轨迹', color: 0x64d9c5, sound: 'mystic' }),

  word('metro-commute', 'ticket', '车票', '乘车前需要准备的凭证', { pronunciation: '/ˈtɪkɪt/', emoji: '🎫', effect: effect('time', 'ticket-extension', 3000), effectLabel: '延长候车时间', color: 0xffcc7e, sound: 'paper' }),
  word('metro-commute', 'train', '列车', '沿轨道行驶的交通工具', { pronunciation: '/treɪn/', emoji: '🚆', effect: effect('damage', 'train-rush', 36), effectLabel: '列车横穿冲击', color: 0x6fe5ff, sound: 'transit' }),
  word('metro-commute', 'door', '车门', '上下车时打开的入口', { pronunciation: '/dɔːr/', emoji: '🚪', effect: effect('teleport', 'carriage-door'), effectLabel: '车门瞬间换位', color: 0xb9c6ff, sound: 'transit' }),
  word('metro-commute', 'seat', '座位', '车厢里可以坐下的位置', { pronunciation: '/siːt/', emoji: '💺', effect: effect('moving-platform', 'metro-seat', undefined, 8500), effectLabel: '生成滑行座位', color: 0x748cff, sound: 'transit' }),
  word('metro-commute', 'bag', '背包', '随身携带物品的袋子', { pronunciation: '/bæɡ/', emoji: '🎒', effect: effect('shield', 'bag-storage', undefined, 9000, 2), effectLabel: '储存两次护盾', color: 0xf09b64, sound: 'paper' }),
  word('metro-commute', 'map', '地图', '显示线路和方向', { pronunciation: '/mæp/', emoji: '🗺️', effect: effect('path', 'safe-route', undefined, 6500), effectLabel: '标出安全路线', color: 0x86eece, sound: 'paper' }),
  word('metro-commute', 'umbrella', '雨伞', '雨天通勤会携带的物品', { pronunciation: '/ʌmˈbrelə/', emoji: '☂️', effect: effect('shield', 'commute-canopy', undefined, 7500, 2), effectLabel: '撑起通勤雨幕', color: 0x8ab8ff, sound: 'water' }),
  word('metro-commute', 'phone', '手机', '查看到站信息的设备', { pronunciation: '/foʊn/', emoji: '📱', effect: effect('time', 'arrival-app', 4200), effectLabel: '刷新到站时间', color: 0xa788ff, sound: 'electric' }),
  word('metro-commute', 'signal', '信号灯', '控制列车通行的灯光', { pronunciation: '/ˈsɪɡnəl/', emoji: '🚦', effect: effect('projectile', 'signal-freeze', undefined, 3500), effectLabel: '冻结空中飞弹', color: 0x70ff99, sound: 'transit' }),
  word('metro-commute', 'stairs', '楼梯', '连接不同高度的台阶', { pronunciation: '/steərz/', emoji: '🪜', effect: effect('path', 'station-stairs', undefined, 9000), effectLabel: '升起通勤阶梯', color: 0xe4c28a, sound: 'transit' }),
] as const;

export function getCommandWords(arenaId: ArenaId): readonly CommandWordDefinition[] {
  return COMMAND_BLOCK_WORDS.filter((entry) => entry.arenaId === arenaId);
}

export function getCommandWord(arenaId: ArenaId, id: string): CommandWordDefinition | undefined {
  return getCommandWords(arenaId).find((entry) => entry.id === id || entry.word === id);
}
