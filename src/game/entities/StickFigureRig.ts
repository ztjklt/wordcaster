import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';

type Point = { x: number; y: number };
type Pose = {
  head: Point;
  neck: Point;
  chest: Point;
  hip: Point;
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  leftHand: Point;
  rightElbow: Point;
  rightHand: Point;
  leftKnee: Point;
  leftFoot: Point;
  rightKnee: Point;
  rightFoot: Point;
};

type TrailFrame = {
  pose: Pose;
  x: number;
  y: number;
  facing: 1 | -1;
  recordedAt: number;
};

const point = (x: number, y: number): Point => ({ x, y });
const idlePose = (): Pose => ({
  head: point(0, -54),
  neck: point(0, -33),
  chest: point(0, -15),
  hip: point(0, 8),
  leftShoulder: point(-9, -28),
  rightShoulder: point(9, -28),
  leftElbow: point(-20, -16),
  leftHand: point(-27, 5),
  rightElbow: point(20, -16),
  rightHand: point(27, 5),
  leftKnee: point(-11, 40),
  leftFoot: point(-18, 67),
  rightKnee: point(11, 40),
  rightFoot: point(18, 67),
});

const clonePose = (pose: Pose): Pose => {
  const copy = {} as Pose;
  (Object.keys(pose) as Array<keyof Pose>).forEach((key) => {
    copy[key] = point(pose[key].x, pose[key].y);
  });
  return copy;
};

const clamp01 = (value: number): number => Phaser.Math.Clamp(value, 0, 1);
const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (value: number): number => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
};
const easeOutBack = (value: number, strength = 1.35): number => {
  const t = clamp01(value) - 1;
  return 1 + (strength + 1) * t ** 3 + strength * t ** 2;
};

const mixPose = (from: Pose, to: Pose, value: number): Pose => {
  const mixed = clonePose(from);
  const t = value;
  (Object.keys(mixed) as Array<keyof Pose>).forEach((key) => {
    mixed[key].x = Phaser.Math.Linear(from[key].x, to[key].x, t);
    mixed[key].y = Phaser.Math.Linear(from[key].y, to[key].y, t);
  });
  return mixed;
};

const withPose = (values: Partial<Record<keyof Pose, Point>>): Pose => {
  const pose = idlePose();
  (Object.keys(values) as Array<keyof Pose>).forEach((key) => {
    const value = values[key];
    if (value) pose[key] = point(value.x, value.y);
  });
  return pose;
};

export class StickFigureRig {
  private readonly container: Phaser.GameObjects.Container;
  private readonly trail: Phaser.GameObjects.Graphics;
  private readonly aura: Phaser.GameObjects.Graphics;
  private readonly silhouette: Phaser.GameObjects.Graphics;
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly accents: Phaser.GameObjects.Graphics;
  private readonly primaryColor: number;
  private readonly secondaryColor: number;
  private readonly friendly: boolean;
  private readonly highEffects: boolean;
  private readonly trailFrames: TrailFrame[] = [];
  private pose = idlePose();
  private action: 'none' | 'attack' | 'hit' | 'cast' | 'defeat' = 'none';
  private attackVariant: 0 | 1 | 2 = 0;
  private actionStarted = 0;
  private actionEnds = 0;
  private flashEnds = 0;
  private lastTrailAt = 0;
  private landedAt = -1000;
  private wasGrounded = true;
  private wasBlocked = false;
  private blockStarted = -1000;
  private locomotionPhase = 0;
  private leftFootPlanted = false;
  private rightFootPlanted = false;
  private leftFootLockX = 0;
  private rightFootLockX = 0;
  private defeatProgress = 0;
  private lastSpeed = 0;
  private stoppedAt = -1000;
  private stopFromSpeed = 0;

  constructor(scene: Phaser.Scene, color: number, depth = 12) {
    this.trail = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.aura = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.silhouette = scene.add.graphics();
    this.body = scene.add.graphics();
    this.accents = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.container = scene.add
      .container(0, 0, [this.trail, this.aura, this.silhouette, this.body, this.accents])
      .setDepth(depth);
    this.primaryColor = color;
    this.friendly = color === 0x63f0d4;
    this.secondaryColor = this.friendly ? 0xffd66d : 0xb58aff;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.highEffects = SaveManager.load().settings.effectsQuality !== 'low' && !reducedMotion;
  }

  update(
    x: number,
    y: number,
    facing: 1 | -1,
    velocityX: number,
    velocityY: number,
    blocked: boolean,
    grounded: boolean,
    now: number,
    delta: number,
  ): void {
    this.container.setPosition(x, y - 3).setScale(facing, 1);
    if (grounded && !this.wasGrounded) this.landedAt = now;
    if (blocked && !this.wasBlocked) this.blockStarted = now;
    this.wasGrounded = grounded;
    this.wasBlocked = blocked;
    if (now >= this.actionEnds && this.action !== 'defeat') this.action = 'none';

    const speed = Math.abs(velocityX);
    if (grounded && speed < 28 && this.lastSpeed > 105 && this.action === 'none') {
      this.stoppedAt = now;
      this.stopFromSpeed = this.lastSpeed;
    }
    if (grounded && speed > 24 && this.action === 'none') {
      this.locomotionPhase += delta * (0.0085 + Math.min(speed, 360) * 0.000018);
    }
    const phase = this.locomotionPhase;
    let target = idlePose();
    if (!grounded) target = this.jumpPose(velocityY);
    else if (speed > 30) {
      target = this.runPose(phase, speed);
      this.applyFootLock(target, x, facing, phase, speed);
    } else {
      target = this.breathePose(now * 0.004);
      this.releaseFootLocks();
      const landingAge = now - this.landedAt;
      if (landingAge >= 0 && landingAge < 210) target = this.landingPose(target, landingAge / 210);
      else {
        const stopAge = now - this.stoppedAt;
        if (stopAge >= 0 && stopAge < 190) {
          target = this.brakingPose(target, stopAge / 190, this.stopFromSpeed);
        }
      }
    }
    if (!grounded || this.action !== 'none') this.releaseFootLocks();
    if (blocked) target = this.blockPose(now * 0.004, now);
    if (this.action === 'attack') target = this.attackPose(this.actionProgress(now));
    if (this.action === 'hit') target = this.hitPose(this.actionProgress(now));
    if (this.action === 'cast') target = this.castPose(now * 0.004, this.actionProgress(now));
    if (this.action === 'defeat') {
      this.defeatProgress = Math.min(1, this.defeatProgress + delta / 640);
      target = this.defeatPose(this.defeatProgress);
    }

    const timeConstant = this.action === 'attack'
      ? 28
      : this.action === 'hit'
        ? 24
        : this.action === 'cast'
          ? 42
          : 62;
    const exponential = 1 - Math.exp(-delta / timeConstant);
    const blend = 1 - (1 - exponential) ** 2.25;
    (Object.keys(this.pose) as Array<keyof Pose>).forEach((key) => {
      this.pose[key].x = Phaser.Math.Linear(this.pose[key].x, target[key].x, blend);
      this.pose[key].y = Phaser.Math.Linear(this.pose[key].y, target[key].y, blend);
    });

    this.captureTrail(x, y, facing, velocityX, now);
    this.draw(x, y, facing, velocityX, grounded, velocityY, now);
    this.lastSpeed = speed;
  }

