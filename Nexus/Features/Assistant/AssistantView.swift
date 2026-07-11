import SwiftUI
import SwiftData

struct AssistantView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Conversation.updatedAt, order: .reverse) private var conversations: [Conversation]
    @State private var current: Conversation?
    @State private var input = ""
    @State private var isWorking = false
    @State private var statusText = ""
    @State private var errorMessage: String?
    @AppStorage("assistantPersona") private var persona = AssistantPrompts.defaultPersona

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                messagesList
                inputBar
            }
            .navigationTitle(current?.title ?? "AIアシスタント")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { historyMenu }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { current = nil } label: { Image(systemName: "square.and.pencil") }
                }
            }
            .alert("エラー", isPresented: .constant(errorMessage != nil)) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private var suggestions: [String] {
        ["今日の状況を教えて", "今月何に使いすぎてる?", "期限切れのタスクを整理して", "習慣の調子はどう?"]
    }

    private var historyMenu: some View {
        Menu {
            ForEach(conversations.prefix(20)) { convo in
                Button(convo.title) { current = convo }
            }
            if !conversations.isEmpty {
                Divider()
                Button(role: .destructive) {
                    conversations.forEach { context.delete($0) }
                    current = nil
                } label: { Label("履歴を全削除", systemImage: "trash") }
            }
        } label: {
            Image(systemName: "clock.arrow.circlepath")
        }
    }

    private var messagesList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    if let current {
                        ForEach(current.sortedMessages) { msg in
                            MessageBubble(role: msg.role, content: msg.content)
                        }
                    } else {
                        emptyState
                    }
                    if isWorking {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text(statusText.isEmpty ? "考え中…" : statusText)
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                        .id("working")
                    }
                }
                .padding()
            }
            .onChange(of: statusText) {
                withAnimation { proxy.scrollTo("working", anchor: .bottom) }
            }
            .onChange(of: current?.messages.count) {
                if let last = current?.sortedMessages.last {
                    withAnimation { proxy.scrollTo(last.persistentModelID, anchor: .bottom) }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "sparkles").font(.system(size: 44)).foregroundStyle(.tint)
            Text("アプリの中身がわかるアシスタント").font(.headline)
            Text("タスク・家計・習慣・ノートを読み書きできます").font(.caption).foregroundStyle(.secondary)
            VStack(spacing: 8) {
                ForEach(suggestions, id: \.self) { text in
                    Button {
                        input = text
                        send()
                    } label: {
                        Text(text)
                            .font(.subheadline)
                            .padding(.horizontal, 14).padding(.vertical, 8)
                            .background(.thinMaterial, in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.top, 40)
    }

    private var inputBar: some View {
        HStack(spacing: 8) {
            TextField("メッセージ…", text: $input, axis: .vertical)
                .lineLimit(1...5)
                .padding(10)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20))
            Button {
                send()
            } label: {
                Image(systemName: "arrow.up.circle.fill").font(.system(size: 32))
            }
            .disabled(input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isWorking)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.bar)
    }

    private func send() {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        input = ""

        let convo: Conversation
        if let current {
            convo = current
        } else {
            convo = Conversation(title: String(text.prefix(24)))
            context.insert(convo)
            current = convo
        }
        let userMsg = ChatMessage(role: "user", content: text)
        userMsg.conversation = convo
        context.insert(userMsg)
        convo.updatedAt = .now

        let history: [[String: Any]] = convo.sortedMessages.map {
            ["role": $0.role, "content": $0.content]
        }

        isWorking = true
        statusText = ""
        Task {
            do {
                let reply = try await ClaudeService.shared.runAgent(
                    userMessages: history,
                    system: persona + AssistantPrompts.toolGuidance,
                    tools: NexusTools.definitions,
                    executeTool: { name, toolInput in
                        await MainActor.run {
                            NexusTools.execute(name: name, input: toolInput, context: context)
                        }
                    },
                    onStatus: { status in
                        Task { @MainActor in statusText = status }
                    }
                )
                let assistantMsg = ChatMessage(role: "assistant",
                                               content: reply.isEmpty ? "(応答なし)" : reply)
                assistantMsg.conversation = convo
                context.insert(assistantMsg)
                convo.updatedAt = .now
            } catch {
                errorMessage = error.localizedDescription
            }
            isWorking = false
            statusText = ""
        }
    }
}

enum AssistantPrompts {
    static let defaultPersona =
        "あなたは私専属の有能なパーソナルアシスタントです。簡潔かつ的確に日本語で答えてください。"

    static let toolGuidance = """


    あなたはユーザーのパーソナル管理アプリ「Nexus」に組み込まれており、\
    ツールでタスク・家計簿・習慣・ノートを直接読み書きできます。\
    質問に答える前に必要なデータをツールで確認し、推測でなく実データに基づいて答えること。\
    書き込み系ツールは実行後に何をしたか一言で報告すること。\
    金額は「1,234円」のように読みやすく整形すること。
    """

    static let briefing = """
    今日のブリーフィングを作成してください。手順:
    1. get_overviewで全体を把握
    2. list_tasks(today)とlist_tasks(overdue)で今日やるべきことを確認
    3. habits_statusで習慣を確認
    4. finance_summary(0)で今月の家計を確認
    その上で、以下の構成で簡潔にまとめて:
    ## 今日の作戦
    (最優先事項2〜3個)
    ## 注意
    (期限切れ・使いすぎ・途切れそうな習慣などの警告。なければ省略)
    ## ひとこと
    (前向きな一言)
    """
}

struct MessageBubble: View {
    let role: String
    let content: String

    var body: some View {
        HStack {
            if role == "user" { Spacer(minLength: 40) }
            Text(rendered)
                .textSelection(.enabled)
                .padding(12)
                .background(role == "user" ? Color.accentColor.opacity(0.85) : Color.gray.opacity(0.15),
                            in: RoundedRectangle(cornerRadius: 16))
                .foregroundStyle(role == "user" ? .white : .primary)
            if role != "user" { Spacer(minLength: 40) }
        }
    }

    private var rendered: AttributedString {
        (try? AttributedString(markdown: content,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
        ?? AttributedString(content)
    }
}
