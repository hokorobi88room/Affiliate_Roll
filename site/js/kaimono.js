/* 買い物の計算 UI(消費税・割引・ポイント・割り勘)
   すべて端末内で完結し、入力内容はどこにも送信・保存されない。
   共通ヘルパーは kmlib.js(window.KMLib)を使う。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const { attachMoney, digitsOf, numOf, yen } = window.KMLib;

  /* 数値の読み取り */
  const moneyOf = (el) => { const v = parseInt(digitsOf(el.value), 10); return isNaN(v) ? 0 : v; };
  const intOf = (el) => { const v = parseInt(digitsOf(el.value), 10); return isNaN(v) ? 0 : v; };

  /* 金額入力にはカンマ整形を付与(%・人数は付けない) */
  ["in-in2out-amount", "in-out2in-amount", "in-disc-price", "in-disc-yen", "in-pt-amount", "in-wk-total"]
    .forEach((id) => attachMoney($(id)));

  /* 触られるまでデフォルト選択に色をつけない(どちらも対等に見せる) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  /* モード切り替え: 選んだモードの入力だけ出す */
  const mode = $("in-mode");
  function syncMode() {
    const m = mode.value;
    for (const block of document.querySelectorAll(".mode-block")) {
      block.hidden = block.dataset.mode !== m;
    }
  }

  /* 割引: %オフ / 円引き で入力欄を切り替え */
  function syncDisc() {
    const type = document.querySelector('input[name="disc-type"]:checked').value;
    document.querySelector('[data-disc="pct"]').hidden = type !== "pct";
    document.querySelector('[data-disc="yen"]').hidden = type !== "yen";
  }
  for (const rdo of document.querySelectorAll('input[name="disc-type"]')) {
    rdo.addEventListener("change", () => { syncDisc(); render(); });
  }

  const taxRate = (name) => Number(document.querySelector(`input[name="${name}"]:checked`).value);

  function show(label, num, sub, react, note) {
    const out = $("result");
    out.hidden = false;
    $("r-label").textContent = label;
    $("r-num").innerHTML = `${yen(num)}<small>円</small>`;
    $("r-sub").innerHTML = sub;
    $("r-react").innerHTML = react;
    const noteEl = $("r-note");
    if (note) { noteEl.textContent = note; noteEl.hidden = false; }
    else { noteEl.hidden = true; }
  }
  const hide = () => { $("result").hidden = true; };

  function render() {
    const m = mode.value;

    if (m === "in2out") {
      const base = moneyOf($("in-in2out-amount"));
      if (base <= 0) return hide();
      const r = taxRate("tax-in2out");
      const tax = Math.round(base * r / 100);
      const total = base + tax;
      show(
        "税こみの金額",
        total,
        `税ぬき <strong>${yen(base)}円</strong> + 消費税 <strong>${yen(tax)}円</strong>(${r}%)`,
        `税ぬき${yen(base)}円に消費税が${yen(tax)}円のって、レジでは<strong>${yen(total)}円</strong>です。思っていた金額と、ズレていませんか?`
      );
      return;
    }

    if (m === "out2in") {
      const total = moneyOf($("in-out2in-amount"));
      if (total <= 0) return hide();
      const r = taxRate("tax-out2in");
      const base = Math.round(total / (1 + r / 100));
      const tax = total - base;
      show(
        "税ぬきの金額(中身)",
        base,
        `消費税 <strong>${yen(tax)}円</strong> / 税こみ <strong>${yen(total)}円</strong>(${r}%)`,
        `${yen(total)}円のうち、消費税は${yen(tax)}円。中身(税ぬき)は<strong>${yen(base)}円</strong>でした。`
      );
      return;
    }

    if (m === "discount") {
      const price = moneyOf($("in-disc-price"));
      const type = document.querySelector('input[name="disc-type"]:checked').value;
      if (type === "pct") {
        const pct = numOf($("in-disc-pct").value);
        if (price <= 0 || pct <= 0) return hide();
        const pay = Math.max(0, Math.round(price * (1 - pct / 100)));
        const saved = price - pay;
        show(
          "支払う金額",
          pay,
          `元の値段 <strong>${yen(price)}円</strong> / お得 <strong>${yen(saved)}円</strong>(${pct}%オフ)`,
          `${yen(price)}円が${yen(pay)}円に。<strong>${yen(saved)}円</strong>おトクです。値引き前の金額、しっかり確認しましたか?`
        );
      } else {
        const off = moneyOf($("in-disc-yen"));
        if (price <= 0 || off <= 0) return hide();
        const pay = Math.max(0, price - off);
        const saved = price - pay;
        show(
          "支払う金額",
          pay,
          `元の値段 <strong>${yen(price)}円</strong> / お得 <strong>${yen(saved)}円</strong>(${yen(off)}円引き)`,
          `${yen(price)}円から${yen(off)}円引いて、支払いは<strong>${yen(pay)}円</strong>。${yen(saved)}円おトクです。`
        );
      }
      return;
    }

    if (m === "point") {
      const amount = moneyOf($("in-pt-amount"));
      const rate = numOf($("in-pt-rate").value);
      if (amount <= 0 || rate <= 0) return hide();
      const pts = Math.floor(amount * rate / 100);
      const net = amount - pts;
      show(
        "実質の負担",
        net,
        `支払い <strong>${yen(amount)}円</strong> / もらえるポイント <strong>${yen(pts)}pt</strong>(還元率 ${rate}%)`,
        `${yen(amount)}円で${yen(pts)}ポイント。実質は<strong>${yen(net)}円</strong>まで下がります。ポイントの使い道は、もう決まっていますか?`
      );
      return;
    }

    if (m === "warikan") {
      const total = moneyOf($("in-wk-total"));
      const people = intOf($("in-wk-people"));
      if (total <= 0 || people <= 0) return hide();
      const per = Math.ceil(total / people);
      const collected = per * people;
      const over = collected - total;
      const noteMsg = over === 0
        ? "ちょうど割り切れるので、端数はありません。"
        : `端数がないよう1円単位で切り上げています。${people}人ぶんで${yen(collected)}円あつまり、もとより${yen(over)}円だけ多め(あとで誰かに返してもOK)。`;
      show(
        "ひとりぶん",
        per,
        `合計 <strong>${yen(total)}円</strong> ÷ <strong>${people}人</strong>`,
        `${yen(total)}円を${people}人で分けると、ひとり<strong>${yen(per)}円</strong>。` +
          (over === 0
            ? "きれいに割り切れました。幹事さん、おつかれさまです。"
            : `端数の${yen(over)}円だけ、あとで調整すればバッチリです。幹事さん、おつかれさまです。`),
        noteMsg
      );
      return;
    }

    hide();
  }

  /* 入力のたび即時再計算 */
  for (const el of document.querySelectorAll("#calc-form input, #calc-form select")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }
  mode.addEventListener("change", () => { syncMode(); render(); });

  syncMode();
  syncDisc();
  render();
})();