  playAttack(now: number, variant: number = 0): void {
    this.action = 'attack';
    this.attackVariant = Phaser.Math.Clamp(Math.round(variant), 0, 2) as 0 | 1 | 2;
    this.actionStarted = now;
    this.actionEnds = now + [360, 410, 540][this.attackVariant];
    this.lastTrailAt = now - 100;
  }

  playHit(now: number): void {
    this.action = 'hit';
    this.actionStarted = now;
    this.actionEnds = now + 230;
    this.flashEnds = now + 105;
  }

  playCast(now: number): void {
    this.action = 'cast';
    this.actionStarted = now;
    this.actionEnds = now + 520;
  }

  playDefeat(): void {
    this.action = 'defeat';
    this.defeatProgress = 0;
    this.actionEnds = Number.POSITIVE_INFINITY;
  }

  destroy(): void {
    this.trailFrames.length = 0;
    this.container.destroy();
  }

  private actionProgress(now: number): number {
    return Phaser.Math.Clamp((now - this.actionStarted) / Math.max(1, this.actionEnds - this.actionStarted), 0, 1);
  }

  private captureTrail(x: number, y: number, facing: 1 | -1, velocityX: number, now: number): void {
    const activeMotion = this.action === 'attack' || this.action === 'hit' || Math.abs(velocityX) > 120;
    const trailInterval = this.action === 'attack'
      ? this.attackVariant === 2 ? 22 : 26
      : 42;
    if (!this.highEffects || !activeMotion || now - this.lastTrailAt < trailInterval) return;
    this.lastTrailAt = now;
    this.trailFrames.unshift({ pose: clonePose(this.pose), x, y, facing, recordedAt: now });
    this.trailFrames.splice(this.action === 'attack' ? 4 : 3);
  }

  private draw(
    x: number,
    y: number,
    facing: 1 | -1,
    velocityX: number,
    grounded: boolean,
    velocityY: number,
    now: number,
  ): void {
    const pose = this.pose;
    this.trail.clear();
    this.aura.clear();
    this.silhouette.clear();
    this.body.clear();
    this.accents.clear();
    const color = now < this.flashEnds ? 0xffffff : this.primaryColor;

    this.drawMotionTrail(x, y, facing, now, color);
    this.drawGroundShadow(grounded, velocityY);
    this.drawLandingFx(now, color);

    this.aura.lineStyle(this.highEffects ? 22 : 16, color, this.highEffects ? 0.105 : 0.065);
    this.drawLimbs(this.aura, pose);
    this.aura.fillStyle(color, 0.1).fillCircle(pose.head.x, pose.head.y, 25);

    this.drawSilhouette(pose);
    this.body.lineStyle(7, color, 1);
    this.drawLimbs(this.body, pose);
    this.body.lineStyle(2, 0xeaffff, 0.34);
    this.drawInnerLimbs(this.body, pose);
    this.drawTorsoArmor(pose, color);
    this.drawJoints(pose, color);
    this.drawHead(pose, color);
    this.drawScarf(pose, velocityX, now, color);
    this.drawWeapon(pose, color, now);

    if (this.action === 'attack') this.drawAttackFx(color, now);
    if (this.action === 'hit') this.drawHitFx(color, now);
    if (this.action === 'cast') this.drawCastFx(color, now);
    if (this.action === 'defeat') this.drawDefeatFx(now);
    if (this.action === 'none' && grounded) this.drawIdleEmbers(now, color);
  }

