import Phaser from 'phaser';
import { EnemyAI } from '../ai/EnemyAI';
import { AudioDuckingController } from '../../audio/AudioDuckingController';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../events/GameEvents';
import { CombatSystem } from '../combat/CombatSystem';
import { BulletTimeSystem } from '../combat/BulletTimeSystem';
import { Enemy } from '../entities/Enemy';
import { Fighter } from '../entities/Fighter';
import { Player } from '../entities/Player';
import { KeyboardControls } from '../input/KeyboardControls';
import { TouchControls } from '../input/TouchControls';
import { VoiceOverlay } from '../ui/VoiceOverlay';
import type { SpeechResult } from '../../voice/SpeechProvider';
import { IntentResolver } from '../../language/IntentResolver';
import { HintSystem } from '../../language/HintSystem';
import { VocabularyProgress } from '../../language/VocabularyProgress';
import { EquipmentSystem } from '../combat/EquipmentSystem';
import { ObjectCommandSystem } from '../objects/ObjectCommandSystem';
import { WrongSummonFactory } from '../objects/WrongSummonFactory';
import { buildLessonChallengePrompts, LanguageChallengeAI } from '../ai/LanguageChallengeAI';
import { PlayerNeedsSystem } from '../../home/PlayerNeedsSystem';
import { SaveManager } from '../../storage/SaveManager';
import { createBattleStats } from '../combat/BattleStats';
import { AudioManager } from '../../audio/AudioManager';
import { addButton } from './SceneHelpers';
import type { AIInterpretation } from '../../voice/VoiceTypes';
import type { GameplayCommand } from '../../language/GameplayCommand';
import { getArena, type ArenaDefinition } from '../arena/BattleContent';
import { contributesToOralMastery } from '../../voice/VoiceFeedback';
import { CombatVfxDirector } from '../combat/CombatVfxDirector';

export class BattleScene extends Phaser.Scene {
  private player!: Player;
  private enemy!: Enemy;
  private enemyAI!: EnemyAI;
  private keyboard!: KeyboardControls;
  private touch?: TouchControls;
  private playerHealthBar!: Phaser.GameObjects.Rectangle;
  private enemyHealthBar!: Phaser.GameObjects.Rectangle;
  private staminaBar!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private voiceText!: Phaser.GameObjects.Text;
  private voiceOverlay!: VoiceOverlay;
  private bulletTime!: BulletTimeSystem;
  private audioDucking!: AudioDuckingController;
  private readonly intentResolver = new IntentResolver();
  private readonly hintSystem = new HintSystem();
  private readonly vocabularyProgress = new VocabularyProgress();
  private equipment!: EquipmentSystem;
  private objectCommands!: ObjectCommandSystem;
  private wrongSummons!: WrongSummonFactory;
  private languageChallenge = new LanguageChallengeAI();
  private rivalSpeech!: Phaser.GameObjects.Container;
  private rivalSpeechPrefix!: Phaser.GameObjects.Text;
  private challengeText!: Phaser.GameObjects.Text;
  private challengeTimerBar!: Phaser.GameObjects.Rectangle;
  private rivalHint!: Phaser.GameObjects.Container;
  private rivalHintPrefix!: Phaser.GameObjects.Text;
  private rivalHintText!: Phaser.GameObjects.Text;
  private rivalHintTween?: Phaser.Tweens.Tween;
  private challengeAura?:Phaser.GameObjects.Container;
  private battleOver = false;
  private playerHitConnected = false;
  private enemyHitConnected = false;
  private readonly stats = createBattleStats();
  private battleElapsedMs = 0;
  private readonly audio = new AudioManager();
  private tutorialActive = false;
  private equippedSkills: string[] = [];
  private readonly pendingAI = new Map<string, string>();
  private arena!: ArenaDefinition;
  private textInputFocused=false;
  private mobileLayout=false;
  private effectsQuality:'high'|'low'='high';
  private reducedMotion=false;
  private playerComboIndex = -1;
  private playerComboExpiresAt = 0;
  private playerLungeUntil = 0;
  private playerLungeSpeed = 0;
  private enemyAttackToken = 0;
  private hitStopUntil = 0;
  private hitStopAnimationTime = 0;
  private hitStopResume?: Phaser.Time.TimerEvent;
  private combatVfx!: CombatVfxDirector;
  private lastDashDustAt = 0;
  private lastRivalGuideAt = -10000;

  constructor() { super('BattleScene'); }

  create(): void {
    document.querySelector('#dom-overlay')?.replaceChildren();
    this.physics.world.setBounds(0, 0, 1280, 720);
    this.createTextures();
    const save = SaveManager.load();
    this.arena = getArena(save.selectedArenaId);
    this.mobileLayout = window.innerWidth <= 1000 || window.innerHeight <= 520;
    this.effectsQuality=save.settings.effectsQuality ?? 'high';
    this.reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.combatVfx = new CombatVfxDirector(this, this.effectsQuality, this.reducedMotion);
    const platforms = this.createArena(this.effectsQuality);
    this.equippedSkills = save.equippedSkills;
    this.player = new Player(this, 250, 450, save.player.maxHealth, save.player.maxStamina);
    this.enemy = new Enemy(this, 1000, 450);
    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.enemy, platforms);
    this.physics.add.collider(this.player, this.enemy);
    this.equipment = new EquipmentSystem(this, this.player);
    this.objectCommands = new ObjectCommandSystem(this, platforms, this.player, this.enemy);
    this.wrongSummons = new WrongSummonFactory(this, platforms);
    this.objectCommands.getObjects().forEach((object) => {
      this.physics.add.collider(object, this.player, () => this.handleObjectImpact(object, this.player));
      this.physics.add.collider(object, this.enemy, () => this.handleObjectImpact(object, this.enemy));
    });
    this.keyboard = new KeyboardControls(this);
    if (this.mobileLayout) this.touch = new TouchControls(this);
    this.enemyAI = new EnemyAI(this.enemy, this.player);
    this.bulletTime = new BulletTimeSystem(this);
    this.audioDucking = new AudioDuckingController(this.sound);
    this.createHud();
    this.battleElapsedMs = 0;
    this.languageChallenge = new LanguageChallengeAI(
      9000,
      18000,
      6500,
      buildLessonChallengePrompts(this.arena.lesson),
    );
    this.voiceOverlay = new VoiceOverlay();
    EventBus.on(GameEvents.VOICE_LISTEN_START, this.handleVoiceStart, this);
    EventBus.on(GameEvents.VOICE_LISTEN_END, this.handleVoiceEnd, this);
    EventBus.on(GameEvents.VOICE_RESULT, this.handleVoiceResult, this);
    EventBus.on(GameEvents.VOICE_RETRY, this.handleVoiceRetry, this);
    EventBus.on(GameEvents.VOICE_ERROR, this.handleVoiceError, this);
    EventBus.on(GameEvents.VOICE_INTERPRETATION, this.handleVoiceInterpretation, this);
    EventBus.on(GameEvents.HINT_REQUEST, this.handleHintRequest, this);
    EventBus.on(GameEvents.TEXT_INPUT_FOCUS, this.handleTextFocus, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.cameras.main.fadeIn(this.reducedMotion?120:480,4,7,16);
    if (!save.settings.tutorialSeen) this.showTutorial(); else this.showArenaIntro();
  }

