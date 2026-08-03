import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the finished Japanese sales page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /この世界はあなたの色になる/);
  assert.match(html, /53,244/);
  assert.match(html, /30,000/);
  assert.match(html, /なぜ、同じ出来事でも/);
  assert.match(html, /その方法は、この教材の中心です/);
});

test("keeps the core method gated and removes unsupported claims", async () => {
  const response = await render();
  const html = await response.text();

  assert.doesNotMatch(html, /諦観|色即是空|空即是色/);
  assert.doesNotMatch(html, /ワークシート|音声ガイド|80,000字|読者の声|★★★★★/);
  assert.doesNotMatch(html, /受講生|販売実績|残り\d|本日限定/);
});

test("places purchase links in the hero, middle, and final close", async () => {
  const response = await render();
  const html = await response.text();
  const purchaseLinks = html.match(/href="https:\/\/note\.com\/"/g) ?? [];

  assert.equal(purchaseLinks.length, 3);
  assert.match(html, /制作確認用の仮リンク/);
  assert.match(html, /答えを知る/);
  assert.match(html, /ここで終わらせる/);
  assert.match(html, /この世界はあなたの色になる<!-- -->』を手に入れる|この世界はあなたの色になる』を手に入れる/);
});
