import SwiftUI
import SwiftData

struct TaskEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context

    let task: TaskItem?
    @State private var title = ""
    @State private var details = ""
    @State private var priority: TaskPriority = .normal
    @State private var hasDue = false
    @State private var dueDate = Date.now.addingTimeInterval(3600)
    @State private var remind = false
    @State private var tagsText = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("タイトル", text: $title)
                    TextField("詳細メモ", text: $details, axis: .vertical).lineLimit(2...6)
                    TextField("タグ(カンマ区切り)", text: $tagsText)
                }
                Section("優先度") {
                    Picker("優先度", selection: $priority) {
                        ForEach(TaskPriority.allCases) { p in
                            Label(p.label, systemImage: p.symbol).tag(p)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                Section("期限") {
                    Toggle("期限を設定", isOn: $hasDue.animation())
                    if hasDue {
                        DatePicker("期限", selection: $dueDate)
                        Toggle("期限に通知", isOn: $remind)
                    }
                }
            }
            .navigationTitle(task == nil ? "新規タスク" : "タスク編集")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("キャンセル") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { save() }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear { load() }
        }
    }

    private func load() {
        guard let task else { return }
        title = task.title
        details = task.details
        priority = task.priority
        if let due = task.dueDate {
            hasDue = true
            dueDate = due
        }
        tagsText = task.tags.joined(separator: ", ")
    }

    private func save() {
        let tags = tagsText.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        let target: TaskItem
        if let task {
            target = task
        } else {
            target = TaskItem(title: title)
            context.insert(target)
        }
        target.title = title
        target.details = details
        target.priority = priority
        target.dueDate = hasDue ? dueDate : nil
        target.tags = tags

        if remind, hasDue {
            NotificationManager.shared.scheduleTaskReminder(title: title, at: dueDate)
        }
        Haptics.success()
        dismiss()
    }
}
