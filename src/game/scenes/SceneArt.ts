import Phaser from 'phaser';
import { getArena, type ArenaDefinition, type ArenaId } from '../arena/BattleContent';
import { SaveManager } from '../../storage/SaveManager';

export function addAtmosphericBackdrop(scene:Phaser.Scene, arenaId?:ArenaId, dim=.72):ArenaDefinition{
  const arena=getArena(arenaId ?? SaveManager.load().selectedArenaId);
  scene.cameras.main.setBackgroundColor('#050814');
  const image=scene.add.image(640,360,arena.textureKey).setDisplaySize(1300,734).setAlpha(.76).setDepth(-30);
  scene.tweens.add({targets:image,x:646,y:357,duration:14000,ease:'Sine.inOut',yoyo:true,repeat:-1});
  scene.add.rectangle(640,360,1280,720,0x040711,dim).setDepth(-29);
  scene.add.circle(1080,110,280,arena.accent,.055).setBlendMode(Phaser.BlendModes.ADD).setDepth(-28);
  scene.add.rectangle(640,4,1120,2,arena.accent,.35).setDepth(-27);
  return arena;
}

export function addIllustratedBackdrop(scene:Phaser.Scene,textureKey:string,accent:number,dim=.64):void{
  scene.cameras.main.setBackgroundColor('#040711');
  const image=scene.add.image(640,360,textureKey).setDisplaySize(1300,732).setAlpha(.88).setDepth(-30);
  scene.tweens.add({targets:image,x:646,y:357,duration:15000,ease:'Sine.inOut',yoyo:true,repeat:-1});
  scene.add.rectangle(640,360,1280,720,0x03060f,dim).setDepth(-29);
  scene.add.circle(1080,110,300,accent,.055).setBlendMode(Phaser.BlendModes.ADD).setDepth(-28);
  scene.add.rectangle(640,4,1120,2,accent,.42).setDepth(-27);
}

export function addGlassPanel(scene:Phaser.Scene,x:number,y:number,width:number,height:number,accent:number,alpha=.82):Phaser.GameObjects.Container{
  const shadow=scene.add.rectangle(7,10,width+12,height+16,0x01030a,.48);
  const panel=scene.add.rectangle(0,0,width,height,0x07101f,alpha).setStrokeStyle(1,0x7083a2,.42);
  const top=scene.add.rectangle(0,-height/2+2,width-18,3,accent,.7);
  const glow=scene.add.rectangle(-width/2+2,0,3,height-20,accent,.36);
  return scene.add.container(x,y,[shadow,panel,top,glow]);
}
