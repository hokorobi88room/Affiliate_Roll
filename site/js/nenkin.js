/* もらえる年金の目安 UI(すべて端末内で完結・外部送信なし)
   年金 = 基礎年金(みんな共通) + 厚生年金(会社員だけ上乗せ)。
   これは「ざっくり目安」。正確な額はねんきん定期便・ねんきんネットで確認。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const { attachMoney, digitsOf, numOf, commaFmt, yen } = window.KMLib;

  /* --- 2026年度(令和8年度)の公表値 --- */
  const BASIC_FULL_ANNUAL = 846300; // 老齢基礎年金の満額(年)。40年で満額
  const BASIC_FULL_YEARS = 40;      // 満額に必要な加入年数
  const KOSEI_RATE = 0.005481;      // 厚生年金(報酬比例)のざっくり係数

  const incomeEl = $("in-income");
  const yearsEl = $("in-years");

  /* 平均年収の入力にカンマ区切り+全角→半角を付与(年数はカンマ不要なので付けない) */
  attachMoney(incomeEl);

  const isEmployee = () =>
    document.querySelector('input[name="job"]:checked').value === "emp";

  /* 触られるまでデフォルト選択に色をつけない(どちらかを「推し」に見せない) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  /* 入力ミス救済(「400」= 400万のつもり等)。無反応にしない */
  function incomeHint(v) {
    const el = $("income-hint");
    if (v > 0 && v < 10000) {
      if (v < 1000) {
        el.innerHTML = `もしかして <strong>${v}万円</strong> ですか? → ` +
          `<button type="button" class="linklike" id="income-fix" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      } else {
        el.textContent = "「円」の単位で、1万円以上の数字を入れてください(例: 4,000,000)";
      }
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }
  $("income-hint").addEventListener("click", (e) => {
    const b = e.target.closest("#income-fix");
    if (!b) return;
    incomeEl.value = commaFmt(b.dataset.v);
    incomeEl.dispatchEvent(new Event("input", { bubbles: true }));
  });

  /* はたらき方で、平均年収が効くかどうかの案内を切り替える */
  function syncJob() {
    $("self-note").hidden = isEmployee();
  }
  for (const rdo of document.querySelectorAll('input[name="job"]')) {
    rdo.addEventListener("change", syncJob);
  }

  function render() {
    const emp = isEmployee();
    const income = Math.round(numOf(incomeEl.value));
    const years = numOf(yearsEl.value);
    const out = $("result");

    syncJob();
    incomeHint(emp ? income : 0); // 自営業のときは年収ヒントを出さない

    /* 年数のやさしい案内(40年で満額) */
    const yh = $("years-hint");
    if (years > BASIC_FULL_YEARS) {
      yh.textContent = "基礎年金は40年で満額です。40年をこえる分は、基礎年金には増えません。";
      yh.hidden = false;
    } else {
      yh.hidden = true;
    }

    /* 会社員は平均年収が必要。自営業は年数だけで出せる */
    if (years <= 0 || (emp && income < 10000)) {
      out.hidden = true;
      return;
    }

    /* --- 計算 --- */
    const basicYears = Math.min(years, BASIC_FULL_YEARS);
    const basicAnnual = Math.round(BASIC_FULL_ANNUAL * basicYears / BASIC_FULL_YEARS);
    const koseiAnnual = emp ? Math.round(income * KOSEI_RATE * years) : 0;
    const basicMonth = Math.round(basicAnnual / 12);
    const koseiMonth = Math.round(koseiAnnual / 12);
    const month = basicMonth + koseiMonth;              // 合計(月)= 内訳の合計と必ず一致
    const annual = basicAnnual + koseiAnnual;           // 合計(年)

    out.hidden = false;
    $("r-month").innerHTML = `${yen(month)}<small>円</small>`;
    $("r-sub").innerHTML =
      `1年で約 <strong>${yen(annual)}円</strong>` +
      (emp ? "(基礎年金+厚生年金)" : "(基礎年金だけ)");

    /* 会社員だけ、基礎+厚生の内訳テーブルを出す */
    const tbl = $("r-tbl");
    const tbody = $("r-rows");
    if (emp) {
      tbl.hidden = false;
      const rows = [
        ["基礎年金(みんな共通)", basicMonth, basicAnnual, true],
        ["厚生年金(会社員の上乗せ)", koseiMonth, koseiAnnual, true],
      ];
      tbody.innerHTML = "";
      for (const [label, m, a, indent] of rows) {
        const tr = document.createElement("tr");
        if (indent) tr.className = "indent";
        tr.innerHTML = `<td>${label}</td><td>${yen(m)}</td><td>${yen(a)}</td>`;
        tbody.appendChild(tr);
      }
      const sum = document.createElement("tr");
      sum.className = "sum";
      sum.innerHTML = `<td>合計</td><td>${yen(month)}</td><td>${yen(annual)}</td>`;
      tbody.appendChild(sum);
    } else {
      tbl.hidden = true;
      tbody.innerHTML = "";
    }

    /* 経理マンのリアクション(数字の復唱→目安である注意→ねんきんネットへ) */
    $("r-react").innerHTML =
      `65歳から毎月 約<strong>${yen(month)}円</strong> 受け取れる見込みです。` +
      (emp && koseiMonth > 0
        ? `うち厚生年金が<strong>${yen(koseiMonth)}円</strong>。長くはたらくほど、ここが増えていきます。`
        : `基礎年金だけなので、上乗せはありません。`) +
      `ただしこれは目安。じっさいは加入記録で変わるので、ねんきんネットで確認してみませんか?`;

    $("r-caption").textContent =
      "2026年度(令和8年度)の公表値をもとにした、ざっくりの概算です。" +
      "実際の額は、これまでの加入記録・給料の実績・将来の制度改正で変わります。" +
      "正確な見込み額は、ねんきん定期便やねんきんネットで確認してください。";
  }

  /* 入力のたび即時再計算 */
  for (const el of document.querySelectorAll("#calc-form input")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  render();
})();