  update(time: number, delta: number): void {
    if (this.battleOver) {
      this.player?.animate(time, delta);
      this.enemy?.animate(time, delta);
      return;
    }
    if (this.tutorialActive) return;
    if (time < this.hitStopUntil) {
      this.player.animate(this.hitStopAnimationTime, 0);
      this.enemy.animate(this.hitStopAnimationTime, 0);
      this.refreshHud();
      return;
    }
    this.battleElapsedMs += delta;
    const movement = this.textInputFocused ? 0 : this.keyboard.movement || this.touch?.movement || 0;
    if (time < this.playerLungeUntil && !this.player.stats.blocking) {
      this.player.setVelocityX(this.player.facing * this.playerLungeSpeed);
      if (time - this.lastDashDustAt > (this.effectsQuality === 'high' ? 62 : 110)) {
        this.lastDashDustAt = time;
        this.combatVfx.dashDust(this.player.x, this.player.y, this.player.facing, this.arena.accent);
      }
    } else {
      this.player.setMovement(movement);
    }
    this.player.setBlocking(this.keyboard.blocking || Boolean(this.touch?.blocking));
    if (!this.textInputFocused && (this.keyboard.jumpPressed || this.touch?.consumeJump())) this.player.jump();
    if (!this.textInputFocused && (this.keyboard.attackPressed || this.touch?.consumeAttack())) this.tryPlayerAttack(time);
    const challengeEvent = this.languageChallenge.update(this.battleElapsedMs);
    if (challengeEvent === 'started') this.showChallenge();
    if (challengeEvent === 'expired') this.failChallenge('TIME UP');
    if (this.languageChallenge.state.active) { this.enemy.setMovement(0); this.enemy.setTint(0xffcf5c); this.updateChallengeCountdown(); }
    else { const decision = this.enemyAI.update(time); if (decision === 'attack') this.tryEnemyAttack(time); }
    CombatSystem.regenerateStamina(this.player.stats, delta / 1000);
    CombatSystem.regenerateStamina(this.enemy.stats, delta / 1000);
    this.equipment.update();
    this.player.animate(time, delta); this.enemy.animate(time, delta);
    this.challengeAura?.setPosition(this.enemy.x,this.enemy.y-12);
    this.updateRivalSpeechPosition();
    this.refreshHud();
  }

  private createTextures(): void {
    if (!this.textures.exists('fighter-player')) this.drawFighterTexture('fighter-player', 0x4de6c8);
    if (!this.textures.exists('fighter-enemy')) this.drawFighterTexture('fighter-enemy', 0xff6279);
  }

  private drawFighterTexture(key: string, color: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.lineStyle(10, color, 1).strokeCircle(48, 30, 22);
    graphics.lineBetween(48, 53, 48, 92);
    graphics.lineBetween(48, 63, 17, 82); graphics.lineBetween(48, 63, 78, 47);
    graphics.lineBetween(48, 91, 23, 126); graphics.lineBetween(48, 91, 76, 126);
    graphics.generateTexture(key, 96, 136); graphics.destroy();
  }