  private drawMotionTrail(x: number, y: number, facing: 1 | -1, now: number, color: number): void {
    if (!this.highEffects) return;
    const trailLifetime = this.action === 'attack' && this.attackVariant === 2 ? 215 : 175;
    for (let index = this.trailFrames.length - 1; index >= 0; index -= 1) {
      if (now - this.trailFrames[index].recordedAt >= trailLifetime) this.trailFrames.splice(index, 1);
    }
    this.trailFrames.forEach((frame, index) => {
      const age = Phaser.Math.Clamp((now - frame.recordedAt) / trailLifetime, 0, 1);
      const alpha = (1 - age) * (0.25 - index * 0.038);
      const offsetX = (frame.x - x) * facing;
      const offsetY = frame.y - y;
      const mirroredPose = frame.facing === facing ? frame.pose : this.mirrorPose(frame.pose);
      const ghostColor = index % 2 === 0 ? color : this.secondaryColor;
      this.trail.lineStyle(Math.max(4, 13 - index * 2.3), 0x020612, alpha * .72);
      this.drawLimbs(this.trail, mirroredPose, offsetX, offsetY);
      this.trail.lineStyle(Math.max(2, 8 - index * 1.4), ghostColor, alpha);
      this.drawLimbs(this.trail, mirroredPose, offsetX, offsetY);
      this.trail.lineStyle(Math.max(1, 4 - index * .65), 0xffffff, alpha * .28);
      this.drawInnerLimbs(this.trail, mirroredPose, offsetX, offsetY);
      this.trail.lineStyle(4, this.secondaryColor, alpha * 0.9);
      this.trail.strokeCircle(
        mirroredPose.head.x + offsetX,
        mirroredPose.head.y + offsetY,
        15,
      );
      const weapon = this.weaponLine(mirroredPose, this.action === 'attack' ? 45 : 26);
      this.trail.lineStyle(Math.max(2, 7 - index), this.secondaryColor, alpha * 1.35)
        .lineBetween(
          weapon.start.x + offsetX,
          weapon.start.y + offsetY,
          weapon.tip.x + offsetX,
          weapon.tip.y + offsetY,
        );
    });
    if (this.action === 'attack' && this.trailFrames.length > 1) {
      const currentWeapon = this.weaponLine(this.pose, 48);
      this.trail.lineStyle(this.attackVariant === 2 ? 14 : 10, this.secondaryColor, .075)
        .beginPath()
        .moveTo(currentWeapon.tip.x, currentWeapon.tip.y);
      this.trailFrames.forEach((frame) => {
        const trailPose = frame.facing === facing ? frame.pose : this.mirrorPose(frame.pose);
        const weapon = this.weaponLine(trailPose, 48);
        this.trail.lineTo(weapon.tip.x + (frame.x - x) * facing, weapon.tip.y + frame.y - y);
      });
      this.trail.strokePath();
      this.trail.lineStyle(2, 0xffffff, .5)
        .beginPath()
        .moveTo(currentWeapon.tip.x, currentWeapon.tip.y);
      this.trailFrames.forEach((frame) => {
        const trailPose = frame.facing === facing ? frame.pose : this.mirrorPose(frame.pose);
        const weapon = this.weaponLine(trailPose, 48);
        this.trail.lineTo(weapon.tip.x + (frame.x - x) * facing, weapon.tip.y + frame.y - y);
      });
      this.trail.strokePath();
    }
  }

  private drawGroundShadow(grounded: boolean, velocityY: number): void {
    const scale = grounded ? 1 : Phaser.Math.Clamp(1 - Math.abs(velocityY) / 1400, 0.5, 0.82);
    this.trail.fillStyle(0x010309, grounded ? 0.52 : 0.22).fillEllipse(0, 70, 70 * scale, 12 * scale);
    this.trail.lineStyle(2, this.primaryColor, grounded ? 0.12 : 0.05).strokeEllipse(0, 70, 56 * scale, 7 * scale);
  }

  private drawLandingFx(now: number, color: number): void {
    const age = now - this.landedAt;
    if (age < 0 || age > 220) return;
    const progress = age / 220;
    const alpha = 1 - progress;
    this.trail.lineStyle(2, color, alpha * 0.55).strokeEllipse(0, 69, 40 + progress * 55, 7 + progress * 7);
    if (this.highEffects) {
      this.trail.lineStyle(2, this.secondaryColor, alpha * 0.45)
        .lineBetween(-20 - progress * 20, 67, -33 - progress * 30, 55 - progress * 15)
        .lineBetween(20 + progress * 20, 67, 33 + progress * 30, 55 - progress * 15);
    }
  }

  private drawSilhouette(pose: Pose): void {
    this.silhouette.lineStyle(15, 0x02050d, 0.98);
    this.drawLimbs(this.silhouette, pose);
    this.silhouette.fillStyle(0x02050d, 1).fillCircle(pose.head.x, pose.head.y, 19);
  }

  private drawTorsoArmor(pose: Pose, color: number): void {
    this.body.fillStyle(0x07111b, 0.96)
      .beginPath()
      .moveTo(pose.leftShoulder.x - 4, pose.leftShoulder.y)
      .lineTo(pose.rightShoulder.x + 4, pose.rightShoulder.y)
      .lineTo(pose.hip.x + 8, pose.hip.y + 2)
      .lineTo(pose.hip.x - 8, pose.hip.y + 2)
      .closePath()
      .fillPath();
    this.body.lineStyle(2, color, 0.72)
      .beginPath()
      .moveTo(pose.leftShoulder.x - 4, pose.leftShoulder.y)
      .lineTo(pose.rightShoulder.x + 4, pose.rightShoulder.y)
      .lineTo(pose.hip.x + 8, pose.hip.y + 2)
      .lineTo(pose.hip.x - 8, pose.hip.y + 2)
      .closePath()
      .strokePath();
    this.body.lineStyle(2, this.secondaryColor, 0.76)
      .lineBetween(pose.leftShoulder.x + 3, pose.leftShoulder.y + 5, pose.hip.x + 5, pose.hip.y - 2);
    this.body.lineStyle(1, color, 0.54)
      .lineBetween(pose.rightShoulder.x - 1, pose.rightShoulder.y + 5, pose.hip.x - 4, pose.hip.y - 1);
    this.body.fillStyle(this.secondaryColor, 0.9).fillCircle(pose.chest.x, pose.chest.y, 2.7);
  }

  private drawJoints(pose: Pose, color: number): void {
    const joints = [
      pose.neck,
      pose.chest,
      pose.hip,
      pose.leftShoulder,
      pose.rightShoulder,
      pose.leftElbow,
      pose.rightElbow,
      pose.leftKnee,
      pose.rightKnee,
    ];
    joints.forEach((joint, index) => {
      const major = index < 3;
      this.body.fillStyle(0x050a13, 1).fillCircle(joint.x, joint.y, major ? 5.5 : 4.6);
      this.body.lineStyle(2, major ? this.secondaryColor : color, 0.92)
        .strokeCircle(joint.x, joint.y, major ? 4.5 : 3.7);
    });
    [pose.leftHand, pose.rightHand, pose.leftFoot, pose.rightFoot].forEach((joint) => {
      this.body.fillStyle(0x050a13, 1).fillCircle(joint.x, joint.y, 4.5);
      this.body.lineStyle(2, color, 0.8).strokeCircle(joint.x, joint.y, 3.6);
    });
  }

