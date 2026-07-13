/* 医療費控除でいくら戻る — UI(すべて端末内で完結・外部送信なし)
   計算式は SHARED_SPEC 準拠:
     所得の概算 = 年収 − 給与所得控除
     足切り     = min(100,000, 所得の概算 × 5%)
     控除額     = clamp(払った医療費 − 戻ったお金 − 足切り, 0, 2,000,000)
     戻る税金   = 控除額 ×(所得税の限界税率 × 1.021 + 住民税 10%)
     限界税率   = 課税所得(所得 − 基礎控除104万 − 社保概算=年収×15%)を速算表で判定 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const K = window.KMLib;
  const R = window.RATES2026;
  const calc = window.TedoriCalc;

  const form = {
    medical: $("in-medical"),
    refund: $("in-refund"),
    salary: $("in-salary"),
  };
  K.attachMoney(form.medical);
  K.attachMoney(form.refund);
  K.attachMoney(form.salary);

  const numOf = (el) => {
    const v = parseInt(K.digitsOf(el.value), 10);
    return isNaN(v) ? 0 : v;
  };

  /* 所得税の限界税率(課税所得→速算表)。課税所得が0以下なら所得税は生じない */
  function marginalRate(taxable) {
    if (taxable <= 0) return 0;
    for (const b of R.incomeTaxBrackets) {
      if (b[0] === null || taxable <= b[0]) return b[1];
    }
    return 0.45;
  }

  /* 入力ミス救済(「20」= 20万のつもり等)。無反応にしない */
  function moneyHint(v, hintEl, fixId, example) {
    if (v > 0 && v < 10000) {
      if (v < 1000) {
        hintEl.innerHTML = `もしかして <strong>${K.yen(v * 10000)}円(${v}万円)</strong> ですか? → ` +
          `<button type="button" class="linklike" id="${fixId}" data-v="${v * 10000}">この金額で計算する</button>`;
      } else {
        hintEl.textContent = `「円」の単位で、1万円以上の数字を入れてください(例: ${example})`;
      }
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }
  function attachFix(hintEl, fixId, inputEl) {
    hintEl.addEventListener("click", (e) => {
      const b = e.target.closest("#" + fixId);
      if (!b) return;
      inputEl.value = K.commaFmt(b.dataset.v);
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  attachFix($("medical-hint"), "medical-fix", form.medical);
  attachFix($("salary-hint"), "salary-fix", form.salary);

  function render() {
    const paid = numOf(form.medical);       // 1年間に払った医療費(家族ぶん合計)
    const refunded = numOf(form.refund);     // 保険などで戻ったお金
    const salary = numOf(form.salary);       // 本業の年収(引かれる前)
    const out = $("result");

    moneyHint(paid, $("medical-hint"), "medical-fix", "200,000");
    moneyHint(salary, $("salary-hint"), "salary-fix", "4,000,000");

    if (paid < 10000 || salary < 10000) { out.hidden = true; return; }

    // ---- SHARED_SPEC の計算 ----
    const income = salary - calc.salaryDeduction(salary, R.salaryDeductionBrackets); // 所得の概算
    const floor = Math.min(100000, Math.round(income * 0.05));                         // 足切り
    const deduction = Math.min(Math.max(paid - refunded - floor, 0), 2000000);        // 控除額
    const taxable = income - 1040000 - salary * 0.15;                                 // 課税所得(概算)
    const rate = marginalRate(taxable);                                               // 所得税の限界税率
    const refund = deduction * (rate * 1.021 + 0.10);                                 // 戻る税金の目安

    out.hidden = false;

    if (deduction <= 0) {
      // 足切りに届かず、控除ゼロ
      const shortfall = Math.max(0, floor - (paid - refunded));
      $("r-num").innerHTML = `0<small>円</small>`;
      $("r-sub").innerHTML = `あなたの足切りライン <strong>${K.yen(floor)}円</strong>`;
      $("r-cap").textContent =
        `医療費(戻ったお金を引いたぶん)が足切りラインをこえていないため、今回は戻りません。`;
      $("r-react").innerHTML =
        `今回は戻りません(医療費が足切りに届いていません)。` +
        (shortfall > 0
          ? `あと<strong>${K.yen(shortfall)}円</strong>で足切りライン(${K.yen(floor)}円)に届きます。`
          : ``) +
        `来年ぶんの通院ぶんも、レシートをためておきますか?`;
      return;
    }

    const targeted = deduction; // 控除の対象になった医療費(=足切りをこえた分・上限200万)
    $("r-num").innerHTML = `${K.yen(refund)}<small>円</small>`;
    $("r-sub").innerHTML =
      `控除の対象になった医療費 <strong>${K.yen(targeted)}円</strong> / ` +
      `あなたの足切りライン <strong>${K.yen(floor)}円</strong>`;
    $("r-cap").textContent =
      `所得税(限界税率${(rate * 100).toFixed(0)}%)と住民税10%が戻る目安です。` +
      (deduction >= 2000000 ? `※控除額は上限の200万円で計算しています。` : ``) +
      `実際の額は他の控除や税率で少し前後します。`;
    $("r-react").innerHTML =
      `約<strong>${K.yen(refund)}円</strong>が戻ってくる目安です。` +
      `医療費が年<strong>${K.yen(floor)}円</strong>(あなたの足切りライン)をこえた分が対象です。` +
      `レシート、とってありますか?`;
  }

  for (const el of document.querySelectorAll("#calc-form input")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }
  render();
})();
