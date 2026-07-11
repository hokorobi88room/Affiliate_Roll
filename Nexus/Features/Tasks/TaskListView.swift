import SwiftUI
import SwiftData

struct TaskListView: View {
    enum Filter: String, CaseIterable { case active = "未完了", today = "今日", done = "完了済み" }

    @Environment(\.modelContext) private var context
    @Query(sort: \TaskItem.createdAt, order: .reverse) private var tasks: [TaskItem]
    @State private var filter: Filter = .active
    @State private var search = ""
    @State private var editingTask: TaskItem?
    @State private var showNew = false

    private var filtered: [TaskItem] {
        var result: [TaskItem]
        switch filter {
        case .active:
            result = tasks.filter { !$0.isDone }
        case .today:
            result = tasks.filter { task in
                guard let due = task.dueDate else { return false }
                return !task.isDone && Calendar.current.isDateInToday(due)
            }
        case .done:
            result = tasks.filter(\.isDone)
        }
        if !search.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(search) ||
                $0.tags.contains { $0.localizedCaseInsensitiveContains(search) }
            }
        }
        return result.sorted {
            ($0.dueDate ?? .distantFuture, -$0.priorityRaw) < ($1.dueDate ?? .distantFuture, -$1.priorityRaw)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Picker("フィルタ", selection: $filter) {
                    ForEach(Filter.allCases, id: \.self) { Text($0.rawValue) }
                }
                .pickerStyle(.segmented)
                .listRowSeparator(.hidden)

                ForEach(filtered) { task in
                    TaskRowView(task: task)
                        .contentShape(Rectangle())
                        .onTapGesture { editingTask = task }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                context.delete(task)
                            } label: { Label("削除", systemImage: "trash") }
                        }
                }
            }
            .listStyle(.plain)
            .searchable(text: $search, prompt: "タスク・タグを検索")
            .navigationTitle("タスク")
            .toolbar {
                Button { showNew = true } label: { Image(systemName: "plus") }
            }
            .sheet(isPresented: $showNew) { TaskEditorView(task: nil) }
            .sheet(item: $editingTask) { TaskEditorView(task: $0) }
        }
    }
}

struct TaskRowView: View {
    @Bindable var task: TaskItem

    var body: some View {
        HStack(spacing: 12) {
            Button {
                Haptics.tap()
                withAnimation {
                    task.isDone.toggle()
                    task.completedAt = task.isDone ? .now : nil
                }
            } label: {
                Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(task.isDone ? .green : .secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 3) {
                Text(task.title)
                    .strikethrough(task.isDone)
                    .foregroundStyle(task.isDone ? .secondary : .primary)
                HStack(spacing: 8) {
                    if let due = task.dueDate {
                        Label(due.formatted(.dateTime.month().day().hour().minute()),
                              systemImage: "calendar")
                            .font(.caption)
                            .foregroundStyle(due < .now && !task.isDone ? .red : .secondary)
                    }
                    ForEach(task.tags, id: \.self) { tag in
                        Text("#\(tag)").font(.caption).foregroundStyle(.tint)
                    }
                }
            }
            Spacer()
            if task.priority != .normal {
                Image(systemName: task.priority.symbol)
                    .foregroundStyle(task.priority == .urgent ? .red : .orange)
            }
        }
        .padding(.vertical, 2)
    }
}