  private drawHead(pose: Pose, color: number): void {
    this.body.fillStyle(0x040812, 1).fillCircle(pose.head.x, pose.head.y, 17);
    this.body.lineStyle(6, color, 1).strokeCircle(pose.head.x, pose.head.y, 15);
    this.body.lineStyle(2, this.secondaryColor, 0.82)
      .beginPath()
      .arc(pose.head.x, pose.head.y, 12, -2.65, -0.5)
      .strokePath();
    this.body.fillStyle(0x081521, 1)
      .beginPath()
      .moveTo(pose.head.x - 12, pose.head.y - 2)
      .lineTo(pose.head.x + 14, pose.head.y - 5)
      .lineTo(pose.head.x + 11, pose.head.y + 7)
      .lineTo(pose.head.x - 10, pose.head.y + 6)
      .closePath()
      .fillPath();
    this.accents.lineStyle(3, 0xf5ffff, 0.92)
      .lineBetween(pose.head.x + 2, pose.head.y - 1, pose.head.x + 12, pose.head.y - 2);
    this.accents.lineStyle(1, color, 0.9)
      .lineBetween(pose.head.x - 8, pose.head.y + 4, pose.head.x + 10, pose.head.y + 2);
  }

  private drawScarf(pose: Pose, velocityX: number, now: number, color: number): void {
    const motion = Phaser.Math.Clamp(Math.abs(velocityX) / 240, 0, 1);
    const actionBoost = this.action === 'attack' ? 1 : this.action === 'hit' ? 0.6 : 0;
    const wave = Math.sin(now * 0.013 + actionBoost * 1.7);
    const length = 38 + motion * 20 + actionBoost * 21;
    const middleX = pose.neck.x - length * 0.58;
    const endX = pose.neck.x - length;
    const middleY = pose.neck.y + wave * 5 - motion * 3 + actionBoost * 3;
    const endY = pose.neck.y + wave * 9 - motion * 7 + actionBoost * 7;
    this.silhouette.lineStyle(7, 0x03060d, 0.94)
      .beginPath()
      .moveTo(pose.neck.x - 5, pose.neck.y + 1)
      .lineTo(pose.neck.x - 22, pose.neck.y + 5 + wave * 2)
      .lineTo(middleX, middleY)
      .lineTo(endX, endY)
      .strokePath();
    this.body.lineStyle(3, color, 0.75)
      .beginPath()
      .moveTo(pose.neck.x - 5, pose.neck.y)
      .lineTo(pose.neck.x - 22, pose.neck.y + 4 + wave * 2)
      .lineTo(middleX, middleY - 1)
      .lineTo(endX, endY - 1)
      .strokePath();
    this.body.lineStyle(1, this.secondaryColor, 0.65)
      .lineBetween(
        pose.neck.x - 23,
        pose.neck.y + 4,
        endX + 2,
        endY - 3,
      );
    if (this.highEffects && (motion > 0.5 || actionBoost > 0)) {
      this.accents.lineStyle(2, color, 0.28 + actionBoost * 0.16)
        .beginPath()
        .moveTo(pose.neck.x - 7, pose.neck.y + 4)
        .lineTo(pose.neck.x - 25, pose.neck.y + 10 + wave)
        .lineTo(middleX - 4, middleY + 7)
        .lineTo(endX + 5, endY + 10)
        .strokePath();
    }
  }

  private drawWeapon(pose: Pose, color: number, now: number): void {
    const hand = pose.rightHand;
    const weapon = this.weaponLine(pose, this.action === 'attack' ? 48 : 27);
    const angle = Math.atan2(weapon.tip.y - hand.y, weapon.tip.x - hand.x);
    const attackGlow = this.action === 'attack' ? 1 : 0.3;
    this.body.lineStyle(8, 0x02050c, 1).lineBetween(
      hand.x - Math.cos(angle) * 8,
      hand.y - Math.sin(angle) * 8,
      weapon.tip.x,
      weapon.tip.y,
    );
    this.body.lineStyle(3, this.secondaryColor, 0.94)
      .lineBetween(hand.x, hand.y, weapon.tip.x, weapon.tip.y);
    this.accents.lineStyle(this.action === 'attack' ? 7 : 3, color, 0.11 + attackGlow * 0.08)
      .lineBetween(hand.x + 5, hand.y, weapon.tip.x, weapon.tip.y);
    this.accents.fillStyle(0xffffff, 0.85)
      .fillCircle(weapon.tip.x, weapon.tip.y, this.action === 'attack' ? 2.5 : 1.5);
    if (this.action === 'attack' && this.highEffects) {
      const shimmer = Math.sin(now * 0.08) * 2;
      this.accents.lineStyle(1, 0xffffff, 0.78)
        .lineBetween(hand.x + 4, hand.y - 2, weapon.tip.x + shimmer, weapon.tip.y - 2);
    }
  }

  private drawAttackFx(color: number, now: number): void {
    const progress = this.actionProgress(now);
    const cut = this.attackVariant === 2
      ? smoothstep((progress - 0.18) / 0.62)
      : smoothstep((progress - 0.2) / 0.42);
    const alpha = Math.sin(clamp01(cut) * Math.PI);
    const radius = this.attackVariant === 2 ? 67 : 48 + progress * 20;
    const arc = this.attackVariant === 0
      ? { start: -1.22, end: 0.88, cx: 18, cy: -20 }
      : this.attackVariant === 1
        ? { start: 0.72, end: -1.62, cx: 16, cy: 4 }
        : { start: -2.72, end: 2.68, cx: 0, cy: -18 };
    this.trail.lineStyle(this.highEffects ? 17 : 9, this.secondaryColor, 0.065 * alpha)
      .beginPath().arc(arc.cx, arc.cy, radius + 7, arc.start, arc.end).strokePath();
    this.accents.lineStyle(this.attackVariant === 2 ? 8 : 6, this.secondaryColor, 0.82 * alpha)
      .beginPath().arc(arc.cx, arc.cy, radius, arc.start, arc.end).strokePath();
    this.accents.lineStyle(2, 0xffffff, 0.94 * alpha)
      .beginPath().arc(arc.cx, arc.cy, radius - 5, arc.start + 0.04, arc.end - 0.08).strokePath();
    this.accents.lineStyle(2, color, 0.45 * alpha)
      .lineBetween(-8, -54, -48 - progress * 28, -45)
      .lineBetween(-2, -39, -40 - progress * 32, -22)
      .lineBetween(5, -24, -31 - progress * 26, -4);
    if (this.attackVariant === 2 && this.highEffects && progress > 0.55) {
      const finisher = 1 - clamp01((progress - 0.55) / 0.45);
      this.accents.lineStyle(2, 0xffffff, finisher * 0.75)
        .lineBetween(36, -48, 86, -62)
        .lineBetween(42, -31, 99, -32)
        .lineBetween(35, -14, 82, 0);
    }
  }

