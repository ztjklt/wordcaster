import { access, lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const requested = process.argv[2];
const root = requested
  ? resolve(process.cwd(), requested)
  : resolve(import.meta.dirname, "..");

const required = [
  "package.json",
  "package-lock.json",
  "交接说明.md",
  "素材清单.md",
  ".openai/hosting.json",
  "railway.json",
  "app/Game.tsx",
  "app/game/core.ts",
  "app/game/engine.ts",
  "魔法书/index.html",
  "public/book/index.html",
  "share-src/public/book/index.html",
  "scripts/slice-sprites.mjs",
  "tests/game-core.test.ts",
  "Word-Caster-分享版/index.html",
  "public/game/units/knight/idle/frame-00.png",
  "public/game/units/monk/heal/frame-00.png",
  "public/game/enemies/flying-eye/flight/frame-00.png",
  "public/game/effects/explosion/explode/frame-00.png",
  "public/game/terrain/dirt-1.png",
  "public/game/scenery/sheep/idle/frame-00.png",
];

for (const entry of required) {
  await access(resolve(root, entry));
}

for (const entry of ["node_modules", "dist", ".git", ".wrangler", ".vinext"]) {
  try {
    await access(resolve(root, entry));
    throw new Error(`交接目录不应包含 ${entry}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("交接目录")) {
      throw error;
    }
  }
}

for (const entry of ["public/book/index.html", "share-src/public/book/index.html"]) {
  const stats = await lstat(resolve(root, entry));
  if (stats.isSymbolicLink()) {
    throw new Error(`${entry} 仍是符号链接，转交后可能失效`);
  }
}

const packageJson = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
if (!packageJson.engines?.node || !packageJson.scripts?.dev) {
  throw new Error("交接目录缺少Node版本或运行脚本");
}

const rootEntries = await readdir(root);
if (rootEntries.some((entry) => entry === ".DS_Store")) {
  throw new Error("交接目录仍包含系统临时文件");
}

console.log(`交接目录完整性检查通过：${root}`);
