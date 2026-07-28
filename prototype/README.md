# 单文件横版闯关原型

独立于仓库主项目（`src/`、`server/` 等 Phaser+Vite 格斗版）的新方向探索：**名词召唤战斗 + 空洞骑士式横版拾词闯关**。单个 `index.html`，Phaser 3 从 CDN 加载，无需构建。

## 运行

```bash
cd prototype
python3 -m http.server 8765
```

浏览器打开 `http://localhost:8765`（需要用本地服务器而非直接双击文件，否则麦克风无法启用）。Chrome 优先。

## 当前内容

- 开场：破损的咒语书
- 第一关"苏醒森林"：横版拾词闯关，6 个单词（jump / push / shield / water / wind / bridge），每个对应一段小机关
- 语音持续监听，说出已拾得的英文单词即可施放对应效果
- 关末魔法书结算 + 选卡准备下一关（下一关内容待续）
