import test from "node:test";
import assert from "node:assert/strict";
import {
  isIgnorableOpenError,
  resolveExternalUrl,
} from "../src/utils/externalUrl.js";

test("resolveExternalUrl rejects hash-only links", () => {
  assert.equal(resolveExternalUrl("#", "https://example.com/"), undefined);
  assert.equal(resolveExternalUrl("  #  ", "https://example.com/"), undefined);
});

test("resolveExternalUrl accepts real http(s) links", () => {
  assert.equal(
    resolveExternalUrl("https://example.com", "https://advert.test/"),
    "https://example.com/"
  );
  assert.equal(
    resolveExternalUrl("/directory", "https://advert.test/"),
    "https://advert.test/directory"
  );
});

test("resolveExternalUrl rejects malformed absolute links", () => {
  assert.equal(resolveExternalUrl("https://#", "https://advert.test/"), undefined);
  assert.equal(resolveExternalUrl("https:/#", "https://advert.test/"), undefined);
  assert.equal(resolveExternalUrl("http://#", "https://advert.test/"), undefined);
  assert.equal(resolveExternalUrl("http:/#", "https://advert.test/"), undefined);
  assert.equal(resolveExternalUrl("https:///#", "https://advert.test/"), undefined);
});

test("resolveExternalUrl does not rewrite https:/# onto the current origin", () => {
  assert.equal(resolveExternalUrl("https:/#", "https://advert.test/path"), undefined);
});

test("resolveExternalUrl rejects non-http schemes", () => {
  assert.equal(resolveExternalUrl("mailto:hello@example.com"), undefined);
  assert.equal(resolveExternalUrl("javascript:alert(1)"), undefined);
});

test("isIgnorableOpenError matches WebView window.open failures", () => {
  assert.equal(
    isIgnorableOpenError(
      "Failed to execute 'open' on 'Window': Unable to open a window with invalid URL 'https:/#'."
    ),
    true
  );
  assert.equal(isIgnorableOpenError("TypeError: something else"), false);
});
