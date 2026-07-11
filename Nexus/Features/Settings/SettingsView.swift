import SwiftUI
import SwiftData

struct SettingsView: View {
    @AppStorage("accentColorName") private var accentColorName = "indigo"
    @AppStorage("appLockEnabled") private var appLockEnabled = false
    @AppStorage("assistantPersona") private var persona =
        "あなたは私専属の有能なパーソナルアシスタントです。簡潔かつ的確に日本語で答えてください。"
    @State private var apiKey = ""
    @State private var apiKeySaved = false
    @State private var exportURL: URL?
    @Environment(\.modelContext) private var context

    var body: some View {
        Form {
            Section("外観") {
                Picker("アクセントカラー", selection: $accentColorName) {
                    ForEach(Theme.allNames, id: \.self) { name in
                        HStack {
                            Circle().fill(Theme.color(named: name)).frame(width: 16, height: 16)
                            Text(name)
                        }.tag(name)
                    }
                }
            }

            Section("セキュリティ") {
                Toggle("Face ID / パスコードでロック", isOn: $appLockEnabled)
            }

            Section {
                SecureField("Claude API キー (sk-ant-…)", text: $apiKey)
                Button(apiKeySaved ? "保存済み ✓" : "APIキーを保存") {
                    KeychainHelper.save(key: "claude_api_key", value: apiKey)
                    apiKeySaved = true
                    Haptics.success()
                }
                .disabled(apiKey.isEmpty)
            } header: {
                Text("AIアシスタント")
            } footer: {
                Text("キーはKeychainに暗号化保存され、端末外には送信されません(Anthropic APIへの通信を除く)。")
            }

            Section("AIの性格(システムプロンプト)") {
                TextEditor(text: $persona).frame(minHeight: 100)
            }

            Section("データ") {
                Button {
                    exportURL = DataExporter.exportAll(context: context)
                } label: {
                    Label("全データをJSONでバックアップ", systemImage: "square.and.arrow.up")
                }
                if let exportURL {
                    ShareLink(item: exportURL) {
                        Label("バックアップを共有", systemImage: "doc.zipper")
                    }
                }
            }

            Section("情報") {
                LabeledContent("バージョン", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "-")
                LabeledContent("再署名期限の目安", value: "インストールから7日")
            }
        }
        .navigationTitle("設定")
        .onAppear {
            apiKeySaved = KeychainHelper.load(key: "claude_api_key")?.isEmpty == false
        }
    }
}
