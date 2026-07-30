# Word Caster

原创中文横版像素言灵守城游戏。玩家是守护“言灵封印”的 Word Caster：
白天在 Caster’s Grimoire 学习英语咒词，夜晚念出词语召唤士兵、
搭建墙、陷阱与炮台，阻挡邪恶法师从召唤门放出的怪物。

战役前3个白昼开放基础建造、四类守军和基础法术，第4个白昼起开放高级言灵。
每个白昼最多首次学习8个词，夜晚可以翻书浏览但不能开始新课程。

## 运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

## 操作

- `A / D`：移动
- `Space`：跳跃
- 鼠标左键：近战或使用工匠锤
- 鼠标右键：放置言灵建筑
- 按住 `M`：开启麦克风，松开后识别
- `E / Tab`：打开施法魔典
- `1 / 2`：切换短刀与工匠锤
- `Esc`：取消、关闭书页或暂停

## 分享版

运行 `npm run package:share` 会生成 `Word-Caster-分享版` 文件夹。

运行 `npm run package:handoff` 会生成不含 `node_modules` 的
`Word-Caster-队友交接版` 源码交接文件夹，并自动检查依赖与素材是否完整。

## 手机与部署

- 手机正式模式为横屏；触控层提供移动、跳跃、近战、放置、工具和暂停。
- 按住底部“按住施法”按钮等价于电脑按住 `M`。
- `railway.json` 已配置 `npm ci && npm run build`、`npm start` 与根路径健康检查。
- 游戏只处理浏览器返回的转写，不保存或上传麦克风音频。
