import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "Word-Caster-队友交接版");

const projectEntries = [
  ".gitignore",
  ".openai/hosting.json",
  "交接说明.md",
  "素材清单.md",
  "README.md",
  "package.json",
  "package-lock.json",
  "drizzle.config.ts",
  "eslint.config.mjs",
  "next.config.ts",
  "railway.json",
  "postcss.config.mjs",
  "tsconfig.json",
  "tsconfig.game.json",
  "vite.config.ts",
  "vite.share.config.ts",
  "app",
  "build",
  "db",
  "drizzle",
  "incantation-voice-kit",
  "public",
  "scripts",
  "share-src",
  "tests",
  "worker",
  "魔法书",
  "Word-Caster-分享版",
];

const rawAssetEntries = [
  "Archer",
  "Explosion",
  "Fire",
  "Lancer",
  "Monk",
  "Sheep",
  "Trees",
  "Warrior",
  "主角",
  "可放置墙",
  "老武士",
  "草地",
  "蘑菇怪",
  "血魔和恶魔",
  "防御塔",
  "稻草人.png",
  "Monsters_Creatures_Fantasy/Flying eye",
  "GandalfHardcore FREE Platformer Assets/BG Dirt1.png",
  "GandalfHardcore FREE Platformer Assets/BG Dirt2.png",
  "GandalfHardcore FREE Platformer Assets/Decor.png",
  "GandalfHardcore FREE Platformer Assets/Small Tent.png",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of [...projectEntries, ...rawAssetEntries]) {
  await cp(resolve(root, entry), resolve(output, entry), {
    recursive: true,
    force: true,
    dereference: true,
    filter(source) {
      const name = source.split("/").at(-1);
      return ![
        ".DS_Store",
        "node_modules",
        "dist",
        ".wrangler",
        ".vinext",
      ].includes(name);
    },
  });
}

console.log(`队友交接文件夹已生成：${output}`);
