import SwiftUI
import SwiftData

/// どこからでも1画面でタスク・ノート・支出を即記録
struct QuickCaptureView: View {
    enum Mode: String, CaseIterable { case task = "タスク", note = "ノート", expense = "支出" }

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var mode: Mode = .task
    @State private var text = ""
    @State private var amount = ""
    @State private var category = Transaction.expenseCategories[0]
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Picker("種類", selection: $mode) {
                    ForEach(Mode.allCases, id: \.self) { Text($0.rawValue) }
                }
                .pickerStyle(.segmented)

                if mode == .expense {
                    TextField("金額", text: $amount)
                        .keyboardType(.numberPad)
                        .font(.largeTitle.bold())
                        .multilineTextAlignment(.center)
                        .focused($focused)
                    Picker("カテゴリ", selection: $category) {
                        ForEach(Transaction.expenseCategories, id: \.self) { Text($0) }
                    }
                    .pickerStyle(.navigationLink)
                    TextField("メモ(任意)", text: $text)
                        .textFieldStyle(.roundedBorder)
                } else {
                    TextField(mode == .task ? "何をする?" : "メモを書く…", text: $text, axis: .vertical)
                        .lineLimit(3...8)
                        .textFieldStyle(.roundedBorder)
                        .focused($focused)
                }
                Spacer()
            }
            .padding()
            .navigationTitle("クイック追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { save() }.disabled(!canSave)
                }
            }
            .onAppear { focused = true }
        }
        .presentationDetents([.medium])
    }

    private var canSave: Bool {
        switch mode {
        case .expense: return Decimal(string: amount) != nil
        default: return !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    private func save() {
        switch mode {
        case .task:
            context.insert(TaskItem(title: text))
        case .note:
            let lines = text.split(separator: "\n", maxSplits: 1).map(String.init)
            context.insert(Note(title: lines.first ?? "無題", body: lines.count > 1 ? lines[1] : text))
        case .expense:
            if let value = Decimal(string: amount) {
                context.insert(Transaction(amount: value, kind: .expense, category: category, memo: text))
            }
        }
        Haptics.success()
        dismiss()
    }
}
