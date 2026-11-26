import assert from "node:assert/strict";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createRecipeLibrary } from "../src/recipe-library.mjs";

test("the recipe list rereads only changed files and notices additions and deletions", (t) => {
  const directory = fs.mkdtempSync(path.join(tmpdir(), "paoding-recipes-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const write = (id, title, created_at) => {
    fs.writeFileSync(path.join(directory, id + ".json"), JSON.stringify({ title, created_at }));
  };
  write("first", "番茄炒蛋", "2026-01-01");
  write("second", "白灼虾", "2026-01-02");
  const read = fs.readFileSync;
  const reads = [];
  t.mock.method(fs, "readFileSync", (file, ...args) => {
    if (typeof file === "string" && path.dirname(file) === directory) reads.push(path.basename(file));
    return read(file, ...args);
  });
  const list = createRecipeLibrary(directory);
  assert.deepEqual(list().map(r => r.id), ["second", "first"]);
  assert.deepEqual(reads.splice(0).sort(), ["first.json", "second.json"]);
  assert.deepEqual(list().map(r => r.id), ["second", "first"]);
  assert.deepEqual(reads.splice(0), []);

  write("first", "番茄炒鸡蛋", "2026-01-03");
  assert.deepEqual(list().map(r => r.title), ["番茄炒鸡蛋", "白灼虾"]);
  assert.deepEqual(reads.splice(0), ["first.json"]);

  fs.unlinkSync(path.join(directory, "second.json"));
  fs.writeFileSync(path.join(directory, "third.json"), "{partial");
  assert.deepEqual(list().map(r => r.id), ["first"]);
  write("third", "冬瓜汤", "2026-01-04");
  assert.deepEqual(list().map(r => r.id), ["third", "first"]);
});
