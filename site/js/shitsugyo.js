/* 失業保険でもらえる額の「目安」UI(すべて端末内で完結・外部送信なし)
   ※これは目安ツール。実際の給付率は45〜80%の曲線で、正確な額と日数はハローワークが決めます。
   数値は2025年8月〜の公表値(基本手当日額の上限・下限、所定給付日数)にもとづく概算。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const yen = KMLib.yen;
  const commaFmt = KMLib.commaFmt;
  const digitsOf = KMLib.digitsOf;

  /* ---- 公表値(2025年8月〜)---- */
  const CAPS = { u29: 7255, a3044: 7715, a4559: 8490, a6064: 7294 }; // 基本手当日額の上限(年齢帯別)
  const LOWER = 2411;  // 基本手当日額の下限(全年齢)
  const RATE = 0.6;    // 真ん中の給付率で概算(本来は45〜80%)

  // 自己都合(自分から辞める): 加入年数だけで決まる。1年未満は原則ゼロ。
  const SELF_DAYS = { under1: 0, y1to5: 90, y5to10: 90, y10to20: 120, y20plus: 150 };
  // 会社都合(解雇・倒産など): 加入年数 × 年齢帯(簡易表)
  const COMPANY_DAYS = {
    under1:  { u29: 90,  a3044: 90,  a4559: 90,  a6064: 90  },
    y1to5:   { u29: 90,  a3044: 120, a4559: 180, a6064: 150 },
    y5to10:  { u29: 120, a3044: 180, a4559: 240, a6064: 180 },
    y10to20: { u29: 180, a3044: 210, a4559: 270, a6064: 210 },
    // 20年以上×29歳以下は区分がないため「1〜5年」扱いにフォールバック(=90日)
    y20plus: { u29: 90,  a3044: 240, a4559: 330, a6064: 240 },
  };

  const form = {
    salary: $("in-salary"),
    age: $("in-age"),
    tenure: $("in-tenure"),
  };
  KMLib.attachMoney(form.salary);

  const reasonOf = () => document.querySelector('input[name="reason"]:checked').value;

  function dailyBenefit(salary, ageKey) {
    let d = Math.round((salary / 30) * RATE); // 賃金日額 × 0.6(真ん中の給付率で概算)
    const cap = CAPS[ageKey];
    if (d > cap) d = cap;   // 上限で頭打ち
    if (d < LOWER) d = LOWER; // 下限
    return d;
  }
  function benefitDays(reason, ageKey, tenureKey) {
    return reason === "self" ? SELF_DAYS[tenureKey] : COMPANY_DAYS[tenureKey][ageKey];
  }

  /* 触られるまでデフォルト選択に色をつけない(どちらかを「推し」に見せない) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  /* 入力ミス救済(「30」= 30万のつもり等)。無反応にしない */
  function moneyHint(v, hintEl) {
    if (v > 0 && v < 10000) {
      if (v < 1000) {
        hintEl.innerHTML = `もしかして <strong>${v}万円</strong> ですか? → ` +
          `<button type="button" class="linklike" id="salary-fix" data-v="${v * 10000}">${yen(v * 10000)}円で計算する</button>`;
      } else {
        hintEl.textContent = "「円」の単位で、1万円以上の数字を入れてください(例: 300,000)";
      }
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }

  function render() {
    const salary = parseInt(digitsOf(form.salary.value), 10) || 0;
    const ageKey = form.age.value;
    const tenureKey = form.tenure.value;
    const reason = reasonOf();
    const out = $("result");

    moneyHint(salary, $("salary-hint"));
    if (salary < 10000) { out.hidden = true; return; }

    const wageDaily = salary / 30;
    const daily = dailyBenefit(salary, ageKey);
    const days = benefitDays(reason, ageKey, tenureKey);
    const total = daily * days;
    const capped = Math.round(wageDaily * RATE) > CAPS[ageKey];

    out.hidden = false;

    /* 自己都合 × 加入1年未満 → 原則もらえない */
    if (reason === "self" && tenureKey === "under1") {
      $("r-eq").textContent = "自分から辞める・加入1年未満は";
      $("r-main").innerHTML = `0<small>円</small>`;
      $("r-sub").innerHTML =
        "自分から辞めた場合、雇用保険の加入が<strong>1年未満</strong>だと、失業保険は原則もらえません。" +
        "会社の都合(解雇・倒産など)なら、1年未満でも約90日ぶん受け取れます。";
      $("r-react").innerHTML =
        "自分から辞める場合、加入が<strong>1年未満</strong>だと失業保険は原則ゼロです。" +
        "あと少しで1年、というときは、辞める時期も一度考えてみますか?" +
        "<small>これはざっくりの目安です。じっさいはハローワークで決まります</small>";
      return;
    }

    $("r-eq").innerHTML = `1日 約${yen(daily)}円 × ${days}日 =`;
    $("r-main").innerHTML = `約${yen(total)}<small>円</small>`;
    $("r-sub").innerHTML =
      `やめる前の1日ぶんの給料(目安)は約<strong>${yen(wageDaily)}円</strong>。` +
      `その約6割が、1日あたりに受け取れるお金の目安です` +
      (capped ? "(年齢帯の上限で頭打ち)" : "") + "。";

    let react = `${days}日ぶんで、合計およそ<strong>${yen(total)}円</strong>が受け取れる目安です。`;
    if (reason === "self") {
      react += "ただし自分から辞めた場合は、受け取りはじめるまで<strong>約2〜3か月</strong>の待ち(給付制限)があります。";
    } else {
      react += "会社の都合の場合は、待ち(給付制限)がなく早めに受け取れます。";
    }
    react += "<small>これはざっくりの目安です。じっさいはハローワークで決まります</small>";
    $("r-react").innerHTML = react;
  }

  /* 入力のたび即時再計算 */
  for (const el of document.querySelectorAll("#calc-form input, #calc-form select")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }
  /* 「30万のつもり」ボタン */
  $("salary-hint").addEventListener("click", (e) => {
    const b = e.target.closest("#salary-fix");
    if (!b) return;
    form.salary.value = commaFmt(b.dataset.v);
    form.salary.dispatchEvent(new Event("input", { bubbles: true }));
  });

  render();
})();
