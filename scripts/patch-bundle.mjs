import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(rootDir, "assets/index-DvXX5t7H.js");
let source = fs.readFileSync(bundlePath, "utf8");

const guard = `function __resolveExternalUrl(u){if(u==null)return;const t=String(u).trim();if(!t||t==="#")return;try{const n=new URL(t,typeof location<"u"?location.href:void 0);if(n.protocol!=="http:"&&n.protocol!=="https:"||!n.hostname||n.hostname==="#")return;return n.href}catch{if(!/^https?:\\/\\//i.test(t))return;if(/^https?:\\/\\/#?$/i.test(t)||/^https?:\\/#$/i.test(t))return;return t}}function __openExternalUrl(u,e,t){const s=__resolveExternalUrl(u);if(s)return window.open(s,e??"_blank",t)};`;

if (!source.includes("__resolveExternalUrl")) {
  source = guard + source;
}

source = source
  .replaceAll('window.open(A,"_blank")', '__openExternalUrl(A,"_blank")')
  .replaceAll('window.open(me,"_blank")', '__openExternalUrl(me,"_blank")')
  .replaceAll('window.open(f,"_blank")', '__openExternalUrl(f,"_blank")')
  .replaceAll('href:C.link,target:"_blank"', 'href:__resolveExternalUrl(C.link),target:"_blank"')
  .replaceAll('href:m.link||"#"', 'href:__resolveExternalUrl(m.link)')
  .replaceAll('href:o.link||"#"', 'href:__resolveExternalUrl(o.link)')
  .replaceAll('m.websiteUrl||m.link||"#"', '__resolveExternalUrl(m.websiteUrl||m.link)')
  .replaceAll('href:E||"#"', 'href:__resolveExternalUrl(E)');

fs.writeFileSync(bundlePath, source);
console.log("Patched bundle at", bundlePath);
