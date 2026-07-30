# Incantation Voice Kit

把“说出单词 → 命中词库 → 彩色流光、闪光变色与声音反馈”接入任意网页项目。运行时零依赖，不需要 Phaser、React、OpenAI API 或服务端。

## 直接运行示例

```bash
npm install
npm run build
npm run example
```

示例地址为终端显示的本地网址加 `/examples/`。浏览器麦克风识别需要 `https://` 或 `localhost`。不支持 Web Speech API 的浏览器会自动保留“念写”输入。

## ESM / TypeScript

```ts
import {
  createIncantationVoice,
  playWordFlash,
  type IncantationWord,
} from 'incantation-voice-kit';
import 'incantation-voice-kit/style.css';

const words: IncantationWord[] = [
  { id: 'apple', word: 'apple', color: '#ff6b7b', soundProfile: 'food' },
  { id: 'shield', word: 'shield', color: '#73cfff', soundProfile: 'metal' },
  { id: 'stone', word: 'stone', aliases: ['rock'], color: '#b7b9c3', soundProfile: 'nature' },
];

const voice = createIncantationVoice({
  target: '#voice-layer',
  words,
  volume: 0.8,
  onMatch(result) {
    const target = document.querySelector(`[data-word-id="${result.word.id}"]`);
    if (target instanceof HTMLElement) {
      playWordFlash(target, { color: result.word.color });
    }
    game.execute(result.word.id);
  },
  onNoMatch(result) {
    console.warn(result.reason, result.transcript);
  },
});
```

挂载元素应具有定位上下文：

```css
#voice-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
```

## 直接用 `<script>`

```html
<link rel="stylesheet" href="./incantation-voice-kit.css">
<script src="./incantation-voice-kit.iife.js"></script>
<script>
  const voice = IncantationVoiceKit.createIncantationVoice({
    target: '#voice-layer',
    words: [
      { id: 'apple', word: 'apple', color: '#ff6b7b', soundProfile: 'food' }
    ],
    onMatch(result) {
      console.log('matched', result.word.id);
    }
  });
</script>
```

IIFE和ESM构建都内嵌默认音效；`dist/assets/audio` 另附原始OGG，方便项目自行托管或替换。

## 手动确认游戏结果

默认 `feedbackMode: 'auto'`，词库命中后立即显示成功反馈。需要先让游戏校验冷却、资源或目标状态时使用手动模式：

```ts
let voice;
voice = createIncantationVoice({
  target: '#voice-layer',
  words,
  feedbackMode: 'manual',
  onMatch(result) {
    if (game.canExecute(result.word.id)) {
      game.execute(result.word.id);
      voice.playSuccess(result);
    } else {
      voice.playFailure('cooldown');
    }
  },
});
```

## Phaser 接入

```ts
const voice = createIncantationVoice({
  target: '#dom-overlay',
  words,
  onMatch: ({ word }) => {
    const target = sceneObjects.get(word.id);
    target?.setTintFill(Number.parseInt((word.color ?? '#ffffff').slice(1), 16));
    scene.time.delayedCall(180, () => target?.clearTint());
  },
});

scene.events.once('shutdown', () => voice.destroy());
```

组件本身没有 Phaser 依赖；回调只返回纯数据。

## React 接入

```tsx
const overlayRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!overlayRef.current) return;
  const voice = createIncantationVoice({
    target: overlayRef.current,
    words,
    onMatch: ({ word }) => dispatch({ type: 'cast', wordId: word.id }),
  });
  return () => voice.destroy();
}, [words]);

return <div ref={overlayRef} className="voice-layer" />;
```

## API

### `createIncantationVoice(options)`

- `target`：挂载元素或CSS选择器。
- `words`：`{ id, word, aliases?, color?, soundProfile? }[]`。
- `language`：浏览器识别语言，默认 `en-US`。
- `continuous`：是否持续识别，默认 `true`。
- `feedbackMode`：`auto` 或 `manual`。
- `volume`：`0–1`。
- `accentColor`：默认主题色。
- `reducedMotion`：`true`、`false` 或 `system`。
- `haptics`：是否在成功时震动，默认关闭。
- `shortcuts`：是否启用 `L` 言灵、`N` 念写，默认开启。
- `onMatch`、`onNoMatch`、`onCandidate`、`onStateChange`：项目回调。

实例方法：

- `start()` / `stop()` / `destroy()`
- `submitText(text)`
- `setWords(words)`
- `setVolume(volume)`
- `playSuccess(result?)` / `playFailure(reason?)`

辅助方法 `playWordFlash(element, options)` 会对任意DOM目标播放“主题色 → 金色 → 紫色 → 恢复”的闪变。

## 匹配规则

- 忽略大小写、标点、连字符与重复空格。
- 一个句子可以包含一个词库单词，例如 `Please give me the shield`。
- 同时包含两个词库单词时返回 `ambiguous`。
- `a p p l e` 返回 `spelling`，不会误执行。
- 实时片段只产生候选，不执行操作；浏览器最终结果才会触发 `onMatch`。
- 浏览器前三个识别候选中，主结果未知时会尝试备选文本。
- 连续识别异常三次后停止重连并切换念写。

## 声音与许可

四个原始界面音效来自 Kenney UI SFX Set，按 CC0 提供，详见 `LICENSE-KENNEY.txt`。八种单词专属音色由 Web Audio API 实时合成。

代码当前标记为 `UNLICENSED`，如需公开发布到 npm，请由项目所有者选择并补充代码许可证。