  private createArena(effectsQuality: 'high'|'low'): Phaser.Physics.Arcade.StaticGroup {
    this.cameras.main.setBackgroundColor('#080d18');
    const backdrop = this.add.image(640, 360, this.arena.textureKey).setDisplaySize(1304, 734).setDepth(-20);
    this.tweens.add({
      targets: backdrop,
      x: 646,
      y: 357,
      duration: 12000,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    this.add.rectangle(640, 360, 1280, 720, 0x050816, .18).setDepth(-19);
    this.add.circle(1040, 150, 280, this.arena.accent, 0.08).setBlendMode(Phaser.BlendModes.ADD).setDepth(-18);
    this.createAtmosphere(this.arena.atmosphere, effectsQuality === 'high' ? 1 : .45);
    this.createDepthLighting(effectsQuality);
    const platforms = this.physics.add.staticGroup();
    const addPlatform = (x: number, y: number, width: number, height: number, color: number) => {
      this.add.rectangle(x, y + Math.max(8, height * .35), width + 14, height + 18, 0x02040a, .58).setDepth(0);
      this.add.tileSprite(x, y, width, height, this.arena.platformTextureKey)
        .setTileScale(.5, Math.max(.09, height / 192))
        .setTint(color === this.arena.platform ? 0xffffff : 0xc9d4e8)
        .setDepth(2);
      this.add.rectangle(x, y - height / 2 + 1, width, 2, this.arena.accent, .62).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
      this.add.rectangle(x, y + height / 2 - 1, width, 3, 0x03050b, .88).setDepth(3);
      if(height<30){
        this.add.rectangle(x,y+height/2+8,width-18,4,this.arena.accent,.14).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
        this.add.triangle(x-width*.31,y+height/2+10,-10,-8,10,-8,0,7,this.arena.platform,.88).setStrokeStyle(1,this.arena.accent,.28).setDepth(1);
        this.add.triangle(x+width*.31,y+height/2+10,-10,-8,10,-8,0,7,this.arena.platform,.88).setStrokeStyle(1,this.arena.accent,.28).setDepth(1);
      }
      const collider = this.add.rectangle(x, y, width, height, color, .001).setDepth(1);
      platforms.add(collider);
      (collider.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    };
    addPlatform(640, 575, 1280, 64, this.arena.platform);
    addPlatform(385, 430, 250, 18, this.arena.platform);
    addPlatform(850, 370, 230, 18, this.arena.platform);
    const arenaPlaque = this.add.container(640, 548).setDepth(4);
    const plaqueLineLeft = this.add.rectangle(-86, 0, 54, 1, this.arena.accent, .42);
    const plaqueLineRight = this.add.rectangle(86, 0, 54, 1, this.arena.accent, .42);
    const plaqueText = this.add.text(0, 0, this.arena.name, { fontFamily: 'Arial', fontSize: '10px', fontStyle: 'bold', color: this.arena.accentCss, letterSpacing: 5 }).setOrigin(.5).setAlpha(.78);
    arenaPlaque.add([plaqueLineLeft, plaqueLineRight, plaqueText]);
    return platforms;
  }
  private createAtmosphere(kind: ArenaDefinition['atmosphere'], density: number): void {
    const baseCount: Record<ArenaDefinition['atmosphere'], number> = {
      rain: 54,
      petals: 24,
      steam: 20,
      motes: 34,
      sparks: 28,
    };
    const count = Math.round(baseCount[kind] * density);
    for (let index = 0; index < count; index += 1) {
      if (kind === 'rain') {
        const rain = this.add.rectangle(
          Phaser.Math.Between(0, 1280),
          Phaser.Math.Between(-100, 680),
          1,
          Phaser.Math.Between(18, 34),
          0x8fe8ff,
          .28,
        ).setRotation(-.14).setDepth(-5);
        this.tweens.add({
          targets: rain,
          x: '+=85',
          y: 780,
          duration: Phaser.Math.Between(850, 1300),
          delay: Phaser.Math.Between(0, 900),
          repeat: -1,
          onRepeat: () => rain.setPosition(Phaser.Math.Between(-80, 1280), -40),
        });
      } else if (kind === 'petals') {
        const petal = this.add.ellipse(
          Phaser.Math.Between(0, 1280),
          Phaser.Math.Between(-50, 600),
          Phaser.Math.Between(5, 10),
          3,
          0xff82bd,
          .65,
        ).setDepth(-4);
        this.tweens.add({
          targets: petal,
          x: `+=${Phaser.Math.Between(120, 300)}`,
          y: 760,
          rotation: Phaser.Math.FloatBetween(2, 7),
          duration: Phaser.Math.Between(4500, 8000),
          delay: Phaser.Math.Between(0, 4000),
          repeat: -1,
          onRepeat: () => petal.setPosition(Phaser.Math.Between(-120, 1100), -20),
        });
      } else if (kind === 'motes') {
        const mote = this.add.circle(
          Phaser.Math.Between(45, 1235),
          Phaser.Math.Between(130, 590),
          Phaser.Math.Between(1, 3),
          index % 4 === 0 ? 0xffcf82 : this.arena.accent,
          Phaser.Math.FloatBetween(.16, .46),
        ).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: mote,
          x: `+=${Phaser.Math.Between(-50, 50)}`,
          y: `-=${Phaser.Math.Between(45, 120)}`,
          alpha: { from: mote.alpha, to: .04 },
          scale: { from: .7, to: 1.65 },
          duration: Phaser.Math.Between(2600, 5200),
          delay: Phaser.Math.Between(0, 2200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      } else if (kind === 'sparks') {
        const spark = this.add.rectangle(
          Phaser.Math.Between(20, 1260),
          Phaser.Math.Between(110, 555),
          Phaser.Math.Between(8, 24),
          1,
          index % 5 === 0 ? 0xffb963 : 0x73eaff,
          Phaser.Math.FloatBetween(.22, .58),
        ).setDepth(-4).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: spark,
          x: `+=${Phaser.Math.Between(40, 125)}`,
          scaleX: .1,
          alpha: 0,
          duration: Phaser.Math.Between(420, 900),
          delay: Phaser.Math.Between(0, 2600),
          repeat: -1,
          repeatDelay: Phaser.Math.Between(450, 1800),
          onRepeat: () => spark
            .setPosition(Phaser.Math.Between(20, 1220), Phaser.Math.Between(110, 555))
            .setScale(1)
            .setAlpha(Phaser.Math.FloatBetween(.22, .58)),
        });
      } else {
        const steam = this.add.circle(
          Phaser.Math.Between(80, 1200),
          Phaser.Math.Between(450, 570),
          Phaser.Math.Between(9, 22),
          0xffe7cf,
          .08,
        ).setDepth(-4);
        this.tweens.add({
          targets: steam,
          y: '-=170',
          x: `+=${Phaser.Math.Between(-40, 40)}`,
          alpha: 0,
          scale: 2.2,
          duration: Phaser.Math.Between(2400, 4200),
          delay: Phaser.Math.Between(0, 2500),
          repeat: -1,
          onRepeat: () => steam
            .setPosition(Phaser.Math.Between(80, 1200), Phaser.Math.Between(500, 575))
            .setAlpha(.08)
            .setScale(1),
        });
      }
    }
  }

  private createDepthLighting(quality:'high'|'low'):void{
    const mistCount=quality==='high'?4:2;
    const mistColor = this.arena.atmosphere === 'steam'
      ? 0xffd6c4
      : this.arena.atmosphere === 'motes'
        ? 0xd8c7ff
        : this.arena.atmosphere === 'sparks'
          ? 0x8beeff
          : 0xc9ecff;
    for(let index=0;index<mistCount;index+=1){
      const mist=this.add.ellipse(Phaser.Math.Between(-100,1180),Phaser.Math.Between(470,595),Phaser.Math.Between(330,520),Phaser.Math.Between(34,72),mistColor,Phaser.Math.FloatBetween(.018,.045)).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
      if(!this.reducedMotion)this.tweens.add({targets:mist,x:'+=260',alpha:{from:mist.alpha,to:mist.alpha*.25},duration:Phaser.Math.Between(7000,12000),delay:index*900,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    }
    if(this.arena.id==='neon-shrine'){
      this.add.triangle(1080,230,-90,-210,90,-210,250,370,this.arena.accent,.025).setBlendMode(Phaser.BlendModes.ADD).setDepth(-3);
      this.add.circle(1118,118,56,0xffd8a8,.035).setBlendMode(Phaser.BlendModes.ADD).setDepth(-3);
    }else if(this.arena.id==='moon-bamboo'){
      this.add.rectangle(24,360,48,720,0x02070a,.2).setDepth(16);
      this.add.rectangle(1256,360,48,720,0x02070a,.2).setDepth(16);
    }else if(this.arena.id==='sunrise-kitchen'){
      this.add.triangle(1040,260,-130,-250,110,-250,275,390,0xffd895,.035).setBlendMode(Phaser.BlendModes.ADD).setDepth(-3);
      this.add.ellipse(970,522,360,80,0xffb968,.026).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
    }else if(this.arena.id==='cozy-study'){
      this.add.circle(1030,132,112,0xb99cff,.032).setBlendMode(Phaser.BlendModes.ADD).setDepth(-3);
      this.add.ellipse(236,518,260,74,0xffbd72,.03).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
    }else if(this.arena.id==='metro-commute'){
      for(const x of [208,490,772,1054]){
        this.add.rectangle(x,164,176,3,0x8beeff,.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(-3);
        this.add.triangle(x,318,-88,-154,88,-154,146,220,0x8beeff,.015).setBlendMode(Phaser.BlendModes.ADD).setDepth(-3);
      }
    }else{
      for(const x of [176,1094])this.add.circle(x,520,88,0xffb45e,.035).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
    }
    this.add.rectangle(640,710,1280,20,0x010309,.72).setDepth(18);
  }

  private createHud(): void {
    this.add.rectangle(244, 58, 400, 82, 0x07101f, .68).setStrokeStyle(1, 0x57708d, .34).setDepth(29);
    this.add.rectangle(1036, 58, 400, 82, 0x07101f, .68).setStrokeStyle(1, 0x57708d, .34).setDepth(29);
    this.add.text(58, 20, 'PLAYER / 言灵使', { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#76f7de', letterSpacing: 2 }).setDepth(32);
    this.add.rectangle(58, 50, 360, 18, 0x111a2a, .96).setOrigin(0, 0.5).setStrokeStyle(1, 0x6d7f9a, .42).setDepth(30);
    this.playerHealthBar = this.add.rectangle(58, 50, 360, 14, 0x55e8cb).setOrigin(0, 0.5).setDepth(31);
    this.add.rectangle(58, 74, 250, 7, 0x101a2b, .96).setOrigin(0, 0.5).setDepth(30);
    this.staminaBar = this.add.rectangle(58, 74, 250, 5, 0xffd56a).setOrigin(0, 0.5).setDepth(31);
    for (let index = 1; index < 5; index += 1) this.add.rectangle(58 + index * 72, 50, 1, 14, 0x07101f, .48).setDepth(32);
    this.add.text(1222, 20, 'RIVAL / 宿敌', { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#ff7990', letterSpacing: 2 }).setOrigin(1, 0).setDepth(32);
    this.add.rectangle(1222, 50, 360, 18, 0x111a2a, .96).setOrigin(1, 0.5).setStrokeStyle(1, 0x6d7f9a, .42).setDepth(30);
    this.enemyHealthBar = this.add.rectangle(1222, 50, 360, 14, 0xff647f).setOrigin(1, 0.5).setDepth(31);
    for (let index = 1; index < 5; index += 1) this.add.rectangle(1222 - index * 72, 50, 1, 14, 0x07101f, .48).setDepth(32);
    this.add.rectangle(640, 35, 252, 48, 0x050a15, .58).setStrokeStyle(1, this.arena.accent, .22).setDepth(29);
    this.statusText = this.add.text(640, 35, 'FIGHT!', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#f5f7ff', letterSpacing: 2 }).setOrigin(0.5).setDepth(32).setShadow(0, 2, '#000000', 5);
    this.voiceText = this.add.text(640, 248, '', { fontFamily: 'Arial', fontSize: '15px', color: '#8291ad', padding: { x: 12, y: 7 } }).setOrigin(0.5).setDepth(30).setShadow(0,2,'#000000',5);
    this.rivalSpeech = this.add.container(this.enemy.x, this.enemy.y - 166).setDepth(36).setVisible(false);
    this.rivalSpeechPrefix = this.add.text(0, -31, 'RIVAL / 对手', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffcf70',
      letterSpacing: 4,
    }).setOrigin(.5).setShadow(0, 2, '#02040a', 6);
    this.challengeText = this.add.text(0, 0, '', {
      fontFamily: 'Arial Black, Arial',
      fontSize: this.mobileLayout ? '20px' : '25px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: this.mobileLayout ? 460 : 570 },
    }).setOrigin(.5).setShadow(0, 3, '#02040a', 8);
    const challengeTimerTrack = this.add.rectangle(0, 39, this.mobileLayout ? 330 : 440, 1, 0xffffff, .2);
    this.challengeTimerBar = this.add.rectangle(
      -(this.mobileLayout ? 330 : 440) / 2,
      39,
      this.mobileLayout ? 330 : 440,
      2,
      0xffcf70,
      .96,
    ).setOrigin(0, .5);
    const rivalTick = this.add.rectangle(0, 39, 5, 5, 0xffffff, .86).setRotation(Math.PI / 4);
    this.rivalSpeech.add([
      this.rivalSpeechPrefix,
      this.challengeText,
      challengeTimerTrack,
      this.challengeTimerBar,
      rivalTick,
    ]);
    this.rivalHint = this.add.container(this.enemy.x, this.enemy.y - 96).setDepth(37).setVisible(false);
    this.rivalHintPrefix = this.add.text(0, -17, 'RIVAL / 提示', {
      fontFamily: 'Arial',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#ffcf70',
      letterSpacing: 3,
    }).setOrigin(.5).setShadow(0, 2, '#02040a', 5);
    this.rivalHintText = this.add.text(0, 7, '', {
      fontFamily: 'Arial',
      fontSize: this.mobileLayout ? '15px' : '17px',
      fontStyle: 'bold',
      color: '#fff0bd',
      align: 'center',
    }).setOrigin(.5).setShadow(0, 2, '#02040a', 7);
    const hintUnderline = this.add.rectangle(0, 28, this.mobileLayout ? 210 : 280, 1, this.arena.accent, .72);
    this.rivalHint.add([this.rivalHintPrefix, this.rivalHintText, hintUnderline]);
    const auraOuter=this.add.circle(0,0,68,0xffcf70,0).setStrokeStyle(2,0xffcf70,.42);
    const auraInner=this.add.circle(0,0,49,this.arena.accent,.025).setStrokeStyle(1,this.arena.accent,.6);
    const auraMarks=this.add.graphics().lineStyle(2,0xffcf70,.62);
    for(let index=0;index<8;index+=1){const angle=index*Math.PI/4;auraMarks.lineBetween(Math.cos(angle)*73,Math.sin(angle)*73,Math.cos(angle)*82,Math.sin(angle)*82);}
    this.challengeAura=this.add.container(this.enemy?.x??1000,this.enemy?.y??450,[auraOuter,auraInner,auraMarks]).setDepth(24).setVisible(false);
    if(!this.reducedMotion)this.tweens.add({targets:[auraOuter,auraInner],scale:{from:.92,to:1.08},alpha:{from:.5,to:1},duration:780,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    if (!this.mobileLayout) {
      this.add.text(58, 92, 'A/D 移动  ·  W 跳跃  ·  J 攻击  ·  K 格挡', { fontFamily: 'Arial', fontSize: '11px', color: '#a7b4ca' }).setDepth(30).setShadow(0, 2, '#000000', 4);
    }
  }

  private handleVoiceStart(): void { if (this.battleOver) return; if (!this.languageChallenge.state.active) this.statusText.setText('言灵展开 · 持续聆听'); }
  private handleVoiceEnd(): void { if (!this.battleOver && !this.languageChallenge.state.active) this.statusText.setText('FIGHT!'); }
  private handleVoiceResult(result: SpeechResult): void {
    this.stats.voiceUses += 1;
    const hintLevel = this.hintSystem.currentLevel;
    const command = this.intentResolver.resolve(result, hintLevel);
    if (this.languageChallenge.state.active) {
      const answer = this.languageChallenge.answer(command, this.battleElapsedMs);
      if (answer === 'correct') {
        this.audio.play('success');
        this.playVoiceCast(true);
        if (contributesToOralMastery(result.provider)) {
          this.stats.correctExpressions += 1;
          if (hintLevel === 0) this.stats.independentExpressions += 1;
          if (command.itemId) this.recordProgress(command.itemId, command.languageScore, hintLevel === 0);
        }
        const action = command.intent === 'SUMMON_EQUIPMENT' && command.itemId
          ? this.equipment.equip(command.itemId)
          : this.objectCommands.execute(command);
        this.enemy.setVelocityX(this.enemy.x > this.player.x ? 420 : -420);
        this.enemy.setTint(0x9e89ff);
        this.voiceText
          .setText(`CHALLENGE CLEARED · ${action} · ${command.languageScore}分`)
          .setColor('#4de6c8');
        EventBus.emit(GameEvents.VOICE_COMMAND_SUCCESS,{utteranceId:result.utteranceId,challenge:true});
        this.hideChallenge();
        return;
      }
      this.failChallenge(command.intent === 'SUMMON_WRONG_ITEM' ? `WRONG: ${command.mistakenWord}` : 'WRONG ANSWER');
      if (command.intent !== 'SUMMON_WRONG_ITEM') return;
    }
    if (command.itemId && command.intent !== 'SUMMON_WRONG_ITEM' && !this.arena.lesson.words.some((word) => word.itemId === command.itemId)) { this.voiceText.setText(`${command.itemId.toUpperCase()} 不在本局言灵词库`).setColor('#ffcf5c'); this.showRivalGuidance('只用本局开放的言灵词。'); EventBus.emit(GameEvents.VOICE_COMMAND_FAILED, { utteranceId: result.utteranceId, reason: 'not-in-lesson' }); return; }
    if ((command.intent === 'SUMMON_EQUIPMENT' || command.intent === 'CAST_SKILL') && command.itemId && !this.equippedSkills.includes(command.itemId)) { this.voiceText.setText(`${command.itemId.toUpperCase()} 未装备，请在战斗准备中配置`).setColor('#ffcf5c'); this.showRivalGuidance('先在备战中装备它。'); EventBus.emit(GameEvents.VOICE_COMMAND_FAILED,{utteranceId:result.utteranceId,reason:'not-equipped'}); return; }
    if (command.intent === 'UNKNOWN') { if (result.utteranceId) this.pendingAI.set(result.utteranceId, result.transcript); this.voiceText.setText(`AI 正在理解自由表达`).setColor('#ffcf5c'); return; }
    if (command.intent === 'SUMMON_EQUIPMENT' && command.itemId) { this.audio.play('success'); this.playVoiceCast(); if(contributesToOralMastery(result.provider))this.recordSuccessfulExpression(hintLevel); const mastery = contributesToOralMastery(result.provider) ? this.recordProgress(command.itemId, command.languageScore, hintLevel === 0) : (SaveManager.load().vocabularyMastery[command.itemId] ?? 0); this.voiceText.setText(`${this.equipment.equip(command.itemId)} · ${!contributesToOralMastery(result.provider) ? '念写不计口语分' : `${command.languageScore}分 · 掌握${mastery}%`}`).setColor('#4de6c8'); EventBus.emit(GameEvents.VOICE_COMMAND_SUCCESS,{utteranceId:result.utteranceId,challenge:false}); this.hintSystem.reset(); return; }
    if (command.intent === 'SUMMON_WRONG_ITEM' && command.itemId) {
      this.audio.play('wrong'); this.stats.wrongSummons += 1; this.stats.lastMistake = command.mistakenWord;
      const item = this.wrongSummons.spawn(command.itemId, this.player.x + this.player.facing * 150);
      this.physics.add.collider(item, this.player, () => this.handleWrongImpact(item, this.player));
      this.physics.add.collider(item, this.enemy, () => this.handleWrongImpact(item, this.enemy));
      this.voiceText.setText(`You said: ${command.mistakenWord} · Summoned: ${command.itemId.toUpperCase()}`).setColor('#ff8294');
      EventBus.emit(GameEvents.VOICE_COMMAND_FAILED,{utteranceId:result.utteranceId,reason:'confusable'});
      return;
    }
    if(contributesToOralMastery(result.provider))this.recordSuccessfulExpression(hintLevel); const mastery = command.itemId && contributesToOralMastery(result.provider) ? this.recordProgress(command.itemId, command.languageScore, hintLevel === 0) : 0;
    this.voiceText.setText(`${this.objectCommands.execute(command)} · ${command.languageScore}分${mastery ? ` · 掌握${mastery}%` : ''}`).setColor('#4de6c8'); this.hintSystem.reset();
    this.playVoiceCast(); EventBus.emit(GameEvents.VOICE_COMMAND_SUCCESS,{utteranceId:result.utteranceId,challenge:false});
  }
  private handleVoiceRetry(message: string): void { this.stats.retries += 1; this.voiceText.setText(`${message} · 免费重试`).setColor('#ffcf5c'); }
  private handleVoiceError(message: string): void { this.voiceText.setText(message).setColor('#ff8294'); }
  private handleVoiceInterpretation(result: AIInterpretation): void {
    const raw = this.pendingAI.get(result.utteranceId); if (!raw) return; this.pendingAI.delete(result.utteranceId);
    if (result.confidence < 0.65 || result.intent === 'UNKNOWN') { this.voiceText.setText(`系统理解：${result.naturalText} · 暂无可执行动作`).setColor('#ffcf5c'); this.showRivalGuidance('换一个更短、更明确的英语句式。'); EventBus.emit(GameEvents.VOICE_COMMAND_FAILED,{utteranceId:result.utteranceId,reason:'unknown'}); return; }
    if(result.itemId&&!this.arena.lesson.words.some((word)=>word.itemId===result.itemId)){this.voiceText.setText(`${result.itemId.toUpperCase()} 不在本局言灵词库`).setColor('#ffcf5c');EventBus.emit(GameEvents.VOICE_COMMAND_FAILED,{utteranceId:result.utteranceId,reason:'not-in-lesson'});return;}
    const command: GameplayCommand = { intent: result.intent, itemId: result.itemId, rawTranscript: raw, normalizedTranscript: raw.toLowerCase(), confidence: result.confidence, languageScore: 0 };
    if ((command.intent === 'SUMMON_EQUIPMENT' || command.intent === 'CAST_SKILL') && command.itemId && !this.equippedSkills.includes(command.itemId)) { this.voiceText.setText(`${command.itemId.toUpperCase()} 未装备`).setColor('#ffcf5c'); EventBus.emit(GameEvents.VOICE_COMMAND_FAILED,{utteranceId:result.utteranceId,reason:'not-equipped'}); return; }
    if (command.intent === 'SUMMON_EQUIPMENT' && command.itemId) {
      this.equipment.equip(command.itemId);
      this.audio.play('success');
      this.playVoiceCast();
      this.voiceText.setText(`系统理解：${result.naturalText} · 已执行`).setColor('#4de6c8');
      EventBus.emit(GameEvents.VOICE_COMMAND_SUCCESS,{utteranceId:result.utteranceId,challenge:false});
      return;
    }
    this.voiceText.setText(`${this.objectCommands.execute(command)} · AI 理解执行，不计学习得分`).setColor('#4de6c8');
    this.audio.play('success');
    this.playVoiceCast();
    EventBus.emit(GameEvents.VOICE_COMMAND_SUCCESS,{utteranceId:result.utteranceId,challenge:false});
  }
  private handleHintRequest(): void {
    this.stats.hintsUsed += 1;
    const hint = this.hintSystem.next();
    this.showRivalLine(hint.text, `RIVAL / 对手提示 ${hint.level}/4`, 1900);
  }
  private handleTextFocus(focused:boolean):void{this.textInputFocused=focused;if(focused)this.player.setMovement(0);}
  private recordProgress(itemId: string, score: number, independent: boolean): number { this.vocabularyProgress.recordSentence(`command_${itemId}`, score); return this.vocabularyProgress.recordVocabulary(itemId, score, independent); }
  private recordSuccessfulExpression(hintLevel: number): void { this.stats.correctExpressions += 1; if (hintLevel === 0) this.stats.independentExpressions += 1; }
  private playVoiceCast(challenge = false): void {
    this.player.playCast(this.time.now);
    const color = challenge ? 0xffd76e : this.arena.accent;
    this.combatVfx.castBurst(this.player.x, this.player.y - 18, color);
    const cast = this.add.container(this.player.x, this.player.y - 12).setDepth(24);
    const floor = this.add.ellipse(0, 75, 112, 19, color, .08).setStrokeStyle(2, color, .72);
    const outer = this.add.circle(0, 0, challenge ? 78 : 64, color, .018).setStrokeStyle(challenge ? 4 : 3, color, .78);
    const inner = this.add.circle(0, 0, challenge ? 48 : 41, 0xffffff, 0).setStrokeStyle(1, 0xffffff, .52);
    const runes = this.add.graphics().lineStyle(2, color, .7);
    const runeCount = this.effectsQuality === 'high' && !this.reducedMotion ? 12 : 6;
    for (let index = 0; index < runeCount; index += 1) {
      const angle = index / runeCount * Math.PI * 2;
      const innerRadius = challenge ? 82 : 68;
      const outerRadius = innerRadius + (index % 3 === 0 ? 16 : 9);
      runes.lineBetween(
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius,
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius,
      );
    }
    cast.add([floor, outer, inner, runes]).setScale(.62).setAlpha(.25);
    this.tweens.add({
      targets: cast,
      scale: challenge ? 1.25 : 1,
      alpha: 1,
      duration: this.reducedMotion ? 100 : 210,
      ease: 'Back.out',
      yoyo: true,
      hold: challenge ? 135 : 80,
      onUpdate: () => cast.setPosition(this.player.x, this.player.y - 12),
      onComplete: () => cast.destroy(),
    });
    if (this.effectsQuality === 'high' && !this.reducedMotion) {
      for (let index = 0; index < (challenge ? 14 : 9); index += 1) {
        const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
        const spark = this.add.rectangle(
          this.player.x,
          this.player.y - 10,
          Phaser.Math.Between(15, 36),
          2,
          index % 4 === 0 ? 0xffffff : color,
          .82,
        ).setRotation(angle).setBlendMode(Phaser.BlendModes.ADD).setDepth(23);
        const distance = Phaser.Math.Between(58, challenge ? 145 : 110);
        this.tweens.add({
          targets: spark,
          x: spark.x + Math.cos(angle) * distance,
          y: spark.y + Math.sin(angle) * distance,
          alpha: 0,
          scaleX: .1,
          duration: Phaser.Math.Between(240, 410),
          ease: 'Cubic.out',
          onComplete: () => spark.destroy(),
        });
      }
      const camera = this.cameras.main;
      this.tweens.killTweensOf(camera);
      camera.setZoom(1).setScroll(0, 0);
      this.tweens.add({
        targets: camera,
        zoom: challenge ? 1.035 : 1.018,
        duration: 100,
        ease: 'Sine.out',
        yoyo: true,
        hold: challenge ? 85 : 35,
        onComplete: () => camera.setZoom(1).setScroll(0, 0),
      });
    }
  }

  private tryPlayerAttack(now: number): void {
    if (!this.player.canAttack(now)) return;
    const continuedCombo = now <= this.playerComboExpiresAt && this.playerComboIndex >= 0;
    const variant = continuedCombo ? (this.playerComboIndex + 1) % 3 : 0;
    const beats = [
      { cooldown: 270, hitAt: 150, range: 122, damage: 10, lunge: 118, lungeMs: 165, window: 630 },
      { cooldown: 305, hitAt: 178, range: 140, damage: 13, lunge: 145, lungeMs: 200, window: 700 },
      { cooldown: 520, hitAt: 276, range: 160, damage: 20, lunge: 175, lungeMs: 295, window: 0 },
    ] as const;
    const beat = beats[variant];
    this.playerComboIndex = variant;
    this.playerComboExpiresAt = beat.window ? now + beat.window : 0;
    this.playerLungeUntil = now + beat.lungeMs;
    this.playerLungeSpeed = beat.lunge;
    this.player.beginAttack(now, beat.cooldown, variant);
    this.playerHitConnected = false;
    this.spawnPlayerAttackCue(variant);
    const arcAt = [112, 142, 215][variant] ?? 112;
    this.time.delayedCall(arcAt, () => {
      if (this.battleOver || this.player.defeated) return;
      const comboColors = [0x7cf8df, 0x8de7ff, 0xffdb79];
      this.combatVfx.attackArc(
        this.player.x + this.player.facing * (variant === 2 ? 70 : 55),
        this.player.y - (variant === 1 ? 36 : 24),
        this.player.facing,
        comboColors[variant] ?? this.arena.accent,
        variant,
      );
    });
    this.time.delayedCall(beat.hitAt, () => {
      if (this.battleOver || this.playerHitConnected || !this.inAttackRange(this.player, this.enemy, beat.range)) return;
      this.playerHitConnected = true;
      this.hit(
        this.player,
        this.enemy,
        Math.round(beat.damage * this.equipment.damageMultiplier),
        variant,
      );
    });
  }

  private tryEnemyAttack(now: number): void {
    if (!this.enemy.canAttack(now) || !this.inAttackRange(this.enemy, this.player, 112)) return;
    const attackToken = ++this.enemyAttackToken;
    this.enemy.beginAttack(now, 690, 1);
    this.enemyHitConnected = false;
    this.spawnEnemyTelegraph();
    this.time.delayedCall(142, () => {
      if (this.battleOver || attackToken !== this.enemyAttackToken || this.enemy.defeated) return;
      this.combatVfx.attackArc(
        this.enemy.x + this.enemy.facing * 52,
        this.enemy.y - 34,
        this.enemy.facing,
        0xff728b,
        1,
      );
    });
    this.time.delayedCall(188, () => {
      if (this.battleOver || attackToken !== this.enemyAttackToken || this.enemyHitConnected || !this.inAttackRange(this.enemy, this.player, 132)) return;
      this.enemyHitConnected = true; this.hit(this.enemy, this.player, 11);
    });
  }

  private spawnPlayerAttackCue(variant: number): void {
    const labels = ['壹式 · 闪', '贰式 · 返', '终式 · 断'];
    const colors = [0x7cf8df, 0x8de7ff, 0xffdb79];
    const color = colors[variant] ?? colors[0];
    const cue = this.add.text(
      this.player.x,
      this.player.y - 105,
      labels[variant] ?? labels[0],
      {
        fontFamily: 'Arial Black, Arial',
        fontSize: variant === 2 ? '17px' : '13px',
        fontStyle: 'bold',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#031018',
        strokeThickness: 4,
        letterSpacing: 2,
      },
    ).setOrigin(.5).setDepth(27).setAlpha(.9);
    this.tweens.add({
      targets: cue,
      y: cue.y - (variant === 2 ? 34 : 22),
      alpha: 0,
      scale: variant === 2 ? 1.18 : 1.04,
      duration: this.reducedMotion ? 190 : (variant === 2 ? 520 : 360),
      ease: 'Cubic.out',
      onComplete: () => cue.destroy(),
    });
  }

  private spawnEnemyTelegraph(): void {
    const telegraph = this.add.container(this.enemy.x, this.enemy.y - 15).setDepth(24);
    const ring = this.add.circle(0, 0, 62, 0xff647f, .025).setStrokeStyle(3, 0xff7f91, .82);
    const inner = this.add.arc(0, 0, 43, -80, 70, false, 0xffd179, 0).setStrokeStyle(3, 0xffd179, .72);
    const warning = this.add.text(0, -74, '!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '22px',
      color: '#ffd179',
      stroke: '#270710',
      strokeThickness: 5,
    }).setOrigin(.5);
    telegraph.add([ring, inner, warning]).setScale(.72).setAlpha(.25);
    this.tweens.add({
      targets: telegraph,
      scale: 1,
      alpha: 1,
      duration: this.reducedMotion ? 100 : 165,
      ease: 'Back.out',
      onUpdate: () => telegraph.setPosition(this.enemy.x, this.enemy.y - 15),
      onComplete: () => {
        this.tweens.add({
          targets: telegraph,
          alpha: 0,
          scale: 1.1,
          duration: 90,
          onComplete: () => telegraph.destroy(),
        });
      },
    });
  }

  private inAttackRange(attacker: Fighter, target: Fighter, range: number): boolean {
    const dx = target.x - attacker.x;
    return Math.abs(dx) <= range && Math.abs(target.y - attacker.y) < 105 && Math.sign(dx || attacker.facing) === attacker.facing;
  }

  private applyHitStop(requestedMs: number): void {
    if (this.battleOver || this.tutorialActive || this.physics.world.isPaused) return;
    const qualityFactor = this.effectsQuality === 'low' ? .72 : 1;
    const motionFactor = this.reducedMotion ? .45 : 1;
    const duration = Math.max(12, Math.round(requestedMs * qualityFactor * motionFactor));
    this.hitStopAnimationTime = this.time.now;
    this.hitStopUntil = Math.max(this.hitStopUntil, this.time.now + duration);
    this.physics.pause();
    this.hitStopResume?.remove(false);
    this.hitStopResume = this.time.delayedCall(duration, () => {
      this.hitStopResume = undefined;
      if (!this.battleOver && !this.tutorialActive && !document.hidden) this.physics.resume();
    });
  }

  private animateCameraImpact(direction: 1 | -1, tier: number, blocked: boolean): void {
    const camera = this.cameras.main;
    const qualityScale = this.effectsQuality === 'low' ? .58 : 1;
    const intensity = blocked ? .002 : (.0045 + tier * .0018) * qualityScale;
    camera.shake(this.reducedMotion ? 35 : 50 + tier * 20, this.reducedMotion ? intensity * .35 : intensity);
    if (this.reducedMotion) return;
    this.tweens.killTweensOf(camera);
    camera.setZoom(1).setScroll(0, 0);
    this.tweens.add({
      targets: camera,
      zoom: 1 + (.009 + tier * .008) * qualityScale,
      scrollX: direction * (2 + tier * 2.5) * qualityScale,
      scrollY: -tier * 1.5 * qualityScale,
      duration: 42 + tier * 8,
      ease: 'Quad.out',
      hold: tier === 2 ? 35 : 12,
      yoyo: true,
      onComplete: () => camera.setZoom(1).setScroll(0, 0),
    });
  }

  private hit(attacker: Fighter, target: Fighter, damage: number, impactTier = 1): void {
    const now = this.time.now;
    if (now < target.invulnerableUntil || target.defeated) return;
    const result = CombatSystem.applyDamage(target.stats, damage);
    if (target === this.enemy) this.stats.damageDealt += result.damage; else this.stats.damageTaken += result.damage;
    if (!result.blocked && target === this.enemy) this.enemyAttackToken += 1;
    if (!result.blocked && target === this.player) {
      this.playerComboIndex = -1;
      this.playerComboExpiresAt = 0;
      this.playerLungeUntil = 0;
    }
    target.invulnerableUntil = now + 230; target.playHit(now);
    const resolvedTier = result.blocked ? 0 : impactTier;
    const knockback = result.blocked ? 85 : [220, 275, 380][resolvedTier] ?? 275;
    target.setVelocityX(attacker.facing * knockback);
    if (!result.blocked && resolvedTier === 2) target.setVelocityY(-72);
    target.setTint(result.blocked ? 0x8fcfff : 0xffffff);
    this.tweens.add({ targets: target, alpha: 0.35, duration: 55, yoyo: true, repeat: 1, onComplete: () => { if (!target.defeated) target.setAlpha(1).clearTint(); } });
    this.applyHitStop([35, 50, 75][resolvedTier] ?? 50);
    this.animateCameraImpact(attacker.facing, resolvedTier, result.blocked);
    const impactColor = result.blocked ? 0x8fcfff : (resolvedTier === 2 ? 0xffe28a : 0xffcf5c);
    this.audio.play(result.blocked ? 'block' : 'hit'); this.spawnHitBurst(target.x, target.y, impactColor);
    this.spawnImpactComposition(
      target.x,
      target.y,
      impactColor,
      attacker.facing,
      resolvedTier,
      result.blocked,
    );
    this.combatVfx.impact(target.x, target.y, impactColor, resolvedTier);
    this.spawnDamageNumber(target.x,target.y-72,result.blocked?'BLOCK':`-${result.damage}`,result.blocked?0x8fcfff:0xffd56a);
    this.statusText.setText(result.blocked ? 'BLOCKED' : `${result.damage} HIT`);
    this.time.delayedCall(420, () => { if (!this.battleOver) this.statusText.setText('FIGHT!'); });
    if (result.defeated) this.endBattle(target === this.enemy);
  }

  private refreshHud(): void {
    this.playerHealthBar.width = 360 * (this.player.stats.health / this.player.stats.maxHealth);
    this.enemyHealthBar.width = 360 * (this.enemy.stats.health / this.enemy.stats.maxHealth);
    this.staminaBar.width = 250 * (this.player.stats.stamina / this.player.stats.maxStamina);
  }

  private handleObjectImpact(object: Phaser.Physics.Arcade.Image, target: Fighter): void {
    if (!object.getData('armed') || Math.abs(object.body?.velocity.x ?? 0) < 150) return;
    object.setData('armed', false); this.environmentalHit(target, object.getData('damage') ?? 12, Math.sign(object.body?.velocity.x ?? 1));
  }
  private handleWrongImpact(item: Phaser.Physics.Arcade.Image, target: Fighter): void {
    if (item.getData('spent') || Math.abs(item.body?.velocity.y ?? 0) < 120) return;
    item.setData('spent', true); this.environmentalHit(target, item.getData('damage') ?? 18, Math.sign(item.x - target.x) || 1);
  }
  private environmentalHit(target: Fighter, damage: number, direction: number): void {
    if (target.defeated || this.battleOver) return;
    const result = CombatSystem.applyDamage(target.stats, damage); target.setVelocityX(direction * 280); this.cameras.main.shake(90, 0.007);
    this.audio.play('hit'); this.spawnHitBurst(target.x, target.y, 0xff8294);
    this.combatVfx.impact(target.x, target.y, 0xff8294, 1);
    this.spawnDamageNumber(target.x,target.y-72,`-${result.damage}`,0xff8294);
    if (target === this.enemy) this.stats.damageDealt += result.damage; else this.stats.damageTaken += result.damage;
    this.statusText.setText(`${result.damage} OBJECT HIT`); if (result.defeated) this.endBattle(target === this.enemy);
  }
  private showChallenge(): void {
    this.bulletTime.enter();
    this.audioDucking.duck();
    this.rivalHintTween?.stop();
    this.rivalHint.setVisible(false);
    this.rivalSpeech.setVisible(true).setAlpha(0).setScale(.94);
    this.challengeAura?.setVisible(true);
    this.statusText.setText('LANGUAGE DUEL · 子弹时间');
    this.enemy.setTint(0xffcf5c);
    this.updateRivalSpeechPosition();
    this.tweens.killTweensOf(this.rivalSpeech);
    this.tweens.add({
      targets: this.rivalSpeech,
      alpha: 1,
      scale: 1,
      duration: this.reducedMotion ? 80 : 210,
      ease: 'Cubic.out',
    });
  }
  private updateChallengeCountdown(): void {
    const remaining = this.languageChallenge.state.remainingMs;
    this.rivalSpeechPrefix.setText(`RIVAL / 对手  ·  ${(remaining / 1000).toFixed(1)}s`);
    this.challengeText.setText(this.languageChallenge.state.question);
    this.challengeTimerBar
      .setScale(Math.min(1, remaining / 6500), 1)
      .setFillStyle(remaining < 1900 ? 0xff647f : 0xffcf70, .96);
  }
  private hideChallenge(): void {
    this.bulletTime.exit();
    this.audioDucking.restore();
    this.tweens.killTweensOf(this.rivalSpeech);
    this.rivalSpeech.setVisible(false);
    this.challengeAura?.setVisible(false);
    this.enemy.clearTint();
    if (!this.battleOver) this.statusText.setText('FIGHT!');
  }
  private failChallenge(reason: string): void {
    const retryLine = (this.languageChallenge.state.question || 'SAY IT AGAIN').replace(/^SAY IT \/ /, '');
    this.hideChallenge();
    this.voiceText.setText(`${reason} · 敌人重击命中`).setColor('#ff8294');
    this.showRivalLine(
      reason === 'TIME UP' ? `Too slow · ${retryLine}` : `Try again · ${retryLine}`,
      'RIVAL / 对手',
      1550,
    );
    this.environmentalHit(this.player, 24, this.enemy.x > this.player.x ? -1 : 1);
    if (!this.battleOver) this.statusText.setText('LANGUAGE BREAK · -24');
  }
  private updateRivalSpeechPosition(): void {
    if (!this.enemy || !this.rivalSpeech) return;
    const horizontalMargin = this.mobileLayout ? 245 : 300;
    const speechX = Phaser.Math.Clamp(this.enemy.x, horizontalMargin, 1280 - horizontalMargin);
    const speechY = Phaser.Math.Clamp(this.enemy.y - 166, 138, 340);
    this.rivalSpeech.setPosition(speechX, speechY);
    this.rivalHint.setPosition(
      Phaser.Math.Clamp(this.enemy.x, this.mobileLayout ? 190 : 230, this.mobileLayout ? 1090 : 1050),
      Phaser.Math.Clamp(this.enemy.y - 96, 202, 400),
    );
  }
  private showRivalLine(text: string, prefix = 'RIVAL / 对手', duration = 1800): void {
    this.rivalHintTween?.stop();
    this.rivalHintPrefix.setText(prefix);
    this.rivalHintText.setText(text);
    this.updateRivalSpeechPosition();
    this.rivalHint.setVisible(true).setAlpha(1).setScale(.97);
    this.rivalHintTween = this.tweens.add({
      targets: this.rivalHint,
      alpha: 0,
      scale: 1,
      delay: duration,
      duration: this.reducedMotion ? 90 : 280,
      ease: 'Cubic.in',
      onComplete: () => this.rivalHint.setVisible(false),
    });
  }
  private showRivalGuidance(text: string): void {
    if (this.languageChallenge.state.active || this.time.now - this.lastRivalGuideAt < 3200) return;
    this.lastRivalGuideAt = this.time.now;
    this.showRivalLine(text, 'RIVAL / 对手', 1450);
  }
  private spawnHitBurst(x: number, y: number, color: number): void {
    const flash = this.add.circle(x, y, 12, 0xffffff, .9).setBlendMode(Phaser.BlendModes.ADD).setDepth(26);
    this.tweens.add({ targets: flash, alpha: 0, scale: 3.4, duration: 130, ease: 'Quad.out', onComplete: () => flash.destroy() });
    for (let index = 0; index < (this.effectsQuality==='high'?12:7); index += 1) {
      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const distance = Phaser.Math.Between(44, 105);
      const spark = this.add.rectangle(x, y, Phaser.Math.Between(18, 38), Phaser.Math.Between(2, 4), index % 3 === 0 ? 0xffffff : color, .95)
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(25);
      this.tweens.add({ targets: spark, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, scaleX: .18, duration: Phaser.Math.Between(170, 300), ease: 'Cubic.out', onComplete: () => spark.destroy() });
    }
    const slash = this.add.arc(x, y, 42, -58, 62, false, color, 0).setStrokeStyle(4, color, .8).setRotation(Phaser.Math.FloatBetween(-.4, .35)).setBlendMode(Phaser.BlendModes.ADD).setDepth(25);
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.6, duration: 180, onComplete: () => slash.destroy() });
  }
  private spawnImpactComposition(
    x: number,
    y: number,
    color: number,
    direction: 1 | -1,
    tier: number,
    blocked: boolean,
  ): void {
    const ringCount = this.effectsQuality === 'high' && tier === 2 && !this.reducedMotion ? 3 : 1;
    for (let index = 0; index < ringCount; index += 1) {
      const ring = this.add.circle(x, y, 32 + index * 7, color, 0)
        .setStrokeStyle(Math.max(1, 4 - index), index === 1 ? 0xffffff : color, .85 - index * .16)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(25)
        .setScale(.35);
      this.tweens.add({
        targets: ring,
        scale: 1.45 + tier * .28 + index * .2,
        alpha: 0,
        duration: this.reducedMotion ? 105 : 170 + tier * 55 + index * 35,
        delay: index * 16,
        ease: 'Cubic.out',
        onComplete: () => ring.destroy(),
      });
    }

    const crossLength = blocked ? 74 : 94 + tier * 25;
    const cross = [
      this.add.rectangle(x, y, crossLength, tier === 2 ? 6 : 4, 0xffffff, .88).setRotation(-.68 * direction),
      this.add.rectangle(x, y, crossLength * .72, 3, color, .82).setRotation(.78 * direction),
    ];
    cross.forEach((beam, index) => {
      beam.setBlendMode(Phaser.BlendModes.ADD).setDepth(26);
      this.tweens.add({
        targets: beam,
        scaleX: 1.55,
        scaleY: .15,
        alpha: 0,
        duration: this.reducedMotion ? 90 : 130 + tier * 25 + index * 18,
        ease: 'Quad.out',
        onComplete: () => beam.destroy(),
      });
    });

    if (this.reducedMotion) return;
    const lineCount = this.effectsQuality === 'high' ? 5 + tier * 4 : 3 + tier;
    for (let index = 0; index < lineCount; index += 1) {
      const trailLength = Phaser.Math.Between(34, tier === 2 ? 128 : 82);
      const offsetY = Phaser.Math.Between(-76 - tier * 10, 76 + tier * 10);
      const offsetX = Phaser.Math.Between(26, 84);
      const line = this.add.rectangle(
        x - direction * offsetX,
        y + offsetY,
        trailLength,
        Phaser.Math.Between(1, tier === 2 ? 4 : 3),
        index % 4 === 0 ? 0xffffff : color,
        Phaser.Math.FloatBetween(.34, .8),
      ).setOrigin(direction > 0 ? 1 : 0, .5)
        .setRotation(Phaser.Math.FloatBetween(-.12, .12))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(24);
      this.tweens.add({
        targets: line,
        x: line.x + direction * Phaser.Math.Between(55, 130),
        scaleX: .08,
        alpha: 0,
        duration: Phaser.Math.Between(120, tier === 2 ? 255 : 195),
        ease: 'Expo.out',
        onComplete: () => line.destroy(),
      });
    }

    if (tier !== 2 || blocked) return;
    const finisherArc = this.add.arc(
      x - direction * 16,
      y,
      88,
      direction > 0 ? -82 : 98,
      direction > 0 ? 62 : 242,
      false,
      color,
      0,
    ).setStrokeStyle(9, color, .72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(24)
      .setScale(.56);
    this.tweens.add({
      targets: finisherArc,
      scale: 1.45,
      alpha: 0,
      rotation: finisherArc.rotation + direction * .16,
      duration: 310,
      ease: 'Cubic.out',
      onComplete: () => finisherArc.destroy(),
    });
  }
  private spawnDamageNumber(x:number,y:number,label:string,color:number):void{
    const text=this.add.text(x,y,label,{fontFamily:'Arial Black, Arial',fontSize:label==='BLOCK'?'15px':'22px',fontStyle:'bold',color:`#${color.toString(16).padStart(6,'0')}`,stroke:'#06101a',strokeThickness:5}).setOrigin(.5).setDepth(28).setScale(.72);
    this.tweens.add({targets:text,y:y-42,alpha:0,scale:1.08,duration:this.reducedMotion?260:620,ease:'Cubic.out',onComplete:()=>text.destroy()});
  }
  private showArenaIntro():void{
    const group=this.add.container(640,365).setDepth(72);
    const lineLeft=this.add.rectangle(-185,4,108,1,this.arena.accent,.65);
    const lineRight=this.add.rectangle(185,4,108,1,this.arena.accent,.65);
    const eyebrow=this.add.text(0,-44,'BATTLEFIELD / 战场',{fontFamily:'Arial',fontSize:'10px',fontStyle:'bold',color:'#b8c4da',letterSpacing:4}).setOrigin(.5);
    const name=this.add.text(0,-8,this.arena.name,{fontFamily:'Arial Black, Arial',fontSize:'36px',color:'#ffffff',letterSpacing:4}).setOrigin(.5).setShadow(0,3,'#000000',8);
    const subtitle=this.add.text(0,39,this.arena.subtitle,{fontFamily:'Arial',fontSize:'13px',color:this.arena.accentCss,letterSpacing:2}).setOrigin(.5);
    group.add([lineLeft,lineRight,eyebrow,name,subtitle]).setAlpha(0).setScale(.94);
    this.tweens.add({targets:group,alpha:1,scale:1,duration:this.reducedMotion?100:360,ease:'Cubic.out',hold:850,yoyo:true,onComplete:()=>group.destroy()});
  }
  private showTutorial(): void {
    this.tutorialActive=true;this.voiceOverlay.setVisible(false);this.physics.pause();
    const shade=this.add.rectangle(640,360,1280,720,0x02040a,.84).setDepth(80);
    const modal=this.add.container(640,350).setDepth(81);
    const panel=this.add.graphics().fillStyle(0x07101f,.96).fillRoundedRect(-440,-220,880,440,20).lineStyle(2,this.arena.accent,.82).strokeRoundedRect(-440,-220,880,440,20);
    const accent=this.add.rectangle(0,-216,780,4,this.arena.accent,.82);
    const eyebrow=this.add.text(0,-176,'FIRST DUEL / 初次交锋',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:this.arena.accentCss,letterSpacing:4}).setOrigin(.5);
    const title=this.add.text(0,-142,'让英语成为你的招式',{fontFamily:'Arial Black, Arial',fontSize:'32px',color:'#ffffff'}).setOrigin(.5);
    const cards=[['01','移动与战斗','A/D 或左侧按钮移动\nW 跳跃 · J 攻击 · K 格挡'],['02','言灵与念写','言灵持续聆听英语\n念写可手动输入但不计口语分'],['03','语言挑战','平时保持正常速度\n敌人提问时才进入子弹时间']];
    const cardObjects:Phaser.GameObjects.GameObject[]=[];
    cards.forEach(([index,heading,body],cardIndex)=>{const x=-276+cardIndex*276;const bg=this.add.rectangle(x,18,248,168,0x101a2d,.86).setStrokeStyle(1,cardIndex===1?this.arena.accent:0x536784,.54);const number=this.add.text(x-96,-43,index,{fontFamily:'Arial Black, Arial',fontSize:'15px',color:this.arena.accentCss});const headingText=this.add.text(x,-20,heading,{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);const bodyText=this.add.text(x,33,body,{fontFamily:'Arial',fontSize:'13px',color:'#aebbd0',align:'center',lineSpacing:9}).setOrigin(.5);cardObjects.push(bg,number,headingText,bodyText);});
    const tip=this.add.text(0,139,'先展开「本局言灵」，看清本场的 8 个词和 6 个句式。',{fontFamily:'Arial',fontSize:'14px',color:'#ffdc86'}).setOrigin(.5);
    modal.add([panel,accent,eyebrow,title,...cardObjects,tip]);
    const start=addButton(this,640,553,'进入战场',()=>{[shade,modal,start].forEach(item=>item.destroy());this.tutorialActive=false;this.voiceOverlay.setVisible(true);this.physics.resume();this.showArenaIntro();},true).setDepth(83);
    const save=SaveManager.load();save.settings.tutorialSeen=true;SaveManager.save(save);
  }
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.voiceOverlay?.cancel();
      this.physics.pause();
    } else if (!this.battleOver && !this.tutorialActive && this.time.now >= this.hitStopUntil) {
      this.physics.resume();
    }
  };

  private endBattle(playerWon: boolean): void {
    this.battleOver = true;
    const save = new PlayerNeedsSystem().afterBattle(SaveManager.load(), playerWon);
    this.stats.won = playerWon; this.stats.durationSeconds = Math.max(1, Math.round(this.battleElapsedMs / 1000));
    this.stats.rewardCoins = playerWon ? 22 + this.stats.correctExpressions * 2 : 8; this.stats.rewardXp = this.stats.correctExpressions * 8 + this.stats.independentExpressions * 4;
    save.player.coins += this.stats.rewardCoins; save.player.englishXp += this.stats.rewardXp; SaveManager.save(save);
    const loser = playerWon ? this.enemy : this.player;
    loser.defeat();
    this.physics.pause();
    this.time.delayedCall(650, () => this.scene.start('ResultScene', this.stats));
  }

  private cleanup(): void {
    this.hitStopResume?.remove(false);
    this.hitStopResume = undefined;
    this.rivalHintTween?.stop();
    this.rivalHintTween = undefined;
    EventBus.off(GameEvents.VOICE_LISTEN_START, this.handleVoiceStart, this);
    EventBus.off(GameEvents.VOICE_LISTEN_END, this.handleVoiceEnd, this);
    EventBus.off(GameEvents.VOICE_RESULT, this.handleVoiceResult, this);
    EventBus.off(GameEvents.VOICE_RETRY, this.handleVoiceRetry, this);
    EventBus.off(GameEvents.VOICE_ERROR, this.handleVoiceError, this);
    EventBus.off(GameEvents.VOICE_INTERPRETATION, this.handleVoiceInterpretation, this);
    EventBus.off(GameEvents.HINT_REQUEST, this.handleHintRequest, this);
    EventBus.off(GameEvents.TEXT_INPUT_FOCUS, this.handleTextFocus, this);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange); this.combatVfx?.destroy(); this.voiceOverlay.destroy(); this.bulletTime.destroy(); this.audioDucking.restore(); this.touch?.destroy(); this.equipment.destroy(); this.objectCommands.destroy(); this.audio.close();
  }
}
