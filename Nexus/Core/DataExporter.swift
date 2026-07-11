import Foundation
import SwiftData

/// 全データをJSONにシリアライズしてバックアップファイルを生成
enum DataExporter {
    struct Backup: Codable {
        var exportedAt: Date
        var tasks: [TaskDTO] = []
        var habits: [HabitDTO] = []
        var notes: [NoteDTO] = []
        var transactions: [TransactionDTO] = []
        var focusSessions: [FocusDTO] = []
    }
    struct TaskDTO: Codable {
        var title: String; var details: String; var isDone: Bool
        var priority: Int; var dueDate: Date?; var createdAt: Date; var tags: [String]
    }
    struct HabitDTO: Codable {
        var name: String; var emoji: String; var targetPerWeek: Int; var logDates: [Date]
    }
    struct NoteDTO: Codable {
        var title: String; var body: String; var isPinned: Bool
        var createdAt: Date; var updatedAt: Date; var tags: [String]
    }
    struct TransactionDTO: Codable {
        var amount: Decimal; var kind: Int; var category: String; var memo: String; var date: Date
    }
    struct FocusDTO: Codable {
        var startedAt: Date; var durationMinutes: Int; var label: String
    }

    static func exportAll(context: ModelContext) -> URL? {
        var backup = Backup(exportedAt: .now)
        do {
            backup.tasks = try context.fetch(FetchDescriptor<TaskItem>()).map {
                TaskDTO(title: $0.title, details: $0.details, isDone: $0.isDone,
                        priority: $0.priorityRaw, dueDate: $0.dueDate,
                        createdAt: $0.createdAt, tags: $0.tags)
            }
            backup.habits = try context.fetch(FetchDescriptor<Habit>()).map {
                HabitDTO(name: $0.name, emoji: $0.emoji,
                         targetPerWeek: $0.targetPerWeek, logDates: $0.logs.map(\.date))
            }
            backup.notes = try context.fetch(FetchDescriptor<Note>()).map {
                NoteDTO(title: $0.title, body: $0.body, isPinned: $0.isPinned,
                        createdAt: $0.createdAt, updatedAt: $0.updatedAt, tags: $0.tags)
            }
            backup.transactions = try context.fetch(FetchDescriptor<Transaction>()).map {
                TransactionDTO(amount: $0.amount, kind: $0.kindRaw,
                               category: $0.category, memo: $0.memo, date: $0.date)
            }
            backup.focusSessions = try context.fetch(FetchDescriptor<FocusSession>()).map {
                FocusDTO(startedAt: $0.startedAt, durationMinutes: $0.durationMinutes, label: $0.label)
            }

            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(backup)

            let formatter = DateFormatter()
            formatter.dateFormat = "yyyyMMdd-HHmm"
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("nexus-backup-\(formatter.string(from: .now)).json")
            try data.write(to: url)
            return url
        } catch {
            return nil
        }
    }
}
