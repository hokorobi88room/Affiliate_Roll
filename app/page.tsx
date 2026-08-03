const purchaseUrl = "https://note.com/";

const worries = [
  "布団に入ると、今日の会話を何度もやり直してしまう",
  "返信が来ないだけで『何か悪いことをしたかも』と不安になる",
  "SNSを閉じたあと、自分だけが遅れている気がする",
  "人前では『大丈夫』と言えるのに、独りになると急に疲れる",
  "頑張っているのに、自分だけは自分を認めてあげられない",
];

const chapters = [
  {
    number: "00",
    title: "なぜ、同じ出来事が違って見えるのか",
    text: "ひとつのコップから、あなたを苦しめてきた『見え方』の仕組みをほどきます。",
  },
  {
    number: "01",
    title: "なぜ、考えすぎを止められないのか",
    text: "眠れない夜の反省会が始まる理由を知り、自分を責める必要がなかったと理解します。",
  },
  {
    number: "02",
    title: "苦しさを長引かせているものの正体",
    text: "出来事そのものではない、心の奥で握りしめてきたものを見つけます。",
  },
  {
    number: "03",
    title: "感情に飲まれた瞬間の、具体的な戻り方",
    text: "理屈ではなく、涙が止まらない夜や腹が立った瞬間にも使える実践へ進みます。",
  },
  {
    number: "04",
    title: "あなたの色で生きていく",
    text: "元に戻る日も含めて、自分の手で日常を選び直していく方法を身につけます。",
  },
];

const futureScenes = [
  ["仕事の帰り道", "誰かの一言を、家の中まで持ち帰らない。"],
  ["返信を待つ時間", "まだ起きていない最悪の未来を、何度も作らない。"],
  ["うまくできない日", "元に戻っても、また立て直せると知っている。"],
  ["大切な人の前", "自分の穏やかさを、次の人へ手渡していける。"],
];

const faqs = [
  [
    "宗教的な内容ですか？",
    "特定の信仰を勧める内容ではありません。古くから残る考え方を、現代の人間関係や感情の扱い方に置き換えて読み解く実践教材です。",
  ],
  [
    "読むだけで人生が変わりますか？",
    "読むだけで嫌な出来事が消えるとはお約束しません。この教材が渡すのは、出来事が起きたあとに自分を立て直すための考え方と実践方法です。繰り返し使うことで、自分のものにしていく内容です。",
  ],
  [
    "心が弱い私にもできますか？",
    "はい。この教材は、感情をうまく扱えない自分を責めてしまう人のために書かれています。最初から上手にできることを前提にしていません。",
  ],
  [
    "どのくらいの内容ですか？",
    "第0章から第4章までの全5章、53,244文字です。一気に読み切るより、気になった一節へ何度も戻りながら読むことをおすすめしています。",
  ],
  [
    "返金はできますか？",
    "デジタルコンテンツの性質上、購入後の返金には対応していません。内容と価格をご確認のうえでお申し込みください。",
  ],
];

