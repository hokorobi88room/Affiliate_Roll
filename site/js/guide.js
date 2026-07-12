/* あなたの経理マン — ご挨拶ポップアップ & おまかせモード(2択ツリー)
   原則: 1画面1質問・選択肢は常に2つまで(ジャムの法則)・選択肢に色の優劣をつけない。
   すべて端末内で完結し、入力内容はどこにも送信・保存されない。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const R = window.RATES2026;
  const KM = window.KM; // ui.js の金額入力ヘルパー(カンマ・全角対応)

  /* ---------- ステップ定義(選択肢は必ず2つ以下) ---------- */
  const STEPS = {
    salary: {
      no: 1, q: "月収を教えてください",
      note: "税金や保険料が引かれる前の金額です。給与明細なら「総支給額」の欄。だいたいでOK!",
      input: "salary", placeholder: "300,000", next: "bonusAsk",
    },
    bonusAsk: {
      no: 2, q: "ボーナスはありますか?",
      choices: [
        ["ある", "bonusInput", {}],
        ["ない・わからない", "lastyear", { bonus: 0 }],
      ],
    },
    bonusInput: {
      no: 2, q: "ボーナスは1年分の合計でいくら?",
      note: "「基本給×◯か月分」のざっくりでOK(例: 25万円×2か月分=500,000)",
      input: "bonus", placeholder: "500,000", next: "lastyear",
    },
    lastyear: {
      no: 3, q: "去年(2025年)も働いて収入がありましたか?",
      note: "住民税は「去年の収入」で決まるため確認します。年金を受け取っていた方も「はい」です。去年といまで収入が大きく違う方は、住民税の欄が実際と少しズレます",
      choices: [
        ["はい(だいたい同じくらい)", "age1", { lastyear: "yes" }],
        ["いいえ(新社会人など)", "age1", { lastyear: "no" }],
      ],
    },
    age1: {
      no: 4, q: "年齢を教えてください",
      note: "40歳から介護保険料が少しだけ加わるので、確認させてください",
      choices: [
        ["〜39歳", "dep1", { age: "under40" }],
        ["40歳〜", "age2", {}],
      ],
    },
    age2: {
      no: 4, q: "40歳からのなかでは、どちらですか?",
      note: "65歳からは介護保険料が給料から引かれなくなります",
      choices: [
        ["40〜64歳", "dep1", { age: "40to64" }],
        ["65歳〜", "dep1", { age: "over65" }],
      ],
    },
    dep1: {
      no: 5, q: "あなたの収入で暮らしている「16歳以上」の家族はいますか?",
      note: "例: 収入の少ない(年収123万円以下)配偶者、高校生・大学生のお子さん、仕送り中の親御さん。小さいお子さん(16歳未満)は、税金の計算では数えないルールです",
      choices: [
        ["いない", "pref", { dependents: 0 }],
        ["いる", "dep2", {}],
      ],
    },
    dep2: {
      no: 5, q: "あなたの収入で暮らしている16歳以上の家族は、何人ですか?",
      note: "16歳未満のお子さんは数に入れません",
      choices: [
        ["1人", "pref", { dependents: 1 }],
        ["2人以上", "depN", {}],
      ],
    },
    depN: {
      no: 5, q: "何人ですか?(数字で入力)",
      note: "16歳未満のお子さんは数に入れません",
      input: "dependents", unit: "人", placeholder: "2", next: "pref",
    },
    pref: {
      no: 6, q: "会社がある都道府県は?",
      note: "お住まいではなく勤務先です(健康保険料が県ごとに少し違います)",
      select: true, next: "done",
    },
  };
  const TOTAL = 6;

  /* ---------- 状態 ---------- */
  let answers = {};
  let history = [];
  let current = null;
  let partialStart = null;   // 途中の項目だけ決めたいとき(例: 扶養だけ)
  let lastFocus = null;      // 閉じたときフォーカスを戻す先
  let lockedScrollY = 0;

  /* ---------- 金額入力(カンマ・全角対応は ui.js の共通ヘルパー) ---------- */
  KM.attachMoneyInput($("g-input"));

  /* ---------- 画面描画 ---------- */
  function show(stepKey) {
    const s = STEPS[stepKey];
    current = stepKey;
    $("g-progress").textContent = `Q${s.no} / ${TOTAL}`;
    $("g-q").textContent = s.q;
    $("g-note").textContent = s.note || "";
    $("g-note").hidden = !s.note;

    const inputRow = $("g-inputrow"), selectRow = $("g-selectrow"), choices = $("g-choices");
    inputRow.hidden = true; selectRow.hidden = true;
    choices.innerHTML = "";

    if (s.input) {
      inputRow.hidden = false;
      $("g-input-wrap").classList.toggle("unit-nin", s.unit === "人");
      const inp = $("g-input");
      inp.placeholder = s.placeholder || "";
      inp.value = answers[s.input] ? KM.commaFmt(answers[s.input]) : "";
      const btn = mkChoice("これでOK!", true);
      btn.addEventListener("click", () => {
        let v = parseInt(KM.digitsOf(inp.value), 10);
        if (s.input === "salary" && (isNaN(v) || v < 10000)) {
          $("g-note").hidden = false;
          $("g-note").textContent = "1万円以上の数字を入れてください(だいたいでOK!)";
          inp.focus();
          return;
        }
        if (s.input === "dependents") {
          if (isNaN(v) || v < 2) {
            $("g-note").hidden = false;
            $("g-note").textContent = "2以上の数字を入れてください(1人なら、ひとつ前にもどって「1人」を選んでください)";
            inp.focus();
            return;
          }
          v = Math.min(v, 7); // フォームの選択肢は7人まで
        }
        answers[s.input] = isNaN(v) ? 0 : v;
        if (s.next === "pref" && partialStart) { finish(); return; }
        go(s.next);
      });
      choices.appendChild(btn);
      // ソフトキーボードで決定ボタンが隠れないように
      setTimeout(() => { inp.focus(); btn.scrollIntoView({ block: "nearest" }); }, 60);
    } else if (s.select) {
      selectRow.hidden = false;
      const sel = $("g-select");
      if (!sel.options.length) {
        for (const [key, p] of Object.entries(R.prefectures)) {
          const opt = document.createElement("option");
          opt.value = key;
          opt.textContent = p.name;
          sel.appendChild(opt);
        }
      }
      sel.value = answers.pref || $("in-pref").value || "tokyo";
      const btn = mkChoice("これで完了!🎉", true);
      btn.addEventListener("click", () => {
        answers.pref = sel.value;
        finish();
      });
      choices.appendChild(btn);
    } else {
      for (const [label, next, patch] of s.choices) {
        const btn = mkChoice(label, false);
        btn.addEventListener("click", () => {
          Object.assign(answers, patch);
          if (next === "pref" && partialStart) { finish(); return; }
          go(next);
        });
        choices.appendChild(btn);
      }
    }
    // Q1では「もどる」の代わりに逃げ道(やめて自分で入力)を出す
    const back = $("g-back");
    back.hidden = false;
    back.textContent = history.length === 0 ? "× やめる(自分で入力する)" : "← ひとつ前にもどる";
  }

  /* 選択肢は色分けしない。塗るのは決定ボタン(primary)だけ */
  function mkChoice(label, primary) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice" + (primary ? " primary" : "");
    b.textContent = label;
    return b;
  }

  function go(stepKey) {
    history.push(current);
    show(stepKey);
  }

  /* ---------- 完了: フォームに反映して結果へ ---------- */
  function finish() {
    const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
    if ("salary" in answers) { $("in-salary").value = KM.commaFmt(answers.salary); fire($("in-salary"), "input"); }
    if ("bonus" in answers) { $("in-bonus").value = answers.bonus ? KM.commaFmt(answers.bonus) : ""; fire($("in-bonus"), "input"); }
    if ("pref" in answers) { $("in-pref").value = answers.pref; fire($("in-pref"), "change"); }
    if ("dependents" in answers) { $("in-dependents").value = String(answers.dependents); fire($("in-dependents"), "change"); }
    if ("age" in answers) {
      const r = document.querySelector(`input[name="age"][value="${answers.age}"]`);
      r.checked = true; fire(r, "change");
    }
    if ("lastyear" in answers) {
      const r = document.querySelector(`input[name="lastyear"][value="${answers.lastyear}"]`);
      r.checked = true; fire(r, "change");
    }

    // あなた専用バナー(カクテルパーティー効果)
    const parts = [];
    if ("dependents" in answers) parts.push(`扶養${answers.dependents}人`);
    if ("age" in answers) parts.push({ under40: "〜39歳", "40to64": "40〜64歳", over65: "65歳〜" }[answers.age]);
    if (answers.lastyear === "no") parts.push("住民税なし(1年目)");
    if ("pref" in answers) parts.push(R.prefectures[answers.pref].name);
    const banner = $("guide-banner");
    if (banner && parts.length) {
      $("guide-banner-text").textContent = `経理マンがあなた専用に設定しました(${parts.join("・")})`;
      banner.hidden = false;
    }

    close($("guide"), { restoreFocus: false });
    const result = $("result");
    if (!result.hidden) result.scrollIntoView({ behavior: "smooth" });
    else $("in-salary").focus();
  }

  /* ---------- 開閉(スクロールロック・フォーカス管理つき) ---------- */
  const mainEl = document.querySelector("main");
  function open(el) {
    lastFocus = document.activeElement;
    lockedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = "100%";
    el.hidden = false;
    if ("inert" in mainEl) mainEl.inert = true;
    const dialog = el.querySelector(".dialog");
    dialog.focus({ preventScroll: true });
  }
  function close(el, opts) {
    el.hidden = true;
    if ("inert" in mainEl) mainEl.inert = false;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, lockedScrollY);
    const restore = !opts || opts.restoreFocus !== false;
    if (restore && lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function startGuide(fromStep) {
    answers = {};
    history = [];
    partialStart = (fromStep && fromStep !== "salary") ? fromStep : null;
    // フォームに入力済みの値は引き継ぐ(二度打たせない)
    if (!partialStart) {
      const cur = parseInt(KM.digitsOf($("in-salary").value), 10);
      if (cur >= 10000) answers.salary = cur;
      const bonus = parseInt(KM.digitsOf($("in-bonus").value), 10);
      if (bonus > 0) answers.bonus = bonus;
    }
    if ($("welcome") && !$("welcome").hidden) close($("welcome"), { restoreFocus: false });
    open($("guide"));
    show(fromStep || "salary");
  }

  /* ---------- イベント ---------- */
  $("g-back").addEventListener("click", () => {
    if (history.length === 0) {
      close($("guide"));
      $("in-salary").focus();
      return;
    }
    show(history.pop());
  });
  $("cta-guide").addEventListener("click", () => startGuide("salary"));
  $("w-guide").addEventListener("click", () => startGuide("salary"));
  $("w-self").addEventListener("click", () => {
    close($("welcome"), { restoreFocus: false });
    sessionStorage.setItem("km_greeted", "1");
    $("in-salary").focus();
  });
  for (const btn of document.querySelectorAll("[data-guide-start]")) {
    btn.addEventListener("click", () => startGuide(btn.dataset.guideStart));
  }
  // ×ボタン・背景タップ・Escのどれでも閉じられる(閉じ込めない)
  for (const btn of document.querySelectorAll(".dialog-close")) {
    btn.addEventListener("click", () => close(btn.closest(".overlay")));
  }
  for (const ov of document.querySelectorAll(".overlay")) {
    ov.addEventListener("click", (e) => { if (e.target === ov) close(ov); });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("guide").hidden) close($("guide"));
    else if (!$("welcome").hidden) close($("welcome"));
  });

  /* ---------- 初回のご挨拶(共有リンクで来た人には出さない) ---------- */
  const hasParams = new URLSearchParams(location.search).has("m");
  if (!hasParams && !sessionStorage.getItem("km_greeted")) {
    sessionStorage.setItem("km_greeted", "1");
    open($("welcome"));
  }
})();
