/*
 * 手取り計算エンジン(令和8年度・2026年)
 * すべて端末内で完結する純関数。データは data/rates2026.js の RATES2026 を参照。
 * 設計方針: 年間ベースで正確に計算し、月あたりに換算して表示する。
 */
(function (global) {
  "use strict";

  /** 標準報酬月額を等級表から求める(該当区間の標準額を返す) */
  function standardMonthly(salary, table) {
    for (const row of table) {
      // row = [標準報酬月額, 下限(以上), 上限(未満)] 上限nullは青天井
      if (salary >= row[1] && (row[2] === null || salary < row[2])) return row[0];
    }
    return table[table.length - 1][0];
  }

  /** 給与所得控除(令和7年分以降) */
  function salaryDeduction(income, brackets) {
    for (const b of brackets) {
      // b = [上限(以下・nullは無限), 率, 加算額, 最低額]
      if (b[0] === null || income <= b[0]) {
        const v = income * b[1] + b[2];
        return Math.min(Math.max(v, b[3] ?? 0), 1950000);
      }
    }
    return 1950000;
  }

  /** 基礎控除(所得税・令和8年分: 合計所得金額に応じた段階) */
  function basicDeduction(totalIncome, brackets) {
    for (const b of brackets) {
      if (b[0] === null || totalIncome <= b[0]) return b[1];
    }
    return 0;
  }

  /** 所得税速算表(課税所得→税額、復興特別所得税込み) */
  function incomeTax(taxable, brackets, surtaxRate) {
    if (taxable <= 0) return 0;
    // 課税所得は千円未満切捨て
    taxable = Math.floor(taxable / 1000) * 1000;
    let tax = 0;
    for (const b of brackets) {
      if (b[0] === null || taxable <= b[0]) {
        tax = taxable * b[1] - b[2];
        break;
      }
    }
    tax = tax * (1 + surtaxRate);
    // 復興税込みの年税額は百円未満切捨て
    return Math.max(0, Math.floor(tax / 100) * 100);
  }

  /**
   * メイン計算
   * @param {Object} p
   *  monthlySalary: 月収(額面・円)
   *  annualBonus:   年間賞与合計(額面・円)
   *  prefecture:    都道府県キー(例 "tokyo")
   *  age:           "under40" | "40to64" | "over65"
   *  dependents:    税法上の扶養親族の数(一般扶養として計算)
   *  noResidentTax: true = 住民税ゼロ(新社会人1年目など)
   */
  function calcNet(p, R) {
    R = R || global.RATES2026;
    const pref = R.prefectures[p.prefecture] || R.prefectures.tokyo;
    const healthRate = pref.rate / 100;           // 健康保険(労使計)
    const kaigo = p.age === "40to64" ? R.kaigoRate / 100 : 0;
    const shien = R.shienkinRate / 100;           // 子ども・子育て支援金(労使計)
    const pensionRate = R.pensionRate / 100;      // 厚生年金(労使計)
    const empRate = R.employmentRate / 100;       // 雇用保険(労働者負担率)

    // ---- 月々の社会保険料(労働者負担 = 折半) ----
    const smrHealth = standardMonthly(p.monthlySalary, R.gradesHealth);
    const smrPension = standardMonthly(p.monthlySalary, R.gradesPension);
    const mHealth = round1(smrHealth * (healthRate + kaigo + shien) / 2);
    const mPension = round1(smrPension * pensionRate / 2);
    const mEmployment = Math.round(p.monthlySalary * empRate);
    const monthlySI = mHealth + mPension + mEmployment;

    // ---- 賞与の社会保険料 ----
    let bonusSI = 0, bHealth = 0, bPension = 0, bEmployment = 0;
    if (p.annualBonus > 0) {
      // 標準賞与額: 1,000円未満切捨て。健保は年度累計573万円上限、厚年は1回150万円上限(年3回以下想定で簡略化)
      const stdBonusHealth = Math.min(Math.floor(p.annualBonus / 1000) * 1000, R.bonusCapHealth);
      const stdBonusPension = Math.min(Math.floor(p.annualBonus / 1000) * 1000, R.bonusCapPension);
      bHealth = round1(stdBonusHealth * (healthRate + kaigo + shien) / 2);
      bPension = round1(stdBonusPension * pensionRate / 2);
      bEmployment = Math.round(p.annualBonus * empRate);
      bonusSI = bHealth + bPension + bEmployment;
    }

    const annualGross = p.monthlySalary * 12 + (p.annualBonus || 0);
    const annualSI = monthlySI * 12 + bonusSI;

    // ---- 所得税(年額) ----
    const salaryIncome = Math.max(0, annualGross - salaryDeduction(annualGross, R.salaryDeductionBrackets));
    const basic = basicDeduction(salaryIncome, R.basicDeductionBrackets);
    const dependentDeduction = (p.dependents || 0) * R.dependentDeduction;
    const taxableIncome = salaryIncome - basic - annualSI - dependentDeduction;
    const annualIncomeTax = incomeTax(taxableIncome, R.incomeTaxBrackets, R.reconstructionSurtax);

    // ---- 住民税(年額・概算: 前年も同収入だった前提) ----
    let annualResidentTax = 0;
    if (!p.noResidentTax) {
      const taxableResident = salaryIncome - R.residentBasicDeduction - annualSI
        - (p.dependents || 0) * R.residentDependentDeduction;
      if (taxableResident > 0) {
        const shotokuwari = Math.floor(taxableResident / 1000) * 1000 * R.residentTaxRate;
        annualResidentTax = Math.max(0,
          Math.round(shotokuwari) - R.residentAdjustmentCredit + R.residentPerCapita);
      } else if (salaryIncome > R.residentTaxExemptIncome) {
        annualResidentTax = R.residentPerCapita;
      }
    }

    const annualNet = annualGross - annualSI - annualIncomeTax - annualResidentTax;

    // 月あたり表示: 住民税は月割(特別徴収イメージ)、所得税も月割で概算提示
    const monthlyNet = Math.round(
      p.monthlySalary - monthlySI - annualIncomeTax / 12 * (p.monthlySalary * 12 / annualGross)
      - annualResidentTax / 12
    );

    return {
      input: p,
      annualGross,
      monthly: {
        gross: p.monthlySalary,
        health: mHealth,
        pension: mPension,
        employment: mEmployment,
        socialInsurance: monthlySI,
        netApprox: monthlyNet,
      },
      bonus: { gross: p.annualBonus || 0, socialInsurance: bonusSI, health: bHealth, pension: bPension, employment: bEmployment },
      annual: {
        socialInsurance: annualSI,
        incomeTax: annualIncomeTax,
        residentTax: annualResidentTax,
        net: annualNet,
        netRate: annualNet / annualGross,
      },
      detail: {
        standardMonthlyHealth: smrHealth,
        standardMonthlyPension: smrPension,
        salaryIncome,
        basicDeduction: basic,
        taxableIncome: Math.max(0, taxableIncome),
        healthRatePct: pref.rate,
        kaigoApplied: p.age === "40to64",
      },
    };
  }

  // 健保の折半額は50銭以下切捨て・50銭超切上げ(五捨六入相当)だが、
  // 事業所ごとの端数処理差があるため一般的な四捨五入系で近似(誤差は最大1円)
  function round1(v) { return Math.round(v); }

  const api = { calcNet, standardMonthly, salaryDeduction, basicDeduction, incomeTax };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.TedoriCalc = api;
})(typeof window !== "undefined" ? window : globalThis);
