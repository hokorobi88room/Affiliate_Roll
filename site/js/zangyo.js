/* 残業代の計算 UI(すべて端末内で完結・外部送信なし)
   残業代 = 時給 × 倍率 × 残業時間。割増率は労働基準法の下限どおり。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const { attachMoney, digitsOf, numOf, commaFmt, yen } = window.KMLib;

  const wageEl = $("in-wage");
  const hoursEl = $("in-hours");
  const monthlyEl = $("in-monthly");

  /* 金額入力にカンマ区切り+全角→半角を付与 */
  attachMoney(wageEl);
  attachMoney(monthlyEl);

  /* 倍率の決定: ふつう=1.25 / 特別→深夜1.5・休日1.35 */
  function multiplier() {
    const kind = document.querySelector('input[name="kind"]:checked').value;
    if (kind === "normal") return 1.25;
    const sp = document.querySelector('input[name="special"]:checked').value;
    return sp === "night" ? 1.5 : 1.35;
  }

  /* 「特別な残業」を選んだときだけ、深夜/休日の2択を出す */
  function syncSpecialDetail() {
    $("special-detail").hidden =
      document.querySelector('input[name="kind"]:checked').value !== "special";
  }
  for (const rdo of document.querySelectorAll('input[name="kind"]')) {
    rdo.addEventListener("change", syncSpecialDetail);
  }
  /* 触られるまでデフォルト選択に色をつけない(どちらかを「推し」に見せない) */
  for (const seg of document.querySelectorAll(".seg.untouched")) {
    seg.addEventListener("change", () => seg.classList.remove("untouched"), { once: true });
  }

  /* details「月給から時給を出す」: 月給÷160時間の目安を出して、時給欄に入れる */
  function syncMonthly() {
    const out = $("monthly-out");
    const monthly = parseInt(digitsOf(monthlyEl.value), 10);
    if (!monthly || monthly < 10000) { out.hidden = true; return; }
    const hourly = Math.round(monthly / 160);
    out.hidden = false;
    out.innerHTML =
      `→ 時給の目安 <strong>${yen(hourly)}円</strong> ` +
      `<button type="button" class="linklike" id="monthly-apply" data-v="${hourly}">この時給で計算する</button>`;
  }
  monthlyEl.addEventListener("input", syncMonthly);
  monthlyEl.addEventListener("compositionend", syncMonthly);
  $("monthly-out").addEventListener("click", (e) => {
    const b = e.target.closest("#monthly-apply");
    if (!b) return;
    wageEl.value = commaFmt(b.dataset.v);
    wageEl.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function render() {
    const wage = parseInt(digitsOf(wageEl.value), 10) || 0;
    const hours = numOf(hoursEl.value);
    const out = $("result");

    if (wage <= 0 || hours <= 0) { out.hidden = true; return; }

    const mult = multiplier();
    const pay = wage * mult * hours;               // 残業代の合計
    const premiumPerHour = wage * (mult - 1);      // 1時間あたりの「上乗せ」ぶん
    const hoursText = String(hours);               // 20 も 12.5 もそのまま表示

    out.hidden = false;
    $("r-pay").innerHTML = `${yen(pay)}<small>円</small>`;
    $("r-sub").innerHTML =
      `時給${commaFmt(wage)}円 × <strong>${mult}倍</strong> × ${hoursText}時間`;

    $("r-react").innerHTML =
      `${hoursText}時間の残業で、約<strong>${yen(pay)}円</strong>。` +
      `1時間あたり<strong>${yen(premiumPerHour)}円</strong>が上乗せされています。` +
      `その1時間ぶん、ちゃんともらえていますか?`;

    $("r-caption").textContent =
      "割増率は労働基準法の下限で計算しました。会社の決まりによっては、これより高いこともあります。" +
      "深夜や休日が時間外と重なると、さらに割増が上がる場合があります。";
  }

  /* 入力のたび即時再計算 */
  for (const el of document.querySelectorAll("#calc-form input")) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  render();
})();
