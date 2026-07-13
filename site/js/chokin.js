/* つみたてシミュレーション(複利)UI
   すべて端末内で完結し、入力内容はどこにも送信・保存されない。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const K = window.KMLib;
  const yen = K.yen;    // 四捨五入してカンマ(円)
  const man = K.man;    // 万円(小数1桁)
  const commaFmt = K.commaFmt;

  const el = {
    monthly: $("in-monthly"),
    years: $("in-years"),
    rate: $("in-rate"),
    initial: $("in-initial"),
  };

  // 金額・年数はカンマ整形+全角→半角。利回りは小数を含むので numOf で読む。
  K.attachMoney(el.monthly);
  K.attachMoney(el.years);
  K.attachMoney(el.initial);

  function read() {
    const intOf = (elm) => parseInt(K.digitsOf(elm.value), 10) || 0;
    return {
      monthly: intOf(el.monthly),
      years: intOf(el.years),
      rate: K.numOf(el.rate.value), // 例: 3, 3.5
      initial: intOf(el.initial),
    };
  }

  /* 月複利のシミュレーション
     r=年利/12/100、n=年×12
     合計 = 毎月額×(((1+r)^n − 1)/r)×(1+r) + 初期×(1+r)^n
     r=0 のときは 毎月額×n + 初期(0除算を避ける) */
  function simulate(monthly, years, ratePct, initial) {
    const r = ratePct / 12 / 100;
    const n = years * 12;
    let total;
    if (!(r > 0)) {
      total = monthly * n + initial; // 利回り0(または未入力)
    } else {
      total = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) + initial * Math.pow(1 + r, n);
    }
    const principal = monthly * n + initial;
    return { total, principal };
  }

  function render() {
    const p = read();
    const out = $("result");

    // 年数が入っていて、毎月 or 最初のお金 のどちらかがあるときだけ計算
    if (p.years <= 0 || (p.monthly <= 0 && p.initial <= 0)) {
      out.hidden = true;
      return;
    }

    const s = simulate(p.monthly, p.years, p.rate, p.initial);
    const total = Math.round(s.total);
    const principal = Math.round(s.principal);
    const gain = total - principal; // 表示どうしが必ず一致するよう丸め後に引く

    out.hidden = false;

    // でかい数字(合計)
    $("r-label").textContent = `${p.years}年後の合計(概算)`;
    $("r-total").innerHTML = `${yen(total)}<small>円</small>`;
    $("r-sub").innerHTML =
      `自分で積み立てるお金 <strong>${yen(principal)}円</strong> / ` +
      `増えた分 <strong>${yen(gain)}円</strong>`;

    // グラフのように見せる帯(元本 vs 増えた分)
    const gp = total > 0 ? Math.max(0, gain) / total * 100 : 0;
    const pp = 100 - gp;
    $("bar-principal").style.width = pp.toFixed(2) + "%";
    $("bar-gain").style.width = gp.toFixed(2) + "%";
    $("leg-principal").textContent = yen(principal) + "円";
    $("leg-gain").textContent = yen(gain) + "円";

    // 内訳(足すと合計に一致)
    $("t-principal").textContent = yen(principal);
    $("t-gain").textContent = yen(gain);
    $("t-total").textContent = yen(total);

    // 経理マンのリアクション(数字を復唱→増えた分を強調→問いで締め)
    const q = p.monthly > 0
      ? `毎月${commaFmt(p.monthly)}円、続けられそうですか?`
      : `この置きっぱなしのお金、そのままにしておきますか?`;
    $("r-react").innerHTML =
      `${p.years}年後、積み立てた元本 約<strong>${man(principal)}万円</strong> が ` +
      `約<strong>${man(total)}万円</strong> に。` +
      `増えた分は 約<strong>${man(gain)}万円</strong> です。${q}`;
  }

  // 入力のたび即時再計算
  for (const input of document.querySelectorAll("#calc-form input")) {
    input.addEventListener("input", render);
    input.addEventListener("change", render);
  }

  render();
})();