  private drawHitFx(color: number, now: number): void {
    const progress = this.actionProgress(now);
    const alpha = 1 - progress;
    const radius = 16 + progress * 32;
    this.accents.lineStyle(3, 0xffffff, alpha * 0.9)
      .lineBetween(-radius, -42, radius, -6)
      .lineBetween(-radius * 0.6, -5, radius * 0.8, -45);
    this.accents.lineStyle(2, color, alpha * 0.7).strokeCircle(-8, -26, radius);
  }

  private drawCastFx(color: number, now: number): void {
    const progress = this.actionProgress(now);
    const pulse = 35 + Math.sin(now * 0.022) * 5;
    const fade = Math.min(1, (1 - progress) * 3);
    this.aura.fillStyle(color, 0.055 * fade).fillCircle(0, -18, pulse + 14);
    this.accents.lineStyle(7, color, 0.1 * fade).strokeCircle(0, -18, pulse + 6);
    this.accents.lineStyle(2, this.secondaryColor, 0.92 * fade).strokeCircle(0, -18, pulse);
    this.accents.lineStyle(1, color, 0.78 * fade).strokeCircle(0, -18, pulse - 10);
    const orbit = now * 0.008;
    const particles = this.highEffects ? 6 : 3;
    for (let index = 0; index < particles; index += 1) {
      const angle = orbit + index * (Math.PI * 2 / particles);
      const radius = 38 + (index % 2) * 12;
      const px = Math.cos(angle) * radius;
      const py = -18 + Math.sin(angle) * radius;
      this.accents.fillStyle(index % 2 ? color : this.secondaryColor, 0.85 * fade)
        .fillCircle(px, py, index % 2 ? 2 : 3);
    }
  }

  private drawDefeatFx(now: number): void {
    const pulse = 0.25 + Math.sin(now * 0.004) * 0.08;
    this.aura.lineStyle(2, this.primaryColor, pulse).strokeEllipse(0, 56, 76, 17);
  }

  private drawIdleEmbers(now: number, color: number): void {
    if (!this.highEffects) return;
    const phase = now * 0.001;
    for (let index = 0; index < 3; index += 1) {
      const y = 30 - ((phase * 23 + index * 31) % 50);
      const x = Math.sin(phase * 2 + index * 2.3) * (18 + index * 3);
      this.accents.fillStyle(index === 1 ? this.secondaryColor : color, 0.24)
        .fillCircle(x, y, index === 1 ? 1.8 : 1.2);
    }
  }

  private drawInnerLimbs(
    graphics: Phaser.GameObjects.Graphics,
    pose: Pose,
    offsetX = 0,
    offsetY = 0,
  ): void {
    const line = (a: Point, b: Point) => {
      graphics.lineBetween(
        Phaser.Math.Linear(a.x, b.x, 0.12) + offsetX,
        Phaser.Math.Linear(a.y, b.y, 0.12) + offsetY,
        Phaser.Math.Linear(a.x, b.x, 0.88) + offsetX,
        Phaser.Math.Linear(a.y, b.y, 0.88) + offsetY,
      );
    };
    line(pose.neck, pose.chest);
    line(pose.chest, pose.hip);
    line(pose.leftShoulder, pose.leftElbow);
    line(pose.rightShoulder, pose.rightElbow);
    line(pose.hip, pose.leftKnee);
    line(pose.hip, pose.rightKnee);
  }

  private drawLimbs(graphics: Phaser.GameObjects.Graphics, pose: Pose, offsetX = 0, offsetY = 0): void {
    const line = (a: Point, b: Point) => graphics.lineBetween(
      a.x + offsetX,
      a.y + offsetY,
      b.x + offsetX,
      b.y + offsetY,
    );
    line(pose.neck, pose.chest);
    line(pose.chest, pose.hip);
    line(pose.neck, pose.leftShoulder);
    line(pose.leftShoulder, pose.leftElbow);
    line(pose.leftElbow, pose.leftHand);
    line(pose.neck, pose.rightShoulder);
    line(pose.rightShoulder, pose.rightElbow);
    line(pose.rightElbow, pose.rightHand);
    line(pose.hip, pose.leftKnee);
    line(pose.leftKnee, pose.leftFoot);
    line(pose.hip, pose.rightKnee);
    line(pose.rightKnee, pose.rightFoot);
  }

  private weaponLine(pose: Pose, length: number): { start: Point; tip: Point } {
    const hand = pose.rightHand;
    const elbow = pose.rightElbow;
    const angle = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
    return {
      start: hand,
      tip: point(hand.x + Math.cos(angle) * length, hand.y + Math.sin(angle) * length),
    };
  }

  private mirrorPose(pose: Pose): Pose {
    const mirrored = clonePose(pose);
    (Object.keys(mirrored) as Array<keyof Pose>).forEach((key) => {
      mirrored[key].x *= -1;
    });
    return mirrored;
  }

