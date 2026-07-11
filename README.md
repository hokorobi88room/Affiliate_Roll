# Nexus — 個人用オールインワン最強アプリ 🚀

AppStore非公開・完全個人利用前提の「パーソナルOS」的 iPhone アプリです。
SwiftUI + SwiftData 製、外部ライブラリ依存ゼロ(Appleフレームワークのみ)なので、
Xcodeさえあれば `project.yml` から即ビルドできます。

## 搭載機能

| 機能 | 内容 |
|---|---|
| 🏠 ダッシュボード | 残タスク・今月支出・今日の集中時間を一望。クイック追加(タスク/ノート/支出)付き |
| ✅ タスク管理 | 優先度・期限・タグ・検索・期限通知・スワイプ操作 |
| 🔥 習慣トラッカー | 7日グリッド・連続日数(ストリーク)・毎日リマインド通知 |
| 📝 ノート | Markdownプレビュー・ピン留め・全文検索・共有 |
| 💴 家計簿 | 収支記録・カテゴリ別ドーナツチャート(Swift Charts)・月送り |
| ✨ AIアシスタント | Claude API 直結のストリーミングチャット。会話履歴保存・性格(システムプロンプト)カスタム可 |
| ⏱ 集中タイマー | ポモドーロ式。セッション自動記録・完了通知・画面スリープ防止 |
| 🔒 アプリロック | Face ID / パスコード(LocalAuthentication) |
| 🗣 Siri / ショートカット | 「Nexusにタスクを追加」「支出を記録」(App Intents) |
| 📱 ホーム画面ウィジェット | Today ウィジェット(small / medium) |
| 💾 バックアップ | 全データをJSONエクスポート(週次再インストール時のデータ保険にも) |

APIキーは **Keychain 保存**、データはすべて端末内(SwiftData)。外部送信は Claude API のみ。

## ビルド手順(Mac)

```bash
brew install xcodegen        # 初回のみ
xcodegen generate            # Nexus.xcodeproj を生成
open Nexus.xcodeproj
```

1. Xcode の Signing & Capabilities で自分の **Personal Team** を選択(Nexus / NexusWidgets 両ターゲット)
2. 実機を選んで ⌘R

初回は iPhone 側で「設定 > 一般 > VPNとデバイス管理」から開発者を信頼してください。

## 7日署名の毎週更新運用

無料の Personal Team 署名は7日で失効しますが、**再ビルドしてもデータは消えません**
(削除せず上書きインストールされる限り SwiftData / Keychain は保持されます)。

- 週1回、iPhoneを繋いで ⌘R するだけでOK
- 自動化したい場合(Macがある前提):
  ```bash
  # 週次で実行するワンライナー(要 ios-deploy or Xcodeスケジュール)
  xcodegen generate && xcodebuild -scheme Nexus -destination 'platform=iOS,name=<あなたのiPhone名>' build
  ```
  これを `launchd` / カレンダーリマインダーに登録
- 保険として設定画面の「JSONバックアップ」を定期的に取っておくと万一の削除にも復元素材が残ります
- 年間 $99 の Apple Developer Program に入れば署名が **1年間** 有効になり、週次更新は不要になります(公開しなくても加入だけでOK)

## AIアシスタントのセットアップ

1. https://console.anthropic.com でAPIキー(sk-ant-…)を発行
2. アプリ内 その他 > 設定 > AIアシスタント にキーを貼り付けて保存
3. AIタブで即チャット可能(ストリーミング対応)

モデルは `ClaudeService.swift` の `model` 引数で変更できます(既定: `claude-sonnet-5`)。

## 構成

```
project.yml                 # XcodeGen 定義(app + widget extension)
Nexus/
  App/                      # エントリポイント・タブ構成・テーマ
  Models/                   # SwiftData モデル(Task/Habit/Note/Transaction/Chat/Focus)
  Core/                     # Keychain・通知・ハプティクス・アプリロック・エクスポート
  Features/
    Dashboard/  Tasks/  Habits/  Notes/  Finance/  Assistant/  Focus/  Settings/
  Intents/                  # Siri / ショートカット(App Intents)
NexusWidgets/               # WidgetKit 拡張
```

## 今後の拡張アイデア

- App Group + 共有SwiftDataでウィジェットに実データ表示
- HealthKit連携(歩数・睡眠をダッシュボードへ)
- iCloud同期(ModelConfigurationにCloudKitを指定するだけ)
- Live Activity で集中タイマーをロック画面に表示
