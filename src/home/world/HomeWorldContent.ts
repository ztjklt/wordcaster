import type { HomeBuildingDefinition, HomeEntranceDefinition } from '../HomeTypes';
import { HOME_WORLD_HEIGHT, HOME_WORLD_WIDTH } from '../HomeSave';

export const HOME_WORLD = {
  width: HOME_WORLD_WIDTH,
  height: HOME_WORLD_HEIGHT,
  spawn: { x: 350, y: 600 },
} as const;

export const HOME_BUILDINGS: readonly HomeBuildingDefinition[] = [
  { id: 'restaurant', x: 540, y: 305, width: 390, height: 250, label: '街角餐厅', subtitle: 'RESTAURANT', icon: '餐', accent: 0xffa968 },
  { id: 'hospital', x: 1250, y: 260, width: 390, height: 250, label: '生命诊所', subtitle: 'HOSPITAL', icon: '医', accent: 0x72e1ff },
  { id: 'training', x: 1800, y: 390, width: 410, height: 280, label: '言灵道场', subtitle: 'TRAINING', icon: '练', accent: 0x68f0d5 },
  { id: 'bookshelf', x: 1120, y: 930, width: 440, height: 260, label: '记忆书库', subtitle: 'BOOKSHELF', icon: '书', accent: 0xc69bff },
  { id: 'adventure', x: 1910, y: 940, width: 420, height: 250, label: '远征之门', subtitle: 'ADVENTURE', icon: '战', accent: 0xff7188 },
  { id: 'quarters', x: 360, y: 955, width: 360, height: 230, label: '休息居所', subtitle: 'QUARTERS', icon: '眠', accent: 0xffd47c },
] as const;

export const HOME_ENTRANCES: readonly HomeEntranceDefinition[] = [
  { id: 'restaurant-door', buildingId: 'restaurant', x: 540, y: 465, radius: 125, priority: 8, label: '进入街角餐厅', hint: '练习自然点餐并恢复饥饿与口渴', action: { type: 'scene', scene: 'RestaurantScene' } },
  { id: 'hospital-door', buildingId: 'hospital', x: 1250, y: 420, radius: 125, priority: 8, label: '进入生命诊所', hint: '进行生命与体力强化', action: { type: 'scene', scene: 'HospitalScene' } },
  { id: 'training-door', buildingId: 'training', x: 1800, y: 565, radius: 130, priority: 9, label: '进入言灵道场', hint: '校准识别、发音与战斗意图', action: { type: 'scene', scene: 'TrainingScene' } },
  { id: 'bookshelf-door', buildingId: 'bookshelf', x: 1120, y: 770, radius: 125, priority: 8, label: '进入记忆书库', hint: '查看单词与句式掌握度', action: { type: 'scene', scene: 'BookshelfScene' } },
  { id: 'adventure-gate', buildingId: 'adventure', x: 1910, y: 785, radius: 145, priority: 10, label: '开启远征之门', hint: '选择言灵决斗或命令方块', action: { type: 'scene', scene: 'ModeSelectScene' } },
  { id: 'quarters-bed', buildingId: 'quarters', x: 360, y: 810, radius: 120, priority: 7, label: '回到休息居所', hint: '睡眠并恢复行动状态', action: { type: 'sleep' } },
  { id: 'settings-terminal', buildingId: 'quarters', x: 160, y: 610, radius: 105, priority: 6, label: '打开系统终端', hint: '调整音量、震动与特效设置', action: { type: 'settings' } },
] as const;
