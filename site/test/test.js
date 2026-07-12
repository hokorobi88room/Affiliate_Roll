/*
 * 計算エンジンの検証テスト(node site/test/test.js で実行)
 * 期待値は協会けんぽ保険料額表・国税庁の公表計算方法から手計算した値。
 */
const R = require("../data/rates2026.js");
const C = require("../js/calc.js");

let pass = 0, fail = 0;
function eq(label, actual, expected, tolerance = 0) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) { pass++; console.log(`  ok: ${label} = ${actual}`); }
  else { fail++; console.error(`  NG: ${label} = ${actual}, expected ${expected} (±${tolerance})`); }
}

console.log("[1] 標準報酬月額の等級判定");
eq("月収29.5万→健保標準30万", C.standardMonthly(295000, R.gradesHealth), 300000);
eq("月収31万→健保標準32万", C.standardMonthly(310000, R.gradesHealth), 320000);
eq("月収5万→健保下限5.8万", C.standardMonthly(50000, R.gradesHealth), 58000);
eq("月収200万→健保上限139万", C.standardMonthly(2000000, R.gradesHealth), 1390000);
eq("月収200万→厚年上限65万", C.standardMonthly(2000000, R.gradesPension), 650000);
eq("月収8万→厚年下限8.8万", C.standardMonthly(80000, R.gradesPension), 88000);

console.log("[2] 給与所得控除(令和8年分)");
// 令和8年度改正: 最低保障74万円(本則69万+令和8・9年特例5万)。収入220万円以下で適用
eq("収入150万→74万(最低保障)", C.salaryDeduction(1500000, R.salaryDeductionBrackets), 740000);
eq("収入200万→74万(最低保障が220万まで効く)", C.salaryDeduction(2000000, R.salaryDeductionBrackets), 740000);
eq("収入230万→77万(30%+8万)", C.salaryDeduction(2300000, R.salaryDeductionBrackets), 770000);
eq("収入300万→98万", C.salaryDeduction(3000000, R.salaryDeductionBrackets), 980000);
eq("収入500万→144万", C.salaryDeduction(5000000, R.salaryDeductionBrackets), 1440000);
eq("収入1000万→195万(上限)", C.salaryDeduction(10000000, R.salaryDeductionBrackets), 1950000);

console.log("[3] 基礎控除(令和8年分・令和8年度税制改正反映)");
eq("所得130万→104万", C.basicDeduction(1300000, R.basicDeductionBrackets), 1040000);
eq("所得244万→104万", C.basicDeduction(2440000, R.basicDeductionBrackets), 1040000);
eq("所得489万→104万", C.basicDeduction(4890000, R.basicDeductionBrackets), 1040000);
eq("所得600万→67万", C.basicDeduction(6000000, R.basicDeductionBrackets), 670000);
eq("所得1000万→62万", C.basicDeduction(10000000, R.basicDeductionBrackets), 620000);

console.log("[4] 所得税速算(復興税込み)");
// 課税所得103.1万 → 103.1万×5%=51,550 → ×1.021=52,632 → 52,600(百円未満切捨て)
eq("課税所得1,031,000→52,600", C.incomeTax(1031000, R.incomeTaxBrackets, R.reconstructionSurtax), 52600);
// 課税所得300万 → 300万×10%-97,500=202,500 → ×1.021=206,752 → 206,700
eq("課税所得300万→206,700", C.incomeTax(3000000, R.incomeTaxBrackets, R.reconstructionSurtax), 206700);

console.log("[5] 総合計算: 東京都・月収30万・賞与なし・30歳独身");
{
  const r = C.calcNet({ monthlySalary: 300000, annualBonus: 0, prefecture: "tokyo", age: "under40", dependents: 0 }, R);
  // 健保(9.85%+支援金0.23%)/2 × 30万 = 15,120円
  eq("健保+支援金(月)", r.monthly.health, 15120);
  // 厚年 30万×9.15% = 27,450円
  eq("厚生年金(月)", r.monthly.pension, 27450);
  // 雇用 30万×0.5% = 1,500円
  eq("雇用保険(月)", r.monthly.employment, 1500);
  eq("社保合計(月)", r.monthly.socialInsurance, 44070);
  // 年収360万: 給与所得244万, 基礎控除104万, 社保528,840
  eq("給与所得", r.detail.salaryIncome, 2440000);
  eq("課税所得", r.detail.taxableIncome, 2440000 - 1040000 - 528840);
  // 所得税: 課税871,160→871,000×5%×1.021=44,464→44,400
  eq("所得税(年)", r.annual.incomeTax, 44400);
  // 住民税: (244万-43万-528,840)→1,481,160→1,481,000×10%=148,100-2,500+5,000=150,600
  eq("住民税(年)", r.annual.residentTax, 150600);
  eq("手取り(年)", r.annual.net, 3600000 - 528840 - 44400 - 150600);
  console.log(`  → 年間手取り ${r.annual.net.toLocaleString()}円 (手取り率${(r.annual.netRate * 100).toFixed(1)}%)`);
}

console.log("[6] 総合計算: 介護保険該当(45歳)・扶養2人・賞与あり");
{
  const r = C.calcNet({ monthlySalary: 400000, annualBonus: 1000000, prefecture: "tokyo", age: "40to64", dependents: 2 }, R);
  // 健保標準41万 × (9.85+1.62+0.23)%/2 = 41万×11.7%/2=23,985
  eq("健保+介護+支援金(月)", r.monthly.health, 23985);
  eq("厚生年金(月)", r.monthly.pension, Math.round(410000 * 0.0915));
  // 賞与100万: 健保 100万×11.7%/2=58,500 / 厚年 100万×9.15%=91,500 / 雇用 5,000
  eq("賞与社保", r.bonus.socialInsurance, 58500 + 91500 + 5000);
  console.log(`  → 年間手取り ${r.annual.net.toLocaleString()}円 (手取り率${(r.annual.netRate * 100).toFixed(1)}%)`);
}

console.log("[7] 住民税ゼロ(1年目)オプション");
{
  const r = C.calcNet({ monthlySalary: 250000, annualBonus: 0, prefecture: "osaka", age: "under40", dependents: 0, noResidentTax: true }, R);
  eq("住民税(年)", r.annual.residentTax, 0);
}

console.log(`\n結果: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
