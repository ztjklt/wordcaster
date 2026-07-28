import Phaser from 'phaser';
import { AudioManager } from '../../audio/AudioManager';
import { PlayerNeedsSystem } from '../../home/PlayerNeedsSystem';
import { VocabularyProgress } from '../../language/VocabularyProgress';
import { SaveManager } from '../../storage/SaveManager';
import type { SpeechResult } from '../../voice/SpeechProvider';
import { contributesToOralMastery } from '../../voice/VoiceFeedback';
import type { VoiceUtterance } from '../../voice/VoiceTypes';
import { getArena, type ArenaDefinition } from '../arena/BattleContent';
import { CommandBlockEffectSystem } from '../command-block/CommandBlockEffectSystem';
import { getCommandWords, type CommandWordDefinition } from '../command-block/CommandBlockContent';
import { CommandBlockRoundController, type CommandBlockRunStats } from '../command-block/CommandBlockRoundController';
import { resolveSpokenWord } from '../command-block/SpokenWordResolver';
import { TransparentEmojiRenderer } from '../command-block/TransparentEmojiRenderer';
import { WordBlockSystem } from '../command-block/WordBlockSystem';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../events/GameEvents';
import { CommandBlockTouchControls } from '../input/CommandBlockTouchControls';
import { KeyboardControls } from '../input/KeyboardControls';
import { VoiceOverlay } from '../ui/VoiceOverlay';

interface CommandBlockSceneData { seed?: number }

