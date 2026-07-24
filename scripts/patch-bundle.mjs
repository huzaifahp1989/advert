import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(rootDir, "assets/index-DvXX5t7H.js");
let source = fs.readFileSync(bundlePath, "utf8");

const OLD_GUARDS = [
  // Current main (pre-harden)
  `function __resolveExternalUrl(u){if(u==null)return;const t=String(u).trim();if(!t||t==="#")return;try{const n=new URL(t,typeof location<"u"?location.href:void 0);if(n.protocol!=="http:"&&n.protocol!=="https:"||!n.hostname||n.hostname==="#")return;return n.href}catch{if(!/^https?:\\/\\//i.test(t))return;if(/^https?:\\/\\/#?$/i.test(t)||/^https?:\\/#$/i.test(t))return;return t}}function __openExternalUrl(u,e,t){const s=__resolveExternalUrl(u);if(s)return window.open(s,e??"_blank",t)};`,
  // Hardened without window exports
  `function __resolveExternalUrl(u){if(u==null)return;const t=String(u).trim();if(!t||/^(?:#|https?:\\/+#?|https?:\\/\\/#?)$/i.test(t))return;if(/^https?:\\/+/i.test(t)){try{const a=new URL(t);if(a.protocol!=="http:"&&a.protocol!=="https:"||!a.hostname)return;return a.href}catch{return}}try{const n=new URL(t,typeof location<"u"?location.href:void 0);if(n.protocol!=="http:"&&n.protocol!=="https:"||!n.hostname)return;return n.href}catch{return}}function __openExternalUrl(u,e,t){const s=__resolveExternalUrl(u);if(!s)return null;try{return window.open(s,e??"_blank",t)}catch(r){return console.warn("Blocked window.open for invalid URL:",u,r),null}};`,
  // Hardened with window exports (may already be present)
  `function __resolveExternalUrl(u){if(u==null)return;const t=String(u).trim();if(!t||/^(?:#|https?:\\/+#?|https?:\\/\\/#?)$/i.test(t))return;if(/^https?:\\/+/i.test(t)){try{const a=new URL(t);if(a.protocol!=="http:"&&a.protocol!=="https:"||!a.hostname)return;return a.href}catch{return}}try{const n=new URL(t,typeof location<"u"?location.href:void 0);if(n.protocol!=="http:"&&n.protocol!=="https:"||!n.hostname)return;return n.href}catch{return}}function __openExternalUrl(u,e,t){const s=__resolveExternalUrl(u);if(!s)return null;try{return window.open(s,e??"_blank",t)}catch(r){return console.warn("Blocked window.open for invalid URL:",u,r),null}}window.__resolveExternalUrl=__resolveExternalUrl;window.__openExternalUrl=__openExternalUrl;`,
];

const NEW_GUARD = `function __resolveExternalUrl(u){if(u==null)return;const t=String(u).trim();if(!t||/^(?:#|https?:\\/+#?|https?:\\/\\/#?)$/i.test(t))return;if(/^https?:\\/+/i.test(t)){try{const a=new URL(t);if(a.protocol!=="http:"&&a.protocol!=="https:"||!a.hostname)return;return a.href}catch{return}}try{const n=new URL(t,typeof location<"u"?location.href:void 0);if(n.protocol!=="http:"&&n.protocol!=="https:"||!n.hostname)return;return n.href}catch{return}}function __openExternalUrl(u,e,t){const s=__resolveExternalUrl(u);if(!s)return null;try{return window.open(s,e??"_blank",t)}catch(r){return console.warn("Blocked window.open for invalid URL:",u,r),null}}window.__resolveExternalUrl=__resolveExternalUrl;window.__openExternalUrl=__openExternalUrl;`;

if (!source.includes("var H0={exports:{}}")) {
  throw new Error(
    "Bundle is corrupted (missing var H0={exports:{}}). Restore assets/index-DvXX5t7H.js from main before patching."
  );
}

let replacedGuard = false;
for (const oldGuard of OLD_GUARDS) {
  if (source.includes(oldGuard)) {
    source = source.replace(oldGuard, NEW_GUARD);
    replacedGuard = true;
    console.log("Replaced existing external URL guard");
    break;
  }
}

if (!replacedGuard) {
  if (source.startsWith("function __resolveExternalUrl")) {
    throw new Error("Unknown existing __resolveExternalUrl guard; refusing to patch with regex.");
  }
  source = NEW_GUARD + source;
  console.log("Inserted external URL guard at bundle start");
}

