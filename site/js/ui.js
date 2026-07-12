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
    // 年収モードでは12等分して月収に(ボーナス込みの年収を想定するためボーナス欄は使わない)
    const annualMode = document.querySelector('input[name="salarymode"]:checked').value === "annual";
    return {
      monthlySalary: annualMode ? Math.round(num(form.salary) / 12) : num(form.salary),
      annualBonus: annualMode ? 0 : num(form.bonus),
      annualMode,
      prefecture: form.pref.value,
      age: ageBase === "40plus" ? document.querySelector('input[name="age2"]:checked').value : "under40",
      dependents: parseInt(form.dependents.value, 10),
      // 「去年も収入があった? いいえ」= 住民税なし(前年無収入)
      noResidentTax: document.querySelector('input[name="lastyear"]:checked').value === "no",
    };
  }

  /* 月収/年収モードの切替(ラベル・ボーナス欄の表示を追従) */
  function syncSalaryMode() {
    const annual = document.querySelector('input[name="salarymode"]:checked').value === "annual";
    $("salary-label").childNodes[0].textContent = annual ? "💰 年収を入れてください" : "💰 月収を入れてください";
    $("salary-label-hint").textContent = annual ? "引かれる前の年収。ボーナスも入れてOK" : "引かれる前の金額。だいたいでOK";
    form.salary.placeholder = annual ? "4,500,000" : "300,000";
    $("bonus-field").hidden = annual; // 年収にはボーナスも入っている前提なので二重計上を防ぐ
  }
  for (const rdo of document.querySelectorAll('input[name="salarymode"]')) {
    rdo.addEventListener("change", syncSalaryMode);
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

  /* 都道府県を選んだら、料率の全国順位をひとこと(データへのリアクション) */
  const rateAsc = Object.values(R.prefectures).map((x) => x.rate).sort((a, b) => a - b);
  function prefRank(key) {
    const pref = R.prefectures[key];
    const rank = rateAsc.findIndex((v) => v === pref.rate) + 1;
    $("pref-rank").textContent = `${pref.name}の保険料率は、47都道府県で安いほうから${rank}番目です`;
  }

  function render() {
    const p = readInput();
    const out = $("result");
    salaryHint(parseInt(digitsOf(form.salary.value), 10) || 0); // 救済は入力欄の生の値で判定(年収モードでも正しく効く)
    bonusHint(p.annualBonus);
    prefRank(p.prefecture);
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
      (p.annualMode ? "年収は12等分して計算しています(ボーナスの割合によって少しズレます)。" : "") +
      (p.age === "over65" ? "※70歳以上の方は年金の保険料が引かれなくなるため、実際の手取りはこれより多くなります。" : "");

    // ふるさと納税の上限(めやす): 住民税の収入に応じた分 × 20% ÷ (90% − 所得税率×1.021) + 2,000円
    const shotokuwari = r.annual.residentTax > 0 ? Math.max(0, r.annual.residentTax - R.residentPerCapita + R.residentAdjustmentCredit) : 0;
    let marginal = 0;
    for (const b of R.incomeTaxBrackets) { if (b[0] === null || r.detail.taxableIncome <= b[0]) { marginal = b[1]; break; } }
    if (shotokuwari > 0) {
      const limit = Math.floor((shotokuwari * 0.2 / (0.9 - marginal * 1.021) + 2000) / 1000) * 1000;
      $("furusato-line").innerHTML =
        `あなたの上限は <strong>約${yen(limit)}円</strong>(めやす)。この金額までの寄付なら、実質2,000円の負担で返礼品がもらえます。` +
        `<br><span style="color:var(--muted);font-size:12px">住宅ローン控除・医療費控除などがある方はズレます。正確な額は寄付サイトの詳細シミュレーターで確認してください。</span>`;
    } else {
      $("furusato-line").textContent = "この条件では住民税がかからないため、ふるさと納税の節税メリットはありません。";
    }

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

  /* 逆算: 目標の手取り(月)→必要な月収(いまの条件で二分探索) */
  KM.attachMoneyInput($("rev-target"));
  function netMonthlyFor(gross, base) {
    const r = window.TedoriCalc.calcNet({ ...base, monthlySalary: gross, annualBonus: 0 }, R);
    const taxM = Math.round(r.annual.incomeTax / 12);
    const residentM = Math.round(r.annual.residentTax / 12);
    return r.monthly.gross - r.monthly.health - r.monthly.pension - r.monthly.employment - taxM - residentM;
  }
  $("rev-run").addEventListener("click", () => {
    const target = parseInt(digitsOf($("rev-target").value), 10) || 0;
    const outEl = $("rev-out");
    outEl.hidden = false;
    if (target < 10000) { outEl.textContent = "1万円以上の数字を入れてください"; return; }
    const base = readInput();
    if (netMonthlyFor(2000000, base) < target) {
      outEl.textContent = "月収200万円でも届かない目標です。桁を確認してください";
      return;
    }
    let lo = 10000, hi = 2000000;
    for (let i = 0; i < 40; i++) {
      const mid = Math.round((lo + hi) / 2);
      if (netMonthlyFor(mid, base) >= target) hi = mid; else lo = mid;
    }
    const need = Math.ceil(hi / 1000) * 1000;
    outEl.innerHTML = `手取り月${yen(target)}円には、月収(引かれる前)<strong>約${yen(need)}円</strong>が必要です(いまの条件・ボーナスなしで計算)`;
  });

  /* 画像で保存: 経理マン入りの結果カードを生成(端末内で生成・どこにも送信しない) */
  $("share-img").addEventListener("click", async () => {
    const p = readInput();
    if (p.monthlySalary < 10000) return;
    const r = window.TedoriCalc.calcNet(p, R);
    const rate = (r.annual.netRate * 100).toFixed(1);
    const netMText = $("peek-amount").textContent; // 「月239,680円」
    const mascot = document.querySelector("#keiriman").innerHTML;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#FDF6EA"/>
      <g transform="translate(70,120) scale(1.85)">${mascot}</g>
      <g font-family="Hiragino Maru Gothic ProN, Hiragino Sans, sans-serif">
        <text x="500" y="150" font-size="46" font-weight="800" fill="#17734C">あなたの経理マン@綻流夢</text>
        <text x="500" y="265" font-size="52" font-weight="800" fill="#3A2E2A">わたしの手取り率は…</text>
        <text x="500" y="420" font-size="120" font-weight="800" fill="#17734C">${rate}%</text>
        <text x="500" y="510" font-size="44" font-weight="800" fill="#3A2E2A">手取り ${netMText}</text>
        <text x="500" y="575" font-size="28" font-weight="700" fill="#6F6152">2026年(令和8年度)の最新ルールで計算</text>
      </g>
    </svg>`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200; canvas.height = 630;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        const file = new File([blob], "keiriman-tedori.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file] }); return; } catch { /* キャンセル時は保存へ */ }
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "keiriman-tedori.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });

  /* PWA: オフラインでも計算できるように(データはどこにも送らない設計と相性◎) */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* 未対応環境は無視 */ });
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
