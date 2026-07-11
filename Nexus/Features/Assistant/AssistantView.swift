import SwiftUI
import SwiftData

struct AssistantView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Conversation.updatedAt, order: .reverse) private var conversations: [Conversation]
    @State private var current: Conversation?
    @State private var input = ""
    @State private var isStreaming = false
    @State private var streamingText = ""
    @State private var errorMessage: String?
    @AppStorage("assistantPersona") private var persona =
        "あなたは私専属の有能なパーソナルアシスタントです。簡潔かつ的確に日本語で答えてください。"

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
                        ContentUnavailableView("なんでも聞いてください",
                                               systemImage: "sparkles",
                                               description: Text("Claude搭載のパーソナルアシスタント"))
                            .padding(.top, 80)
                    }
                    if isStreaming {
                        MessageBubble(role: "assistant",
                                      content: streamingText.isEmpty ? "…" : streamingText)
                            .id("streaming")
                    }
                }
                .padding()
            }
            .onChange(of: streamingText) {
                withAnimation { proxy.scrollTo("streaming", anchor: .bottom) }
            }
        }
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
            .disabled(input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isStreaming)
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

        let history = convo.sortedMessages.map {
            ClaudeService.APIMessage(role: $0.role, content: $0.content)
        }

        isStreaming = true
        streamingText = ""
        Task {
            do {
                for try await chunk in ClaudeService.shared.streamReply(messages: history, system: persona) {
                    streamingText += chunk
                }
                let reply = ChatMessage(role: "assistant", content: streamingText)
                reply.conversation = convo
                context.insert(reply)
                convo.updatedAt = .now
            } catch {
                errorMessage = error.localizedDescription
            }
            isStreaming = false
            streamingText = ""
        }
    }
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
