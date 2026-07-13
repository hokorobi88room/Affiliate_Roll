/* 退職金の手取り計算 UI(すべて端末内で完結・外部送信なし)
   国税庁の方法(2026年):
     引ける枠(退職所得控除) = 勤続20年まで 40万円×年数(最低80万円)、
                              20年超は 800万円 + 70万円×(年数−20)。1年未満は切り上げ。
     税金がかかる金額 = max(0, (退職金 − 引ける枠) × 1/2)。
       役員で勤続5年以下を選んだときは ×1/2 を外す。
     所得税 = 課税金額に速算表を適用(復興特別所得税0.021込み) … calc.js の incomeTax()
     住民税 = 課税金額 × 10%
     手取り = 退職金 − 所得税 − 住民税 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const { attachMoney, digitsOf, numOf, commaFmt, yen, man } = window.KMLib;
  const R = window.RATES2026;
  const { incomeTax } = window.TedoriCalc;

  const moneyEl = $("in-money");
  const yearsEl = $("in-years");

  /* 金額入力にカンマ区切り+全角→半角を付与(退職金は大きい入力) */
  attachMoney(moneyEl);

  /* 触られるまでデフォルト選択に色をつけない(どちらかを「推し」に見せない) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  /* 引ける枠(退職所得控除) */
  function deductFrame(years) {
    const A = Math.ceil(years); // 1年未満は切り上げ
    if (A <= 20) return Math.max(400000 * A, 800000); // 最低80万円
    return 8000000 + 700000 * (A - 20);
  }

  /* 「退職金だけ大きい単位で入れた?」の救済(500 → 500万円 など)。無反応にしない */
  function moneyHint() {
    const v = parseInt(digitsOf(moneyEl.value), 10) || 0;
    const hintEl = $("money-hint");
    if (v > 0 && v < 10000) {
      hintEl.innerHTML =
        `もしかして <strong>${commaFmt(v)}万円</strong> ですか? → ` +
        `<button type="button" class="linklike" id="money-fix" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }
  $("money-hint").addEventListener("click", (e) => {
    const b = e.target.closest("#money-fix");
    if (!b) return;
    moneyEl.value = commaFmt(b.dataset.v);
    moneyEl.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function render() {
    const money = parseInt(digitsOf(moneyEl.value), 10) || 0;
    const years = numOf(yearsEl.value); // 端数は下の計算で切り上げ
    const isExec5 = document.querySelector('input[name="kind"]:checked').value === "exec5";
    const out = $("result");

    moneyHint();
    if (money < 10000 || years <= 0) { out.hidden = true; return; }

    const frame = deductFrame(years);
    const over = money - frame;                       // 枠を引いた残り
    // 税金がかかる金額(役員5年以下は ×1/2 なし)
    const taxable = over <= 0 ? 0 : Math.max(0, isExec5 ? over : over / 2);
    const tax = incomeTax(taxable, R.incomeTaxBrackets, R.reconstructionSurtax); // 所得税(復興税込み)
    const resident = taxable * R.residentTaxRate;     // 住民税(課税金額×10%)
    const totalTax = tax + resident;
    const net = money - tax - resident;               // 手取り

    out.hidden = false;
    $("r-net").innerHTML = `${yen(net)}<small>円</small>`;
    $("r-sub").innerHTML = totalTax > 0
      ? `退職金 <strong>${yen(money)}円</strong> − 税金 <strong>${yen(totalTax)}円</strong>`
      : `退職金 <strong>${yen(money)}円</strong> がまるまる手取りです`;

    /* 小表: 引ける枠・税金がかかる金額・所得税・住民税(合計を sum 行に) */
    const rows = [
      ["引ける枠(税金がかからない額)", frame, false],
      ["税金がかかる金額", taxable, false],
      ["所得税", tax, true],
      ["住民税", resident, true],
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
    sum.innerHTML = `<td>税金の合計</td><td>${yen(totalTax)}</td>`;
    tbody.appendChild(sum);

    $("r-caption").textContent =
      "2026年・国税庁の方法で計算した概算です。" +
      "退職金は「引ける枠(退職所得控除)を引いて、残りを半分にした金額」にだけ税金がかかります。" +
      "会社に「退職所得の受給に関する申告書」を出していれば、この計算どおりに引かれて手続きは完了します。" +
      (isExec5 ? "役員で勤続5年以下のため、残りを半分にする計算は使っていません。" : "");

    /* 経理マンのリアクション(数値の復唱→やさしさの一言→問いで締め) */
    if (totalTax > 0) {
      $("r-react").innerHTML =
        `退職金<strong>${yen(money)}円</strong>のうち、税金は約<strong>${yen(totalTax)}円</strong>だけ。` +
        `手取りは<strong>${yen(net)}円</strong>です。長くはたらいた人ほど税金がやさしくなります。` +
        `この手取り、使いみちはもう決めてありますか?`;
    } else {
      $("r-react").innerHTML =
        `退職金<strong>${yen(money)}円</strong>は、税金<strong>0円</strong>!まるまる手取りです。` +
        `はたらいた年数ぶんの「引ける枠(${man(frame)}万円)」に収まったからです。` +
        `長くはたらいた人ほど税金がやさしくなります。この先の使いみち、もう決めてありますか?`;
    }
  }

  /* 入力のたび即時再計算 */
  for (const el of document.querySelectorAll("#calc-form input")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  render();
})();