export class CommandBlockScene extends Phaser.Scene {
  private seed = 1;
  private arena!: ArenaDefinition;
  private controller!: CommandBlockRoundController;
  private player!: Player;
  private enemy!: Enemy;
  private keyboard!: KeyboardControls;
  private touch?: CommandBlockTouchControls;
  private voiceOverlay!: VoiceOverlay;
  private wordBlocks!: WordBlockSystem;
  private effects!: CommandBlockEffectSystem;
  private readonly audio = new AudioManager();
  private readonly vocabulary = new VocabularyProgress();
  private readonly emoji = new TransparentEmojiRenderer(this);
  private basePlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private projectiles: Phaser.Physics.Arcade.Image[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Rectangle;
  private playerHealthBar!: Phaser.GameObjects.Rectangle;
  private enemyHealthBar!: Phaser.GameObjects.Rectangle;
  private rivalPrefix!: Phaser.GameObjects.Text;
  private rivalPrompt!: Phaser.GameObjects.Text;
  private effectStatus!: Phaser.GameObjects.Text;
  private textInputFocused = false;
  private inputLocked = true;
  private runEnded = false;
  private runStartedAtMs = 0;
  private pauseStartedAtMs?: number;
  private pausedTotalMs = 0;
  private lastProjectileAt = 0;
  private temporaryPlatforms: Phaser.GameObjects.GameObject[] = [];
  private temporaryCleanups: Array<() => void> = [];
  private reducedMotion = false;

  constructor() { super('CommandBlockScene'); }
  init(data: CommandBlockSceneData): void { this.seed = data.seed ?? 1; }

  create(): void {
    document.querySelector('#dom-overlay')?.replaceChildren();
    const save = SaveManager.load();
    this.arena = getArena(save.selectedArenaId);
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.physics.world.setBounds(0, 0, 1280, 760);
    this.createTextures();
    this.createArena();
    this.player = new Player(this, 62, 470, save.player.maxHealth, save.player.maxStamina);
    this.enemy = new Enemy(this, 1215, 450);
    this.physics.add.collider(this.player, this.basePlatforms);
    this.physics.add.collider(this.enemy, this.basePlatforms);
    this.keyboard = new KeyboardControls(this);
    if (window.innerWidth <= 1000 || window.innerHeight <= 520) {
      this.touch = new CommandBlockTouchControls(this, this.arena.accent);
    }

    this.controller = new CommandBlockRoundController(this.arena.id, this.seed);
    const definitions = this.controller.run.wordIds
      .map((id) => getCommandWords(this.arena.id).find((entry) => entry.id === id))
      .filter((entry): entry is CommandWordDefinition => Boolean(entry));
    this.wordBlocks = new WordBlockSystem(this, this.arena, definitions, this.seed, this.reducedMotion);
    this.physics.add.collider(this.player, this.wordBlocks.colliders);
    this.physics.add.collider(this.enemy, this.wordBlocks.colliders);

    this.runStartedAtMs = Date.now();
    this.createHud();
    this.effects = new CommandBlockEffectSystem(this, this.player, this.enemy, {
      addTime: (valueMs) => this.controller.addTime(valueMs),
      addScore: (value) => {
        this.controller.addScore(value);
        this.refreshHud();
      },
      showHints: (durationMs) => this.wordBlocks.showHints(durationMs),
      createPlatform: (durationMs, preset) => this.createTemporaryPlatform(durationMs, preset),
      createMovingPlatform: (durationMs, preset) => this.createMovingPlatform(durationMs, preset),
      createPath: (durationMs, preset) => this.createTemporaryPath(durationMs, preset),
      clearProjectiles: () => this.clearProjectiles(),
      reflectProjectiles: () => this.reflectProjectiles(),
      freezeProjectiles: (durationMs) => this.freezeProjectiles(durationMs),
      highlightRoute: (durationMs) => this.highlightSafeRoute(durationMs),
      grantComboGuard: (count) => this.controller.grantComboGuard(count),
    });

    const dictionary = getCommandWords(this.arena.id).map((entry) => ({
      word: entry.word,
      chinese: entry.chinese,
      effect: entry.effectLabel,
    }));
    this.voiceOverlay = new VoiceOverlay('command-block', {
      title: '十词言灵',
      dictionary,
      patterns: ['APPLE', 'Say apple.', 'I need an apple.'],
      placeholder: '写下一个尚未激活的完整单词，例如 APPLE',
    });
    EventBus.on(GameEvents.VOICE_RESULT, this.handleVoiceResult, this);
    EventBus.on(GameEvents.VOICE_UTTERANCE, this.handleUtterance, this);
    EventBus.on(GameEvents.TEXT_INPUT_FOCUS, this.handleTextFocus, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.cameras.main.fadeIn(this.reducedMotion ? 100 : 380, 3, 5, 13);
    this.time.delayedCall(520, () => this.beginChallenge());
  }

  update(time: number, delta: number): void {
    if (this.runEnded) {
      this.player.animate(time, delta);
      this.enemy.animate(time, delta);
      return;
    }
    if (this.pauseStartedAtMs !== undefined) {
      this.player.animate(time, 0);
      this.enemy.animate(time, 0);
      return;
    }

    const now = Date.now();
    const movement = this.textInputFocused ? 0 : this.keyboard.movement || this.touch?.movement || 0;
    this.player.setMovement(movement);
    if (!this.textInputFocused && (this.keyboard.jumpPressed || this.touch?.consumeJump())) {
      this.player.jump();
      this.audio.play('jump');
    }
    this.enemy.setMovement(0);
    this.enemy.facing = -1;
    this.player.animate(time, delta);
    this.enemy.animate(time, delta);

    if (this.player.y > 748) this.handleFall();
    if (!this.inputLocked && this.controller.remaining(now) <= 0) this.handleTimeout();
    if (!this.inputLocked && now >= this.effects.enemyDisabledUntil && now - this.lastProjectileAt >= 2600) {
      this.lastProjectileAt = now;
      this.fireProjectile(false);
    }
    this.projectiles = this.projectiles.filter((projectile) => {
      if (!projectile.active) return false;
      if (projectile.x < -100 || projectile.x > 1380 || projectile.y < -100 || projectile.y > 800) {
        projectile.destroy();
        return false;
      }
      return true;
    });
    this.refreshHud();
  }

  private beginChallenge(): void {
    if (this.runEnded) return;
    const now = Date.now();
    this.controller.start(now);
    this.lastProjectileAt = now;
    this.inputLocked = false;
    this.rivalPrefix.setText('RIVAL // TEN WORD RESONANCE');
    this.rivalPrompt.setText('读出任意一个尚未点亮的完整单词');
    this.effectStatus.setText('完整单词或含词短句均可 · 一次只说一个').setColor(this.arena.accentCss);
    this.cameras.main.flash(this.reducedMotion ? 80 : 170, 28, 52, 72, false);
    this.refreshHud();
  }

  private createTextures(): void {
    if (!this.textures.exists('fighter-player')) this.drawFighterTexture('fighter-player', 0x4de6c8);
    if (!this.textures.exists('fighter-enemy')) this.drawFighterTexture('fighter-enemy', 0xff6279);
    if (!this.textures.exists('command-projectile')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0xffffff, .18).fillCircle(18, 18, 17);
      graphics.fillStyle(this.arena.accent, .85).fillCircle(18, 18, 9);
      graphics.lineStyle(2, 0xffffff, .88).strokeCircle(18, 18, 13);
      graphics.generateTexture('command-projectile', 36, 36);
      graphics.destroy();
    }
  }

  private drawFighterTexture(key: string, color: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.lineStyle(10, color, 1).strokeCircle(48, 30, 22);
    graphics.lineBetween(48, 53, 48, 92);
    graphics.lineBetween(48, 63, 17, 82);
    graphics.lineBetween(48, 63, 78, 47);
    graphics.lineBetween(48, 91, 23, 126);
    graphics.lineBetween(48, 91, 76, 126);
    graphics.generateTexture(key, 96, 136);
    graphics.destroy();
  }

  private createArena(): void {
    this.cameras.main.setBackgroundColor('#050814');
    const backdrop = this.add.image(640, 360, this.arena.textureKey).setDisplaySize(1304, 734).setDepth(-20);
    if (!this.reducedMotion) {
      this.tweens.add({ targets: backdrop, x: 647, y: 356, duration: 13000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.add.rectangle(640, 360, 1280, 720, 0x030611, .28).setDepth(-19);
    this.add.circle(1010, 118, 250, this.arena.accent, .075).setBlendMode(Phaser.BlendModes.ADD).setDepth(-18);
    this.createAtmosphere();
    this.basePlatforms = this.physics.add.staticGroup();
    this.addIsland(200, 578, 400, 64);
    this.addIsland(1080, 578, 400, 64);
    this.addIsland(640, 670, 360, 24, .32);
  }

  private addIsland(x: number, y: number, width: number, height: number, alpha = 1): void {
    this.add.rectangle(x + 6, y + 10, width + 12, height + 12, 0x010309, .58 * alpha).setDepth(1);
    this.add.tileSprite(x, y, width, height, this.arena.platformTextureKey)
      .setTileScale(.52, Math.max(.1, height / 190))
      .setAlpha(alpha)
      .setDepth(3);
    this.add.rectangle(x, y - height / 2 + 1, width, 3, this.arena.accent, .65 * alpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);
    const collider = this.add.rectangle(x, y, width, height, 0xffffff, .001);
    this.basePlatforms.add(collider);
    (collider.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }

  private createAtmosphere(): void {
    const count = this.reducedMotion ? 10 : 28;
    for (let index = 0; index < count; index += 1) {
      const particle = this.add.circle(
        30 + index * 47 % 1220,
        160 + index * 83 % 430,
        index % 5 === 0 ? 3 : 1.5,
        index % 3 === 0 ? 0xffffff : this.arena.accent,
        .12 + index % 4 * .07,
      ).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD);
      if (!this.reducedMotion) {
        this.tweens.add({
          targets: particle,
          x: particle.x + 42 - index % 5 * 15,
          y: particle.y - 48 - index % 4 * 13,
          alpha: .02,
          duration: 2800 + index % 7 * 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      }
    }
  }

  private createHud(): void {
    this.add.text(42, 20, 'PLAYER / WORD RUNNER', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: this.arena.accentCss,
      letterSpacing: 3,
    }).setDepth(40);
    this.add.rectangle(42, 48, 286, 12, 0x07101f, .9).setOrigin(0, .5).setDepth(40);
    this.playerHealthBar = this.add.rectangle(42, 48, 286, 8, this.arena.accent, .96).setOrigin(0, .5).setDepth(41);
    this.add.text(1238, 20, 'RIVAL / BLOCK KEEPER', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#ff7890',
      letterSpacing: 3,
    }).setOrigin(1, 0).setDepth(40);
    this.add.rectangle(952, 48, 286, 12, 0x07101f, .9).setOrigin(0, .5).setDepth(40);
    this.enemyHealthBar = this.add.rectangle(1238, 48, 286, 8, 0xff657d, .9).setOrigin(1, .5).setDepth(41);
    this.progressText = this.add.text(640, 20, 'RESONANCE 0 / 10', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#8b9bb4',
      letterSpacing: 3,
    }).setOrigin(.5).setDepth(40);
    this.scoreText = this.add.text(640, 46, '000000', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '20px',
      color: '#f8fbff',
      letterSpacing: 2,
    }).setOrigin(.5).setDepth(40);
    this.timerBar = this.add.rectangle(640, 72, 312, 3, this.arena.accent, .9).setDepth(40);
    this.timerText = this.add.text(808, 68, '15.0', {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#d8e2f0',
    }).setDepth(40);

    this.rivalPrefix = this.add.text(640, 190, 'RIVAL // 准备共鸣', {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ff7890',
      letterSpacing: 3,
    }).setOrigin(.5).setDepth(32);
    this.rivalPrompt = this.add.text(640, 211, '', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '17px',
      color: '#f7faff',
      fixedWidth: 720,
      align: 'center',
    }).setOrigin(.5, 0).setDepth(32).setShadow(0, 4, '#000000', 9);
    this.effectStatus = this.add.text(640, 245, '', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: this.arena.accentCss,
      letterSpacing: 2,
    }).setOrigin(.5).setDepth(34).setShadow(0, 2, '#000000', 6);
    this.add.text(640, 696, 'A / D 移动  ·  W 跳跃  ·  L 言灵  ·  N 念写', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#71819b',
      letterSpacing: 2,
    }).setOrigin(.5).setDepth(45);
  }

  private handleUtterance(utterance: VoiceUtterance): void {
    if (this.inputLocked || this.runEnded) return;
    const raw = utterance.partialText || utterance.finalRawText || '';
    const match = resolveSpokenWord(raw, this.wordBlocks.definitions, this.controller.activatedWordIds, false);
    this.wordBlocks.setCandidate(match.candidateWordId);
    if (match.candidateWordId) {
      const definition = this.wordBlocks.getDefinition(match.candidateWordId);
      if (definition) this.effectStatus.setText(`${definition.word.toUpperCase()} · ${definition.effectLabel}`).setColor(this.arena.accentCss);
    }
  }

  private handleVoiceResult(result: SpeechResult): void {
    if (this.inputLocked || this.runEnded) {
      EventBus.emit(GameEvents.VOICE_COMMAND_FAILED, { utteranceId: result.utteranceId, reason: 'input-locked' });
      return;
    }
    const match = resolveSpokenWord(result.transcript, this.wordBlocks.definitions, this.controller.activatedWordIds, true);
    this.wordBlocks.setCandidate(undefined);
    if (match.matched && match.wordId) {
      const target = this.wordBlocks.getDefinition(match.wordId);
      if (target) this.handleCorrect(target, result);
      return;
    }

    if (match.mode === 'activated') {
      this.wordBlocks.flashFailure(match.wordId);
      this.effectStatus.setText('这个言灵已经激活 · 换一个发光前的单词').setColor('#f8d475');
      EventBus.emit(GameEvents.VOICE_COMMAND_FAILED, { utteranceId: result.utteranceId, reason: 'already-activated' });
      return;
    }

    const penalty = this.controller.wrong();
    this.wordBlocks.flashFailure(match.wordId);
    const message = match.mode === 'ambiguous'
      ? '一次只读一个方块'
      : match.mode === 'spelling'
        ? '请直接朗读完整单词，不要逐字母拼读'
        : '没有识别到尚未激活的完整单词';
    this.effectStatus
      .setText(penalty.guarded ? `${message} · 连击保护已消耗` : `${message} · SCORE -25`)
      .setColor('#ff7890');
    this.enemy.playCast(this.time.now);
    this.fireProjectile(true);
    this.audio.play('wrong');
    EventBus.emit(GameEvents.VOICE_COMMAND_FAILED, {
      utteranceId: result.utteranceId,
      reason: match.mode === 'ambiguous' ? 'ambiguous-word' : match.mode === 'spelling' ? 'letter-spelling' : 'word-not-visible',
    });
    this.refreshHud();
  }

  private handleCorrect(target: CommandWordDefinition, result: SpeechResult): void {
    if (this.inputLocked || this.runEnded) return;
    const scoring = this.controller.correct(target.id, Date.now(), result.provider);
    if (!scoring) return;
    this.inputLocked = true;
    const center = this.wordBlocks.activate(target.id) ?? { x: 640, y: 352 };
    this.effectStatus
      .setText(`${target.word.toUpperCase()} · ${target.effectLabel} · +${scoring.score}`)
      .setColor(`#${target.visual.color.toString(16).padStart(6, '0')}`);
    this.player.playCast(this.time.now);
    this.effects.apply(target, Date.now());
    this.emoji.show(target, center.x, center.y - 70, target.visual.color);
    if (contributesToOralMastery(result.provider)) this.vocabulary.recordVocabulary(target.id, 95, true);
    this.audio.playEffect(target.effectId, target.visual.soundProfile);
    EventBus.emit(GameEvents.VOICE_COMMAND_SUCCESS, { utteranceId: result.utteranceId, challenge: false });
    this.refreshHud();

    if (this.controller.complete) {
      this.time.delayedCall(this.reducedMotion ? 500 : 1250, () => this.finishRun());
      return;
    }
    this.time.delayedCall(this.reducedMotion ? 180 : 460, () => {
      if (this.runEnded) return;
      this.inputLocked = false;
      this.effectStatus.setText('继续读出任意尚未点亮的单词').setColor(this.arena.accentCss);
    });
  }

  private handleTimeout(): void {
    if (this.inputLocked || this.runEnded) return;
    this.controller.timeout(Date.now());
    this.player.stats.health = Math.max(0, this.player.stats.health - 20);
    this.player.playHit(this.time.now);
    this.wordBlocks.flashFailure();
    this.effectStatus.setText('TIME OUT · LIFE -20 · 计时已经重置').setColor('#ff657d');
    this.audio.play('wrong');
    EventBus.emit(GameEvents.VOICE_COMMAND_FAILED, { reason: 'timeout' });
    this.refreshHud();
    if (this.player.stats.health <= 0) this.time.delayedCall(550, () => this.finishRun());
  }

  private handleFall(): void {
    if (this.runEnded) return;
    this.player.stats.health = Math.max(0, this.player.stats.health - 15);
    this.player.setPosition(62, 450).setVelocity(0, 0);
    this.player.playHit(this.time.now);
    this.effectStatus.setText('坠落重置 · LIFE -15').setColor('#ff8797');
    this.audio.play('hit');
    if (this.player.stats.health <= 0) this.finishRun();
  }

  private fireProjectile(punishment: boolean): void {
    if (this.runEnded || !this.player.active || !this.enemy.active) return;
    const projectile = this.physics.add.image(this.enemy.x - 42, this.enemy.y - 62, 'command-projectile')
      .setDepth(20)
      .setCircle(14, 4, 4)
      .setBlendMode(Phaser.BlendModes.ADD);
    const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, this.player.x, this.player.y - 48);
    const speed = (punishment ? 360 : 255) * this.effects.projectileSpeedScale(Date.now());
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    (projectile.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    projectile.setAngularVelocity(220);
    this.projectiles.push(projectile);
    this.physics.add.overlap(projectile, this.player, () => this.hitByProjectile(projectile, punishment));
    this.physics.add.collider(projectile, this.basePlatforms, () => projectile.destroy());
    this.physics.add.collider(projectile, this.wordBlocks.colliders, () => projectile.destroy());
    this.enemy.playCast(this.time.now);
  }

  private hitByProjectile(projectile: Phaser.Physics.Arcade.Image, punishment: boolean): void {
    if (!projectile.active) return;
    projectile.destroy();
    if (Date.now() < this.player.invulnerableUntil) {
      this.audio.play('block');
      this.effectStatus.setText('言灵护体 · 攻击无效').setColor('#d9f7ff');
      return;
    }
    if (this.effects.absorbProjectile()) {
      this.audio.play('block');
      this.effectStatus.setText(`护盾抵消攻击 · 剩余 ${this.effects.shieldHits}`).setColor('#72ddff');
      return;
    }
    this.player.stats.health = Math.max(0, this.player.stats.health - (punishment ? 12 : 8));
    this.player.playHit(this.time.now);
    this.audio.play('hit');
    if (this.player.stats.health <= 0) this.finishRun();
  }

  private createTemporaryPlatform(durationMs: number, preset: string): void {
    const wide = preset === 'wide-bridge' || preset === 'dining-table';
    const width = wide ? 300 : preset === 'stable-desk' ? 220 : 170;
    const x = preset === 'wide-bridge' ? 640 : Phaser.Math.Clamp(this.player.x + this.player.facing * 145, 150, 1130);
    const y = Phaser.Math.Clamp(this.player.y - (preset === 'bamboo-lift' ? 145 : 105), 270, 520);
    const face = this.add.rectangle(x, y, width, 18, this.arena.platform, .96)
      .setStrokeStyle(2, this.arena.accent, .8)
      .setDepth(12);
    const collider = this.add.rectangle(x, y, width, 18, 0xffffff, .001);
    this.physics.add.existing(collider, true);
    this.physics.add.collider(this.player, collider);
    this.temporaryPlatforms.push(face, collider);
    face.setScale(preset === 'bamboo-lift' ? 1 : 0, preset === 'bamboo-lift' ? 0 : 1);
    this.tweens.add({
      targets: face,
      scaleX: 1,
      scaleY: 1,
      duration: this.reducedMotion ? 100 : 300,
      ease: 'Back.out',
    });
    this.removeTemporary([face, collider], durationMs);
  }

  private createMovingPlatform(durationMs: number, preset: string): void {
    const width = preset === 'river-boat' ? 230 : 170;
    const x = Phaser.Math.Clamp(this.player.x + this.player.facing * 150, 170, 1110);
    const y = Phaser.Math.Clamp(this.player.y - 110, 300, 520);
    const face = this.add.rectangle(x, y, width, 20, this.arena.platform, .96)
      .setStrokeStyle(2, this.arena.accent, .86)
      .setDepth(12);
    const collider = this.add.rectangle(x, y, width, 20, 0xffffff, .001);
    this.physics.add.existing(collider, true);
    this.physics.add.collider(this.player, collider);
    this.temporaryPlatforms.push(face, collider);

    if (preset === 'following-chair') {
      const follow = () => {
        if (!face.active || !collider.active) return;
        const targetX = Phaser.Math.Clamp(this.player.x + this.player.facing * 105, 120, 1160);
        face.x = Phaser.Math.Linear(face.x, targetX, .05);
        collider.x = face.x;
        (collider.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      };
      this.events.on(Phaser.Scenes.Events.UPDATE, follow);
      const cleanup = () => this.events.off(Phaser.Scenes.Events.UPDATE, follow);
      this.temporaryCleanups.push(cleanup);
      this.time.delayedCall(durationMs, cleanup);
    } else {
      const distance = preset === 'river-boat' ? 420 : 260;
      this.tweens.add({
        targets: [face, collider],
        x: Phaser.Math.Clamp(x + (x < 640 ? distance : -distance), 150, 1130),
        duration: Math.max(1800, durationMs / 2),
        yoyo: true,
        repeat: 1,
        ease: 'Sine.inOut',
        onUpdate: () => (collider.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject(),
      });
    }
    this.removeTemporary([face, collider], durationMs);
  }

  private createTemporaryPath(durationMs: number, preset: string): void {
    const count = preset === 'station-stairs' ? 5 : 4;
    const direction = this.player.x < 640 ? 1 : -1;
    const objects: Phaser.GameObjects.GameObject[] = [];
    for (let index = 0; index < count; index += 1) {
      const x = Phaser.Math.Clamp(this.player.x + direction * (100 + index * 105), 110, 1170);
      const y = Phaser.Math.Clamp(this.player.y - 70 - index * (preset === 'station-stairs' ? 55 : 34), 260, 520);
      const face = this.add.rectangle(x, y, preset === 'station-stairs' ? 125 : 100, 13, this.arena.platform, .9)
        .setStrokeStyle(1, this.arena.accent, .85)
        .setDepth(11)
        .setScale(0, 1);
      const collider = this.add.rectangle(x, y, preset === 'station-stairs' ? 125 : 100, 13, 0xffffff, .001);
      this.physics.add.existing(collider, true);
      this.physics.add.collider(this.player, collider);
      objects.push(face, collider);
      this.tweens.add({ targets: face, scaleX: 1, duration: 220, delay: index * 80, ease: 'Back.out' });
    }
    this.temporaryPlatforms.push(...objects);
    this.removeTemporary(objects, durationMs);
  }

  private removeTemporary(objects: Phaser.GameObjects.GameObject[], durationMs: number): void {
    this.time.delayedCall(durationMs, () => {
      const active = objects.filter((object) => object.active);
      if (!active.length) return;
      this.tweens.add({
        targets: active,
        alpha: 0,
        scaleX: .2,
        duration: 260,
        onComplete: () => active.forEach((object) => object.destroy()),
      });
    });
  }

  private highlightSafeRoute(durationMs: number): void {
    const route = this.add.graphics().setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    route.lineStyle(4, this.arena.accent, .65);
    route.beginPath().moveTo(70, 520).lineTo(270, 405).lineTo(478, 505).lineTo(640, 405).lineTo(802, 505).lineTo(1010, 405).strokePath();
    this.tweens.add({ targets: route, alpha: 0, duration: durationMs, onComplete: () => route.destroy() });
  }

  private reflectProjectiles(): void {
    this.projectiles.filter((projectile) => projectile.active).forEach((projectile) => {
      const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, this.enemy.x, this.enemy.y - 48);
      projectile.setTint(this.arena.accent).setVelocity(Math.cos(angle) * 440, Math.sin(angle) * 440);
      this.physics.add.overlap(projectile, this.enemy, () => {
        if (!projectile.active) return;
        projectile.destroy();
        this.enemy.stats.health = Math.max(5, this.enemy.stats.health - 10);
        this.enemy.playHit(this.time.now);
      });
    });
  }

  private freezeProjectiles(durationMs: number): void {
    const velocities = this.projectiles
      .filter((projectile) => projectile.active)
      .map((projectile) => ({ projectile, x: projectile.body?.velocity.x ?? 0, y: projectile.body?.velocity.y ?? 0 }));
    velocities.forEach(({ projectile }) => {
      projectile.setVelocity(0, 0).setTint(0x83ffb0);
      projectile.setAngularVelocity(0);
    });
    this.time.delayedCall(durationMs, () => velocities.forEach(({ projectile, x, y }) => {
      if (projectile.active) projectile.clearTint().setVelocity(x, y).setAngularVelocity(220);
    }));
  }

  private refreshHud(): void {
    if (!this.controller) return;
    this.playerHealthBar.width = 286 * Math.max(0, this.player.stats.health / this.player.stats.maxHealth);
    this.enemyHealthBar.width = 286 * Math.max(0, this.enemy.stats.health / this.enemy.stats.maxHealth);
    this.scoreText.setText(String(this.controller.stats.score).padStart(6, '0'));
    this.progressText.setText(`RESONANCE ${this.controller.activatedCount} / ${this.controller.totalWords}`);
    const remaining = this.controller.remaining(Date.now());
    this.timerText.setText((remaining / 1000).toFixed(1));
    this.timerBar.width = 312 * Phaser.Math.Clamp(remaining / this.controller.timeLimitMs, 0, 1);
    this.timerBar.setFillStyle(remaining < 3500 ? 0xff657d : this.arena.accent, .9);
    const gameContainer = document.querySelector<HTMLElement>('#game-container');
    if (gameContainer) {
      gameContainer.dataset.commandActivated = String(this.controller.activatedCount);
      gameContainer.dataset.commandRemainingMs = String(Math.round(remaining));
      gameContainer.dataset.commandScore = String(this.controller.stats.score);
      gameContainer.dataset.commandWords = this.wordBlocks.definitions.map((entry) => entry.word).join(',');
    }
  }

  private finishRun(): void {
    if (this.runEnded) return;
    this.runEnded = true;
    this.inputLocked = true;
    this.clearProjectiles();
    this.player.setMovement(0);
    this.enemy.setMovement(0);
    const durationMs = Math.max(0, Date.now() - this.runStartedAtMs - this.pausedTotalMs);
    const stats = this.controller.finish(this.player.stats.health > 0, durationMs);
    this.persistResult(stats);
    this.time.delayedCall(550, () => this.scene.start('CommandBlockResultScene', stats));
  }

  private persistResult(stats: CommandBlockRunStats): void {
    let save = SaveManager.load();
    save.commandBlock.bestScore = Math.max(save.commandBlock.bestScore, stats.score);
    save.commandBlock.bestCombo = Math.max(save.commandBlock.bestCombo, stats.bestCombo);
    if (stats.won && !save.commandBlock.clearedArenas.includes(stats.arenaId)) save.commandBlock.clearedArenas.push(stats.arenaId);
    if (stats.perfect && !save.commandBlock.perfectArenas.includes(stats.arenaId)) save.commandBlock.perfectArenas.push(stats.arenaId);
    save.player.coins += stats.rewardCoins;
    save.player.englishXp += stats.rewardXp;
    save = new PlayerNeedsSystem().afterBattle(save, stats.won);
    SaveManager.save(save);
  }

  private handleTextFocus(focused: boolean): void { this.textInputFocused = focused; }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pauseStartedAtMs ??= Date.now();
      this.voiceOverlay?.cancel();
      return;
    }
    if (this.pauseStartedAtMs !== undefined) {
      const pausedMs = Math.max(0, Date.now() - this.pauseStartedAtMs);
      this.pausedTotalMs += pausedMs;
      this.controller?.addTime(pausedMs);
      this.effects.enemyDisabledUntil += pausedMs;
      this.effects.projectileSlowUntil += pausedMs;
      this.lastProjectileAt += pausedMs;
      this.pauseStartedAtMs = undefined;
    }
  };

  private clearProjectiles(): void {
    this.projectiles.forEach((projectile) => projectile.destroy());
    this.projectiles = [];
  }

  private cleanup(): void {
    this.voiceOverlay?.destroy();
    this.touch?.destroy();
    this.wordBlocks?.destroy();
    this.clearProjectiles();
    this.temporaryCleanups.forEach((cleanup) => cleanup());
    this.temporaryCleanups = [];
    this.temporaryPlatforms.forEach((object) => {
      if (object.active) object.destroy();
    });
    this.temporaryPlatforms = [];
    this.audio.close();
    EventBus.off(GameEvents.VOICE_RESULT, this.handleVoiceResult, this);
    EventBus.off(GameEvents.VOICE_UTTERANCE, this.handleUtterance, this);
    EventBus.off(GameEvents.TEXT_INPUT_FOCUS, this.handleTextFocus, this);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    const gameContainer = document.querySelector<HTMLElement>('#game-container');
    if (gameContainer) {
      delete gameContainer.dataset.commandActivated;
      delete gameContainer.dataset.commandRemainingMs;
      delete gameContainer.dataset.commandScore;
      delete gameContainer.dataset.commandWords;
    }
    document.querySelector('#dom-overlay')?.replaceChildren();
  }
}
