import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadGuard() {
  const code = fs.readFileSync(path.join(rootDir, "url-guard.js"), "utf8");
  const opens = [];
  const context = {
    URL,
    console: { warn() {} },
    document: { addEventListener() {} },
    location: { href: "https://advert.test/" },
  };
  context.window = context;
  context.window.open = (url, target, features) => {
    if (/^(?:https?:\/+#?|https?:\/\/#?)$/i.test(String(url))) {
      throw new Error(
        `Failed to execute 'open' on 'Window': Unable to open a window with invalid URL '${url}'.`
      );
    }
    opens.push({ url, target, features });
    return { focus() {} };
  };
  context.window.addEventListener = () => {};
  vm.runInNewContext(code, context);
  return { context, opens };
}

test("url-guard blocks placeholder links without throwing", () => {
  const { context, opens } = loadGuard();
  assert.equal(context.window.open("https:/#", "_blank"), null);
  assert.equal(context.window.open("https://#", "_blank"), null);
  assert.equal(context.window.open("#", "_blank"), null);
  assert.equal(opens.length, 0);
});

test("url-guard allows real https links", () => {
  const { context, opens } = loadGuard();
  const result = context.window.open("https://example.com/ad", "_blank", "noopener");
  assert.ok(result);
  assert.equal(opens.length, 1);
  assert.equal(opens[0].url, "https://example.com/ad");
});

test("bundle soft-fails invalid window.open errors", () => {
  const source = fs.readFileSync(path.join(rootDir, "assets/index-DvXX5t7H.js"), "utf8");
  assert.match(source, /Ignored invalid window\.open error/);
  assert.match(source, /window\.__openExternalUrl=__openExternalUrl/);
  assert.match(source, /https\?:\\\/\+#\?/);
  // Guard against patch regressions that delete the React vendor preamble.
  assert.match(source, /var H0=\{exports:\{\}\}/);
});

test("index.html inlines bootstrap url guard", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  assert.match(html, /PLACEHOLDER_LINK/);
  assert.match(html, /Ignored invalid window\.open error/);
  assert.match(html, /window\.__openExternalUrl/);
});

test("bundle falls through to ad preview when external open fails", () => {
  const source = fs.readFileSync(path.join(rootDir, "assets/index-DvXX5t7H.js"), "utf8");
  assert.match(
    source,
    /if\(A&&A!=="#"&&__openExternalUrl\(A,"_blank"\)\)return;s\?\.\(x\.id\)/
  );
  assert.match(
    source,
    /if\(f&&f!=="#"&&__openExternalUrl\(f,"_blank"\)\)return;s\?\.\(d\.id\)/
  );
  assert.doesNotMatch(
    source,
    /if\(A&&A!=="#"\)\{__openExternalUrl\(A,"_blank"\);return\}s\?\.\(x\.id\)/
  );
});

test("top slider promo inventory opens advertise flow instead of ad preview", () => {
  const source = fs.readFileSync(path.join(rootDir, "assets/index-DvXX5t7H.js"), "utf8");
  assert.match(
    source,
    /ads:Bq,className:"home-top-slider",onTrack:\(m,E\)=>un\(m,E,"slider"\),onPreview:\(\)=>\{ba\(\)\}/
  );
  assert.match(source, /id:"promo-basic-5-starter"/);
});
