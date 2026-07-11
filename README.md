# Affiliate_Roll — 手取りチェッカー

0円運用の収益化ツールサイト。月収から2026年(令和8年度)の手取り額を計算する。

- **サイト本体**: `site/`(静的HTML/CSS/JS・ビルド不要・依存ゼロ)
- **仕様書**: `docs/`(要件定義・詳細設計・ターゲティング・運用方針・デプロイ手順)

## ローカルで動かす

```bash
cd site && python3 -m http.server 8000
# → http://localhost:8000
```

## テスト(料率・計算をいじったら必須)

```bash
node site/test/test.js
```

## デプロイ

`docs/05_デプロイ手順.md` 参照(Cloudflare Pages / Build output directory = `site`)。

## 年次更新

料率・税制はすべて `site/data/rates2026.js` に集約。毎年2月(協会けんぽ)と12月(税制大綱)にこのファイルだけ更新 → テスト再実行 → push。