  private breathePose(time: number): Pose {
    const pose = idlePose();
    const breathe = Math.sin(time) * 1.6;
    const sway = Math.sin(time * 0.47) * 1.2;
    pose.head.y += breathe;
    pose.head.x += sway * 0.55;
    pose.neck.y += breathe * 0.7;
    pose.chest.y += breathe * 0.45;
    pose.chest.x += sway * 0.25;
    pose.leftShoulder.y += breathe * 0.4;
    pose.rightShoulder.y += breathe * 0.4;
    pose.leftHand.y -= breathe * 0.5;
    pose.rightHand.y -= breathe * 0.5;
    return pose;
  }

  private runPose(time: number, speed: number): Pose {
    const pose = idlePose();
    const stride = Math.sin(time);
    const bounce = Math.abs(Math.cos(time));
    const compression = Math.max(0, Math.cos(time * 2));
    const intensity = Phaser.Math.Clamp((speed - 30) / 260, 0, 1);
    const lean = 5 + intensity * 12;
    const strideSize = 28 + intensity * 16;
    const leftLift = Math.max(0, stride);
    const rightLift = Math.max(0, -stride);
    const shoulderTwist = stride * (3 + intensity * 3);
    pose.head = point(lean + 3, -53 + bounce * 4.2 + compression * 1.4);
    pose.neck = point(lean, -32 + bounce * 2.5);
    pose.chest = point(lean * 0.86, -15 + bounce * 2.1);
    pose.hip = point(lean * 0.28, 9 + bounce * 3.2);
    pose.leftShoulder = point(lean - 10 - shoulderTwist, -28 + bounce * 1.7);
    pose.rightShoulder = point(lean + 10 + shoulderTwist, -28 + bounce * 1.7);
    pose.leftElbow = point(lean - 24 * stride, -14 - Math.abs(stride) * 11);
    pose.leftHand = point(lean - 42 * stride, 4 - Math.abs(stride) * 9);
    pose.rightElbow = point(lean + 24 * stride, -14 - Math.abs(stride) * 11);
    pose.rightHand = point(lean + 42 * stride, 4 - Math.abs(stride) * 9);
    pose.leftKnee = point(lean * 0.15 + strideSize * stride * 0.63, 38 - leftLift * 12);
    pose.leftFoot = point(strideSize * stride, 67 - leftLift * (19 + intensity * 8));
    pose.rightKnee = point(lean * 0.15 - strideSize * stride * 0.63, 38 - rightLift * 12);
    pose.rightFoot = point(-strideSize * stride, 67 - rightLift * (19 + intensity * 8));
    return pose;
  }

  private jumpPose(velocityY: number): Pose {
    const falling = velocityY > 0;
    const force = Phaser.Math.Clamp(Math.abs(velocityY) / 560, 0, 1);
    if (!falling) {
      return withPose({
        head: point(5, -62 - force * 7),
        neck: point(3, -38 - force * 4),
        chest: point(1, -19 - force * 2),
        hip: point(-4, 5),
        leftShoulder: point(-10, -33 - force * 2),
        rightShoulder: point(13, -34 - force * 2),
        leftElbow: point(-33, -5),
        leftHand: point(-49, 16),
        rightElbow: point(32, -7),
        rightHand: point(50, 13),
        leftKnee: point(-23, 25),
        leftFoot: point(-11, 46),
        rightKnee: point(20, 29),
        rightFoot: point(7, 52),
      });
    }
    return withPose({
      head: point(-3, -53 + force * 3),
      neck: point(-1, -31),
      chest: point(0, -13),
      hip: point(1, 9),
      leftShoulder: point(-13, -26),
      rightShoulder: point(11, -27),
      leftElbow: point(-37, -15),
      leftHand: point(-54, -35),
      rightElbow: point(36, -14),
      rightHand: point(54, -32),
      leftKnee: point(-23, 36 + force * 4),
      leftFoot: point(-14, 59 + force * 5),
      rightKnee: point(23, 36 + force * 4),
      rightFoot: point(14, 59 + force * 5),
    });
  }

  private blockPose(time: number, now: number): Pose {
    const pose = this.breathePose(time);
    const age = Math.max(0, now - this.blockStarted);
    const recoil = Math.sin(age * 0.052) * Math.exp(-age / 150) * 9;
    pose.head = point(-5 - recoil * 0.45, -51);
    pose.neck = point(-5 - recoil * 0.6, -31);
    pose.chest = point(-8 - recoil * 0.7, -14);
    pose.hip = point(-10 - recoil * 0.35, 10);
    pose.leftShoulder = point(-13 - recoil * 0.5, -27);
    pose.rightShoulder = point(3 - recoil * 0.75, -29);
    pose.leftElbow = point(15 - recoil, -28);
    pose.leftHand = point(29 - recoil, -42);
    pose.rightElbow = point(21 - recoil, -9);
    pose.rightHand = point(35 - recoil, -23);
    pose.leftKnee = point(-20, 40);
    pose.leftFoot = point(-31, 67);
    pose.rightKnee = point(15, 36);
    pose.rightFoot = point(29, 66);
    return pose;
  }

