import Foundation
import SwiftData

/// AIエージェントに公開するアプリ内ツール群。
/// Claudeがこれらを呼び出してタスク・家計・習慣・ノートを直接読み書きする。
@MainActor
enum NexusTools {

    // MARK: - ツール定義(Claude APIのtoolsパラメータ)

    static let definitions: [[String: Any]] = [
        [
            "name": "get_overview",
            "description": "今日の全体状況(未完了タスク数、今月の収支、習慣の達成状況、今日の集中時間)を取得する。まず状況把握したいときに呼ぶ。",
            "input_schema": ["type": "object", "properties": [:] as [String: Any]]
        ],
        [
            "name": "list_tasks",
            "description": "タスク一覧を取得する。filter: 'active'(未完了) / 'today'(今日期限) / 'overdue'(期限切れ) / 'done'(完了済み)",
            "input_schema": [
                "type": "object",
                "properties": ["filter": ["type": "string", "enum": ["active", "today", "overdue", "done"]]],
                "required": ["filter"]
            ]
        ],
        [
            "name": "add_task",
            "description": "新しいタスクを追加する。期限はISO8601形式(例 2026-07-12T18:00:00+09:00)。priorityは0=低,1=中,2=高,3=至急",
            "input_schema": [
                "type": "object",
                "properties": [
                    "title": ["type": "string"],
                    "due": ["type": "string", "description": "ISO8601期限(任意)"],
                    "priority": ["type": "integer", "minimum": 0, "maximum": 3]
                ],
                "required": ["title"]
            ]
        ],
        [
            "name": "complete_task",
            "description": "タイトルの部分一致でタスクを完了にする",
            "input_schema": [
                "type": "object",
                "properties": ["title_query": ["type": "string"]],
                "required": ["title_query"]
            ]
        ],
        [
            "name": "finance_summary",
            "description": "指定月の収支サマリーとカテゴリ別支出を取得。month_offset: 0=今月, -1=先月",
            "input_schema": [
                "type": "object",
                "properties": ["month_offset": ["type": "integer"]],
                "required": ["month_offset"]
            ]
        ],
        [
            "name": "add_expense",
            "description": "支出を記録する。カテゴリ: 食費/外食/日用品/交通/住居/通信/娯楽/医療/衣服/その他",
            "input_schema": [
                "type": "object",
                "properties": [
                    "amount": ["type": "integer", "description": "金額(円)"],
                    "category": ["type": "string"],
                    "memo": ["type": "string"]
                ],
                "required": ["amount", "category"]
            ]
        ],
        [
            "name": "habits_status",
            "description": "全習慣の今日の達成状況と連続日数を取得",
            "input_schema": ["type": "object", "properties": [:] as [String: Any]]
        ],
        [
            "name": "log_habit",
            "description": "名前の部分一致で習慣を今日達成として記録する",
            "input_schema": [
                "type": "object",
                "properties": ["name_query": ["type": "string"]],
                "required": ["name_query"]
            ]
        ],
        [
            "name": "create_note",
            "description": "ノートを作成する",
            "input_schema": [
                "type": "object",
                "properties": ["title": ["type": "string"], "body": ["type": "string"]],
                "required": ["title", "body"]
            ]
        ],
        [
            "name": "search_notes",
            "description": "ノートをキーワード検索して内容を取得",
            "input_schema": [
                "type": "object",
                "properties": ["query": ["type": "string"]],
                "required": ["query"]
            ]
        ]
    ]

    static func statusLabel(for name: String) -> String {
        switch name {
        case "get_overview": return "📊 全体状況を確認中…"
        case "list_tasks": return "📋 タスクを確認中…"
        case "add_task": return "✏️ タスクを追加中…"
        case "complete_task": return "✅ タスクを完了に…"
        case "finance_summary": return "💴 家計を集計中…"
        case "add_expense": return "💸 支出を記録中…"
        case "habits_status": return "🔥 習慣を確認中…"
        case "log_habit": return "🔥 習慣を記録中…"
        case "create_note": return "📝 ノートを作成中…"
        case "search_notes": return "🔍 ノートを検索中…"
        default: return "⚙️ 実行中…"
        }
    }

