import { access, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "Word-Caster-分享版");
const requiredFiles = ["index.html", "book/index.html", "README.txt"];

for (const relativePath of requiredFiles) {
  await access(resolve(root, relativePath));
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const sourceExtensions = new Set([".css", ".html", ".js", ".mjs"]);
const checks = [
  ["fetch() 网络请求", /\bfetch\s*\(/],
  ["XMLHttpRequest 网络请求", /\bXMLHttpRequest\b/],
  ["WebSocket 网络请求", /\bWebSocket\b/],
  ["mediaDevices API", /\bmediaDevices\b/],
  ["getUserMedia API", /\bgetUserMedia\b/],
  ["innerHTML DOM 操作", /\binnerHTML\b/],
  ["内联事件属性", /<[^>]+\son[a-z]+\s*=/i],
  [
    "外部资源链接",
    /\b(?:href|src)\s*=\s*["'](?:https?:)?\/\//i,
  ],
  [
    "页面跳转赋值",
    /\b(?:window\.)?location(?:\.href)?\s*=(?!=)/,
  ],
];

const violations = [];
const files = await collectFiles(root);
for (const path of files) {
  if (!sourceExtensions.has(extname(path).toLowerCase())) continue;
  const source = await readFile(path, "utf8");
  for (const [label, pattern] of checks) {
    const match = pattern.exec(source);
    if (match) {
      const before = source.slice(0, match.index);
      const line = before.split("\n").length;
      const column = match.index - before.lastIndexOf("\n");
      violations.push(
        `${path.slice(root.length + 1)}:${line}:${column} ${label}`,
      );
    }
  }
}

if (violations.length > 0) {
  throw new Error(
    `抖音互动空间静态检查未通过：\n${violations.join("\n")}`,
  );
}

console.log(
  `抖音互动空间静态检查通过：${files.length} 个文件，必需入口与本地资源完整`,
);