  private attackPose(progress: number): Pose {
    const ready = idlePose();
    if (this.attackVariant === 0) {
      const windup = withPose({
        head: point(-12, -46), neck: point(-12, -27), chest: point(-16, -8), hip: point(-19, 16),
        leftShoulder: point(-25, -22), rightShoulder: point(-3, -28),
        leftElbow: point(15, -17), leftHand: point(36, -34),
        rightElbow: point(-32, -43), rightHand: point(-59, -53),
        leftKnee: point(-27, 45), leftFoot: point(-44, 67),
        rightKnee: point(18, 42), rightFoot: point(38, 67),
      });
      const impact = withPose({
        head: point(23, -54), neck: point(21, -33), chest: point(18, -14), hip: point(12, 9),
        leftShoulder: point(7, -30), rightShoulder: point(30, -27),
        leftElbow: point(-9, -8), leftHand: point(-27, 7),
        rightElbow: point(57, -25), rightHand: point(91, -17),
        leftKnee: point(-24, 41), leftFoot: point(-43, 67),
        rightKnee: point(30, 36), rightFoot: point(51, 65),
      });
      const follow = withPose({
        head: point(17, -43), neck: point(20, -24), chest: point(22, -5), hip: point(15, 15),
        leftShoulder: point(9, -20), rightShoulder: point(31, -18),
        leftElbow: point(-14, -2), leftHand: point(-34, 13),
        rightElbow: point(61, 7), rightHand: point(91, 30),
        leftKnee: point(-27, 45), leftFoot: point(-44, 67),
        rightKnee: point(34, 42), rightFoot: point(54, 67),
      });
      return this.sampleAction(progress, ready, windup, impact, follow, [0.24, 0.46, 0.7]);
    }
    if (this.attackVariant === 1) {
      const windup = withPose({
        head: point(-12, -40), neck: point(-13, -22), chest: point(-15, -3), hip: point(-17, 20),
        leftShoulder: point(-25, -18), rightShoulder: point(-4, -20),
        leftElbow: point(13, -5), leftHand: point(33, -18),
        rightElbow: point(-23, 9), rightHand: point(-43, 35),
        leftKnee: point(-29, 48), leftFoot: point(-48, 67),
        rightKnee: point(20, 46), rightFoot: point(41, 67),
      });
      const impact = withPose({
        head: point(17, -66), neck: point(14, -41), chest: point(10, -21), hip: point(2, 5),
        leftShoulder: point(-1, -36), rightShoulder: point(24, -38),
        leftElbow: point(-17, -12), leftHand: point(-34, 6),
        rightElbow: point(46, -57), rightHand: point(67, -88),
        leftKnee: point(-23, 38), leftFoot: point(-42, 67),
        rightKnee: point(27, 31), rightFoot: point(48, 63),
      });
      const follow = withPose({
        head: point(21, -54), neck: point(21, -32), chest: point(19, -12), hip: point(12, 11),
        leftShoulder: point(7, -28), rightShoulder: point(31, -27),
        leftElbow: point(-11, -6), leftHand: point(-30, 11),
        rightElbow: point(61, -32), rightHand: point(88, -49),
        leftKnee: point(-25, 42), leftFoot: point(-43, 67),
        rightKnee: point(33, 37), rightFoot: point(53, 66),
      });
      return this.sampleAction(progress, ready, windup, impact, follow, [0.27, 0.5, 0.73]);
    }
    const coil = withPose({
      head: point(-17, -43), neck: point(-18, -24), chest: point(-21, -5), hip: point(-22, 18),
      leftShoulder: point(-31, -19), rightShoulder: point(-8, -24),
      leftElbow: point(17, -15), leftHand: point(38, -38),
      rightElbow: point(-43, -27), rightHand: point(-69, -10),
      leftKnee: point(-32, 47), leftFoot: point(-53, 67),
      rightKnee: point(18, 45), rightFoot: point(41, 67),
    });
    const crossed = withPose({
      head: point(7, -68), neck: point(5, -43), chest: point(0, -22), hip: point(-7, 0),
      leftShoulder: point(-12, -38), rightShoulder: point(17, -39),
      leftElbow: point(-35, -18), leftHand: point(-55, 1),
      rightElbow: point(26, -58), rightHand: point(9, -81),
      leftKnee: point(-29, 23), leftFoot: point(-42, 49),
      rightKnee: point(26, 18), rightFoot: point(45, 44),
    });
    const impact = withPose({
      head: point(25, -58), neck: point(25, -36), chest: point(22, -16), hip: point(15, 5),
      leftShoulder: point(9, -32), rightShoulder: point(36, -31),
      leftElbow: point(-13, -7), leftHand: point(-36, 13),
      rightElbow: point(65, -42), rightHand: point(99, -51),
      leftKnee: point(-27, 31), leftFoot: point(-45, 58),
      rightKnee: point(35, 27), rightFoot: point(57, 55),
    });
    const follow = withPose({
      head: point(15, -39), neck: point(18, -20), chest: point(22, -1), hip: point(20, 20),
      leftShoulder: point(8, -16), rightShoulder: point(32, -13),
      leftElbow: point(-19, 3), leftHand: point(-43, 19),
      rightElbow: point(62, 13), rightHand: point(91, 39),
      leftKnee: point(-31, 48), leftFoot: point(-55, 67),
      rightKnee: point(40, 46), rightFoot: point(62, 67),
    });
    if (progress < 0.2) return mixPose(ready, coil, smoothstep(progress / 0.2));
    if (progress < 0.35) return mixPose(coil, crossed, easeOutBack((progress - 0.2) / 0.15, .7));
    if (progress < 0.56) return mixPose(crossed, impact, easeOutBack((progress - 0.35) / 0.21, 1.25));
    if (progress < 0.79) return mixPose(impact, follow, smoothstep((progress - 0.56) / 0.23));
    return mixPose(follow, ready, easeInOutCubic((progress - 0.79) / 0.21));
  }

  private hitPose(progress: number): Pose {
    const impact = withPose({
      head: point(-23, -43), neck: point(-20, -24), chest: point(-16, -5), hip: point(8, 14),
      leftShoulder: point(-31, -18), rightShoulder: point(-8, -23),
      leftElbow: point(-46, -11), leftHand: point(-62, -37),
      rightElbow: point(34, -1), rightHand: point(52, 18),
      leftKnee: point(-24, 45), leftFoot: point(-43, 67),
      rightKnee: point(24, 44), rightFoot: point(44, 67),
    });
    const stagger = withPose({
      head: point(-15, -36), neck: point(-13, -18), chest: point(-10, 0), hip: point(-5, 21),
      leftShoulder: point(-23, -14), rightShoulder: point(0, -16),
      leftElbow: point(-40, -2), leftHand: point(-51, 19),
      rightElbow: point(31, 1), rightHand: point(48, 20),
      leftKnee: point(-30, 49), leftFoot: point(-51, 67),
      rightKnee: point(22, 46), rightFoot: point(43, 67),
    });
    if (progress < 0.42) return mixPose(impact, stagger, easeOutBack(progress / 0.42, 0.7));
    return mixPose(stagger, idlePose(), easeInOutCubic((progress - 0.42) / 0.58));
  }

