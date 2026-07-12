/* あなたの経理マン UI制御(すべて端末内で完結・外部送信なし) */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const yen = (v) => Math.round(v).toLocaleString("ja-JP");
  const man = (v) => (Math.round(v / 1000) / 10).toLocaleString("ja-JP"); // 万円(小数1桁)

  /* ---- 金額入力の共通ヘルパー(guide.jsからも使う) ---- */
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
  window.KM = { zen2han, digitsOf, commaFmt, formatMoneyInput, attachMoneyInput };

  const form = {
    salary: $("in-salary"),
    bonus: $("in-bonus"),
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

  attachMoneyInput(form.salary);
  attachMoneyInput(form.bonus);

  function readInput() {
    const num = (el) => {
      const v = parseInt(digitsOf(el.value), 10);
      return isNaN(v) ? 0 : v;
    };
    // 年齢は2段階の2択(〜39歳/40歳〜 → 40〜64歳/65歳〜)
    const ageBase = document.querySelector('input[name="age"]:checked').value;
    return {
      monthlySalary: num(form.salary),
      annualBonus: num(form.bonus),
      prefecture: form.pref.value,
      age: ageBase === "40plus" ? document.querySelector('input[name="age2"]:checked').value : "under40",
      dependents: parseInt(form.dependents.value, 10),
      // 「去年も収入があった? いいえ」= 住民税なし(前年無収入)
      noResidentTax: document.querySelector('input[name="lastyear"]:checked').value === "no",
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

  /* 月収の入力ミス救済(「30」= 30万のつもり等)。無反応にしない */
  function salaryHint(v) {
    const hint = $("salary-hint");
    if (v > 0 && v < 10000) {
      if (v < 1000) {
        hint.innerHTML = `もしかして <strong>${v}万円</strong> ですか? → ` +
          `<button type="button" class="linklike" id="salary-fix" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      } else {
        hint.textContent = "「円」の単位で、1万円以上の数字を入れてください(例: 300,000)";
      }
      hint.hidden = false;
    } else {
      hint.hidden = true;
    }
  }
  $("salary-hint").addEventListener("click", (e) => {
    const b = e.target.closest("#salary-fix");
    if (!b) return;
    form.salary.value = commaFmt(b.dataset.v);
    form.salary.dispatchEvent(new Event("input", { bubbles: true }));
    form.salary.focus();
  });

  /* ボーナス欄にも同じ救済(「50」= 50万のつもり) */
  function bonusHint(v) {
    const hint = $("bonus-hint");
    if (v > 0 && v < 1000) {
      hint.innerHTML = `もしかして <strong>${v}万円</strong> ですか? → ` +
        `<button type="button" class="linklike" id="bonus-fix" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      hint.hidden = false;
    } else {
      hint.hidden = true;
    }
  }
  $("bonus-hint").addEventListener("click", (e) => {
    const b = e.target.closest("#bonus-fix");
    if (!b) return;
    form.bonus.value = commaFmt(b.dataset.v);
    form.bonus.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function render() {
    const p = readInput();
    const out = $("result");
    salaryHint(p.monthlySalary);
    bonusHint(p.annualBonus);
    if (p.monthlySalary < 10000) {
      out.hidden = true;
      $("result-peek").hidden = true;
      return;
    }
    const r = window.TedoriCalc.calcNet(p, R);
    out.hidden = false;

    /* 月々の表示値は「表の列を足したら必ず合う」ことを最優先に、
       表示用の丸め済み行からそのまま組み立てる(ボーナスぶんの税・保険料は年間列のみ) */
    const m = r.monthly;
    const taxM = Math.round(r.annual.incomeTax / 12 * (p.monthlySalary * 12 / r.annualGross));
    const residentM = Math.round(r.annual.residentTax / 12);
    const netM = m.gross - m.health - m.pension - m.employment - taxM - residentM;

    $("r-monthly").innerHTML = `${yen(netM)}<small>円</small>`;
    $("r-sub").innerHTML =
      `年間の手取り <strong>${yen(r.annual.net)}円</strong> / 手取り率 <strong>${(r.annual.netRate * 100).toFixed(1)}%</strong>` +
      (r.bonus.gross > 0 ? `(ボーナス含む)` : "");

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

    // 内訳テーブル(月々 / 年間)— 月々列は足したら必ず手取り行に一致する
    const rows = [
      ["支給額(引かれる前)", m.gross, r.annualGross, false],
      ["健康保険" + (r.detail.kaigoApplied ? "+介護保険" : "") + "+支援金", -m.health, -(m.health * 12 + r.bonus.health), true],
      ["厚生年金", -m.pension, -(m.pension * 12 + r.bonus.pension), true],
      ["雇用保険", -m.employment, -(m.employment * 12 + r.bonus.employment), true],
      ["所得税", -taxM, -r.annual.incomeTax, true],
      ["住民税", -residentM, -r.annual.residentTax, true],
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
    sum.innerHTML = `<td>手取り</td><td>${yen(netM)}</td><td>${yen(r.annual.net)}</td>`;
    tbody.appendChild(sum);

    $("r-caption").textContent =
      `${R.prefectures[p.prefecture].name}の健康保険料率${r.detail.healthRatePct.toFixed(2)}%・令和8年度の公表値で計算しました。` +
      `月々の税額は年額を12で割った概算、住民税は「去年も同じくらいの収入」前提のめやすです。` +
      (r.bonus.gross > 0 ? "ボーナスぶんの保険料・所得税は「年間」の列にだけ入っています(住民税は毎月に均等割り)。" : "") +
      (p.age === "over65" ? "※70歳以上の方は年金の保険料が引かれなくなるため、実際の手取りはこれより多くなります。" : "");

    // 経理マンのリアクション(復唱→損の数値化・累積化→転換→問い)
    const rateNum = r.annual.netRate * 100;
    const opener =
      rateNum >= 80 ? `手取り率<strong>${rateNum.toFixed(1)}%</strong> — 80%台キープ、なかなか優秀です。` :
      rateNum >= 75 ? `手取り率は<strong>${rateNum.toFixed(1)}%</strong>。だいたい4分の1が天引きです。` :
      `手取り率<strong>${rateNum.toFixed(1)}%</strong>…税率の階段を一段のぼっていますね。`;
    const annualDeduct = r.annualGross - r.annual.net;
    $("r-react").innerHTML =
      opener +
      `あなたのお給料からは毎月<strong>${yen(m.gross - netM)}円</strong>が自動で引かれ、10年で約<strong>${Math.round(annualDeduct * 10 / 10000).toLocaleString("ja-JP")}万円</strong>。` +
      `ここは経理マンでも減らせません。減らせるのは、スマホ代や保険など「毎月出ていくほう」 — もし月5,000円変われば、手取りが月5,000円増えたのと同じです。最後に見直したのは、いつですか?`;

    // 画面下部のミニバー(結果が画面外でも「出た」と分かるように)
    $("peek-amount").textContent = `月${yen(netM)}円`;
    requestAnimationFrame(() => {
      const rect = out.getBoundingClientRect();
      $("result-peek").hidden = rect.top < window.innerHeight && rect.bottom > 0;
    });

    // シェア文言(1円単位を晒さない万円丸め+受け手への問いで渡す)
    const rate = (r.annual.netRate * 100).toFixed(1);
    const shareText = `月収${man(p.monthlySalary)}万円だと、手取りは月${man(netM)}万円(手取り率${rate}%)。あなたは何%?30秒で出る↓`;
    $("share-x").href = "https://x.com/intent/post?text=" + encodeURIComponent(shareText + "\n" + shareUrl(p));
    // 金額を伏せたい人向け
    $("share-x-anon").href = "https://x.com/intent/post?text=" +
      encodeURIComponent(`2026年の手取り率、私は${rate}%だった。あなたは何%?30秒で出る↓\n` + location.origin + location.pathname);
  }

  /* URLパラメータ(共有・復元用) a: 0=〜39歳 1=40〜64歳 2=65歳〜 */
  function ageCode(age) { return age === "40to64" ? "1" : (age === "over65" ? "2" : "0"); }
  function params(p) {
    return new URLSearchParams({
      m: p.monthlySalary, b: p.annualBonus || 0, p: p.prefecture,
      a: ageCode(p.age), d: p.dependents, n: p.noResidentTax ? "1" : "0",
    });
  }
  function shareUrl(p) {
    return location.origin + location.pathname + "?" + params(p).toString();
  }
  /* 注: 入力内容をアドレスバーへ自動で書き込むことはしない(「保存されません」の約束を守る)。
     URLに条件が入るのは、シェアボタンを押した本人が作ったリンクだけ。 */
  function restoreFromUrl() {
    const q = new URLSearchParams(location.search);
    if (!q.has("m")) return false;
    // 改変・切損URLでも壊れて見えないよう、数字だけを取り出して復元する
    const mDigits = digitsOf(q.get("m") || "");
    const bDigits = digitsOf(q.get("b") || "");
    if (!mDigits) return false;
    form.salary.value = commaFmt(mDigits);
    form.bonus.value = (bDigits && bDigits !== "0") ? commaFmt(bDigits) : "";
    if (R.prefectures[q.get("p")]) form.pref.value = q.get("p");
    const age = q.get("a") === "1" ? "40to64" : (q.get("a") === "2" ? "over65" : "under40");
    if (age === "under40") {
      document.querySelector('input[name="age"][value="under40"]').checked = true;
    } else {
      document.querySelector('input[name="age"][value="40plus"]').checked = true;
      document.querySelector(`input[name="age2"][value="${age}"]`).checked = true;
    }
    syncAgeDetail();
    // dパラメータは実在する選択肢のみ受け付ける(改変URLでNaN表示にならないように)
    const d = q.get("d");
    form.dependents.value = Array.from(form.dependents.options).some((o) => o.value === d) ? d : "0";
    document.querySelector(`input[name="lastyear"][value="${q.get("n") === "1" ? "no" : "yes"}"]`).checked = true;
    // 復元された値は意図のある選択なので、未選択スタイルを解除する
    for (const seg of document.querySelectorAll(".seg.untouched")) seg.classList.remove("untouched");
    return true;
  }

  $("copy-url").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(readInput()));
      $("copy-url").textContent = "コピーしました ✓";
      setTimeout(() => { $("copy-url").textContent = "結果URLをコピー"; }, 1600);
    } catch { /* clipboard未対応環境は無視 */ }
  });

  /* 入力のたび即時再計算(ツールの武器)。
     ユーザー自身が条件を変えたら「あなた専用に設定しました」等のバナーは役目を終えるので消す */
  const onFormEvent = (e) => {
    if (e.isTrusted) $("guide-banner").hidden = true;
    render();
  };
  for (const el of document.querySelectorAll("#calc-form input, #calc-form select")) {
    el.addEventListener("input", onFormEvent);
    el.addEventListener("change", onFormEvent);
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

  /* 結果ミニバー: 結果が画面外にあるときだけ出す */
  const peek = $("result-peek");
  peek.addEventListener("click", () => $("result").scrollIntoView({ behavior: "smooth" }));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        peek.hidden = $("result").hidden || e.isIntersecting;
      }
    }, { threshold: 0.05 });
    io.observe($("result"));
  }

  const restored = restoreFromUrl();
  render();
  if (restored) {
    // 共有リンクで来た人を結果まで案内する(受け手が気づけないのを防ぐ)
    const banner = $("guide-banner");
    $("guide-banner-text").textContent = "共有された条件で計算した結果です。月収をあなたの数字に書き換えてみてください";
    banner.hidden = false;
    // 読み込み直後なのでアニメーション無しで直行(スクロール復元との競合も避ける)
    setTimeout(() => $("result").scrollIntoView({ behavior: "instant", block: "start" }), 300);
  }
})();
