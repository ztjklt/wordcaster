import Phaser from 'phaser';
import { RestaurantDialogueSystem, restaurantMenu } from '../../restaurant/RestaurantDialogueSystem';
import { OrderSystem } from '../../restaurant/OrderSystem';
import { RestaurantVoiceOverlay } from '../ui/RestaurantVoiceOverlay';
import { addButton, addTitle } from './SceneHelpers';
import { addGlassPanel, addIllustratedBackdrop } from './SceneArt';

export class RestaurantScene extends Phaser.Scene {
  private readonly dialogue = new RestaurantDialogueSystem();
  private readonly orders = new OrderSystem();
  private overlay?: RestaurantVoiceOverlay;
  private npcText!: Phaser.GameObjects.Text;
  private orderText!: Phaser.GameObjects.Text;

  constructor() { super('RestaurantScene'); }

  create(): void {
    const accent = 0xffad68;
    addIllustratedBackdrop(this, 'scene-restaurant-v2', accent, .43);
    this.add.rectangle(640, 360, 1280, 720, 0x120811, .1).setDepth(-12);
    this.add.rectangle(0, 0, 1280, 5, accent, .32).setOrigin(0).setDepth(-9);
    addTitle(this, 'Daily English / 02', '街角餐厅', '用自然英语点餐，恢复旅途状态。');

    const dialoguePanel = addGlassPanel(this, 318, 368, 500, 270, accent, .82).setDepth(3);
    dialoguePanel.getAt<Phaser.GameObjects.Rectangle>(2)?.setFillStyle(accent, .72);
    this.add.text(102, 253, 'COUNTER  /  对话柜台', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffbd83',
      letterSpacing: 4,
    }).setDepth(5);
    this.add.text(516, 253, 'NPC · MIA', {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#917e94',
      letterSpacing: 2,
    }).setOrigin(1, 0).setDepth(5);

    const portrait = this.add.container(152, 346).setDepth(6);
    const portraitGlow = this.add.circle(0, 0, 53, accent, .06).setStrokeStyle(1, accent, .48);
    const face = this.add.circle(0, -7, 23, 0x0c0a12, 1).setStrokeStyle(3, 0xffc18b, .92);
    const hair = this.add.arc(0, -12, 24, 188, 352, false, 0x522941, .9);
    const eyeA = this.add.circle(-8, -7, 2, 0xffd0a4, .9);
    const eyeB = this.add.circle(8, -7, 2, 0xffd0a4, .9);
    const shoulders = this.add.arc(0, 44, 43, 205, 335, false, 0x412137, .88).setStrokeStyle(3, accent, .52);
    portrait.add([portraitGlow, shoulders, face, hair, eyeA, eyeB]);
    this.tweens.add({ targets: portraitGlow, scale: 1.1, alpha: .72, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.npcText = this.add.text(220, 294, 'What would you like to order?', {
      fontFamily: 'Arial',
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#fff8f1',
      wordWrap: { width: 292 },
      lineSpacing: 7,
    }).setDepth(6).setShadow(0, 3, '#08030a', 8);
    this.add.text(220, 384, '请用下方输入条和店员交谈', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#9a8897',
      letterSpacing: 1,
    }).setDepth(6);
    this.add.rectangle(318, 423, 422, 1, 0xa38696, .18).setDepth(6);
    this.orderText = this.add.text(110, 447, 'ORDER / 当前订单：空', {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffbd83',
      wordWrap: { width: 410 },
    }).setDepth(6);

    const menuPanel = addGlassPanel(this, 936, 355, 568, 396, accent, .84).setDepth(3);
    menuPanel.getAt<Phaser.GameObjects.Rectangle>(2)?.setFillStyle(accent, .72);
    this.add.text(684, 174, 'TONIGHT’S MENU', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '17px',
      color: '#fff6ed',
      letterSpacing: 3,
    }).setDepth(5);
    this.add.text(1168, 180, '8 ITEMS  /  COINS', {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#8e7c91',
      letterSpacing: 2,
    }).setOrigin(1, 0).setDepth(5);
    restaurantMenu.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 808 + col * 264;
      const y = 232 + row * 67;
      const itemAccent = item.type === 'food' ? 0xffad68 : 0x76dff3;
      this.add.rectangle(x, y, 238, 54, 0x101321, .78)
        .setStrokeStyle(1, itemAccent, .22)
        .setDepth(5);
      this.add.circle(x - 96, y, 14, itemAccent, .09).setStrokeStyle(1, itemAccent, .52).setDepth(6);
      this.add.text(x - 96, y, item.type === 'food' ? '◇' : '◌', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: item.type === 'food' ? '#ffc898' : '#9eefff',
      }).setOrigin(.5).setDepth(7);
      this.add.text(x - 72, y - 12, item.name.toUpperCase(), {
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f6f3f7',
        letterSpacing: 1,
      }).setDepth(6);
      this.add.text(x - 72, y + 7, item.type === 'food' ? `饱腹 +${item.hungerRestore}` : `口渴 +${item.thirstRestore}`, {
        fontFamily: 'Arial',
        fontSize: '8px',
        color: '#807f94',
      }).setDepth(6);
      this.add.text(x + 101, y - 7, String(item.price).padStart(2, '0'), {
        fontFamily: 'Arial Black, Arial',
        fontSize: '16px',
        color: item.type === 'food' ? '#ffcf9f' : '#9eefff',
      }).setOrigin(1, 0).setDepth(6);
      this.add.text(x + 101, y + 12, 'COIN', {
        fontFamily: 'Arial',
        fontSize: '6px',
        fontStyle: 'bold',
        color: '#716e84',
        letterSpacing: 1,
      }).setOrigin(1, 0).setDepth(6);
    });

    addButton(this, 222, 548, '确认并用餐', () => this.completeOrder(), true).setScale(.76);
    addButton(this, 466, 548, '返回基地', () => this.scene.start('HomeScene')).setScale(.72);
    this.add.text(690, 513, 'ORDER PHRASES', {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffad68',
      letterSpacing: 2,
    }).setDepth(5);
    this.add.text(690, 534, `“I'd like…”  ·  “Could I have…”  ·  “That's all, thank you.”`, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#91879a',
    }).setDepth(5);

    this.overlay = new RestaurantVoiceOverlay((text) => this.handleSpeech(text));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.overlay?.destroy());
  }

  private handleSpeech(text: string): void {
    const response = this.dialogue.respond(text);
    this.npcText.setText(response.message);
    this.npcText.setColor(response.action === 'wrong_item' ? '#ff8f87' : response.action === 'ready' ? '#72ebd0' : '#fff8f1');
    this.orderText.setText(`ORDER / 当前订单：${this.dialogue.selected.length ? this.dialogue.selected.join(' + ').toUpperCase() : '空'} · ${this.dialogue.total} COIN`);
    this.npcText.setAlpha(.35);
    this.orderText.setAlpha(.35);
    this.tweens.add({ targets: [this.npcText, this.orderText], alpha: 1, duration: 190, ease: 'Cubic.out' });
    if (response.action === 'wrong_item') this.cameras.main.flash(260, 158, 60, 42);
  }

  private completeOrder(): void {
    const result = this.orders.complete(this.dialogue.selected);
    this.npcText.setText(result.message).setColor(result.success ? '#72ebd0' : '#ff9b8f');
    if (result.success) {
      this.dialogue.clear();
      this.orderText.setText('ORDER / 当前订单：空 · 状态已恢复');
      this.cameras.main.flash(180, 40, 160, 130);
    }
  }
}
