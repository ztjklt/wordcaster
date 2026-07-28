import Phaser from 'phaser';
import { PlayerNeedsSystem } from '../../home/PlayerNeedsSystem';
import { HomeCameraController } from '../../home/camera/HomeCameraController';
import { HomeDebugOverlay } from '../../home/debug/HomeDebugOverlay';
import { HomeInteractionSystem, type ScoredInteraction } from '../../home/interaction/HomeInteractionSystem';
import { HomeTouchControls } from '../../home/input/HomeTouchControls';
import { InputModeManager } from '../../home/input/InputModeManager';
import { OrientationInput } from '../../home/input/OrientationInput';
import { HOME_WORLD_HEIGHT, HOME_WORLD_WIDTH } from '../../home/HomeSave';
import type { HomeEntranceDefinition, HomeInputMode, HomeVector } from '../../home/HomeTypes';
import { HomePlayerController } from '../../home/player/HomePlayerController';
import { HomeVoiceBridge, type HomeVoiceCommand } from '../../home/voice/HomeVoiceBridge';
import { HOME_BUILDINGS, HOME_ENTRANCES } from '../../home/world/HomeWorldContent';
import { SaveManager, type GameSave } from '../../storage/SaveManager';

interface HomeKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  interactAlt: Phaser.Input.Keyboard.Key;
  mode: Phaser.Input.Keyboard.Key;
  calibrate: Phaser.Input.Keyboard.Key;
  debug: Phaser.Input.Keyboard.Key;
  voice: Phaser.Input.Keyboard.Key;
  exit: Phaser.Input.Keyboard.Key;
}

interface EntranceView {
  ring: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

export class HomeScene extends Phaser.Scene {
  private save!: GameSave;
  private player!: HomePlayerController;
  private cameraController!: HomeCameraController;
  private inputModes!: InputModeManager;
  private orientation!: OrientationInput;
  private touch?: HomeTouchControls;
  private interaction!: HomeInteractionSystem;
  private voice!: HomeVoiceBridge;
  private debug!: HomeDebugOverlay;
  private keys!: HomeKeys;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildingColliders!: Phaser.Physics.Arcade.StaticGroup;
  private readonly entranceViews = new Map<string, EntranceView>();
  private currentTarget?: ScoredInteraction;
  private waypointEntranceId?: string;
  private interactionText!: Phaser.GameObjects.Text;
  private interactionHint!: Phaser.GameObjects.Text;
  private navigationText!: Phaser.GameObjects.Text;
  private inputText!: Phaser.GameObjects.Text;
  private voiceStatus!: Phaser.GameObjects.Text;
  private autosaveText!: Phaser.GameObjects.Text;
  private needsText!: Phaser.GameObjects.Text;
  private gamepadInteractHeld = false;
  private reducedMotion = false;

  constructor() { super('HomeScene'); }

  create(): void {
    document.querySelector('#dom-overlay')?.replaceChildren();
    this.currentTarget = undefined;
    this.waypointEntranceId = undefined;
    this.gamepadInteractHeld = false;
    this.entranceViews.clear();
    this.save = SaveManager.load();
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.physics.world.setBounds(0, 0, HOME_WORLD_WIDTH, HOME_WORLD_HEIGHT);
    this.createWorld();
    this.player = new HomePlayerController(
      this,
      this.save.home.position.x,
      this.save.home.position.y,
      this.save.home.facing,
    );
    this.physics.add.collider(this.player.body, this.buildingColliders);
    this.cameraController = new HomeCameraController(this.cameras.main, HOME_WORLD_WIDTH, HOME_WORLD_HEIGHT);
    this.cameraController.snapTo(this.player.position);

    this.inputModes = new InputModeManager(this.save.home.inputMode);
    this.orientation = new OrientationInput(this.save.home.orientation);
    if (this.save.home.orientation.enabled) this.orientation.attach();
    this.createInputs();
    if (window.innerWidth <= 1000 || window.innerHeight <= 520 || navigator.maxTouchPoints > 0) {
      this.touch = new HomeTouchControls(this, () => void this.enableOrientation());
    }

    this.interaction = new HomeInteractionSystem(HOME_ENTRANCES);
    this.voice = new HomeVoiceBridge(
      (command) => this.handleVoiceCommand(command),
      (message) => this.setVoiceStatus(message),
    );
    this.debug = new HomeDebugOverlay(this, HOME_BUILDINGS, HOME_ENTRANCES, this.save.home.debugEnabled);
    this.createHud();

    this.time.addEvent({ delay: 5000, loop: true, callback: () => this.autosave(false) });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.cameras.main.fadeIn(this.reducedMotion ? 80 : 420, 3, 6, 13);
  }

