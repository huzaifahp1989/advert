import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(rootDir, "assets/index-DvXX5t7H.js");
let source = fs.readFileSync(bundlePath, "utf8");

const guard = `function __resolveExternalUrl(u){if(u==null)return;const t=String(u).trim();if(!t||/^(?:#|https?:\\/+#?|https?:\\/\\/#?)$/i.test(t))return;if(/^https?:\\/+/i.test(t)){try{const a=new URL(t);if(a.protocol!=="http:"&&a.protocol!=="https:"||!a.hostname)return;return a.href}catch{return}}try{const n=new URL(t,typeof location<"u"?location.href:void 0);if(n.protocol!=="http:"&&n.protocol!=="https:"||!n.hostname)return;return n.href}catch{return}}function __openExternalUrl(u,e,t){const s=__resolveExternalUrl(u);if(!s)return null;try{return window.open(s,e??"_blank",t)}catch(r){return console.warn("Blocked window.open for invalid URL:",u,r),null}};`;

if (!source.includes("__resolveExternalUrl")) {
  source = guard + source;
} else {
  source = source.replace(
    /function __resolveExternalUrl\(u\)\{[\s\S]*?function __openExternalUrl\(u,e,t\)\{[\s\S]*?\};/,
    guard
  );
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

// Soften the root error boundary so invalid window.open errors do not blank the app.
const originalHandler =
  'handleWindowError=e=>{const t=e.error instanceof Error?`${e.error.name}: ${e.error.message}`:e.message||"Unknown runtime error";this.setState({errorMessage:t})}';
const patchedHandler =
  'handleWindowError=e=>{const t=e.error instanceof Error?`${e.error.name}: ${e.error.message}`:e.message||"Unknown runtime error";if(/Failed to execute [\'"]open[\'"] on [\'"]Window[\'"]/i.test(t)&&/invalid URL/i.test(t)){console.warn("Ignored invalid window.open error:",t);return}this.setState({errorMessage:t})}';

if (source.includes(originalHandler)) {
  source = source.replace(originalHandler, patchedHandler);
} else if (!source.includes("Ignored invalid window.open error")) {
  console.warn("Could not locate handleWindowError for soft-fail patch");
}

fs.writeFileSync(bundlePath, source);
console.log("Patched bundle at", bundlePath);
