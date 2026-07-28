import type { GameplayIntent } from '../../language/GameplayCommand';

export type ArenaId =
  | 'neon-shrine'
  | 'moon-bamboo'
  | 'cyber-market'
  | 'sunrise-kitchen'
  | 'cozy-study'
  | 'metro-commute';

export interface LessonWord {
  id: string;
  english: string;
  chinese: string;
  pronunciation: string;
  gameEffect: string;
  intent: GameplayIntent;
  itemId?: string;
}

export interface LessonPattern {
  template: string;
  chinese: string;
  example: string;
  effect: string;
}

export interface BattleLesson {
  id: string;
  arenaId: ArenaId;
  words: LessonWord[];
  patterns: LessonPattern[];
}

export interface ArenaDefinition {
  id: ArenaId;
  name: string;
  subtitle: string;
  textureKey: string;
  asset: string;
  platformTextureKey: string;
  platformAsset: string;
  accent: number;
  accentCss: string;
  platform: number;
  atmosphere: 'petals' | 'rain' | 'steam' | 'motes' | 'sparks';
  lesson: BattleLesson;
}

export const ARENAS: readonly ArenaDefinition[] = [
  {
    id: 'neon-shrine',
    name: '霓虹神社',
    subtitle: '灯火回应你的言灵',
    textureKey: 'arena-neon-shrine',
    asset: '/assets/arenas/neon-shrine.webp',
    platformTextureKey: 'platform-neon-shrine',
    platformAsset: '/assets/arena-textures/platform-shrine-v2.webp',
    accent: 0xff70b8,
    accentCss: '#ff70b8',
    platform: 0x27182f,
    atmosphere: 'petals',
    lesson: {
      id: 'lesson-shrine',
      arenaId: 'neon-shrine',
      words: [
        { id: 'shield', english: 'shield', chinese: '盾牌', pronunciation: '/ʃiːld/', gameEffect: '召唤护盾', intent: 'SUMMON_EQUIPMENT', itemId: 'shield' },
        { id: 'sword', english: 'sword', chinese: '剑', pronunciation: '/sɔːrd/', gameEffect: '召唤长剑', intent: 'SUMMON_EQUIPMENT', itemId: 'sword' },
        { id: 'lantern', english: 'lantern', chinese: '灯笼', pronunciation: '/ˈlæntərn/', gameEffect: '点亮神社灯笼', intent: 'USE_OBJECT', itemId: 'lantern' },
        { id: 'bell', english: 'bell', chinese: '铃铛', pronunciation: '/bel/', gameEffect: '敲响驱散铃', intent: 'USE_OBJECT', itemId: 'bell' },
        { id: 'gate', english: 'gate', chinese: '大门', pronunciation: '/ɡeɪt/', gameEffect: '打开鸟居结界', intent: 'OPEN_OBJECT', itemId: 'gate' },
        { id: 'charm', english: 'charm', chinese: '护符', pronunciation: '/tʃɑːrm/', gameEffect: '激活守护护符', intent: 'USE_OBJECT', itemId: 'charm' },
        { id: 'light', english: 'light', chinese: '灯光', pronunciation: '/laɪt/', gameEffect: '熄灭场景灯', intent: 'TURN_LIGHT_OFF', itemId: 'light' },
        { id: 'help', english: 'help', chinese: '帮助', pronunciation: '/help/', gameEffect: '触发支援', intent: 'CAST_SKILL', itemId: 'help' },
      ],
      patterns: [
        { template: 'I need a {item}.', chinese: '我需要一个……', example: 'I need a shield.', effect: '召唤装备' },
        { template: 'Bring me a {item}.', chinese: '把……带给我。', example: 'Bring me a sword.', effect: '召唤武器' },
        { template: 'Use the {object}.', chinese: '使用这个……', example: 'Use the lantern.', effect: '点亮灯笼' },
        { template: 'Ring the {object}.', chinese: '敲响这个……', example: 'Ring the bell.', effect: '释放铃声' },
        { template: 'Open the {object}.', chinese: '打开这个……', example: 'Open the gate.', effect: '开启结界' },
        { template: 'Please help me.', chinese: '请帮助我。', example: 'Please help me.', effect: '触发支援' },
      ],
    },
  },
  {
    id: 'moon-bamboo',
    name: '月雨竹林',
    subtitle: '在雨声中守住呼吸',
    textureKey: 'arena-moon-bamboo',
    asset: '/assets/arenas/moon-bamboo.webp',
    platformTextureKey: 'platform-moon-bamboo',
    platformAsset: '/assets/arena-textures/platform-bamboo-v2.webp',
    accent: 0x63f0d4,
    accentCss: '#63f0d4',
    platform: 0x102b31,
    atmosphere: 'rain',
    lesson: {
      id: 'lesson-bamboo',
      arenaId: 'moon-bamboo',
      words: [
        { id: 'heal', english: 'heal', chinese: '治愈', pronunciation: '/hiːl/', gameEffect: '恢复生命', intent: 'CAST_SKILL', itemId: 'heal' },
        { id: 'push', english: 'push', chinese: '推开', pronunciation: '/pʊʃ/', gameEffect: '击退敌人', intent: 'CAST_SKILL', itemId: 'push' },
        { id: 'bamboo', english: 'bamboo', chinese: '竹子', pronunciation: '/bæmˈbuː/', gameEffect: '唤起竹影共鸣', intent: 'USE_OBJECT', itemId: 'bamboo' },
        { id: 'leaf', english: 'leaf', chinese: '叶子', pronunciation: '/liːf/', gameEffect: '释放风中竹叶', intent: 'USE_OBJECT', itemId: 'leaf' },
        { id: 'umbrella', english: 'umbrella', chinese: '雨伞', pronunciation: '/ʌmˈbrelə/', gameEffect: '把雨伞带到身边', intent: 'MOVE_OBJECT', itemId: 'umbrella' },
        { id: 'bridge', english: 'bridge', chinese: '桥', pronunciation: '/brɪdʒ/', gameEffect: '检查月下石桥', intent: 'USE_OBJECT', itemId: 'bridge' },
        { id: 'chair', english: 'chair', chinese: '椅子', pronunciation: '/tʃeər/', gameEffect: '移动场景物体', intent: 'MOVE_OBJECT', itemId: 'chair' },
        { id: 'box', english: 'box', chinese: '箱子', pronunciation: '/bɒks/', gameEffect: '移动箱子', intent: 'MOVE_OBJECT', itemId: 'box' },
      ],
      patterns: [
        { template: 'Please {action} me.', chinese: '请……我。', example: 'Please heal me.', effect: '恢复生命' },
        { template: 'Stay away from me.', chinese: '离我远点。', example: 'Stay away from me.', effect: '击退敌人' },
        { template: 'Check the {object}.', chinese: '检查这个……', example: 'Check the bamboo.', effect: '观察场景物件' },
        { template: 'Use the {object}.', chinese: '使用这个……', example: 'Use the leaf.', effect: '释放竹叶' },
        { template: 'Pick up the {object}.', chinese: '拿起这个……', example: 'Pick up the umbrella.', effect: '移动雨伞' },
        { template: 'Move the {object}.', chinese: '移动这个……', example: 'Move the box.', effect: '操纵物体' },
      ],
    },
  },
  {
    id: 'cyber-market',
    name: '赛博夜市',
    subtitle: '让万物听从你的句子',
    textureKey: 'arena-cyber-market',
    asset: '/assets/arenas/cyber-market.webp',
    platformTextureKey: 'platform-cyber-market',
    platformAsset: '/assets/arena-textures/platform-market-v2.webp',
    accent: 0xffb45e,
    accentCss: '#ffb45e',
    platform: 0x311c2a,
    atmosphere: 'steam',
    lesson: {
      id: 'lesson-market',
      arenaId: 'cyber-market',
      words: [
        { id: 'bottle', english: 'bottle', chinese: '瓶子', pronunciation: '/ˈbɒtəl/', gameEffect: '投掷瓶子', intent: 'THROW_OBJECT', itemId: 'bottle' },
        { id: 'cabinet', english: 'cabinet', chinese: '柜子', pronunciation: '/ˈkæbɪnət/', gameEffect: '打开柜子', intent: 'OPEN_OBJECT', itemId: 'cabinet' },
        { id: 'box', english: 'box', chinese: '箱子', pronunciation: '/bɒks/', gameEffect: '移动箱子', intent: 'MOVE_OBJECT', itemId: 'box' },
        { id: 'sword', english: 'sword', chinese: '剑', pronunciation: '/sɔːrd/', gameEffect: '召唤长剑', intent: 'SUMMON_EQUIPMENT', itemId: 'sword' },
        { id: 'noodles', english: 'noodles', chinese: '面条', pronunciation: '/ˈnuːdəlz/', gameEffect: '煮好一碗面', intent: 'USE_OBJECT', itemId: 'noodles' },
        { id: 'coin', english: 'coin', chinese: '硬币', pronunciation: '/kɔɪn/', gameEffect: '抛起夜市硬币', intent: 'USE_OBJECT', itemId: 'coin' },
        { id: 'basket', english: 'basket', chinese: '篮子', pronunciation: '/ˈbɑːskɪt/', gameEffect: '移动购物篮', intent: 'MOVE_OBJECT', itemId: 'basket' },
        { id: 'lantern', english: 'lantern', chinese: '灯笼', pronunciation: '/ˈlæntərn/', gameEffect: '点亮摊位灯笼', intent: 'USE_OBJECT', itemId: 'lantern' },
      ],
      patterns: [
        { template: 'Throw the {object}.', chinese: '投掷这个……', example: 'Throw the bottle.', effect: '投掷物体' },
        { template: 'Open the {object}.', chinese: '打开这个……', example: 'Open the cabinet.', effect: '开启物体' },
        { template: 'Move the {object}.', chinese: '移动这个……', example: 'Move the box.', effect: '移动障碍' },
        { template: 'Cook the {food}.', chinese: '烹饪这个……', example: 'Cook the noodles.', effect: '煮好面条' },
        { template: 'Use the {object}.', chinese: '使用这个……', example: 'Use the coin.', effect: '抛起硬币' },
        { template: 'Bring me the {object}.', chinese: '把……带给我。', example: 'Bring me the basket.', effect: '移动购物篮' },
      ],
    },
  },
  {
    id: 'sunrise-kitchen',
    name: '晨光厨房',
    subtitle: '让早餐随着英语醒来',
    textureKey: 'arena-sunrise-kitchen',
    asset: '/assets/arenas/sunrise-kitchen.webp',
    platformTextureKey: 'platform-sunrise-kitchen',
    platformAsset: '/assets/arena-textures/platform-market-v2.webp',
    accent: 0xffb35c,
    accentCss: '#ffb35c',
    platform: 0x3a2718,
    atmosphere: 'steam',
    lesson: {
      id: 'lesson-kitchen',
      arenaId: 'sunrise-kitchen',
      words: [
        { id: 'cup', english: 'cup', chinese: '杯子', pronunciation: '/kʌp/', gameEffect: '端起热饮', intent: 'USE_OBJECT', itemId: 'cup' },
        { id: 'plate', english: 'plate', chinese: '盘子', pronunciation: '/pleɪt/', gameEffect: '摆好餐盘', intent: 'USE_OBJECT', itemId: 'plate' },
        { id: 'spoon', english: 'spoon', chinese: '勺子', pronunciation: '/spuːn/', gameEffect: '使用勺子', intent: 'USE_OBJECT', itemId: 'spoon' },
        { id: 'pan', english: 'pan', chinese: '平底锅', pronunciation: '/pæn/', gameEffect: '加热平底锅', intent: 'USE_OBJECT', itemId: 'pan' },
        { id: 'kettle', english: 'kettle', chinese: '水壶', pronunciation: '/ˈketəl/', gameEffect: '烧开热水', intent: 'USE_OBJECT', itemId: 'kettle' },
        { id: 'fridge', english: 'fridge', chinese: '冰箱', pronunciation: '/frɪdʒ/', gameEffect: '打开冰箱', intent: 'OPEN_OBJECT', itemId: 'fridge' },
        { id: 'apple', english: 'apple', chinese: '苹果', pronunciation: '/ˈæpəl/', gameEffect: '取用苹果', intent: 'USE_OBJECT', itemId: 'apple' },
        { id: 'table', english: 'table', chinese: '餐桌', pronunciation: '/ˈteɪbəl/', gameEffect: '检查餐桌', intent: 'USE_OBJECT', itemId: 'table' },
      ],
      patterns: [
        { template: 'Use the {object}.', chinese: '使用这个……', example: 'Use the cup.', effect: '端起杯子' },
        { template: 'Set the {object}.', chinese: '摆好这个……', example: 'Set the plate.', effect: '摆好餐盘' },
        { template: 'Use the {object}.', chinese: '使用这个……', example: 'Use the spoon.', effect: '使用餐具' },
        { template: 'Heat the {object}.', chinese: '加热这个……', example: 'Heat the pan.', effect: '加热平底锅' },
        { template: 'Boil the {object}.', chinese: '烧开这个……', example: 'Boil the kettle.', effect: '烧开热水' },
        { template: 'Open the {object}.', chinese: '打开这个……', example: 'Open the fridge.', effect: '打开冰箱' },
      ],
    },
  },
  {
    id: 'cozy-study',
    name: '温暖书房',
    subtitle: '把学习变成可见的行动',
    textureKey: 'arena-cozy-study',
    asset: '/assets/arenas/cozy-study.webp',
    platformTextureKey: 'platform-cozy-study',
    platformAsset: '/assets/arena-textures/platform-shrine-v2.webp',
    accent: 0xa98cff,
    accentCss: '#a98cff',
    platform: 0x211f36,
    atmosphere: 'motes',
    lesson: {
      id: 'lesson-study',
      arenaId: 'cozy-study',
      words: [
        { id: 'book', english: 'book', chinese: '书', pronunciation: '/bʊk/', gameEffect: '翻开书本阅读', intent: 'USE_OBJECT', itemId: 'book' },
        { id: 'lamp', english: 'lamp', chinese: '台灯', pronunciation: '/læmp/', gameEffect: '打开阅读灯', intent: 'USE_OBJECT', itemId: 'lamp' },
        { id: 'computer', english: 'computer', chinese: '电脑', pronunciation: '/kəmˈpjuːtər/', gameEffect: '启动电脑', intent: 'USE_OBJECT', itemId: 'computer' },
        { id: 'phone', english: 'phone', chinese: '手机', pronunciation: '/foʊn/', gameEffect: '查看手机', intent: 'USE_OBJECT', itemId: 'phone' },
        { id: 'clock', english: 'clock', chinese: '时钟', pronunciation: '/klɒk/', gameEffect: '确认时间', intent: 'USE_OBJECT', itemId: 'clock' },
        { id: 'window', english: 'window', chinese: '窗户', pronunciation: '/ˈwɪndoʊ/', gameEffect: '打开窗户', intent: 'OPEN_OBJECT', itemId: 'window' },
        { id: 'desk', english: 'desk', chinese: '书桌', pronunciation: '/desk/', gameEffect: '检查书桌', intent: 'USE_OBJECT', itemId: 'desk' },
        { id: 'chair', english: 'chair', chinese: '椅子', pronunciation: '/tʃeər/', gameEffect: '把椅子带近', intent: 'MOVE_OBJECT', itemId: 'chair' },
      ],
      patterns: [
        { template: 'Read the {object}.', chinese: '阅读这个……', example: 'Read the book.', effect: '打开书本' },
        { template: 'Turn on the {object}.', chinese: '打开这个……', example: 'Turn on the lamp.', effect: '点亮台灯' },
        { template: 'Turn on the {object}.', chinese: '启动这个……', example: 'Turn on the computer.', effect: '启动电脑' },
        { template: 'Check the {object}.', chinese: '查看这个……', example: 'Check the phone.', effect: '查看手机' },
        { template: 'Check the {object}.', chinese: '查看这个……', example: 'Check the clock.', effect: '确认时间' },
        { template: 'Open the {object}.', chinese: '打开这个……', example: 'Open the window.', effect: '打开窗户' },
      ],
    },
  },
  {
    id: 'metro-commute',
    name: '日常地铁',
    subtitle: '在通勤中练习真实表达',
    textureKey: 'arena-metro-commute',
    asset: '/assets/arenas/metro-commute.webp',
    platformTextureKey: 'platform-metro-commute',
    platformAsset: '/assets/arena-textures/platform-bamboo-v2.webp',
    accent: 0x65d9ff,
    accentCss: '#65d9ff',
    platform: 0x162b39,
    atmosphere: 'sparks',
    lesson: {
      id: 'lesson-metro',
      arenaId: 'metro-commute',
      words: [
        { id: 'ticket', english: 'ticket', chinese: '车票', pronunciation: '/ˈtɪkɪt/', gameEffect: '检查车票', intent: 'USE_OBJECT', itemId: 'ticket' },
        { id: 'train', english: 'train', chinese: '列车', pronunciation: '/treɪn/', gameEffect: '启动列车', intent: 'USE_OBJECT', itemId: 'train' },
        { id: 'door', english: 'door', chinese: '车门', pronunciation: '/dɔːr/', gameEffect: '打开车门', intent: 'OPEN_OBJECT', itemId: 'door' },
        { id: 'seat', english: 'seat', chinese: '座位', pronunciation: '/siːt/', gameEffect: '坐到座位上', intent: 'USE_OBJECT', itemId: 'seat' },
        { id: 'bag', english: 'bag', chinese: '背包', pronunciation: '/bæɡ/', gameEffect: '检查背包', intent: 'USE_OBJECT', itemId: 'bag' },
        { id: 'map', english: 'map', chinese: '地图', pronunciation: '/mæp/', gameEffect: '展开线路地图', intent: 'USE_OBJECT', itemId: 'map' },
        { id: 'umbrella', english: 'umbrella', chinese: '雨伞', pronunciation: '/ʌmˈbrelə/', gameEffect: '把雨伞带到身边', intent: 'MOVE_OBJECT', itemId: 'umbrella' },
        { id: 'phone', english: 'phone', chinese: '手机', pronunciation: '/foʊn/', gameEffect: '查看到站信息', intent: 'USE_OBJECT', itemId: 'phone' },
      ],
      patterns: [
        { template: 'Check the {object}.', chinese: '检查这个……', example: 'Check the ticket.', effect: '确认车票' },
        { template: 'Start the {object}.', chinese: '启动这个……', example: 'Start the train.', effect: '启动列车' },
        { template: 'Open the {object}.', chinese: '打开这个……', example: 'Open the door.', effect: '打开车门' },
        { template: 'Sit on the {object}.', chinese: '坐在这个……上。', example: 'Sit on the seat.', effect: '使用座位' },
        { template: 'Check the {object}.', chinese: '检查这个……', example: 'Check the bag.', effect: '确认行李' },
        { template: 'Show me the {object}.', chinese: '给我看这个……', example: 'Show me the map.', effect: '展开地图' },
      ],
    },
  },
] as const;

export function getArena(id: string | undefined): ArenaDefinition {
  return ARENAS.find((arena) => arena.id === id) ?? ARENAS[0];
}
