const lessons = [
  ["第一章", "世界の見方をほどく", "無常・縁起・中庸。東洋思想の地図を、今日の悩みに使える言葉で読み解きます。"],
  ["第二章", "欲望との距離を選ぶ", "足るを知ることは、諦めではありません。焦りに追われず望みを育てる方法を学びます。"],
  ["第三章", "人間関係に余白をつくる", "他者を変えず、自分をすり減らさない。境界線と慈しみを両立する実践です。"],
  ["第四章", "日々を小さく整える", "朝・仕事・夜の所作に思想を宿し、静かな手応えを積み重ねる習慣を設計します。"],
];

const voices = [
  ["会社員・34歳", "答えを急がなくなったら、仕事も人間関係も不思議と進み始めました。読み返すたび、今の自分に必要な一節が見つかります。"],
  ["個人事業主・42歳", "精神論ではなく、生活の選び方まで落とし込まれている。『減らす』ことで前に進める感覚を初めて持てました。"],
];

export default function Home() {
  return (
    <main>
      <header className="nav shell">
        <a className="brand" href="#top" aria-label="ページ上部へ">世界観<span>SEKAIKAN</span></a>
        <nav aria-label="メインナビゲーション">
          <a href="#about">この教材について</a>
          <a href="#contents">内容</a>
          <a className="navCta" href="#purchase">noteで読む</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="heroMark" aria-hidden="true">観</div>
        <div className="shell heroInner">
          <p className="eyebrow">東洋思想から学ぶ、人生の整え方</p>
          <h1>この世界は<br /><em>あなたの世界</em>になる</h1>
          <p className="lead">外側を変える前に、世界を見る「眼」を変える。<br />古の知恵を、いまを生きるあなたの実践へ。</p>
          <a className="primary" href="#purchase">教材の内容を見る <span>→</span></a>
          <div className="heroNote"><span>有料note教材</span><strong>¥30,000</strong><small>税込・買い切り</small></div>
        </div>
        <div className="scroll">SCROLL <i /></div>
      </section>

      <section className="intro shell" id="about">
        <div className="verticalTitle">豊かさは、<br />すでにここにある。</div>
        <div className="introCopy">
          <p className="sectionNo">01　PHILOSOPHY</p>
          <h2>手に入れる人生から、<br />味わう人生へ。</h2>
          <p>もっと成果を。もっと正解を。もっと誰かに認められたい——。私たちは「足りない」という感覚に動かされ、目の前にある豊かさを見落とします。</p>
          <p>本教材は、老荘思想・禅・仏教などに流れる知恵を、現代の仕事、人間関係、暮らしに接続するための実践書です。思想を知識で終わらせず、あなた自身の世界の見方へと育てます。</p>
          <blockquote>「世界」は、出来事の集まりではない。<br />あなたが何を見出すかによって、立ち現れるものだ。</blockquote>
        </div>
      </section>

      <section className="fit">
        <div className="shell">
          <p className="sectionNo light">02　FOR YOU</p>
          <h2>こんなあなたへ</h2>
          <div className="fitGrid">
            {[
              ["一", "頑張っているのに、満たされない"],
              ["二", "他人の評価に、心が揺れてしまう"],
              ["三", "自分らしい選択の軸を持ちたい"],
              ["四", "忙しさのなかでも、静けさを取り戻したい"],
            ].map(([n, text]) => <div className="fitCard" key={n}><span>{n}</span><p>{text}</p></div>)}
          </div>
          <p className="fitEnd">答えを渡すのではなく、<br />あなたの中にある答えの見つけ方を。</p>
        </div>
      </section>

      <section className="curriculum shell" id="contents">
        <div className="sectionHead">
          <div><p className="sectionNo">03　CONTENTS</p><h2>学びの内容</h2></div>
          <p>全4章・約80,000字<br />ワークシート付き</p>
        </div>
        <div className="lessonList">
          {lessons.map(([no, title, text]) => (
            <article className="lesson" key={no}>
              <span>{no}</span><h3>{title}</h3><p>{text}</p><b aria-hidden="true">↘</b>
            </article>
          ))}
        </div>
      </section>

      <section className="included">
        <div className="shell includedGrid">
          <div className="book" aria-label="教材のイメージ"><div><small>東洋思想から学ぶ<br />人生の整え方</small><strong>この世界は<br />あなたの世界になる</strong><span>世界観</span></div></div>
          <div className="includedCopy">
            <p className="sectionNo light">04　INCLUDED</p>
            <h2>購入後、すぐに<br />始められます。</h2>
            <ul>
              <li><b>01</b><span><strong>本編テキスト</strong>スマートフォン・PCでいつでも閲覧</span></li>
              <li><b>02</b><span><strong>実践ワークシート</strong>各章の気づきを生活に落とすPDF</span></li>
              <li><b>03</b><span><strong>音声ガイド</strong>朝と夜に聴く、10分間の内省習慣</span></li>
              <li><b>04</b><span><strong>無期限アップデート</strong>購入後の追補コンテンツも追加料金なし</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="voices shell">
        <p className="sectionNo">05　VOICES</p><h2>読者の声</h2>
        <div className="voiceGrid">{voices.map(([who, quote]) => <figure key={who}><div className="stars">★★★★★</div><blockquote>“{quote}”</blockquote><figcaption>{who} <span>※個人の感想です</span></figcaption></figure>)}</div>
      </section>

      <section className="purchase" id="purchase">
        <div className="purchaseCircle" aria-hidden="true" />
        <div className="shell purchaseInner">
          <p className="eyebrow">今日から、世界の見方を変える。</p>
          <h2>この世界は<br /><em>あなたの世界</em>になる</h2>
          <p>有料note教材｜全4章＋特典</p>
          <div className="price"><small>一括価格（税込）</small><strong><span>¥</span>30,000</strong></div>
          <a className="buy" href="https://note.com/" target="_blank" rel="noreferrer">noteで購入する <span>↗</span></a>
          <small className="safe">noteの決済ページへ移動します ｜ クレジットカード・各種決済対応</small>
        </div>
      </section>

      <section className="faq shell">
        <p className="sectionNo">06　FAQ</p><h2>よくある質問</h2>
        {[
          ["東洋思想の知識がなくても読めますか？", "はい。専門用語は日常の具体例とともに丁寧に解説しています。初めて触れる方を想定した内容です。"],
          ["どのくらいの期間で取り組めますか？", "1日20〜30分で、4週間を目安に進められます。自分のペースで何度でも読み返せます。"],
          ["返金はできますか？", "デジタルコンテンツの性質上、購入後の返金には対応していません。内容をご確認のうえご購入ください。"],
        ].map(([q,a]) => <details key={q}><summary>{q}<span>＋</span></summary><p>{a}</p></details>)}
      </section>

      <footer><div className="shell"><div className="brand inverse">世界観<span>SEKAIKAN</span></div><p>思想を、日々の選択へ。</p><div><a href="#">特定商取引法に基づく表記</a><a href="#">プライバシーポリシー</a></div><small>© 2026 SEKAIKAN. All rights reserved.</small></div></footer>
    </main>
  );
}