  update(time: number, delta: number): void {
    const now = Date.now();
    this.updateInputSources(now);
    const movement = this.inputModes.resolve();
    this.player.update(movement, delta, now);
    this.cameraController.update(this.player.position, this.player.velocity, this.player.facingVector, delta);
    this.updateTarget();
    this.updateNavigation();
    this.handleHotkeys();
    this.debug.update({
      fps: this.game.loop.actualFps,
      position: this.player.position,
      velocity: this.player.velocity,
      state: this.player.currentState,
      inputMode: this.inputModes.mode,
      inputSource: this.inputModes.currentSource,
      orientation: this.orientation.raw,
      target: this.currentTarget?.candidate.id,
    });
    this.inputText.setText(`${this.inputModes.mode.toUpperCase()} / ${this.inputModes.currentSource.toUpperCase()}`);
    this.autosaveText.setText(this.save.home.autosavedAt > 0 ? `AUTO SAVE · ${this.relativeSaveTime(now)}` : 'AUTO SAVE · READY');
    if (time % 600 < delta) this.refreshNeeds();
  }

  private createInputs(): void {
    if (!this.input.keyboard) throw new Error('键盘输入不可用');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      interact: 'E',
      interactAlt: 'SPACE',
      mode: 'M',
      calibrate: 'C',
      debug: 'F3',
      voice: 'L',
      exit: 'ESC',
    }) as HomeKeys;
  }

  private updateInputSources(now: number): void {
    const keyboard: HomeVector = {
      x: Number(this.keys.right.isDown || this.cursors.right.isDown) - Number(this.keys.left.isDown || this.cursors.left.isDown),
      y: Number(this.keys.down.isDown || this.cursors.down.isDown) - Number(this.keys.up.isDown || this.cursors.up.isDown),
    };
    this.inputModes.updateSource('keyboard', keyboard, now);

    const gamepad = this.input.gamepad?.gamepads.find((entry) => entry?.connected);
    const gamepadVector = gamepad
      ? { x: gamepad.axes[0]?.getValue() ?? 0, y: gamepad.axes[1]?.getValue() ?? 0 }
      : { x: 0, y: 0 };
    this.inputModes.updateSource('gamepad', gamepadVector, now);
    const gamepadInteract = Boolean(gamepad?.buttons[0]?.pressed);
    if (gamepadInteract && !this.gamepadInteractHeld) this.performCurrentInteraction();
    this.gamepadInteractHeld = gamepadInteract;

    this.inputModes.updateSource('touch', this.touch?.vector ?? { x: 0, y: 0 }, now);
    this.inputModes.updateSource(
      'orientation',
      this.save.home.orientation.enabled ? this.orientation.vector() : { x: 0, y: 0 },
      now,
    );
    if (this.touch?.consumeInteract()) this.performCurrentInteraction();
  }

  private handleHotkeys(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact) || Phaser.Input.Keyboard.JustDown(this.keys.interactAlt)) {
      this.performCurrentInteraction();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.mode)) {
      const mode = this.inputModes.cycleMode();
      this.save.home.inputMode = mode;
      this.setVoiceStatus(`输入模式：${this.inputModeLabel(mode)}`);
      this.autosave(true);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.calibrate)) {
      this.orientation.calibrate();
      Object.assign(this.save.home.orientation, this.orientation.calibration);
      this.setVoiceStatus('体感中立姿态已重新校准');
      this.autosave(true);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.debug)) {
      this.save.home.debugEnabled = this.debug.toggle();
      this.autosave(true);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.voice)) this.voice.toggle();
    if (Phaser.Input.Keyboard.JustDown(this.keys.exit)) {
      this.autosave(true);
      this.scene.start('MainMenuScene');
    }
  }

  private updateTarget(): void {
    const next = this.interaction.select(this.player.position, this.player.facingVector);
    if (next?.candidate.id === this.currentTarget?.candidate.id) return;
    this.currentTarget = next;
    this.entranceViews.forEach((view, id) => {
      const active = id === next?.candidate.id;
      view.ring.setStrokeStyle(active ? 4 : 2, active ? 0xffffff : 0x63f0d4, active ? .95 : .38);
      view.core.setAlpha(active ? .2 : .06).setScale(active ? 1.18 : 1);
      view.label.setAlpha(active ? 1 : .58);
    });
    if (next) {
      this.interactionText.setText(`E  ${next.candidate.label}`).setAlpha(1);
      this.interactionHint.setText(next.candidate.hint).setAlpha(.86);
    } else {
      this.interactionText.setText('靠近发光入口进行交互').setAlpha(.58);
      this.interactionHint.setText('WASD / 摇杆移动 · M 切换输入 · L 言灵导航').setAlpha(.48);
    }
  }

  private performCurrentInteraction(): void {
    const target = this.currentTarget?.candidate;
    if (!target) {
      this.cameras.main.shake(100, .002);
      this.interactionText.setText('附近没有可交互目标').setColor('#ffbf79');
      this.time.delayedCall(600, () => this.interactionText.setColor('#f5f8ff'));
      return;
    }
    this.player.playInteract(Date.now());
    this.save.home.lastEntranceId = target.id;
    if (!this.save.home.visitedEntranceIds.includes(target.id)) this.save.home.visitedEntranceIds.push(target.id);
    this.autosave(true);
    if (target.action.type === 'scene') {
      const destinationScene = target.action.scene;
      this.cameras.main.fadeOut(this.reducedMotion ? 80 : 260, 3, 7, 14);
      this.time.delayedCall(this.reducedMotion ? 90 : 240, () => this.scene.start(destinationScene));
    } else if (target.action.type === 'sleep') {
      this.save = new PlayerNeedsSystem().sleep(this.save);
      this.save.player.hunger = Math.min(100, this.save.player.hunger + 18);
      this.save.player.thirst = Math.min(100, this.save.player.thirst + 22);
      SaveManager.save(this.save);
      this.refreshNeeds();
      this.interactionText.setText('休息完成 · 状态已经恢复').setColor('#ffd47c');
      this.cameras.main.flash(220, 90, 110, 150);
    } else {
      this.scene.start('SettingsScene');
    }
  }

  private async enableOrientation(): Promise<void> {
    const state = await this.orientation.requestPermission();
    if (state !== 'granted') {
      this.setVoiceStatus(state === 'unavailable' ? '此设备不支持体感输入' : '体感权限未开启');
      return;
    }
    this.orientation.calibrate();
    this.save.home.orientation.enabled = true;
    Object.assign(this.save.home.orientation, this.orientation.calibration);
    this.inputModes.setMode('auto');
    this.save.home.inputMode = 'auto';
    this.setVoiceStatus('体感输入已启用并完成校准');
    this.autosave(true);
  }

  private handleVoiceCommand(command: HomeVoiceCommand): void {
    if (command.type === 'interact') {
      this.performCurrentInteraction();
      return;
    }
    if (command.type === 'unknown') {
      this.setVoiceStatus(`没有理解目的地：“${command.transcript}”`);
      return;
    }
    const entrance = HOME_ENTRANCES.find((entry) => entry.id === command.entranceId);
    if (!entrance) return;
    this.waypointEntranceId = entrance.id;
    this.setVoiceStatus(`已标记：${entrance.label}`);
    const view = this.entranceViews.get(entrance.id);
    if (view && !this.reducedMotion) {
      this.tweens.add({ targets: [view.ring, view.core], scale: 1.45, alpha: .95, duration: 300, yoyo: true, repeat: 2 });
    }
  }

  private updateNavigation(): void {
    const entrance = HOME_ENTRANCES.find((entry) => entry.id === this.waypointEntranceId);
    if (!entrance) {
      this.navigationText.setText('HUB WORLD · ONLINE');
      return;
    }
    const position = this.player.position;
    const distance = Math.hypot(entrance.x - position.x, entrance.y - position.y);
    const angle = Phaser.Math.Angle.Between(position.x, position.y, entrance.x, entrance.y);
    const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
    const index = Math.round(Phaser.Math.Angle.Normalize(angle) / (Math.PI / 4)) % 8;
    this.navigationText.setText(`${arrows[index]}  ${entrance.label} · ${Math.round(distance)}m`);
    if (distance <= entrance.radius) {
      this.waypointEntranceId = undefined;
      this.setVoiceStatus('已经到达目的地 · 按 E 交互');
    }
  }

  private createWorld(): void {
    this.cameras.main.setBackgroundColor('#030711');
    this.add.image(HOME_WORLD_WIDTH / 2, HOME_WORLD_HEIGHT / 2, 'scene-home-base-v2')
      .setDisplaySize(HOME_WORLD_WIDTH, HOME_WORLD_HEIGHT)
      .setAlpha(.86)
      .setDepth(-40);
    this.add.rectangle(HOME_WORLD_WIDTH / 2, HOME_WORLD_HEIGHT / 2, HOME_WORLD_WIDTH, HOME_WORLD_HEIGHT, 0x030711, .36).setDepth(-39);
    const roads = this.add.graphics().setDepth(-10);
    roads.lineStyle(120, 0x071424, .72);
    roads.lineBetween(220, 600, 2000, 600);
    roads.lineBetween(1100, 180, 1100, 1050);
    roads.lineStyle(3, 0x63f0d4, .16);
    roads.lineBetween(220, 600, 2000, 600);
    roads.lineBetween(1100, 180, 1100, 1050);
    roads.lineStyle(1, 0xffffff, .07);
    for (let x = 260; x <= 1980; x += 115) roads.lineBetween(x, 584, x + 48, 584);
    for (let y = 210; y <= 1030; y += 105) roads.lineBetween(1084, y, 1084, y + 42);

    for (let index = 0; index < 38; index += 1) {
      const x = 85 + index * 181 % 2040;
      const y = 100 + index * 263 % 1030;
      const tree = this.add.container(x, y).setDepth(-6);
      const shadow = this.add.ellipse(0, 20, 44, 18, 0x010309, .45);
      const trunk = this.add.rectangle(0, 8, 7, 27, 0x291d28, .92);
      const crown = this.add.circle(0, -9, 22 + index % 3 * 4, index % 4 === 0 ? 0x385c67 : 0x244a47, .88)
        .setStrokeStyle(1, index % 3 === 0 ? 0x63f0d4 : 0x8bb5b4, .22);
      tree.add([shadow, trunk, crown]);
      if (!this.reducedMotion) this.tweens.add({ targets: crown, scaleX: 1.06, angle: index % 2 ? 2 : -2, duration: 1700 + index * 23, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    this.buildingColliders = this.physics.add.staticGroup();
    HOME_BUILDINGS.forEach((building) => this.createBuilding(building));
    HOME_ENTRANCES.forEach((entrance) => this.createEntrance(entrance));
    this.add.rectangle(HOME_WORLD_WIDTH / 2, 8, HOME_WORLD_WIDTH, 16, 0x63f0d4, .12).setDepth(30);
  }

  private createBuilding(building: typeof HOME_BUILDINGS[number]): void {
    const container = this.add.container(building.x, building.y).setDepth(4);
    const shadow = this.add.rectangle(14, 18, building.width + 20, building.height + 24, 0x010309, .52);
    const shell = this.add.rectangle(0, 0, building.width, building.height, 0x071321, .94)
      .setStrokeStyle(2, building.accent, .62);
    const roof = this.add.triangle(0, -building.height / 2 - 48, -building.width / 2 - 18, 45, building.width / 2 + 18, 45, 0, -45, building.accent, .22)
      .setStrokeStyle(2, building.accent, .68);
    const iconRing = this.add.circle(0, -28, 45, building.accent, .08).setStrokeStyle(2, building.accent, .62);
    const icon = this.add.text(0, -31, building.icon, {
      fontFamily: '"Noto Sans SC", "PingFang SC", Arial',
      fontSize: '35px',
      fontStyle: 'bold',
      color: '#f4fbff',
    }).setOrigin(.5);
    const label = this.add.text(0, 38, building.label, {
      fontFamily: '"Noto Sans SC", "PingFang SC", Arial',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(.5);
    const subtitle = this.add.text(0, 72, building.subtitle, {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: `#${building.accent.toString(16).padStart(6, '0')}`,
      letterSpacing: 4,
    }).setOrigin(.5);
    const windows = [-1, 1].flatMap((side) => [
      this.add.rectangle(side * (building.width / 2 - 55), 15, 42, 48, building.accent, .08).setStrokeStyle(1, building.accent, .35),
      this.add.rectangle(side * (building.width / 2 - 55), 15, 2, 42, 0xffffff, .12),
    ]);
    container.add([shadow, shell, roof, iconRing, icon, label, subtitle, ...windows]);
    if (!this.reducedMotion) this.tweens.add({ targets: iconRing, scale: 1.08, alpha: .72, duration: 1450, yoyo: true, repeat: -1 });
    const collider = this.add.rectangle(building.x, building.y, building.width, building.height, 0xffffff, .001);
    this.buildingColliders.add(collider);
    (collider.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }

  private createEntrance(entrance: HomeEntranceDefinition): void {
    const building = HOME_BUILDINGS.find((entry) => entry.id === entrance.buildingId);
    const accent = building?.accent ?? 0x63f0d4;
    const core = this.add.circle(entrance.x, entrance.y, 35, accent, .06).setDepth(12);
    const ring = this.add.circle(entrance.x, entrance.y, 47, accent, .015)
      .setStrokeStyle(2, accent, .38)
      .setDepth(13)
      .setInteractive({ useHandCursor: true });
    const marker = this.add.triangle(entrance.x, entrance.y - 23, 0, 9, 7, -4, -7, -4, accent, .85).setDepth(14);
    const label = this.add.text(entrance.x, entrance.y + 58, entrance.label, {
      fontFamily: '"Noto Sans SC", "PingFang SC", Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#edf6ff',
    }).setOrigin(.5).setDepth(14).setAlpha(.58).setShadow(0, 3, '#000000', 7);
    ring.on('pointerdown', () => {
      this.waypointEntranceId = entrance.id;
      this.setVoiceStatus(`已标记：${entrance.label}`);
    });
    this.entranceViews.set(entrance.id, { ring, core, label });
    if (!this.reducedMotion) this.tweens.add({ targets: marker, y: marker.y - 8, alpha: .38, duration: 880, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private createHud(): void {
    const accent = 0x63f0d4;
    this.add.rectangle(640, 39, 1190, 60, 0x020711, .82)
      .setStrokeStyle(1, 0x657b9a, .26)
      .setScrollFactor(0)
      .setDepth(100);
    this.add.rectangle(54, 39, 3, 42, accent, .8).setScrollFactor(0).setDepth(101);
    this.add.text(72, 22, 'HOME WORLD / 行动基地', {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#f4f9ff',
      letterSpacing: 3,
    }).setScrollFactor(0).setDepth(102);
    this.needsText = this.add.text(72, 43, '', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#8da0ba',
      letterSpacing: 1,
    }).setScrollFactor(0).setDepth(102);
    this.navigationText = this.add.text(640, 29, 'HUB WORLD · ONLINE', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '14px',
      color: '#f6faff',
      letterSpacing: 2,
    }).setOrigin(.5).setScrollFactor(0).setDepth(102);
    this.inputText = this.add.text(1198, 20, '', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#63f0d4',
      letterSpacing: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(102);
    this.autosaveText = this.add.text(1198, 44, 'AUTO SAVE · READY', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#6d7e98',
      letterSpacing: 1,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(102);

    this.interactionText = this.add.text(640, 627, '靠近发光入口进行交互', {
      fontFamily: '"Noto Sans SC", "PingFang SC", Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f5f8ff',
    }).setOrigin(.5).setScrollFactor(0).setDepth(105).setShadow(0, 4, '#000000', 9);
    this.interactionHint = this.add.text(640, 654, 'WASD / 摇杆移动 · M 切换输入 · L 言灵导航', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#91a2ba',
      letterSpacing: 1,
    }).setOrigin(.5).setScrollFactor(0).setDepth(105);
    this.voiceStatus = this.add.text(640, 91, 'L · 言灵导航待命', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#7d91ae',
      letterSpacing: 2,
    }).setOrigin(.5).setScrollFactor(0).setDepth(104).setShadow(0, 2, '#000000', 5);

    const voiceButton = this.add.circle(1214, 104, 27, 0x071321, .82)
      .setStrokeStyle(2, accent, .62)
      .setScrollFactor(0)
      .setDepth(106)
      .setInteractive({ useHandCursor: true });
    const voiceGlyph = this.add.text(1214, 103, 'L', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(.5).setScrollFactor(0).setDepth(107);
    voiceButton.on('pointerdown', () => {
      this.voice.toggle();
      this.tweens.add({ targets: [voiceButton, voiceGlyph], scale: .84, duration: 70, yoyo: true });
    });
    this.refreshNeeds();
  }

  private refreshNeeds(): void {
    if (!this.needsText) return;
    this.needsText.setText(`LV.${this.save.player.level} · COIN ${this.save.player.coins} · HUNGER ${this.save.player.hunger}% · THIRST ${this.save.player.thirst}%`);
  }

  private setVoiceStatus(message: string): void {
    this.voiceStatus.setText(message).setColor('#a9fff0').setAlpha(.35);
    this.tweens.add({ targets: this.voiceStatus, alpha: 1, duration: 180 });
  }

  private autosave(immediate: boolean): void {
    if (!this.player) return;
    this.save.home.position = this.player.position;
    this.save.home.facing = this.player.facingVector;
    this.save.home.autosavedAt = Date.now();
    SaveManager.save(this.save);
    if (immediate && this.autosaveText) {
      this.autosaveText.setColor('#63f0d4');
      this.time.delayedCall(400, () => this.autosaveText?.setColor('#6d7e98'));
    }
  }

  private relativeSaveTime(now: number): string {
    const seconds = Math.max(0, Math.round((now - this.save.home.autosavedAt) / 1000));
    return seconds < 2 ? 'NOW' : `${seconds}s AGO`;
  }

  private inputModeLabel(mode: HomeInputMode): string {
    const labels: Record<HomeInputMode, string> = {
      auto: '自动',
      keyboard: '键鼠',
      gamepad: '手柄',
      touch: '摇杆',
      orientation: '体感',
    };
    return labels[mode];
  }

  private cleanup(): void {
    this.autosave(true);
    this.voice?.destroy();
    this.orientation?.destroy();
    this.touch?.destroy();
    this.debug?.destroy();
    this.player?.destroy();
    document.querySelector('#dom-overlay')?.replaceChildren();
  }
}
