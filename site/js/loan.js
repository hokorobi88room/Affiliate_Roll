/* ローン返済シミュレーション(元利均等)UI
   すべて端末内で完結し、入力内容はどこにも送信・保存されない。
   共通ヘルパーは kmlib.js(window.KMLib)を使う。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const K = window.KMLib;
  const yen = K.yen;      // 四捨五入してカンマ(円)
  const man = K.man;      // 万円(小数1桁)
  const numOf = K.numOf;  // 小数を許す数値化(金利用)
  const digitsOf = K.digitsOf;

  /* 2択でコピーが少し変わるだけ(計算式は同じ) */
  const COPY = {
    house: { lbl: "住宅ローンなら3,000万円くらい", ph: "30,000,000", years: "住宅は35年が多め", word: "住宅ローン" },
    car:   { lbl: "車なら200〜400万円くらい",     ph: "3,000,000",  years: "車は5〜7年が多め", word: "車・その他のローン" },
  };

  const el = {
    amount: $("in-amount"),
    rate: $("in-rate"),
    years: $("in-years"),
  };

  /* 金額入力にカンマ+全角→半角+カーソル保持(金利・年数には付けない) */
  K.attachMoney(el.amount);

  /* 触られるまでデフォルト選択に色をつけない(どちらかを「推し」に見せない) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  function kind() {
    return document.querySelector('input[name="kind"]:checked').value;
  }

  /* 2択の切り替えで、ラベルの補足文とプレースホルダだけ差し替える(入力値は消さない) */
  function syncCopy() {
    const c = COPY[kind()] || COPY.house;
    $("amount-lbl-hint").textContent = c.lbl;
    $("years-lbl-hint").textContent = c.years;
    el.amount.placeholder = c.ph;
  }

  /* 元利均等の毎月返済額 */
  function calcLoan(principal, annualPct, years) {
    const r = annualPct / 12 / 100;      // 月利
    const n = years * 12;                // 返済回数(か月)
    let monthly;
    if (r === 0) {
      monthly = principal / n;           // 無利息は元金を回数で割るだけ
    } else {
      const q = Math.pow(1 + r, n);
      monthly = principal * r * q / (q - 1);
    }
    const total = monthly * n;           // 総返済額 = 毎月 × 回数
    const interest = total - principal;  // 利息合計 = 総返済 − 借入
    return { monthly, total, interest, n };
  }

  /* 入力ミス救済(「3000」= 3,000万のつもり等)。無反応にしない */
  function amountHint(v) {
    const hintEl = $("amount-hint");
    if (v > 0 && v < 10000) {
      hintEl.innerHTML = `もしかして <strong>${v}万円</strong> ですか? → ` +
        `<button type="button" class="linklike" id="amount-fix" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }
  $("amount-hint").addEventListener("click", (e) => {
    const b = e.target.closest("#amount-fix");
    if (!b) return;
    el.amount.value = K.commaFmt(b.dataset.v);
    el.amount.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function render() {
    const principal = parseInt(digitsOf(el.amount.value) || "0", 10);
    const rate = numOf(el.rate.value);                 // 金利は小数OK
    const years = parseInt(digitsOf(el.years.value) || "0", 10);
    const out = $("result");

    amountHint(principal);

    if (principal < 10000 || years < 1) {
      out.hidden = true;
      return;
    }

    const c = COPY[kind()] || COPY.house;
    const res = calcLoan(principal, rate, years);

    out.hidden = false;
    $("r-monthly").innerHTML = `${yen(res.monthly)}<small>円</small>`;
    $("r-sub").innerHTML =
      `総返済額 <strong>${yen(res.total)}円</strong> / 利息だけで <strong>${yen(res.interest)}円</strong>`;

    /* 内訳(借入 + 利息 = 総返済) */
    const rows = [
      ["借りる金額", res.total - res.interest, false],
      ["利息合計", res.interest, true],
    ];
    const tbody = $("r-rows");
    tbody.innerHTML = "";
    for (const [label, v, indent] of rows) {
      const tr = document.createElement("tr");
      if (indent) tr.className = "indent";
      tr.innerHTML = `<td>${label}</td><td>${yen(v)}</td>`;
      tbody.appendChild(tr);
    }
    const sum = document.createElement("tr");
    sum.className = "sum";
    sum.innerHTML = `<td>総返済額</td><td>${yen(res.total)}</td>`;
    tbody.appendChild(sum);

    /* 経理マンのリアクション(数値の復唱→見落としがちな利息→問いで締め) */
    $("r-react").innerHTML =
      `毎月<strong>${yen(res.monthly)}円</strong>を<strong>${years}年</strong>。` +
      `この${c.word}は、利息だけで約<strong>${man(res.interest)}万円</strong>はらう計算です。` +
      `この利息のぶんまで、見込んでおけそうですか?`;
  }

  /* 2択の切り替え時はコピーを更新してから再計算 */
  for (const rdo of document.querySelectorAll('input[name="kind"]')) {
    rdo.addEventListener("change", () => { syncCopy(); render(); });
  }

  /* 入力のたび即時再計算 */
  for (const node of document.querySelectorAll("#calc-form input")) {
    node.addEventListener("input", render);
    node.addEventListener("change", render);
  }

  syncCopy();
  render();
})();
