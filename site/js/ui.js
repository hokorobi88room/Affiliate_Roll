/* 手取りチェッカー UI制御(すべて端末内で完結・外部送信なし) */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const yen = (v) => Math.round(v).toLocaleString("ja-JP");

  const form = {
    salary: $("in-salary"),
    bonus: $("in-bonus"),
    pref: $("in-pref"),
    dependents: $("in-dependents"),
    noResident: $("in-noresident"),
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

  function readInput() {
    const num = (el) => {
      const v = parseInt(String(el.value).replace(/[^\d]/g, ""), 10);
      return isNaN(v) ? 0 : v;
    };
    return {
      monthlySalary: num(form.salary),
      annualBonus: num(form.bonus),
      prefecture: form.pref.value,
      age: document.querySelector('input[name="age"]:checked').value,
      dependents: parseInt(form.dependents.value, 10),
      noResidentTax: form.noResident.checked,
    };
  }

  function render() {
    const p = readInput();
    const out = $("result");
    if (p.monthlySalary < 10000) { out.hidden = true; updateUrl(p); return; }
    const r = window.TedoriCalc.calcNet(p, R);
    out.hidden = false;

    $("r-monthly").innerHTML = `${yen(r.monthly.netApprox / 10000 >= 100 ? r.monthly.netApprox : r.monthly.netApprox)}<small>円</small>`;
    $("r-sub").innerHTML =
      `年間の手取り <strong>${yen(r.annual.net)}円</strong> / 手取り率 <strong>${(r.annual.netRate * 100).toFixed(1)}%</strong>` +
      (r.bonus.gross > 0 ? `(賞与含む)` : "");

    // 構成バー
    const si = r.annual.socialInsurance;
    const tax = r.annual.incomeTax + r.annual.residentTax;
    const net = r.annual.net;
    const total = r.annualGross;
    $("bar-net").style.width = (net / total * 100).toFixed(2) + "%";
    $("bar-si").style.width = (si / total * 100).toFixed(2) + "%";
    $("bar-tax").style.width = (tax / total * 100).toFixed(2) + "%";
    $("lg-net").textContent = `${yen(net)}円(${(net / total * 100).toFixed(1)}%)`;
    $("lg-si").textContent = `${yen(si)}円(${(si / total * 100).toFixed(1)}%)`;
    $("lg-tax").textContent = `${yen(tax)}円(${(tax / total * 100).toFixed(1)}%)`;

    // 内訳テーブル(月々 / 年間)
    const m = r.monthly;
    const rows = [
      ["額面(支給額)", m.gross, r.annualGross, false],
      ["健康保険" + (r.detail.kaigoApplied ? "+介護保険" : "") + "+支援金", -m.health, -(m.health * 12 + r.bonus.health), true],
      ["厚生年金", -m.pension, -(m.pension * 12 + r.bonus.pension), true],
      ["雇用保険", -m.employment, -(m.employment * 12 + r.bonus.employment), true],
      ["所得税(復興税込)", -Math.round(r.annual.incomeTax / 12), -r.annual.incomeTax, true],
      ["住民税", -Math.round(r.annual.residentTax / 12), -r.annual.residentTax, true],
    ];
    const tbody = $("r-rows");
    tbody.innerHTML = "";
    for (const [label, mv, av, indent] of rows) {
      const tr = document.createElement("tr");
      if (indent) tr.className = "indent";
      tr.innerHTML = `<td>${label}</td><td>${mv < 0 ? "−" : ""}${yen(Math.abs(mv))}</td><td>${av < 0 ? "−" : ""}${yen(Math.abs(av))}</td>`;
      tbody.appendChild(tr);
    }
    const sum = document.createElement("tr");
    sum.className = "sum";
    sum.innerHTML = `<td>手取り</td><td>${yen(m.netApprox)}</td><td>${yen(r.annual.net)}</td>`;
    tbody.appendChild(sum);

    $("r-caption").textContent =
      `標準報酬月額 ${yen(r.detail.standardMonthlyHealth)}円(健保)/${yen(r.detail.standardMonthlyPension)}円(厚年)・` +
      `${R.prefectures[p.prefecture].name}の健康保険料率${r.detail.healthRatePct.toFixed(2)}%で計算。月々の税額は年額の12分の1(概算)。`;

    // シェア文言(結果込み)
    const shareText = `額面${yen(p.monthlySalary)}円の手取り、月${yen(m.netApprox)}円だった(手取り率${(r.annual.netRate * 100).toFixed(1)}%)。自分の数字は30秒でわかる↓`;
    $("share-x").href = "https://x.com/intent/post?text=" + encodeURIComponent(shareText + "\n" + shareUrl(p));
    updateUrl(p);
  }

  /* URLパラメータ(共有・復元用) */
  function shareUrl(p) {
    const q = new URLSearchParams({
      m: p.monthlySalary, b: p.annualBonus || 0, p: p.prefecture,
      a: p.age === "40to64" ? "1" : "0", d: p.dependents, n: p.noResidentTax ? "1" : "0",
    });
    return location.origin + location.pathname + "?" + q.toString();
  }
  function updateUrl(p) {
    if (p.monthlySalary >= 10000) {
      history.replaceState(null, "", "?" + new URLSearchParams({
        m: p.monthlySalary, b: p.annualBonus || 0, p: p.prefecture,
        a: p.age === "40to64" ? "1" : "0", d: p.dependents, n: p.noResidentTax ? "1" : "0",
      }));
    }
  }
  function restoreFromUrl() {
    const q = new URLSearchParams(location.search);
    if (!q.has("m")) return;
    form.salary.value = q.get("m") || "";
    form.bonus.value = q.get("b") === "0" ? "" : (q.get("b") || "");
    if (R.prefectures[q.get("p")]) form.pref.value = q.get("p");
    document.querySelector(`input[name="age"][value="${q.get("a") === "1" ? "40to64" : "under40"}"]`).checked = true;
    form.dependents.value = q.get("d") || "0";
    form.noResident.checked = q.get("n") === "1";
  }

  $("copy-url").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(readInput()));
      $("copy-url").textContent = "コピーしました ✓";
      setTimeout(() => { $("copy-url").textContent = "結果URLをコピー"; }, 1600);
    } catch { /* clipboard未対応環境は無視 */ }
  });

  /* 入力のたび即時再計算(ツールの武器) */
  for (const el of document.querySelectorAll("#calc-form input, #calc-form select")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  /* アフィリエイト枠: 設定があるときだけ表示 */
  const offers = window.AFFILIATE_OFFERS || [];
  if (offers.length > 0) {
    const box = $("offer-box");
    const o = offers[0];
    $("offer-title").textContent = o.title;
    $("offer-desc").textContent = o.description;
    const a = $("offer-link");
    a.textContent = o.cta;
    a.href = o.url;
    box.hidden = false;
  }

  restoreFromUrl();
  render();
})();
