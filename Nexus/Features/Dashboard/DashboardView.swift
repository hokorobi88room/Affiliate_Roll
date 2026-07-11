import SwiftUI
import SwiftData

struct DashboardView: View {
    @Query private var tasks: [TaskItem]
    @Query private var habits: [Habit]
    @Query private var transactions: [Transaction]
    @Query private var focusSessions: [FocusSession]
    @State private var showQuickCapture = false

    private var todayTasks: [TaskItem] {
        tasks.filter { !$0.isDone }
            .sorted { ($0.dueDate ?? .distantFuture, -$0.priorityRaw) < ($1.dueDate ?? .distantFuture, -$1.priorityRaw) }
    }

    private var monthExpense: Decimal {
        let cal = Calendar.current
        return transactions
            .filter { $0.kind == .expense && cal.isDate($0.date, equalTo: .now, toGranularity: .month) }
            .reduce(0) { $0 + $1.amount }
    }

    private var todayFocusMinutes: Int {
        focusSessions
            .filter { Calendar.current.isDateInToday($0.startedAt) }
            .reduce(0) { $0 + $1.durationMinutes }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    greetingHeader
                    statRow
                    todaySection
                    habitSection
                }
                .padding()
            }
            .navigationTitle("Nexus")
            .toolbar {
                Button {
                    showQuickCapture = true
                } label: {
                    Image(systemName: "plus.circle.fill").font(.title2)
                }
            }
            .sheet(isPresented: $showQuickCapture) { QuickCaptureView() }
        }
    }

    private var greetingHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greeting)
                .font(.title2.bold())
            Text(Date.now, format: .dateTime.month(.wide).day().weekday(.wide))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var greeting: String {
        switch Calendar.current.component(.hour, from: .now) {
        case 5..<11: return "おはようございます ☀️"
        case 11..<17: return "こんにちは 👋"
        default: return "こんばんは 🌙"
        }
    }

    private var statRow: some View {
        HStack(spacing: 12) {
            StatCard(title: "残タスク", value: "\(todayTasks.count)", symbol: "checklist", color: .blue)
            StatCard(title: "今月支出", value: monthExpense.yenString, symbol: "yensign", color: .red)
            StatCard(title: "今日の集中", value: "\(todayFocusMinutes)分", symbol: "timer", color: .orange)
        }
    }

    private var todaySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("直近のタスク").font(.headline)
            if todayTasks.isEmpty {
                ContentUnavailableView("タスクなし", systemImage: "checkmark.seal.fill",
                                       description: Text("すべて完了しています 🎉"))
                    .frame(height: 120)
            } else {
                ForEach(todayTasks.prefix(5)) { task in
                    TaskRowView(task: task)
                }
            }
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var habitSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("今日の習慣").font(.headline)
            if habits.isEmpty {
                Text("習慣トラッカーから追加できます").foregroundStyle(.secondary).font(.subheadline)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(habits) { habit in
                            HabitChip(habit: habit)
                        }
                    }
                }
            }
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let symbol: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol).foregroundStyle(color)
            Text(value).font(.headline).lineLimit(1).minimumScaleFactor(0.6)
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14))
    }
}

struct HabitChip: View {
    @Bindable var habit: Habit
    @Environment(\.modelContext) private var context

    var body: some View {
        let done = habit.isLogged(on: .now)
        Button {
            Haptics.tap()
            if let log = habit.logs.first(where: { Calendar.current.isDateInToday($0.date) }) {
                context.delete(log)
            } else {
                let log = HabitLog()
                log.habit = habit
                context.insert(log)
            }
        } label: {
            VStack(spacing: 4) {
                Text(habit.emoji).font(.title2)
                Text(habit.name).font(.caption2).lineLimit(1)
                Text("🔥\(habit.currentStreak)").font(.caption2).foregroundStyle(.secondary)
            }
            .padding(10)
            .frame(width: 84)
            .background(done ? Color.green.opacity(0.25) : Color.gray.opacity(0.12),
                        in: RoundedRectangle(cornerRadius: 12))
            .overlay(alignment: .topTrailing) {
                if done {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green).padding(4)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

extension Decimal {
    var yenString: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "ja_JP")
        return formatter.string(from: self as NSDecimalNumber) ?? "¥0"
    }
}
