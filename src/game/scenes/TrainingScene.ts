import Phaser from 'phaser';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../events/GameEvents';
import { VoiceOverlay } from '../ui/VoiceOverlay';
import type { SpeechResult } from '../../voice/SpeechProvider';
import { IntentResolver } from '../../language/IntentResolver';
import { addButton, addTitle } from './SceneHelpers';
import { addGlassPanel, addIllustratedBackdrop } from './SceneArt';

const practicePhrases = [
  ['01', 'I need a shield.', '召唤护盾 · /ʃiːld/'],
  ['02', 'Throw the bottle at him.', '投掷物体 · 重读 bottle'],
  ['03', 'Please heal me.', '恢复生命 · /hiːl/'],
  ['04', 'Stay away from me.', '击退敌人 · 连贯表达'],
] as const;

export class TrainingScene extends Phaser.Scene {
  private overlay?: VoiceOverlay;
  private feedback!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private signalBars: Phaser.GameObjects.Rectangle[] = [];
  private readonly resolver = new IntentResolver();

  constructor() { super('TrainingScene'); }

  create(): void {
    const accent = 0x70e8dc;
    addIllustratedBackdrop(this, 'scene-training-dojo-v2', accent, .48);
    this.add.rectangle(640, 360, 1280, 720, 0x030711, .12).setDepth(-12);
    this.add.rectangle(0, 0, 1280, 4, accent, .38).setOrigin(0).setDepth(-9);
    addTitle(this, 'Voice laboratory / 03', '语音训练场', '校准发音、识别与战斗意图。');

    const phrasePanel = addGlassPanel(this, 300, 395, 484, 350, accent, .8).setDepth(3);
    phrasePanel.getAt<Phaser.GameObjects.Rectangle>(2)?.setFillStyle(accent, .74);
    this.add.text(86, 238, 'PRACTICE SEQUENCE', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#70e8dc',
      letterSpacing: 4,
    }).setDepth(5);
    this.add.text(514, 239, '04 PHRASES', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#667894',
      letterSpacing: 2,
    }).setOrigin(1, 0).setDepth(5);
    practicePhrases.forEach(([number, english, note], index) => {
      const y = 294 + index * 66;
      const selected = index === 0;
      this.add.rectangle(300, y, 418, 54, selected ? 0x10243a : 0x0b1425, selected ? .9 : .72)
        .setStrokeStyle(1, selected ? accent : 0x5c6f8d, selected ? .54 : .18)
        .setDepth(5);
      this.add.text(108, y - 15, number, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '11px',
        color: selected ? '#70e8dc' : '#64758e',
      }).setDepth(6);
      this.add.text(146, y - 16, english, {
        fontFamily: 'Arial',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f5f8ff',
      }).setDepth(6);
      this.add.text(146, y + 8, note, {
        fontFamily: 'Arial',
        fontSize: '9px',
        color: selected ? '#91bcb9' : '#697992',
      }).setDepth(6);
      this.add.circle(492, y, 4, selected ? accent : 0x52627c, selected ? .9 : .45).setDepth(6);
    });

    const analysisPanel = addGlassPanel(this, 912, 394, 604, 352, accent, .82).setDepth(3);
    analysisPanel.getAt<Phaser.GameObjects.Rectangle>(2)?.setFillStyle(accent, .74);
    this.add.text(648, 238, 'LIVE ANALYSIS  /  实时分析', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#70e8dc',
      letterSpacing: 4,
    }).setDepth(5);
    this.add.text(1160, 239, 'MIC · INTENT · SCORE', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#657792',
      letterSpacing: 2,
    }).setOrigin(1, 0).setDepth(5);

    const scope = this.add.container(758, 355).setDepth(6);
    const outer = this.add.circle(0, 0, 74, accent, .025).setStrokeStyle(1, accent, .4);
    const middle = this.add.circle(0, 0, 52, accent, .02).setStrokeStyle(1, 0xa8fff1, .22);
    const inner = this.add.circle(0, 0, 23, accent, .05).setStrokeStyle(1, accent, .72);
    const cross = this.add.graphics().lineStyle(1, accent, .18).lineBetween(-86, 0, 86, 0).lineBetween(0, -86, 0, 86);
    const core = this.add.circle(0, 0, 5, 0xdffff8, .95).setBlendMode(Phaser.BlendModes.ADD);
    scope.add([outer, middle, inner, cross, core]);
    this.tweens.add({ targets: [middle, inner], scale: 1.12, alpha: .6, duration: 980, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.signalBars = Array.from({ length: 11 }, (_, index) => {
      const bar = this.add.rectangle(680 + index * 15, 477, 5, 8 + (index % 4) * 5, index % 3 === 0 ? 0xffd07b : accent, .62).setDepth(6);
      this.tweens.add({ targets: bar, scaleY: .45 + (index % 5) * .16, duration: 520 + index * 45, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      return bar;
    });
    this.scoreText = this.add.text(976, 302, '--', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '50px',
      color: '#70e8dc',
    }).setDepth(6);
    this.add.text(980, 356, 'LANGUAGE SCORE', {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#6d7e98',
      letterSpacing: 2,
    }).setDepth(6);
    this.add.rectangle(978, 387, 152, 1, 0x7486a1, .2).setDepth(6);
    this.add.text(980, 405, 'CHANNEL', { fontFamily: 'Arial', fontSize: '8px', color: '#65758e', letterSpacing: 2 }).setDepth(6);
    this.add.text(1148, 405, 'AUTO', { fontFamily: 'Arial', fontSize: '9px', fontStyle: 'bold', color: '#d7e3f4' }).setOrigin(1, 0).setDepth(6);
    this.add.text(980, 432, 'INTENT', { fontFamily: 'Arial', fontSize: '8px', color: '#65758e', letterSpacing: 2 }).setDepth(6);
    this.feedback = this.add.text(648, 505, '等待你的第一句英语…\n系统会显示识别文本、意图和评分。', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#a8b6cb',
      lineSpacing: 7,
      wordWrap: { width: 492 },
    }).setDepth(6);

    addButton(this, 220, 620, '返回主菜单', () => this.scene.start('MainMenuScene')).setScale(.72);
    this.add.text(1050, 590, '言灵不消耗角色状态 · 念写不计口语分', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#667791',
      letterSpacing: 1,
    }).setOrigin(1, 0).setDepth(5);

    this.overlay = new VoiceOverlay('training');
    EventBus.on(GameEvents.VOICE_RESULT, this.onResult, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.VOICE_RESULT, this.onResult, this);
      this.overlay?.destroy();
    });
  }

  private onResult(result: SpeechResult): void {
    const command = this.resolver.resolve(result);
    const success = command.intent !== 'UNKNOWN';
    this.feedback
      .setText(`识别 / ${result.transcript}\n意图 / ${command.intent}  ·  目标 / ${command.itemId ?? '—'}`)
      .setColor(success ? '#a7f5e7' : '#ffcc78');
    this.scoreText.setText(String(command.languageScore).padStart(2, '0')).setColor(success ? '#70e8dc' : '#ffcc78');
    this.tweens.add({ targets: [...this.signalBars, this.scoreText], alpha: { from: .2, to: 1 }, duration: 220, ease: 'Cubic.out' });
  }
}