    // MARK: - 実行

    static func execute(name: String, input: [String: Any], context: ModelContext) -> String {
        do {
            switch name {
            case "get_overview": return try overview(context)
            case "list_tasks": return try listTasks(filter: input["filter"] as? String ?? "active", context)
            case "add_task": return try addTask(input, context)
            case "complete_task": return try completeTask(query: input["title_query"] as? String ?? "", context)
            case "finance_summary": return try financeSummary(offset: input["month_offset"] as? Int ?? 0, context)
            case "add_expense": return try addExpense(input, context)
            case "habits_status": return try habitsStatus(context)
            case "log_habit": return try logHabit(query: input["name_query"] as? String ?? "", context)
            case "create_note": return try createNote(input, context)
            case "search_notes": return try searchNotes(query: input["query"] as? String ?? "", context)
            default: return "エラー: 未知のツール \(name)"
            }
        } catch {
            return "エラー: \(error.localizedDescription)"
        }
    }

    private static let dueFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static func overview(_ context: ModelContext) throws -> String {
        let tasks = try context.fetch(FetchDescriptor<TaskItem>())
        let habits = try context.fetch(FetchDescriptor<Habit>())
        let txs = try context.fetch(FetchDescriptor<Transaction>())
        let focus = try context.fetch(FetchDescriptor<FocusSession>())
        let cal = Calendar.current

        let active = tasks.filter { !$0.isDone }
        let overdue = active.filter { ($0.dueDate ?? .distantFuture) < .now }
        let monthTx = txs.filter { cal.isDate($0.date, equalTo: .now, toGranularity: .month) }
        let expense = monthTx.filter { $0.kind == .expense }.reduce(Decimal(0)) { $0 + $1.amount }
        let income = monthTx.filter { $0.kind == .income }.reduce(Decimal(0)) { $0 + $1.amount }
        let habitsDone = habits.filter { $0.isLogged(on: .now) }.count
        let focusToday = focus.filter { cal.isDateInToday($0.startedAt) }.reduce(0) { $0 + $1.durationMinutes }

        return """
        未完了タスク: \(active.count)件(うち期限切れ \(overdue.count)件)
        今月の支出: \(expense)円 / 収入: \(income)円
        習慣: \(habitsDone)/\(habits.count) 達成済み(今日)
        今日の集中時間: \(focusToday)分
        現在日時: \(Date.now.formatted(.iso8601))
        """
    }

    private static func listTasks(filter: String, _ context: ModelContext) throws -> String {
        let tasks = try context.fetch(FetchDescriptor<TaskItem>())
        let cal = Calendar.current
        let filtered: [TaskItem]
        switch filter {
        case "today":
            filtered = tasks.filter { !$0.isDone && $0.dueDate.map { cal.isDateInToday($0) } == true }
        case "overdue":
            filtered = tasks.filter { !$0.isDone && ($0.dueDate ?? .distantFuture) < .now }
        case "done":
            filtered = tasks.filter(\.isDone).suffix(20).map { $0 }
        default:
            filtered = tasks.filter { !$0.isDone }
        }
        if filtered.isEmpty { return "該当タスクなし" }
        return filtered.map { task in
            let due = task.dueDate.map { " 期限:" + $0.formatted(.dateTime.month().day().hour().minute()) } ?? ""
            return "- \(task.title) [優先度:\(task.priority.label)]\(due)"
        }.joined(separator: "\n")
    }

    private static func addTask(_ input: [String: Any], _ context: ModelContext) throws -> String {
        guard let title = input["title"] as? String, !title.isEmpty else { return "エラー: title必須" }
        let due = (input["due"] as? String).flatMap { dueFormatter.date(from: $0) }
        let priority = TaskPriority(rawValue: input["priority"] as? Int ?? 1) ?? .normal
        context.insert(TaskItem(title: title, priority: priority, dueDate: due))
        try context.save()
        return "タスク「\(title)」を追加しました"
    }

