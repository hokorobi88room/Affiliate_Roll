/* あなたの経理マン@綻流夢 — 副業の税金・20万円の壁(fukugyo.html 専用)
   会社員(給料をもらう人)向けの目安。
   すべて端末内で完結し、入力内容はどこにも送信・保存されない。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const R = window.RATES2026;
  const C = window.TedoriCalc;
  const { yen, commaFmt, digitsOf } = window.KMLib;

  const THRESHOLD = 200000; // 20万円の壁

  const el = {
    salary: $("in-salary"),
    side: $("in-side"),
    result: $("result"),
  };

  KMLib.attachMoney(el.salary);
  KMLib.attachMoney(el.side);

  const num = (input) => {
    const v = parseInt(digitsOf(input.value), 10);
    return isNaN(v) ? 0 : v;
  };

  /* 本業の年収から所得税の限界税率(1年ぶん)を概算する
     課税所得の概算 = 年収 − 給与所得控除 − 基礎控除(合計所得で判定) − 社会保険料の概算(年収×15%) */
  function marginalIncomeRate(annualSalary) {
    const salaryDeduction = C.salaryDeduction(annualSalary, R.salaryDeductionBrackets);
    const salaryIncome = Math.max(0, annualSalary - salaryDeduction);
    const basic = C.basicDeduction(salaryIncome, R.basicDeductionBrackets);
    const si = annualSalary * 0.15; // 社会保険料の概算
    let taxable = salaryIncome - basic - si;
    taxable = Math.floor(Math.max(0, taxable) / 1000) * 1000;
    if (taxable <= 0) return 0.05; // 本業に所得税がかからない層は最低税率で概算
    for (const b of R.incomeTaxBrackets) {
      if (b[0] === null || taxable <= b[0]) return b[1];
    }
    return 0.45;
  }

  /* 入力ミス救済(「30」= 30万のつもり等)。無反応にしない */
  function moneyHint(v, hintEl, fixId, opt) {
    opt = opt || {};
    if (v > 0 && v < 1000) {
      hintEl.innerHTML = `もしかして <strong>${v}万円</strong> ですか? → ` +
        `<button type="button" class="linklike" id="${fixId}" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      hintEl.hidden = false;
    } else if (opt.needMan && v >= 1000 && v < 10000) {
      hintEl.textContent = `「円」の単位で、1万円以上の数字を入れてください(例: ${opt.example})`;
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }
  function attachFix(hintEl, fixId, inputEl) {
    hintEl.addEventListener("click", (e) => {
      const b = e.target.closest("#" + fixId);
      if (!b) return;
      inputEl.value = commaFmt(b.dataset.v);
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  attachFix($("salary-hint"), "salary-fix", el.salary);
  attachFix($("side-hint"), "side-fix", el.side);

  function render() {
    const salary = num(el.salary);
    const side = num(el.side);
    moneyHint(salary, $("salary-hint"), "salary-fix", { needMan: true, example: "4,000,000" });
    moneyHint(side, $("side-hint"), "side-fix", {});

    if (side <= 0) {
      el.result.hidden = true;
      return;
    }
    el.result.hidden = false;

    const need = side > THRESHOLD;           // 20万円を1円でもこえたら確定申告が必要
    const residentTax = Math.round(side * 0.10); // 住民税(所得割・概算)は20万以下でもかかる
    const haveSalary = salary >= 10000;

    const taxwrap = $("r-taxwrap");
    const needSalaryNote = $("r-need-salary");

    if (!need) {
      /* ---- 20万円以下 → 所得税の確定申告は不要 ---- */
      $("r-label").textContent = `副業のもうけ ${yen(side)}円 → 所得税の確定申告は`;
      $("r-verdict").textContent = "不要";
      $("r-sub").innerHTML = `年20万円以下なので、所得税の確定申告はいりません。` +
        `ただし<strong>住民税の申告は必要</strong>です(お住まいの市区町村へ)。`;

      taxwrap.hidden = false;
      needSalaryNote.hidden = true;
      $("r-tax-label").textContent = "住民税の目安(市区町村へ申告)";
      $("r-tax").innerHTML = `${yen(residentTax)}<small>円</small>`;
      $("r-tbl-wrap").hidden = true;

      $("r-react").innerHTML =
        `副業のもうけ<strong>${yen(side)}円</strong>は年20万円以下。` +
        `<strong>所得税の確定申告はいりません</strong>。` +
        `ただし住民税の申告は必要です。市区町村へ、忘れずに出していますか?`;
    } else {
      /* ---- 20万円超 → 確定申告が必要 ---- */
      $("r-label").textContent = `副業のもうけ ${yen(side)}円 → 確定申告は`;
      $("r-verdict").textContent = "必要";

      if (!haveSalary) {
        $("r-sub").innerHTML = `年20万円をこえたので、<strong>確定申告が必要</strong>です。`;
        taxwrap.hidden = true;
        needSalaryNote.hidden = false;
        $("r-react").innerHTML =
          `副業のもうけ<strong>${yen(side)}円</strong>は20万円をこえたので、` +
          `<strong>確定申告が必要</strong>です。本業の年収も入れると、追加の税金の目安が出せますよ。`;
      } else {
        const rate = marginalIncomeRate(salary);
        const incomeTax = Math.round(side * rate * 1.021); // 復興特別所得税込み
        const total = incomeTax + residentTax;

        $("r-sub").innerHTML = `年20万円をこえたので、<strong>確定申告が必要</strong>です。`;
        taxwrap.hidden = false;
        needSalaryNote.hidden = true;
        $("r-tax-label").textContent = "追加でかかる税金の目安";
        $("r-tax").innerHTML = `${yen(total)}<small>円</small>`;

        $("r-tbl-wrap").hidden = false;
        const rows = [
          ["所得税(概算・復興税込み)", incomeTax],
          ["住民税(概算)", residentTax],
        ];
        const tbody = $("r-rows");
        tbody.innerHTML = "";
        for (const [label, v] of rows) {
          const tr = document.createElement("tr");
          tr.className = "indent";
          tr.innerHTML = `<td>${label}</td><td>${yen(v)}</td>`;
          tbody.appendChild(tr);
        }
        const sum = document.createElement("tr");
        sum.className = "sum";
        sum.innerHTML = `<td>合計(追加の税金)</td><td>${yen(total)}</td>`;
        tbody.appendChild(sum);

        $("r-react").innerHTML =
          `副業のもうけ<strong>${yen(side)}円</strong>には、追加で約<strong>${yen(total)}円</strong>の税金がかかる見込みです。` +
          `確定申告の準備、はじめていますか?`;
      }
    }

    $("r-caption").textContent =
      "会社員(給料をもらう人)向けの目安です。" +
      "医療費控除やふるさと納税などで確定申告をする人は、20万円以下でも副業のぶんの申告が必要です。" +
      "金額は本業の年収から税率を概算した目安で、実際とは差が出ることがあります。";
  }

  /* 入力のたび即時再計算 */
  for (const input of document.querySelectorAll("#calc-form input")) {
    input.addEventListener("input", render);
    input.addEventListener("change", render);
  }

  render();
})();
