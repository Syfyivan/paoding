import assert from "node:assert/strict";
import test from "node:test";
import { explainSteps } from "../src/explain.mjs";

const llm = { baseUrl: "https://model.example.invalid/v1", model: "fixture", apiKey: "fixture" };
const recipe = () => ({ title: "测试菜谱", steps: [{ index: 1 }, { index: 2 }] });
const reply = content => Response.json({
  choices: [{ message: { content: JSON.stringify(content) } }],
});

test("usable explanations survive malformed rows and missing steps", async t => {
  t.mock.method(globalThis, "fetch", async () => reply({
    explanations: [
      null,
      { index: "2", reason: "让受热更均匀", if_not: ["无效字段"], confidence: "high", risk_level: "arbitrary" },
    ],
  }));
  const result = await explainSteps(llm, recipe(), "balanced");
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0].why.reason, "（本步未生成讲解）");
  assert.deepEqual(result.steps[1].why, { reason: "让受热更均匀", if_not: "", cue: "" });
  assert.equal(result.steps[1].confidence, "high");
  assert.equal(result.steps[1].risk_level, "unknown");
});

test("an unusable explanation response still returns all structured steps", async t => {
  let content = null;
  t.mock.method(globalThis, "fetch", async () => reply(content));
  for (const value of [null, { explanations: "not an array" }]) {
    content = value;
    const result = await explainSteps(llm, recipe(), "balanced");
    assert.deepEqual(result.steps.map(step => step.index), [1, 2]);
    assert.ok(result.steps.every(step => step.why.reason === "（本步未生成讲解）"));
  }
});
