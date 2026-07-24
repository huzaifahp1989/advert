import test from "node:test";
import assert from "node:assert/strict";
import { resolveExternalUrl } from "../src/utils/externalUrl.js";

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
});
