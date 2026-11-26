import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { transcribe } from "../src/transcribe.mjs";

test("cloud transcription uploads unchanged audio and multipart fields", async t => {
  const root = await mkdtemp(join(tmpdir(), "paoding-asr-upload-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const audioPath = join(root, "fixture.mp3");
  const bytes = Buffer.alloc(256 * 1024, 0x83);
  await writeFile(audioPath, bytes);

  let uploaded;
  let requestError;
  const server = createServer(async (req, res) => {
    try {
      const form = await new Request("http://localhost" + req.url, {
        method: req.method, headers: req.headers, body: req, duplex: "half",
      }).formData();
      const file = form.get("file");
      uploaded = {
        path: req.url, filename: file.name,
        model: form.get("model"), prompt: form.get("prompt"),
        bytes: Buffer.from(await file.arrayBuffer()),
      };
      res.end(JSON.stringify({ text: "  开始做菜。  " }));
    } catch (error) {
      requestError = error;
      res.writeHead(500).end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const progress = [];
  const text = await transcribe({
    provider: "openai", apiKey: "fixture", model: "fixture-model",
    baseUrl: "http://127.0.0.1:" + server.address().port,
  }, audioPath, update => progress.push(update.pct));
  assert.ifError(requestError);
  assert.equal(text, "开始做菜。");
  assert.equal(uploaded.path, "/audio/transcriptions");
  assert.equal(uploaded.filename, "fixture.mp3");
  assert.equal(uploaded.model, "fixture-model");
  assert.match(uploaded.prompt, /食材、用量/);
  assert.deepEqual(uploaded.bytes, bytes);
  assert.deepEqual(progress, [10, 100]);
});
