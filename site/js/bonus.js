/* ボーナスの手取り計算 UI(すべて端末内で完結・外部送信なし)
   このページは ui.js を読み込まない前提のため、金額入力ヘルパーもここで完結する。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const yen = (v) => Math.round(v).toLocaleString("ja-JP");

  /* ---- 金額入力ヘルパー(カンマ区切り・全角→半角・カーソル位置保持) ---- */
  const zen2han = (s) => String(s).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const digitsOf = (s) => zen2han(s).replace(/[^\d]/g, "");
  const commaFmt = (v) => Number(v).toLocaleString("ja-JP");
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
  function attachMoneyInput(el) {
    el.addEventListener("input", (ev) => { if (ev.isComposing) return; formatMoneyInput(el); });
    el.addEventListener("compositionend", () => formatMoneyInput(el)); // IME(全角)確定時
  }

  const form = {
    bonus: $("in-bonus"),
    salary: $("in-salary"),
    pref: $("in-pref"),
    dependents: $("in-dependents"),
  };

  /* 都道府県セレクトを生成 */
  const R = window.RATES2026;
  for (const [key, p] of Object.entries(R.prefectures)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${p.name}(${p.rate.toFixed(2)}%)`;
    form.pref.appendChild(opt);
  }
  form.pref.value = "tokyo";

  attachMoneyInput(form.bonus);
  attachMoneyInput(form.salary);

  function readInput() {
    const num = (el) => {
      const v = parseInt(digitsOf(el.value), 10);
      return isNaN(v) ? 0 : v;
    };
    // 年齢は2段階の2択(〜39歳/40歳〜 → 40〜64歳/65歳〜)
    const ageBase = document.querySelector('input[name="age"]:checked').value;
    return {
      bonus: num(form.bonus),
      salary: num(form.salary),
      prefecture: form.pref.value,
      age: ageBase === "40plus" ? document.querySelector('input[name="age2"]:checked').value : "under40",
      dependents: parseInt(form.dependents.value, 10),
    };
  }

  /* 「40歳〜」を選んだときだけ詳細(40〜64/65〜)の2択を出す */
  function syncAgeDetail() {
    $("age-detail").hidden = document.querySelector('input[name="age"]:checked').value !== "40plus";
  }
  for (const rdo of document.querySelectorAll('input[name="age"]')) {
    rdo.addEventListener("change", syncAgeDetail);
  }
  /* 触られるまでデフォルト選択に色をつけない(色の優劣を見せない) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  /* 入力ミス救済(「50」= 50万のつもり等)。無反応にしない */
  function moneyHint(v, hintEl, fixId, example) {
    if (v > 0 && v < 10000) {
      if (v < 1000) {
        hintEl.innerHTML = `もしかして <strong>${v}万円</strong> ですか? → ` +
          `<button type="button" class="linklike" id="${fixId}" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
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
      const b = e.target.closest(`#${fixId}`);
      if (!b) return;
      inputEl.value = commaFmt(b.dataset.v);
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  attachFix($("bonus-hint"), "bonus-fix", form.bonus);
  attachFix($("salary-hint"), "salary-fix", form.salary);

  function render() {
    const p = readInput();
    const out = $("result");
    moneyHint(p.bonus, $("bonus-hint"), "bonus-fix", "500,000");
    moneyHint(p.salary, $("salary-hint"), "salary-fix", "300,000");
    if (p.bonus < 10000 || p.salary < 10000) {
      out.hidden = true;
      return;
    }

    /* 計算: 「ボーナスあり」と「ボーナスなし」の差分で、ボーナスぶんの税金を出す */
    const base = {
      monthlySalary: p.salary,
      prefecture: p.prefecture,
      age: p.age,
      dependents: p.dependents,
      noResidentTax: false,
    };
    const A = window.TedoriCalc.calcNet(Object.assign({}, base, { annualBonus: p.bonus }), R);
    const B = window.TedoriCalc.calcNet(Object.assign({}, base, { annualBonus: 0 }), R);

    const health = A.bonus.health;          // 健康保険(+介護)+支援金
    const pension = A.bonus.pension;        // 厚生年金
    const employment = A.bonus.employment;  // 雇用保険
    const tax = Math.max(0, A.annual.incomeTax - B.annual.incomeTax);       // 所得税(概算)
    const residentUp = Math.max(0, A.annual.residentTax - B.annual.residentTax); // 来年の住民税の増加分
    const net = p.bonus - health - pension - employment - tax;
    const deducted = p.bonus - net;
    const rate = net / p.bonus * 100;

    out.hidden = false;
    $("r-net").innerHTML = `${yen(net)}<small>円</small>`;
    $("r-sub").innerHTML =
      `引かれるお金 <strong>${yen(deducted)}円</strong> / 手取り率 <strong>${rate.toFixed(1)}%</strong>`;

    // 内訳テーブル(行を足したら必ず手取り行に一致する)
    const rows = [
      ["支給額(引かれる前)", p.bonus, false],
      ["健康保険" + (A.detail.kaigoApplied ? "+介護保険" : "") + "+支援金", -health, true],
      ["厚生年金", -pension, true],
      ["雇用保険", -employment, true],
      ["所得税(概算)", -tax, true],
    ];
    const tbody = $("r-rows");
    tbody.innerHTML = "";
    for (const [label, v, indent] of rows) {
      const tr = document.createElement("tr");
      if (indent) tr.className = "indent";
      tr.innerHTML = `<td>${label}</td><td>${v < 0 ? "−" : ""}${yen(Math.abs(v))}</td>`;
      tbody.appendChild(tr);
    }
    const sum = document.createElement("tr");
    sum.className = "sum";
    sum.innerHTML = `<td>手取り</td><td>${yen(net)}</td>`;
    tbody.appendChild(sum);

    $("r-caption").textContent =
      `${R.prefectures[p.prefecture].name}の令和8年度の公表値で計算しました。` +
      `所得税は1年分の収入から計算した概算で、給与明細で引かれる額とは少しズレることがあります。` +
      (p.age === "over65" ? "※70歳以上の方は年金の保険料が引かれなくなるため、実際の手取りはこれより多くなります。" : "");

    // 経理マンのリアクション(数値の復唱→見落としがちな住民税→問いで締め)
    $("r-react").innerHTML =
      `ボーナスからも<strong>${yen(deducted)}円</strong>引かれています。手取り率は<strong>${rate.toFixed(1)}%</strong>。` +
      (residentUp > 0
        ? `そして忘れがちですが、今回のボーナスのぶん来年の住民税が約<strong>${yen(residentUp)}円</strong>増えます。`
        : ``) +
      `使いみちは、そこまで見込んで決めてありますか?`;
  }

  /* 入力のたび即時再計算 */
  for (const el of document.querySelectorAll("#calc-form input, #calc-form select")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  render();
})();
