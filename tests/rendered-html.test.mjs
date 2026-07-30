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
  const [page, layout, packageJson, game, voice] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/Game.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game/voice.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<Game \/>/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /themeColor:\s*"#182a29"/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(voice, /getUserMedia\(\{ audio: true \}\)/);
  assert.match(game, /createIncantationVoice/);
  assert.match(game, /voiceController\?\.isRequestingPermission/);
  assert.match(game, /touch-cast/);
  assert.match(game, /beginHold\(\)/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await assert.rejects(access(new URL("../public/favicon.svg", import.meta.url)));
  await access(new URL("../app/game/engine.ts", import.meta.url));
  await access(new URL("../app/game/core.ts", import.meta.url));
  await access(new URL("../app/game/voice.ts", import.meta.url));
  await access(new URL("../public/data/codex.json", import.meta.url));
  await access(templateRoot);
});

test("codex right-page cards render immediately instead of remaining transparent", async () => {
  const book = await readFile(
    new URL("../魔法书/index.html", import.meta.url),
    "utf8",
  );
  assert.match(
    book,
    /\.wg\{[^}]*grid-template-rows:repeat\(5,minmax\(0,1fr\)\)/,
  );
  assert.doesNotMatch(book, /style="animation:fi/);
  assert.match(book, /prioritizeCampaignWords/);
  assert.match(book, /availableFromDay/);
  assert.match(book, /第四日起/);
  assert.match(book, /WORD_CASTER_CODEX_LEARN_REQUEST/);
  assert.match(book, /WORD_CASTER_CODEX_LEARN_RESULT/);
  assert.doesNotMatch(book, /function reportKnownCampaignWords/);
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
