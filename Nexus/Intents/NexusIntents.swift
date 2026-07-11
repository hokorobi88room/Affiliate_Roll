import AppIntents
import SwiftData

/// Siri・ショートカット連携: 「Hey Siri, Nexusにタスク追加」などが可能になる
struct AddTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "タスクを追加"
    static var description = IntentDescription("Nexusに新しいタスクを追加します")

    @Parameter(title: "タスク名")
    var taskTitle: String

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let context = NexusApp.sharedModelContainer.mainContext
        context.insert(TaskItem(title: taskTitle))
        try context.save()
        return .result(dialog: "タスク「\(taskTitle)」を追加しました")
    }
}

struct AddExpenseIntent: AppIntent {
    static var title: LocalizedStringResource = "支出を記録"
    static var description = IntentDescription("Nexusの家計簿に支出を記録します")

    @Parameter(title: "金額(円)")
    var amount: Int

    @Parameter(title: "カテゴリ", default: "その他")
    var category: String

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let context = NexusApp.sharedModelContainer.mainContext
        context.insert(Transaction(amount: Decimal(amount), kind: .expense, category: category))
        try context.save()
        return .result(dialog: "\(category)に¥\(amount)を記録しました")
    }
}

struct NexusShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddTaskIntent(),
            phrases: ["\(.applicationName)にタスクを追加"],
            shortTitle: "タスク追加",
            systemImageName: "checklist"
        )
        AppShortcut(
            intent: AddExpenseIntent(),
            phrases: ["\(.applicationName)に支出を記録"],
            shortTitle: "支出記録",
            systemImageName: "yensign.circle"
        )
    }
}
