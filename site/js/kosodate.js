/* 出産・育児でもらえるお金 UI(すべて端末内で完結・外部送信なし)
   出産育児一時金(一律50万円)+ 育児休業給付金(67%/50%)を、月給と育休の長さから概算する。
   数値は令和7年8月〜令和8年7月の公表値。税額計算は不要なので rates2026.js/calc.js は読み込まない。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const { digitsOf, yen, man, attachMoney } = window.KMLib;

  /* ---- 令和7年8月〜令和8年7月の公表値 ---- */
  const RATE_67 = 0.67;                 // 育休 最初の180日の給付率
  const RATE_50 = 0.50;                 // 育休 181日以降の給付率
  const DAY_CAP = 16110;                // 休業開始時賃金日額の上限額
  const SAL_CAP = DAY_CAP * 30;         // 上限がかかる月給のめやす = 483,300円
  const IPPANKIN = 500000;              // 出産育児一時金(子ども1人につき一律)

  const inSalary = $("in-salary");
  attachMoney(inSalary);

  const numOf = (el) => { const v = parseInt(digitsOf(el.value), 10); return isNaN(v) ? 0 : v; };
  const spanVal = () => document.querySelector('input[name="span"]:checked').value; // "half" | "year"

  /* 触られるまでデフォルト選択に色をつけない(色の優劣を見せない) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  /* 入力ミス救済(「25」= 25万のつもり等)。無反応にしない */
  function moneyHint(v) {
    const hintEl = $("salary-hint");
    if (v > 0 && v < 10000) {
      if (v < 1000) {
        hintEl.innerHTML = `もしかして <strong>${v}万円</strong> ですか? → ` +
          `<button type="button" class="linklike" id="salary-fix" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      } else {
        hintEl.textContent = "「円」の単位で、1万円以上の数字を入れてください(例: 250,000)";
      }
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }
  $("salary-hint").addEventListener("click", (e) => {
    const b = e.target.closest("#salary-fix");
    if (!b) return;
    inSalary.value = Number(b.dataset.v).toLocaleString("ja-JP");
    inSalary.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function render() {
    const salary = numOf(inSalary);
    const out = $("result");
    moneyHint(salary);
    if (salary < 10000) { out.hidden = true; return; }

    /* 賃金日額 ≈ 月給 ÷ 30。上限をこえたぶんは頭打ち(高い月給の人向け) */
    const capped = Math.min(salary, SAL_CAP);
    const capApplied = salary > SAL_CAP;
    const daily = Math.round(Math.min(salary / 30, DAY_CAP));
    const m67 = Math.round(capped * RATE_67);            // = 賃金日額 × 67% × 30
    const m50 = Math.round(capped * RATE_50);            // = 賃金日額 × 50% × 30
    const halfTotal = m67 * 6 + IPPANKIN;               // 半年とった場合(出産一時金込み)
    const yearTotal = m67 * 6 + m50 * 6 + IPPANKIN;     // 1年とった場合(出産一時金込み)
    const span = spanVal();

    out.hidden = false;
    $("r-month").innerHTML = `約${yen(m67)}<small>円</small>`;
    $("r-sub").innerHTML = `そのうえ出産のとき、<strong>出産育児一時金 ${yen(IPPANKIN)}円</strong>(子ども1人)`;

    /* 早見の内訳(選んだ期間の合計を▶で強調) */
    const rows = [
      ["出産育児一時金(子ども1人)", `${yen(IPPANKIN)}円`, false],
      ["育休 最初の半年(毎月)", `約 ${yen(m67)}円`, false],
      ["育休 半年〜1年(毎月)", `約 ${yen(m50)}円`, false],
      ["半年とった場合の合計", `約 ${yen(halfTotal)}円`, span === "half"],
      ["1年とった場合の合計", `約 ${yen(yearTotal)}円`, span === "year"],
    ];
    const tb = $("r-rows");
    tb.innerHTML = "";
    for (const [label, val, hi] of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = hi
        ? `<td><strong>▶ ${label}</strong></td><td><strong>${val}</strong></td>`
        : `<td>${label}</td><td>${val}</td>`;
      tb.appendChild(tr);
    }

    /* 経理マンのリアクション(数値の復唱 → 非課税・免除の話 → 問いで締め) */
    const total = span === "year" ? yearTotal : halfTotal;
    const period = span === "year" ? "1年" : "半年";
    $("r-react").innerHTML =
      `毎月 約${yen(m67)}円 が半年、そのあとは 約${yen(m50)}円 に。` +
      `育休中は税金と保険料がかからないので、手取りで見るとほぼ満額に近いんです。` +
      `${period}とるなら、出産育児一時金とあわせて 約${man(total)}万円。ここまで見込んで計画できていますか?`;

    /* 注記(賃金日額の出し方 + 高い月給の頭打ち + 相談先) */
    $("r-caption").innerHTML =
      `賃金日額 ≈ 月給 ÷ 30 = 約${yen(daily)}円 として計算しました(令和7年8月〜の公表値)。` +
      (capApplied
        ? `月給が高いため、育休のお金は上限(最初の半年で月 ${yen(Math.round(DAY_CAP * RATE_67 * 30))}円)で頭打ちにしています。`
        : `月給が約 ${yen(SAL_CAP)}円 をこえると、育休のお金は上限で頭打ちになります(目安)。`) +
      `くわしい金額は勤め先・ハローワークでご確認ください。`;
  }

  /* 入力のたび即時再計算 */
  for (const el of document.querySelectorAll("#calc-form input")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  render();
})();
