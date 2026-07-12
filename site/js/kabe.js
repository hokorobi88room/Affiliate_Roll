/* あなたの経理マン@綻流夢 — 扶養の壁 診断(kabe.html 専用・ページ内インライン)
   原則: 1画面1質問・選択肢は常に2つ・選択肢に色の優劣をつけない(guide.js と同じ作法)。
   すべて端末内で完結し、入力内容はどこにも送信・保存されない。 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  /* ---------- 質問ツリー(選択肢は必ず2つ) ---------- */
  const STEPS = {
    q1: {
      no: 1,
      q: "配偶者(夫・妻)の扶養に入っていますか?",
      note: "親の扶養に入っている方・自分が世帯主の方は「いいえ」を選んでください",
      choices: [
        ["はい(配偶者の扶養)", "q2", { spouse: true }],
        ["いいえ(親の扶養・自分が世帯主など)", "q2", { spouse: false }],
      ],
    },
    q2: {
      no: 2,
      q: "勤め先の従業員は51人以上ですか?",
      note: "会社の大きさで、勤め先の社会保険に入る基準が変わります。だいたいの感覚でOK",
      choices: [
        ["51人以上", "q3", { big: true }],
        ["50人以下・わからない", "q3", { big: false }],
      ],
    },
    q3: {
      no: 3,
      q: "週20時間以上働いていますか?(契約上)",
      note: "雇用契約書やシフトの取り決めで決まっている時間です。一時的な残業は数えません",
      choices: [
        ["はい(週20時間以上)", "result", { h20: true }],
        ["いいえ(週20時間未満)", "result", { h20: false }],
      ],
    },
  };
  const TOTAL = 3;

  /* ---------- 状態 ---------- */
  let answers = {};
  let history = [];
  let current = null;

  const quizCard = $("kabe-quiz");
  const resultCard = $("k-result");

  /* ---------- 判定 ----------
     週20時間以上 かつ 従業員51人以上 → 第一の壁 106万円(勤め先の社会保険)
     上の条件を満たさない場合          → 第一の壁 130万円(社会保険の扶養)
     配偶者の扶養かどうか(Q1)は、税金の説明(配偶者控除/扶養控除)だけを切り替える */
  function judge(a) {
    return (a.big && a.h20) ? 106 : 130;
  }

  /* 選択肢は色分けしない(どちらを選んでも対等) */
  function mkChoice(label) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.textContent = label;
    return b;
  }

  /* ---------- 質問の描画 ---------- */
  function show(stepKey) {
    const s = STEPS[stepKey];
    current = stepKey;
    resultCard.hidden = true;
    quizCard.hidden = false;
    $("k-progress").textContent = `Q${s.no} / ${TOTAL}`;
    $("k-q").textContent = s.q;
    $("k-note").textContent = s.note || "";

    const choices = $("k-choices");
    choices.innerHTML = "";
    for (const [label, next, patch] of s.choices) {
      const btn = mkChoice(label);
      btn.addEventListener("click", () => {
        Object.assign(answers, patch);
        history.push(current);
        if (next === "result") showResult();
        else show(next);
      });
      choices.appendChild(btn);
    }
    $("k-back").hidden = history.length === 0;
  }

  /* ---------- 結果の描画 ---------- */
  function showResult() {
    const first = judge(answers);
    current = "result";
    quizCard.hidden = true;
    resultCard.hidden = false;

    $("k-num").innerHTML = `${first}<small>万円</small>`;
    $("k-sub").textContent = first === 106
      ? "勤め先の社会保険に入るライン(従業員51人以上の会社で、週20時間以上働く方)"
      : "配偶者や親の社会保険の扶養から外れるライン(全国共通)";

    /* 経理マンのリアクション(言い切り+安心) */
    $("k-react").innerHTML = first === 106
      ? "年収106万円をこえると、勤め先の社会保険に入って、手取りが一気に減るゾーンに入ります。106万円までは気にせず働いてOKです。<small>※2026年10月からは「月収8.8万円以上」という金額の条件がなくなる予定です。以後は週20時間以上働くかどうかで決まります</small>"
      : "年収130万円をこえると、社会保険の扶養から外れて、手取りが一気に減るゾーンに入ります。130万円までは気にせず働いてOKです。<small>※2026年4月から、一時的な残業でこえた分では外れません(雇用契約書の金額で判定されます)</small>";

    /* あなたに関係する壁だけの小さな表 */
    const rows = [["約100万円", "住民税がかかり始める", false]];
    if (first === 106) {
      rows.push(["106万円", "勤め先の社会保険に入る(あなたの第一の壁)", true]);
    } else {
      rows.push(["130万円", "社会保険の扶養から外れる(あなたの第一の壁)", true]);
    }
    if (answers.spouse) {
      rows.push(["136万円", "税の扶養に入れる上限(夫・妻の税金が安くなる)", false]);
      rows.push(["169万円", "夫・妻の税金の割引が満額のまま働ける上限", false]);
      rows.push(["178万円", "あなた自身に所得税がかかり始める", false]);
      rows.push(["207万円", "夫・妻の税金の割引が完全になくなる", false]);
    } else {
      rows.push(["136万円", "税の扶養に入れる上限(親など家族の税金が安くなる)", false]);
      rows.push(["178万円", "あなた自身に所得税がかかり始める", false]);
    }
    const tbody = $("k-walls");
    tbody.innerHTML = "";
    for (const [wall, what, you] of rows) {
      const tr = document.createElement("tr");
      if (you) tr.className = "you";
      const td1 = document.createElement("td");
      td1.textContent = wall;
      const td2 = document.createElement("td");
      td2.textContent = what;
      tr.append(td1, td2);
      tbody.appendChild(tr);
    }

    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- もどる(質問・結果のどちらからでも) ---------- */
  function goBack() {
    if (history.length === 0) return;
    const fromResult = !resultCard.hidden;
    show(history.pop());
    if (fromResult) quizCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("k-back").addEventListener("click", goBack);
  $("k-again").addEventListener("click", goBack);

  show("q1");
})();
