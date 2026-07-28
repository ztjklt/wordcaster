import type { VoiceProviderKind } from './VoiceTypes';
export function contributesToOralMastery(provider:string):boolean{return provider!=='mock';}
export function vibrateVoiceSuccess(target:{vibrate?:(pattern:number|number[])=>boolean}|undefined,enabled:boolean,challenge:boolean):boolean{if(!enabled||typeof target?.vibrate!=='function')return false;return target.vibrate(challenge?[20,35,35]:25);}
export function providerLabel(provider:VoiceProviderKind):string{return provider==='openai-realtime'?'REALTIME':provider==='browser'?'BROWSER':'TEXT';}
