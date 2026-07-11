import SwiftUI
import SwiftData

/// AIがタスク・家計・習慣・集中を横断して「今日の作戦」を生成するシート
struct BriefingView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @AppStorage("assistantPersona") private var persona = AssistantPrompts.defaultPersona
    @State private var statusText = "準備中…"
    @State private var result: String?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let result {
                        Text(rendered(result))
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else if let errorMessage {
                        ContentUnavailableView("生成できませんでした", systemImage: "exclamationmark.triangle",
                                               description: Text(errorMessage))
                    } else {
                        VStack(spacing: 16) {
                            ProgressView().controlSize(.large)
                            Text(statusText).font(.subheadline).foregroundStyle(.secondary)
                                .animation(.default, value: statusText)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 80)
                    }
                }
                .padding()
            }
            .navigationTitle("今日のブリーフィング")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("閉じる") { dismiss() } }
                if result != nil {
                    ToolbarItem(placement: .topBarLeading) {
                        ShareLink(item: result ?? "")
                    }
                }
            }
            .task { await generate() }
        }
    }

    private func rendered(_ text: String) -> AttributedString {
        (try? AttributedString(markdown: text,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
        ?? AttributedString(text)
    }

    private func generate() async {
        do {
            let reply = try await ClaudeService.shared.runAgent(
                userMessages: [["role": "user", "content": AssistantPrompts.briefing]],
                system: persona + AssistantPrompts.toolGuidance,
                tools: NexusTools.definitions,
                executeTool: { name, input in
                    await MainActor.run {
                        NexusTools.execute(name: name, input: input, context: context)
                    }
                },
                onStatus: { status in
                    Task { @MainActor in statusText = status }
                }
            )
            result = reply
            Haptics.success()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
