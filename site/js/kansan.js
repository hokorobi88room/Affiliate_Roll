/* 時給・日給・月給・年収の相互変換 UI(すべて端末内で完結・外部送信なし)
   金額を時給に正規化してから、時給・日給・月給・年収の4つをぜんぶ出す。税計算は不要。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const { digitsOf, numOf, yen, man, commaFmt, attachMoney } = window.KMLib;

  const el = {
    amount: $("in-amount"),
    type: $("in-type"),
    hours: $("in-hours"),
    days: $("in-days"),
    amountHint: $("amount-hint"),
  };

  attachMoney(el.amount); // 金額はカンマ区切り(時給/日給/月給/年収 共通)

  const NAME = { hour: "時給", day: "日給", month: "月給", year: "年収" };

  /* 金額(円)は整数で読む。全角もカンマも取り除く */
  function readYen(inputEl) {
    const v = parseInt(digitsOf(inputEl.value), 10);
    return isNaN(v) ? 0 : v;
  }

  /* 入力値を「時給」に正規化 */
  function toHourly(amount, type, h, d) {
    if (type === "hour") return amount;
    if (type === "day") return amount / h;
    if (type === "month") return amount / (h * d);
    return amount / (12 * h * d); // year
  }

  /* 入力ミス救済:月給/年収なのに1万円未満 → 「万円」の打ち間違いかも(無反応にしない) */
  function updateMoneyHint(type, amount) {
    const hintEl = el.amountHint;
    if ((type === "year" || type === "month") && amount > 0 && amount < 10000) {
      hintEl.innerHTML =
        `もしかして <strong>${commaFmt(amount)}万円</strong> ですか? → ` +
        `<button type="button" class="linklike" id="amount-fix" data-v="${amount * 10000}">${yen(amount * 10000)}円で計算する</button>`;
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }
  el.amountHint.addEventListener("click", (e) => {
    const b = e.target.closest("#amount-fix");
    if (!b) return;
    el.amount.value = commaFmt(b.dataset.v);
    el.amount.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function render() {
    const amount = readYen(el.amount);
    const type = el.type.value;
    let h = numOf(el.hours.value); if (!(h > 0)) h = 8;   // 空・0のときは初期値でわり算エラーを避ける
    let d = numOf(el.days.value); if (!(d > 0)) d = 20;

    updateMoneyHint(type, amount);

    const out = $("result");
    if (amount <= 0) { out.hidden = true; return; }

    const hourly = toHourly(amount, type, h, d);
    const day = hourly * h;
    const month = hourly * h * d;
    const year = month * 12; // ボーナスは含まない

    out.hidden = false;

    /* 大きい数字:年収を入れたときだけ時給を、それ以外は年収を主役にする */
    const heroIsYear = type !== "year";
    $("r-hero-label").textContent = heroIsYear ? "年収にすると(ボーナスは別)" : "時給にすると";
    $("r-hero").innerHTML = `${yen(heroIsYear ? year : hourly)}<small>円</small>`;
    $("r-sub").innerHTML = heroIsYear
      ? `約${man(year)}万円 ・ 月給 ${yen(month)}円`
      : `日給 ${yen(day)}円 ・ 月給 ${yen(month)}円`;

    /* 4種類ぜんぶを表に。いま入れた金額の行に印をつける */
    const rows = [
      ["hour", "時給", hourly, ""],
      ["day", "日給", day, ""],
      ["month", "月給", month, ""],
      ["year", "年収", year, "ボーナス別"],
    ];
    const tbody = $("r-rows");
    tbody.innerHTML = "";
    for (const [key, label, v, sub] of rows) {
      const tr = document.createElement("tr");
      const mark = key === type
        ? ' <span style="font-size:11px;color:var(--accent);font-weight:800">← 入力した金額</span>'
        : "";
      const subTxt = sub ? ` <span style="font-size:11px;color:var(--muted)">${sub}</span>` : "";
      tr.innerHTML = `<td>${label}${mark}</td><td>${yen(v)}${subTxt}</td>`;
      tbody.appendChild(tr);
    }

    $("r-caption").textContent =
      `1日${h}時間・1か月${d}日で働いた場合の金額です。年収にボーナスは含みません。`;

    /* 経理マンのリアクション(数値の復唱 → 引かれる前の注意 → 問いで締め) */
    const headline = (type === "year")
      ? `年収<strong>${yen(amount)}円</strong>は、時給<strong>${yen(hourly)}円</strong>・日給<strong>${yen(day)}円</strong>ぶんの働きです。`
      : `${NAME[type]}<strong>${yen(amount)}円</strong>は、月給<strong>${yen(month)}円</strong>・年収<strong>約${man(year)}万円</strong>(ボーナスは別)にあたります。`;
    $("r-react").innerHTML = headline +
      `時給も月給も年収も、ぜんぶ引かれる前の金額。手取りはもう少し下がります。月々の手取りも見てみますか?`;
  }

  /* 入力のたび即時再計算 */
  for (const node of document.querySelectorAll("#calc-form input, #calc-form select")) {
    node.addEventListener("input", render);
    node.addEventListener("change", render);
  }

  render();
})();