    private static func completeTask(query: String, _ context: ModelContext) throws -> String {
        let tasks = try context.fetch(FetchDescriptor<TaskItem>())
        guard let task = tasks.first(where: { !$0.isDone && $0.title.localizedCaseInsensitiveContains(query) }) else {
            return "「\(query)」に一致する未完了タスクが見つかりません"
        }
        task.isDone = true
        task.completedAt = .now
        try context.save()
        return "タスク「\(task.title)」を完了にしました"
    }

    private static func financeSummary(offset: Int, _ context: ModelContext) throws -> String {
        let txs = try context.fetch(FetchDescriptor<Transaction>())
        let cal = Calendar.current
        guard let month = cal.date(byAdding: .month, value: offset, to: .now) else { return "エラー" }
        let monthTx = txs.filter { cal.isDate($0.date, equalTo: month, toGranularity: .month) }
        if monthTx.isEmpty { return "この月の記録はありません" }
        let expense = monthTx.filter { $0.kind == .expense }
        let income = monthTx.filter { $0.kind == .income }.reduce(Decimal(0)) { $0 + $1.amount }
        let byCategory = Dictionary(grouping: expense, by: \.category)
            .map { ($0.key, $0.value.reduce(Decimal(0)) { $0 + $1.amount }) }
            .sorted { $0.1 > $1.1 }
        let total = expense.reduce(Decimal(0)) { $0 + $1.amount }
        let lines = byCategory.map { "- \($0.0): \($0.1)円" }.joined(separator: "\n")
        return "対象月: \(month.formatted(.dateTime.year().month()))\n支出合計: \(total)円 / 収入: \(income)円\nカテゴリ別:\n\(lines)"
    }

    private static func addExpense(_ input: [String: Any], _ context: ModelContext) throws -> String {
        guard let amount = input["amount"] as? Int, amount > 0 else { return "エラー: amount必須" }
        let category = input["category"] as? String ?? "その他"
        let memo = input["memo"] as? String ?? ""
        context.insert(Transaction(amount: Decimal(amount), kind: .expense, category: category, memo: memo))
        try context.save()
        return "\(category)に\(amount)円を記録しました"
    }

    private static func habitsStatus(_ context: ModelContext) throws -> String {
        let habits = try context.fetch(FetchDescriptor<Habit>())
        if habits.isEmpty { return "習慣は未登録です" }
        return habits.map { habit in
            let today = habit.isLogged(on: .now) ? "✅済" : "⬜未"
            return "- \(habit.emoji)\(habit.name): 今日\(today) / 連続\(habit.currentStreak)日"
        }.joined(separator: "\n")
    }

    private static func logHabit(query: String, _ context: ModelContext) throws -> String {
        let habits = try context.fetch(FetchDescriptor<Habit>())
        guard let habit = habits.first(where: { $0.name.localizedCaseInsensitiveContains(query) }) else {
            return "「\(query)」に一致する習慣が見つかりません"
        }
        if habit.isLogged(on: .now) { return "「\(habit.name)」は今日すでに記録済みです" }
        let log = HabitLog()
        log.habit = habit
        context.insert(log)
        try context.save()
        return "「\(habit.name)」を記録しました(連続\(habit.currentStreak)日)"
    }

    private static func createNote(_ input: [String: Any], _ context: ModelContext) throws -> String {
        guard let title = input["title"] as? String, let body = input["body"] as? String else {
            return "エラー: title/body必須"
        }
        context.insert(Note(title: title, body: body))
        try context.save()
        return "ノート「\(title)」を作成しました"
    }

    private static func searchNotes(query: String, _ context: ModelContext) throws -> String {
        let notes = try context.fetch(FetchDescriptor<Note>())
        let hits = notes.filter {
            $0.title.localizedCaseInsensitiveContains(query) || $0.body.localizedCaseInsensitiveContains(query)
        }.prefix(5)
        if hits.isEmpty { return "「\(query)」に一致するノートなし" }
        return hits.map { "## \($0.title)\n\($0.body.prefix(500))" }.joined(separator: "\n\n")
    }
}
