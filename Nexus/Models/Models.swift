import Foundation
import SwiftData

// MARK: - タスク

enum TaskPriority: Int, Codable, CaseIterable, Identifiable {
    case low = 0, normal = 1, high = 2, urgent = 3
    var id: Int { rawValue }
    var label: String {
        switch self {
        case .low: return "低"
        case .normal: return "中"
        case .high: return "高"
        case .urgent: return "至急"
        }
    }
    var symbol: String {
        switch self {
        case .low: return "arrow.down.circle"
        case .normal: return "minus.circle"
        case .high: return "arrow.up.circle"
        case .urgent: return "exclamationmark.circle.fill"
        }
    }
}

@Model
final class TaskItem {
    var title: String
    var details: String
    var isDone: Bool
    var priorityRaw: Int
    var dueDate: Date?
    var createdAt: Date
    var completedAt: Date?
    var tags: [String]

    var priority: TaskPriority {
        get { TaskPriority(rawValue: priorityRaw) ?? .normal }
        set { priorityRaw = newValue.rawValue }
    }

    init(title: String, details: String = "", priority: TaskPriority = .normal,
         dueDate: Date? = nil, tags: [String] = []) {
        self.title = title
        self.details = details
        self.isDone = false
        self.priorityRaw = priority.rawValue
        self.dueDate = dueDate
        self.createdAt = .now
        self.tags = tags
    }
}

// MARK: - 習慣

@Model
final class Habit {
    var name: String
    var emoji: String
    var targetPerWeek: Int
    var reminderHour: Int?
    var createdAt: Date
    @Relationship(deleteRule: .cascade, inverse: \HabitLog.habit) var logs: [HabitLog]

    init(name: String, emoji: String = "🔥", targetPerWeek: Int = 7, reminderHour: Int? = nil) {
        self.name = name
        self.emoji = emoji
        self.targetPerWeek = targetPerWeek
        self.reminderHour = reminderHour
        self.createdAt = .now
        self.logs = []
    }

    func isLogged(on date: Date) -> Bool {
        logs.contains { Calendar.current.isDate($0.date, inSameDayAs: date) }
    }

    /// 今日から遡った連続達成日数
    var currentStreak: Int {
        let cal = Calendar.current
        var streak = 0
        var day = cal.startOfDay(for: .now)
        // 今日未記録なら昨日から数える
        if !isLogged(on: day) {
            guard let y = cal.date(byAdding: .day, value: -1, to: day) else { return 0 }
            day = y
        }
        while isLogged(on: day) {
            streak += 1
            guard let prev = cal.date(byAdding: .day, value: -1, to: day) else { break }
            day = prev
        }
        return streak
    }
}

@Model
final class HabitLog {
    var date: Date
    var habit: Habit?
    init(date: Date = .now) { self.date = date }
}

// MARK: - ノート

@Model
final class Note {
    var title: String
    var body: String
    var isPinned: Bool
    var createdAt: Date
    var updatedAt: Date
    var tags: [String]

    init(title: String = "", body: String = "", tags: [String] = []) {
        self.title = title
        self.body = body
        self.isPinned = false
        self.createdAt = .now
        self.updatedAt = .now
        self.tags = tags
    }
}

// MARK: - 家計

enum TransactionKind: Int, Codable { case expense = 0, income = 1 }

@Model
final class Transaction {
    var amount: Decimal
    var kindRaw: Int
    var category: String
    var memo: String
    var date: Date

    var kind: TransactionKind {
        get { TransactionKind(rawValue: kindRaw) ?? .expense }
        set { kindRaw = newValue.rawValue }
    }

    init(amount: Decimal, kind: TransactionKind, category: String, memo: String = "", date: Date = .now) {
        self.amount = amount
        self.kindRaw = kind.rawValue
        self.category = category
        self.memo = memo
        self.date = date
    }

    static let expenseCategories = ["食費", "外食", "日用品", "交通", "住居", "通信", "娯楽", "医療", "衣服", "その他"]
    static let incomeCategories = ["給与", "副業", "臨時収入", "その他"]
}

// MARK: - AIチャット

@Model
final class Conversation {
    var title: String
    var createdAt: Date
    var updatedAt: Date
    @Relationship(deleteRule: .cascade, inverse: \ChatMessage.conversation) var messages: [ChatMessage]

    init(title: String = "新しい会話") {
        self.title = title
        self.createdAt = .now
        self.updatedAt = .now
        self.messages = []
    }

    var sortedMessages: [ChatMessage] { messages.sorted { $0.createdAt < $1.createdAt } }
}

@Model
final class ChatMessage {
    var role: String   // "user" | "assistant"
    var content: String
    var createdAt: Date
    var conversation: Conversation?

    init(role: String, content: String) {
        self.role = role
        self.content = content
        self.createdAt = .now
    }
}

// MARK: - 集中セッション

@Model
final class FocusSession {
    var startedAt: Date
    var durationMinutes: Int
    var label: String

    init(startedAt: Date = .now, durationMinutes: Int, label: String = "集中") {
        self.startedAt = startedAt
        self.durationMinutes = durationMinutes
        self.label = label
    }
}