function PurchaseButton({ label, tone = "color" }: { label: string; tone?: "color" | "dark" }) {
  return (
    <div className={`ctaUnit ${tone === "dark" ? "ctaUnitDark" : ""}`}>
      <a className="purchaseButton" href={purchaseUrl} target="_blank" rel="noreferrer">
        <span>{label}</span>
        <b aria-hidden="true">↗</b>
      </a>
      <small>現在は制作確認用の仮リンクです。実際の購入ページには接続されていません。</small>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <img
          className="sceneArtwork heroArtwork"
          src="/lp/hero-woman.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
        />
        <div className="heroAura" aria-hidden="true" />
        <div className="heroGrain" aria-hidden="true" />
        <div className="heroInner">
          <p className="heroKicker">もう、誰かの一言に一日を渡さない。</p>
          <h1>
            この世界は
            <br />
            <em>あなたの色</em>になる
          </h1>
          <p className="heroLead">
            起きたことは変えられない。
            <br />
            けれど、その出来事に
            <br className="mobileOnly" />
            この先まで支配される必要はない。
          </p>

          <div className="heroQuestion">
            <span>QUESTION</span>
            <p>
              なぜ、同じ出来事でも、
              <br />
              すぐ前を向ける人と
              <br className="mobileOnly" />
              何日も引きずる人がいるのか。
            </p>
          </div>

          <div className="heroOffer">
            <div>
              <small>有料note｜全5章・53,244文字</small>
              <strong>
                <span>税込</span>30,000<small>円</small>
              </strong>
            </div>
            <PurchaseButton label="このnoteを手に入れて、答えを知る" tone="dark" />
          </div>
        </div>
        <div className="scrollCue" aria-hidden="true">
          <span>SCROLL</span>
          <i />
        </div>
      </section>

      <section className="confession section">
        <img
          className="sceneArtwork anxietyArtwork"
          src="/lp/anxiety-woman.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <div className="narrow">
          <p className="sectionLabel">DO YOU REMEMBER?</p>
          <h2>
            こんな夜を、
            <br />
            あと何度くり返しますか。
          </h2>
          <p className="introText">
            もう考えても答えは出ない。
            <br />
            そう分かっているのに、頭だけが止まってくれない。
          </p>

          <div className="worryList">
            {worries.map((worry, index) => (
              <div className="worryItem" key={worry}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{worry}</p>
              </div>
            ))}
          </div>

          <div className="quietCopy">
            <p>それでも朝になれば、ちゃんと起きて。</p>
            <p>人前では笑って、「大丈夫」と答えて。</p>
            <p>あなたはずっと、独りで耐えてきたのかもしれません。</p>
          </div>
        </div>
      </section>

      <section className="reframe section">
        <img
          className="sceneArtwork reframeArtwork"
          src="/lp/reframe-woman.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <div className="wide split">
          <div className="reframeIndex" aria-hidden="true">
            01
          </div>
          <div className="reframeCopy">
            <p className="sectionLabel">IT IS NOT YOUR FAULT</p>
            <h2>
              あなたの心が
              <br />
              弱いからではありません。
            </h2>
            <p>
              人の反応が気になることも、嫌な記憶が何度も戻ってくることも、あなたに欠陥がある証拠ではありません。
            </p>
            <p>
              そこには理由があります。理由を知らないまま、「考えすぎる私が悪い」と自分を責め続けてきただけです。
            </p>
            <blockquote>
              あなたは、弱いのではない。
              <br />
              その瞬間に何をすればいいかを、
              <br />
              まだ知らないだけです。
            </blockquote>
          </div>
        </div>
      </section>

      <section className="openLoop section">
        <div className="openLoopGlow" aria-hidden="true" />
        <div className="narrow openLoopInner">
          <p className="sectionLabel sectionLabelGold">THE REAL QUESTION</p>
          <h2>
            では、感情に飲み込まれた
            <br />
            <em>その瞬間</em>、
            <br />
            何をすればいいのか。
          </h2>
          <p>
            「前向きに考えよう」では間に合わない。
            <br />
            涙が止まらない夜にも、腹が立ったその場でも使える、具体的な戻り方があります。
          </p>
          <div className="sealedAnswer">
            <span>THE ANSWER IS INSIDE</span>
            <p>
              その方法は、この教材の中心です。
              <br />
              ここでは、あえて公開しません。
            </p>
          </div>
        </div>
      </section>

      <section className="product section" id="contents">
        <div className="wide">
          <div className="productHead">
            <div>
              <p className="sectionLabel">THE NOTE</p>
              <h2>
                答えを、一冊に。
              </h2>
            </div>
            <p>
              精神論で終わらせない。
              <br />
              感情が動いた瞬間に使うための、
              <br />
              心の実践書です。
            </p>
          </div>

          <div className="productCard">
            <div className="bookCover">
              <span>この世界は</span>
              <strong>
                あなたの色
                <br />
                になる
              </strong>
              <small>世界の見え方を、自分の手に取り戻す</small>
            </div>
            <div className="productFacts">
              <div>
                <strong>5</strong>
                <span>CHAPTERS</span>
              </div>
              <div>
                <strong>53,244</strong>
                <span>CHARACTERS</span>
              </div>
              <div>
                <strong>∞</strong>
                <span>READ AGAIN</span>
              </div>
            </div>
          </div>

          <div className="chapterList">
            {chapters.map((chapter) => (
              <article className="chapter" key={chapter.number}>
                <span>{chapter.number}</span>
                <div>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.text}</p>
                </div>
                <i aria-hidden="true">↘</i>
              </article>
            ))}
          </div>

          <p className="productFootnote">
            ※ここに掲載しているのは、各章で扱う問いだけです。
            <br />
            教材の中心となる実践方法・使う言葉・順番は、本編でお渡しします。
          </p>
        </div>
      </section>

      <section className="future section">
        <div className="wide">
          <p className="sectionLabel">AFTER READING</p>
          <h2>
            嫌なことが消えるのではない。
            <br />
            嫌なことに、明日まで奪われなくなる。
          </h2>
          <div className="futureGrid">
            {futureScenes.map(([where, change], index) => (
              <article key={where}>
                <span>0{index + 1}</span>
                <small>{where}</small>
                <p>{change}</p>
              </article>
            ))}
          </div>
          <div className="futureStatement">
            <p>
              自分の機嫌を、自分で取り戻せる人は、
              <br />
              それだけでもう、誰かを救っています。
            </p>
          </div>
        </div>
      </section>

      <section className="midOffer section" id="purchase">
        <div className="narrow">
          <p className="sectionLabel">A DECISION FOR YOURSELF</p>
          <h2>
            同じ夜をくり返す時間は、
            <br />
            今日も静かに増えていきます。
          </h2>
          <p className="midOfferLead">
            全然必要ないと思ったなら、このページを閉じてください。
            <br />
            でも、「これは今の私のためのものだ」と感じたなら、ここが決断のときです。
          </p>
          <div className="pricePanel">
            <small>有料note｜買い切り</small>
            <strong>
              <span>税込</span>30,000<small>円</small>
            </strong>
            <p>全5章・53,244文字｜何度でも読み返せます</p>
          </div>
          <PurchaseButton label="感情に振り回される毎日を、ここで終わらせる" />
        </div>
      </section>

      <section className="value section">
        <div className="wide valueGrid">
          <div className="valueTitle">
            <p className="sectionLabel">WHY 30,000 YEN?</p>
            <h2>
              安さで選ばれる
              <br />
              教材ではありません。
            </h2>
          </div>
          <div className="valueCopy">
            <p>
              30,000円あれば、本も、食事も、洋服も買えます。だからこそ、この教材は「なんとなく読んで、なんとなく忘れる」ためには作っていません。
            </p>
            <p>
              手に入るのは、一度だけ気分を上げる言葉ではなく、心が乱れるたびに戻ってこられる判断の軸です。
            </p>
            <div className="dailyPrice">
              <span>1年間、日々の道具として使うなら</span>
              <strong>1日あたり 約82円</strong>
              <small>30,000円÷365日で計算した目安です。</small>
            </div>
          </div>
        </div>
      </section>

      <section className="notForYou section">
        <div className="narrow">
          <p className="sectionLabel">NOT FOR EVERYONE</p>
          <h2>この教材を、おすすめしない人。</h2>
          <ul>
            <li>
              <span>×</span>読むだけで、嫌な出来事がすべて消えると思っている人
            </li>
            <li>
              <span>×</span>一度読めば、翌日から別人になれる答えを探している人
            </li>
            <li>
              <span>×</span>自分の心と向き合うための時間を、まったく取りたくない人
            </li>
          </ul>
          <div className="forYou">
            <span>けれど</span>
            <p>
              何度戻っても、また自分で立て直せるようになりたい。
              <br />
              そう思う人には、最後まで受け取ってほしい内容です。
            </p>
          </div>
        </div>
      </section>

      <section className="faq section">
        <img
          className="sceneArtwork faqArtwork"
          src="/lp/faq-woman.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <div className="narrow">
          <p className="sectionLabel">QUESTIONS</p>
          <h2>購入前に、気になること。</h2>
          <div className="faqList">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  <span>{question}</span>
                  <b aria-hidden="true">＋</b>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="finalOffer section">
        <img
          className="sceneArtwork finalArtwork"
          src="/lp/final-woman.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <div className="finalCanvas" aria-hidden="true" />
        <div className="narrow finalInner">
          <p className="sectionLabel">THE REST IS YOURS</p>
          <h2>
            強い人だけが、
            <br />
            前を向けるのではありません。
          </h2>
          <p>
            その人は、感情が動いたあとに
            <br />
            何をすればいいかを知っています。
          </p>
          <p className="finalTruth">
            あなたは、その方法を
            <br />
            まだ知らないだけです。
          </p>
          <div className="finalTitle">
            <small>有料note｜税込30,000円</small>
            <strong>
              この世界を、
              <br />
              あなたの色にする。
            </strong>
          </div>
          <PurchaseButton label="『この世界はあなたの色になる』を手に入れる" tone="dark" />
        </div>
      </section>

      <footer>
        <div className="wide footerInner">
          <p>この世界はあなたの色になる</p>
          <div>
            <a href="#">特定商取引法に基づく表記</a>
            <a href="#">プライバシーポリシー</a>
          </div>
          <small>© 2026 HOKOROBI ROOM</small>
        </div>
      </footer>
    </main>
  );
}
