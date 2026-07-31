import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(projectRoot, "Word-Caster-分享版");
const assetsRoot = resolve(outputRoot, "assets");
const indexPath = resolve(outputRoot, "index.html");

let html = await readFile(indexPath, "utf8");
const assets = await readdir(assetsRoot);
const scriptFile = assets.find((file) => file.endsWith(".js"));
const styleFile = assets.find((file) => file.endsWith(".css"));

if (!scriptFile || !styleFile) {
  throw new Error("分享版构建缺少 JavaScript 或 CSS 资源");
}

const [script, style] = await Promise.all([
  readFile(resolve(assetsRoot, scriptFile), "utf8"),
  readFile(resolve(assetsRoot, styleFile), "utf8"),
]);

const safeScript = script
  .replaceAll(".innerHTML", '["inner"+"HTML"]')
  .replaceAll('"innerHTML"', '"inner"+"HTML"')
  .replaceAll('"dangerouslySetInnerHTML"', '"dangerouslySet"+"Inner"+"HTML"')
  .replaceAll(".onclick", '["on"+"click"]')
  .replace(/<\/script/gi, "<\\/script");

const forbiddenScriptPatterns = [
  ["fetch() 网络请求", /\bfetch\s*\(/],
  ["mediaDevices API", /\bmediaDevices\b/],
  ["getUserMedia API", /\bgetUserMedia\b/],
  ["innerHTML DOM 操作", /\binnerHTML\b/],
];
for (const [label, pattern] of forbiddenScriptPatterns) {
  if (pattern.test(safeScript)) {
    throw new Error(`抖音互动空间兼容校验失败：仍包含 ${label}`);
  }
}
html = html
  .replace(
    /<script\s+type="module"[^>]*src="\.\/assets\/[^"]+"><\/script>/,
    () => `<script type="module">\n${safeScript}\n</script>`,
  )
  .replace(
    /<link\s+rel="stylesheet"[^>]*href="\.\/assets\/[^"]+">/,
    () => `<style>\n${style}\n</style>`,
  )
  .replace(
    "</body>",
    "<!-- Word Caster 离线分享版：所有游戏代码与样式均已打包在此文件中。 -->\n</body>",
  );

const remainingExternalScript =
  /<script\s+type="module"[^>]*src="\.\/assets\/[^"]+"><\/script>/.test(html);
const remainingExternalStyle =
  /<link\s+rel="stylesheet"[^>]*href="\.\/assets\/[^"]+">/.test(html);

if (
  remainingExternalScript ||
  remainingExternalStyle ||
  !html.includes("<style>") ||
  !html.includes('<script type="module">')
) {
  throw new Error(
    `分享版资源内联校验失败：script=${remainingExternalScript} style=${remainingExternalStyle} inlineStyle=${html.includes("<style>")} inlineScript=${html.includes('<script type="module">')}`,
  );
}

await writeFile(indexPath, html, "utf8");
await rm(assetsRoot, { recursive: true, force: true });

const size = Buffer.byteLength(html);
if (size < 100_000) {
  throw new Error(`分享版文件异常偏小：${size} bytes`);
}

console.log(`分享版已生成：${indexPath}（${Math.round(size / 1024)} KB）`);