  private castPose(time: number, progress: number): Pose {
    const pulse = Math.sin(time * 2.4) * 2;
    const cast = withPose({
      head: point(0, -59 + pulse * 0.3), neck: point(0, -36), chest: point(0, -18), hip: point(0, 7),
      leftShoulder: point(-11, -32), rightShoulder: point(11, -32),
      leftElbow: point(-31, -38), leftHand: point(-46, -59 + pulse),
      rightElbow: point(31, -38), rightHand: point(46, -59 - pulse),
      leftKnee: point(-14, 39), leftFoot: point(-24, 67),
      rightKnee: point(14, 39), rightFoot: point(24, 67),
    });
    const enter = smoothstep(progress / 0.22);
    const exit = progress > 0.78 ? smoothstep((progress - 0.78) / 0.22) : 0;
    return mixPose(mixPose(idlePose(), cast, enter), idlePose(), exit);
  }

  private defeatPose(progress: number): Pose {
    const kneel = withPose({
      head: point(-15, -27), neck: point(-13, -9), chest: point(-9, 8), hip: point(4, 27),
      leftShoulder: point(-22, -5), rightShoulder: point(-1, -7),
      leftElbow: point(-35, 15), leftHand: point(-29, 35),
      rightElbow: point(17, 13), rightHand: point(25, 34),
      leftKnee: point(-25, 53), leftFoot: point(-44, 67),
      rightKnee: point(29, 53), rightFoot: point(51, 67),
    });
    const fallen = withPose({
      head: point(58, 42), neck: point(41, 44), chest: point(24, 48), hip: point(3, 54),
      leftShoulder: point(34, 36), rightShoulder: point(36, 53),
      leftElbow: point(14, 28), leftHand: point(-7, 34),
      rightElbow: point(19, 66), rightHand: point(-3, 68),
      leftKnee: point(-23, 58), leftFoot: point(-48, 67),
      rightKnee: point(18, 61), rightFoot: point(47, 67),
    });
    if (progress < 0.5) return mixPose(idlePose(), kneel, easeInOutCubic(progress / 0.5));
    return mixPose(kneel, fallen, easeOutBack((progress - 0.5) / 0.5, 0.45));
  }

  private sampleAction(
    progress: number,
    ready: Pose,
    windup: Pose,
    impact: Pose,
    follow: Pose,
    stops: [number, number, number],
  ): Pose {
    if (progress < stops[0]) return mixPose(ready, windup, smoothstep(progress / stops[0]));
    if (progress < stops[1]) {
      return mixPose(
        windup,
        impact,
        easeOutBack((progress - stops[0]) / (stops[1] - stops[0]), 1.1),
      );
    }
    if (progress < stops[2]) {
      return mixPose(impact, follow, smoothstep((progress - stops[1]) / (stops[2] - stops[1])));
    }
    return mixPose(follow, ready, easeInOutCubic((progress - stops[2]) / (1 - stops[2])));
  }

  private landingPose(base: Pose, progress: number): Pose {
    const crouch = withPose({
      head: point(-2, -39), neck: point(-1, -20), chest: point(0, -2), hip: point(0, 21),
      leftShoulder: point(-14, -16), rightShoulder: point(13, -16),
      leftElbow: point(-34, 0), leftHand: point(-49, 17),
      rightElbow: point(34, 0), rightHand: point(49, 17),
      leftKnee: point(-31, 49), leftFoot: point(-49, 67),
      rightKnee: point(31, 49), rightFoot: point(49, 67),
    });
    return mixPose(crouch, base, easeOutBack(progress, 0.6));
  }

  private brakingPose(base: Pose, progress: number, fromSpeed: number): Pose {
    const force = Phaser.Math.Clamp(fromSpeed / 280, .35, 1);
    const brake = withPose({
      head: point(14 * force, -49),
      neck: point(10 * force, -29),
      chest: point(7 * force, -10),
      hip: point(-9 * force, 14),
      leftShoulder: point(-4, -25),
      rightShoulder: point(20 * force, -24),
      leftElbow: point(-31, -12),
      leftHand: point(-48, -26),
      rightElbow: point(38, -6),
      rightHand: point(55, 12),
      leftKnee: point(-27, 45),
      leftFoot: point(-46, 67),
      rightKnee: point(30, 43),
      rightFoot: point(52, 67),
    });
    return mixPose(brake, base, easeOutBack(progress, .78));
  }

  private applyFootLock(
    pose: Pose,
    worldX: number,
    facing: 1 | -1,
    phase: number,
    speed: number,
  ): void {
    const cycle = Math.sin(phase);
    const leftShouldPlant = cycle < -0.08;
    const rightShouldPlant = cycle > 0.08;
    if (leftShouldPlant && !this.leftFootPlanted) {
      this.leftFootLockX = worldX + pose.leftFoot.x * facing;
      this.leftFootPlanted = true;
    } else if (!leftShouldPlant) {
      this.leftFootPlanted = false;
    }
    if (rightShouldPlant && !this.rightFootPlanted) {
      this.rightFootLockX = worldX + pose.rightFoot.x * facing;
      this.rightFootPlanted = true;
    } else if (!rightShouldPlant) {
      this.rightFootPlanted = false;
    }
    const lockRange = 36 + Phaser.Math.Clamp(speed / 180, 0, 1) * 8;
    if (this.leftFootPlanted) {
      pose.leftFoot.x = Phaser.Math.Clamp((this.leftFootLockX - worldX) * facing, -lockRange, lockRange);
      pose.leftFoot.y = 67;
    }
    if (this.rightFootPlanted) {
      pose.rightFoot.x = Phaser.Math.Clamp((this.rightFootLockX - worldX) * facing, -lockRange, lockRange);
      pose.rightFoot.y = 67;
    }
  }

  private releaseFootLocks(): void {
    this.leftFootPlanted = false;
    this.rightFootPlanted = false;
  }
}
