/* あなたの経理マン — 全ツール共通ライブラリ
   金額入力(カンマ+全角+カーソル保持)・数値ヘルパー・マスコット注入を1か所に集約。
   すべて端末内で完結し、入力内容はどこにも送信・保存されない。 */
(function () {
  "use strict";

  const zen2han = (s) => String(s).replace(/[０-９．]/g, (c) =>
    c === "．" ? "." : String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const digitsOf = (s) => zen2han(s).replace(/[^\d]/g, "");
  const numOf = (s) => { const v = parseFloat(zen2han(String(s)).replace(/[^\d.]/g, "")); return isNaN(v) ? 0 : v; };
  const commaFmt = (v) => Number(v).toLocaleString("ja-JP");
  const yen = (v) => Math.round(v).toLocaleString("ja-JP");
  const man = (v) => (Math.round(v / 1000) / 10).toLocaleString("ja-JP"); // 万円(小数1桁)

  /* カンマ整形してもカーソル位置(数字何個目の直後か)を保つ */
  function formatMoneyInput(el) {
    const pos = el.selectionStart ?? el.value.length;
    const digitsLeft = digitsOf(el.value.slice(0, pos)).length;
    const digits = digitsOf(el.value);
    el.value = digits ? commaFmt(digits) : "";
    let idx = 0, seen = 0;
    while (idx < el.value.length && seen < digitsLeft) {
      if (/\d/.test(el.value[idx])) seen++;
      idx++;
    }
    try { el.setSelectionRange(idx, idx); } catch { /* 未対応環境は無視 */ }
  }
  function attachMoney(el) {
    if (!el) return;
    el.addEventListener("input", (ev) => { if (ev.isComposing) return; formatMoneyInput(el); });
    el.addEventListener("compositionend", () => formatMoneyInput(el));
  }

  /* 経理マンのマスコット(全ページ共通の1定義) */
  const MASCOT = '<symbol id="keiriman" viewBox="0 0 200 210">' +
    '<path d="M68 132 Q52 170 62 196 Q100 184 138 196 Q148 170 132 132 Z" fill="#2E8B61"/>' +
    '<ellipse cx="86" cy="194" rx="10" ry="7" fill="#2E8B61"/><ellipse cx="114" cy="194" rx="10" ry="7" fill="#2E8B61"/>' +
    '<ellipse cx="100" cy="164" rx="34" ry="30" fill="#4CAF82"/>' +
    '<circle cx="100" cy="163" r="15" fill="#FFD766" stroke="#E8B830" stroke-width="2"/>' +
    '<path d="M93 156l7 8 7-8M100 164v8M95 167h10M95 171h10" stroke="#8A6800" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="80" cy="169" r="9" fill="#4CAF82"/><circle cx="120" cy="169" r="9" fill="#4CAF82"/>' +
    '<circle cx="100" cy="82" r="56" fill="#FFF6E9"/>' +
    '<path d="M97 26 Q102 12 116 16" stroke="#3A2E2A" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M46 66 Q100 50 154 66 L154 92 Q100 78 46 92 Z" fill="#4CAF82"/>' +
    '<circle cx="78" cy="76" r="11" fill="#fff"/><circle cx="78" cy="77" r="6" fill="#3A2E2A"/><circle cx="80.5" cy="74.5" r="2.4" fill="#fff"/>' +
    '<circle cx="122" cy="76" r="11" fill="#fff"/><circle cx="122" cy="77" r="6" fill="#3A2E2A"/><circle cx="124.5" cy="74.5" r="2.4" fill="#fff"/>' +
    '<circle cx="57" cy="102" r="9" fill="#FFB4A2" opacity=".8"/><circle cx="143" cy="102" r="9" fill="#FFB4A2" opacity=".8"/>' +
    '<path d="M91 104 Q100 113 109 104" stroke="#3A2E2A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M164 38l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#FFD766"/>' +
    '<path d="M34 32l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2Z" fill="#FFD766"/></symbol>';
  function injectMascot() {
    if (document.getElementById("keiriman")) return;
    const wrap = document.createElement("div");
    wrap.style.display = "none";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + MASCOT + "</svg>";
    document.body.prepend(wrap);
  }

  /* PWA: オフラインでも使えるように(データは送らない設計と相性◎) */
  function registerSW() {
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { injectMascot(); registerSW(); });
  } else { injectMascot(); registerSW(); }

  window.KMLib = { zen2han, digitsOf, numOf, commaFmt, yen, man, formatMoneyInput, attachMoney, injectMascot };
})();
