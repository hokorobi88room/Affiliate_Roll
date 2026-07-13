/* 家計バランス診断 — 手取りから費目ごとの理想の目安を金額で出す
   すべて端末内で完結し、入力内容はどこにも送信・保存されない。
   税額計算は不要(割合をかけるだけ)なので kmlib.js だけで動く。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const { digitsOf, commaFmt, yen } = window.KMLib;

  /* 費目の配分プロファイル(合計はどちらも100%)。
     verb は表示の言い回し(家賃などは「まで」、貯金は「ねらう」)。 */
  const PROFILES = {
    single: [
      { key: "rent",    emoji: "🏠", label: "家賃",       pct: 28, verb: "まで" },
      { key: "food",    emoji: "🍚", label: "食費",       pct: 15, verb: "まで" },
      { key: "utility", emoji: "💡", label: "水道・光熱", pct: 6,  verb: "まで" },
      { key: "comm",    emoji: "📱", label: "通信",       pct: 5,  verb: "まで" },
      { key: "insure",  emoji: "🛡️", label: "保険",       pct: 3,  verb: "まで" },
      { key: "fun",     emoji: "🎉", label: "趣味・交際", pct: 11, verb: "まで" },
      { key: "goods",   emoji: "🧴", label: "日用品・服", pct: 8,  verb: "まで" },
      { key: "save",    emoji: "🐷", label: "貯金・投資", pct: 17, verb: "ねらう" },
      { key: "spare",   emoji: "🧰", label: "予備",       pct: 7,  verb: "のこす" },
    ],
    family: [
      { key: "rent",    emoji: "🏠", label: "家賃",       pct: 25, verb: "まで" },
      { key: "food",    emoji: "🍚", label: "食費",       pct: 18, verb: "まで" },
      { key: "utility", emoji: "💡", label: "水道・光熱", pct: 7,  verb: "まで" },
      { key: "comm",    emoji: "📱", label: "通信",       pct: 5,  verb: "まで" },
      { key: "insure",  emoji: "🛡️", label: "保険",       pct: 6,  verb: "まで" },
      { key: "fun",     emoji: "🎉", label: "趣味・交際", pct: 8,  verb: "まで" },
      { key: "goods",   emoji: "🧴", label: "日用品・服", pct: 9,  verb: "まで" },
      { key: "save",    emoji: "🐷", label: "貯金・投資", pct: 15, verb: "ねらう" },
      { key: "spare",   emoji: "🧰", label: "予備",       pct: 7,  verb: "のこす" },
    ],
  };

  const inTake = $("in-take");
  window.KMLib.attachMoney(inTake);

  const takeOf = () => {
    const v = parseInt(digitsOf(inTake.value), 10);
    return isNaN(v) ? 0 : v;
  };
  const profileKey = () =>
    document.querySelector('input[name="household"]:checked').value;

  /* 触られるまでデフォルト選択に色をつけない(どちらかを推しに見せない) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  /* 入力ミス救済(「25」= 25万のつもり等)。無反応にしない */
  function moneyHint(v) {
    const hintEl = $("take-hint");
    if (v > 0 && v < 10000) {
      if (v < 1000) {
        hintEl.innerHTML =
          `もしかして <strong>${v}万円</strong> ですか? → ` +
          `<button type="button" class="linklike" id="take-fix" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      } else {
        hintEl.textContent = "「円」の単位で、1万円以上の数字を入れてください(例: 250,000)";
      }
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }
  $("take-hint").addEventListener("click", (e) => {
    const b = e.target.closest("#take-fix");
    if (!b) return;
    inTake.value = commaFmt(b.dataset.v);
    inTake.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function render() {
    const take = takeOf();
    moneyHint(take);
    const out = $("result");
    if (take < 10000) { out.hidden = true; return; }

    const key = profileKey();
    const items = PROFILES[key];
    const amtOf = (pct) => Math.round(take * pct / 100);
    const rent = items.find((i) => i.key === "rent");
    const save = items.find((i) => i.key === "save");
    const rentAmt = amtOf(rent.pct);
    const saveAmt = amtOf(save.pct);

    out.hidden = false;

    /* ヒーロー: いちばん聞かれる「家賃はいくらまで」を主役に */
    $("r-label").textContent = `家賃の目安(手取り ${yen(take)}円)`;
    $("r-rent").innerHTML = `${yen(rentAmt)}<small>円まで</small>`;
    $("r-sub").innerHTML =
      `貯金・投資は月 <strong>${yen(saveAmt)}円</strong> をねらいましょう`;

    /* 費目ごとの早見表(◯円まで(◯%)) */
    const tbody = $("r-rows");
    tbody.innerHTML = "";
    for (const it of items) {
      const amt = amtOf(it.pct);
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${it.emoji} ${it.label}</td>` +
        `<td>${yen(amt)}円<small>${it.verb}</small></td>` +
        `<td>${it.pct}%</td>`;
      tbody.appendChild(tr);
    }

    /* 経理マンの吹き出し(数値を復唱→貯金の目標→問いで締め) */
    const kindWord = key === "single" ? "ひとりぐらし" : "家族ぐらし";
    $("r-react").innerHTML =
      `${kindWord}で手取り ${yen(take)}円 なら、家賃は <strong>${yen(rentAmt)}円まで</strong> が目安。` +
      `貯金・投資は月 <strong>${yen(saveAmt)}円</strong> をねらいましょう。` +
      `いまの暮らしと比べて、どこがはみ出ていますか?`;
  }

  /* 入力のたび即時再計算 */
  inTake.addEventListener("input", render);
  for (const rdo of document.querySelectorAll('input[name="household"]')) {
    rdo.addEventListener("change", render);
  }

  render();
})();
