import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished game shell and Chinese metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(
    html,
    /<title>Word Caster｜横版英语言灵守城游戏<\/title>/i,
  );
  assert.match(html, /白天学习英语咒词/);
  assert.match(html, /Word Caster/);
  assert.match(html, /开始新战役/);
  assert.match(html, /按住施法/);
  assert.match(html, /言灵封印/);
  assert.match(html, /<canvas/i);
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("removes starter preview code, assets and dependency", async () => {
  const [page, hostedGame, layout, packageJson, game, voice] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HostedGame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/Game.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game/voice.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<HostedGame \/>/);
  assert.match(hostedGame, /<Game recognizerFactory=\{createArkRecognizer\} \/>/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /themeColor:\s*"#182a29"/);
  assert.match(layout, /href="\.\/ui\/theme\.css"/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(voice, /mediaDevices|getUserMedia/);
  assert.match(game, /createIncantationVoice/);
  assert.match(game, /voiceController\?\.isRequestingPermission/);
  assert.match(game, /touch-cast/);
  assert.match(game, /className="touch-joystick"/);
  assert.match(game, /resolveJoystickVector/);
  assert.match(game, /beginHold\(\)/);
  assert.match(game, /CodexQuickAccessTransactions/);
  assert.match(game, /enableQuickVoiceAccess\(\)/);
  assert.match(game, /gameShellRef\.current\?\.focus/);
  assert.match(game, /engine\.releaseInput\(\)/);
  assert.doesNotMatch(game, /quickUseAction/);
  assert.match(game, /inkCost:\s*CODEX_ACTIONS\[id\]\.inkCost/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await assert.rejects(access(new URL("../public/favicon.svg", import.meta.url)));
  await access(new URL("../app/game/engine.ts", import.meta.url));
  await access(new URL("../app/game/core.ts", import.meta.url));
  await access(new URL("../app/game/voice.ts", import.meta.url));
  await access(new URL("../public/data/codex.json", import.meta.url));
  await access(templateRoot);
});

test("ships the offline dark-fairytale theme, icon sprite and font subsets", async () => {
  const [theme, icons] = await Promise.all([
    readFile(new URL("../public/ui/theme.css", import.meta.url), "utf8"),
    readFile(new URL("../public/ui/icons.svg", import.meta.url), "utf8"),
  ]);
  assert.match(theme, /--wc-obsidian:\s*#0d1318/i);
  assert.match(theme, /--wc-parchment:\s*#eadbb8/i);
  assert.match(theme, /--wc-brass:\s*#c8a75a/i);
  assert.match(theme, /--wc-arcane:\s*#9874c4/i);
  assert.match(theme, /--wc-aether:\s*#78d0d2/i);
  assert.match(theme, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  for (const icon of [
    "book",
    "shield",
    "heart",
    "drop",
    "hourglass",
    "mic",
    "pause",
    "rotate",
    "sparkles",
  ]) {
    assert.match(icons, new RegExp(`<symbol id="${icon}"`));
  }
  for (const font of [
    "cinzel-600.woff2",
    "cinzel-700.woff2",
    "noto-sans-400.woff2",
    "noto-sans-600.woff2",
    "noto-sans-700.woff2",
    "noto-serif-600.woff2",
    "noto-serif-700.woff2",
  ]) {
    const fontBuffer = await readFile(
      new URL(`../public/ui/fonts/${font}`, import.meta.url),
    );
    assert.ok(fontBuffer.byteLength > 10_000, `${font} is unexpectedly small`);
  }
});

test("codex right-page cards render immediately instead of remaining transparent", async () => {
  const book = await readFile(
    new URL("../魔法书/index.html", import.meta.url),
    "utf8",
  );
  assert.match(
    book,
    /\.wg\{\s*grid-template-columns:repeat\(3,minmax\(0,1fr\)\);\s*grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/,
  );
  assert.match(
    book,
    /function pageSize\(\)\{return matchMedia\('\(max-width:900px\),\(max-height:560px\)'\)\.matches\?6:9\}/,
  );
  assert.match(book, /@media\(max-width:500px\)\{\s*\.wg\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(book, /style="animation:fi/);
  assert.match(book, /prioritizeCampaignWords/);
  assert.match(book, /availableFromDay/);
  assert.match(book, /第四日起/);
  assert.match(book, /WORD_CASTER_CODEX_LEARN_REQUEST/);
  assert.match(book, /WORD_CASTER_CODEX_LEARN_RESULT/);
  assert.match(book, /const COMMON_CAT='common'/);
  assert.match(book, /const NAV_CATS=\[COMMON_CAT,\.\.\.CATS\]/);
  assert.match(
    book,
    /gameState\.campaignActions\s*\.map\(action=>findWordInfo\(action\.english\)\)/,
  );
  assert.match(book, /data-action="quick-access"/);
  assert.equal(book.match(/data-action="quick-access"/g)?.length, 1);
  assert.match(book, /WORD_CASTER_CODEX_QUICK_ACCESS_REQUEST/);
  assert.match(book, /WORD_CASTER_CODEX_QUICK_ACCESS_RESULT/);
  assert.match(book, /快速访问仅可在 Word Caster 游戏内开启/);
  assert.doesNotMatch(book, /data-action="quick-use"/);
  assert.doesNotMatch(book, /WORD_CASTER_CODEX_QUICK_USE/);
  assert.match(
    book,
    /function totalProgress\(\)\{let u=0,t=0,ts=0;for\(const c of CATS\)/,
  );
  assert.doesNotMatch(book, /V_DATA\.common\s*=/);
  assert.doesNotMatch(book, /function reportKnownCampaignWords/);
  assert.doesNotMatch(book, /\sonclick\s*=/i);
  assert.doesNotMatch(book, /\binnerHTML\b/);
  assert.doesNotMatch(book, /https?:\/\/fonts\.googleapis\.com/i);
});

test("keeps the retired brand out of player-facing sources", async () => {
  const playerFacingFiles = [
    "../app/Game.tsx",
    "../app/layout.tsx",
    "../app/game/engine.ts",
    "../魔法书/index.html",
    "../README.md",
    "../交接说明.md",
  ];
  for (const path of playerFacingFiles) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /暮林矿途|言灵防线|墨书台|守林人/,
      `${path} still exposes retired story text`,
    );
  }
});

test("ships the supplied ground, defenders, effects, scenery and enemy frames", async () => {
  const asset = (path) =>
    fileURLToPath(new URL(`../public/game/${path}`, import.meta.url));
  const expectedSizes = [
    ["structures/tower.png", 40, 60],
    ["structures/wood-wall.png", 20, 20],
    ["structures/stone-wall.png", 20, 20],
    ["structures/iron-wall.png", 20, 20],
    ["structures/crystal-wall.png", 20, 20],
    ["terrain/grass.png", 96, 32],
    ["terrain/dirt-1.png", 192, 128],
    ["terrain/dirt-2.png", 192, 128],
    ["units/archer/idle/frame-00.png", 20, 20],
    ["units/swordsman/idle/frame-00.png", 28, 40],
    ["units/spearman/idle/frame-00.png", 28, 40],
    ["units/spearman/attack/frame-00.png", 40, 40],
    ["units/knight/idle/frame-00.png", 28, 40],
    ["units/monk/heal/frame-00.png", 28, 32],
    ["effects/fire/burn/frame-00.png", 40, 40],
    ["effects/explosion/explode/frame-00.png", 60, 60],
    ["enemies/mushroom/run/frame-00.png", 20, 20],
    ["enemies/blood-monster/walk/frame-00.png", 40, 40],
    ["enemies/flying-eye/flight/frame-00.png", 40, 40],
    ["enemies/demon/walk/frame-00.png", 60, 60],
    ["scenery/trees/tree-00.png", 56, 72],
    ["scenery/sheep/idle/frame-00.png", 20, 20],
    ["scenery/scarecrow.png", 32, 40],
    ["environment/gandalf/trees/willow.png", 224, 192],
    ["environment/gandalf/ground/tall-grass.png", 96, 32],
    ["environment/gandalf/ground/angel-statue.png", 64, 64],
    ["environment/gandalf/animated/cooking-area.png", 768, 64],
    ["environment/gandalf/animated/portal.png", 640, 64],
    ["environment/gandalf/sky/hot-air-balloon.png", 20, 35],
    ["environment/core/merchant-wizard.png", 200, 280],
  ];
  for (const [path, width, height] of expectedSizes) {
    const metadata = await sharp(asset(path)).metadata();
    assert.equal(metadata.width, width, path);
    assert.equal(metadata.height, height, path);
  }
  const tower = await sharp(asset("structures/tower.png"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(tower.data[3], 0, "tower background should be transparent");
  assert.equal(
    (await readdir(asset("units/archer/shoot"))).filter((name) =>
      name.endsWith(".png"),
    ).length,
    8,
  );
  assert.equal(
    (await readdir(asset("enemies/blood-monster/attack02"))).filter((name) =>
      name.endsWith(".png"),
    ).length,
    8,
  );
  assert.equal(
    (await readdir(asset("enemies/demon/attack01"))).filter((name) =>
      name.endsWith(".png"),
    ).length,
    7,
  );
  assert.equal(
    (await readdir(asset("enemies/flying-eye/flight"))).filter((name) =>
      name.endsWith(".png"),
    ).length,
    8,
  );
});