const simpleReplacements = [
  ['window.open(A,"_blank")', '__openExternalUrl(A,"_blank")'],
  ['window.open(me,"_blank")', '__openExternalUrl(me,"_blank")'],
  ['window.open(f,"_blank")', '__openExternalUrl(f,"_blank")'],
  ['href:C.link,target:"_blank"', 'href:__resolveExternalUrl(C.link),target:"_blank"'],
  ['href:m.link||"#"', 'href:__resolveExternalUrl(m.link)'],
  ['href:o.link||"#"', 'href:__resolveExternalUrl(o.link)'],
  ['m.websiteUrl||m.link||"#"', '__resolveExternalUrl(m.websiteUrl||m.link)'],
  ['href:E||"#"', 'href:__resolveExternalUrl(E)'],
  // Preview fallthrough: only skip preview when open succeeds.
  [
    'if(A&&A!=="#"){__openExternalUrl(A,"_blank");return}s?.(x.id)',
    'if(A&&A!=="#"&&__openExternalUrl(A,"_blank"))return;s?.(x.id)',
  ],
  [
    'if(f&&f!=="#"){__openExternalUrl(f,"_blank");return}s?.(d.id)',
    'if(f&&f!=="#"&&__openExternalUrl(f,"_blank"))return;s?.(d.id)',
  ],
  // Hardcoded promo inventory slides are not real ads — open advertise flow instead.
  [
    'ads:Bq,className:"home-top-slider",onTrack:(m,E)=>un(m,E,"slider"),onPreview:gs',
    'ads:Bq,className:"home-top-slider",onTrack:(m,E)=>un(m,E,"slider"),onPreview:()=>{ba()}',
  ],
];

for (const [from, to] of simpleReplacements) {
  if (!source.includes(from)) continue;
  source = source.replaceAll(from, to);
}

// Soften the root error boundary so invalid window.open errors do not blank the app.
const originalHandler =
  'handleWindowError=e=>{const t=e.error instanceof Error?`${e.error.name}: ${e.error.message}`:e.message||"Unknown runtime error";this.setState({errorMessage:t})}';
const patchedHandler =
  'handleWindowError=e=>{const t=e.error instanceof Error?`${e.error.name}: ${e.error.message}`:e.message||"Unknown runtime error";if(/Failed to execute [\'"]open[\'"] on [\'"]Window[\'"]/i.test(t)&&/invalid URL/i.test(t)){console.warn("Ignored invalid window.open error:",t);return}this.setState({errorMessage:t})}';

if (source.includes(originalHandler)) {
  source = source.replace(originalHandler, patchedHandler);
  console.log("Soft-failed root error boundary for invalid window.open");
} else if (!source.includes("Ignored invalid window.open error")) {
  console.warn("Could not locate handleWindowError for soft-fail patch");
}

if (!source.includes("var H0={exports:{}}")) {
  throw new Error("Refusing to write corrupted bundle (H0 missing after patch).");
}

fs.writeFileSync(bundlePath, source);
console.log("Patched bundle at", bundlePath);

// Patch lazy chunks that still call window.open with listing links.
const chunkPatches = [
  {
    file: "assets/AllEventsSection-HMXPnNP3.js",
    replacements: [
      [
        't.link&&window.open(t.link,"_blank","noopener,noreferrer")',
        't.link&&(window.__openExternalUrl||window.open)(t.link,"_blank","noopener,noreferrer")',
      ],
      [
        'l.stopPropagation(),window.open(t.link,"_blank","noopener,noreferrer")',
        'l.stopPropagation(),(window.__openExternalUrl||window.open)(t.link,"_blank","noopener,noreferrer")',
      ],
    ],
  },
  {
    file: "assets/AllLinksSection-DXF0WEKJ.js",
    replacements: [
      [
        'C=t=>{!t||t==="#"||window.open(t,"_blank","noopener,noreferrer")}',
        'C=t=>{!t||t==="#"||(window.__openExternalUrl||window.open)(t,"_blank","noopener,noreferrer")}',
      ],
    ],
  },
];

for (const { file, replacements } of chunkPatches) {
  const chunkPath = path.join(rootDir, file);
  let chunk = fs.readFileSync(chunkPath, "utf8");
  let changed = false;
  for (const [from, to] of replacements) {
    if (chunk.includes(to)) continue;
    if (!chunk.includes(from)) continue;
    chunk = chunk.replaceAll(from, to);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(chunkPath, chunk);
    console.log("Patched chunk at", chunkPath);
  } else {
    console.log("Chunk already patched or patterns missing:", chunkPath);
  }
}
