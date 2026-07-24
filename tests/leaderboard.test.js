import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(rootDir, "assets/index-DvXX5t7H.js");

test("bundle includes leaderboard with actives count and last-played sorting", () => {
  const source = fs.readFileSync(bundlePath, "utf8");

  assert.match(source, /children:"Leaderboard"/);
  assert.match(source, /" actives"/);
  assert.match(source, /Last played on top/);
  assert.match(source, /home_voice_last_played/);
  assert.match(source, /sort\(\(d,f\)=>\(u\[f\.id\]\?\?0\)-\(u\[d\.id\]\?\?0\)\)/);
});
