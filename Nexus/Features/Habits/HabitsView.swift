import SwiftUI
import SwiftData

struct HabitsView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Habit.createdAt) private var habits: [Habit]
    @State private var showNew = false

    var body: some View {
        List {
            ForEach(habits) { habit in
                HabitRowView(habit: habit)
            }
            .onDelete { indexSet in
                indexSet.forEach { context.delete(habits[$0]) }
            }
        }
        .navigationTitle("習慣トラッカー")
        .toolbar { Button { showNew = true } label: { Image(systemName: "plus") } }
        .sheet(isPresented: $showNew) { NewHabitView() }
        .overlay {
            if habits.isEmpty {
                ContentUnavailableView("習慣がありません", systemImage: "flame",
                                       description: Text("+ から毎日続けたいことを追加"))
            }
        }
    }
}

struct HabitRowView: View {
    @Bindable var habit: Habit
    @Environment(\.modelContext) private var context

    private var last7Days: [Date] {
        let cal = Calendar.current
        return (0..<7).reversed().compactMap { cal.date(byAdding: .day, value: -$0, to: cal.startOfDay(for: .now)) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(habit.emoji).font(.title2)
                VStack(alignment: .leading) {
                    Text(habit.name).font(.headline)
                    Text("連続 \(habit.currentStreak) 日 ・ 週目標 \(habit.targetPerWeek) 回")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
            }
            HStack(spacing: 8) {
                ForEach(last7Days, id: \.self) { day in
                    let logged = habit.isLogged(on: day)
                    let isToday = Calendar.current.isDateInToday(day)
                    Button {
                        guard isToday else { return }
                        Haptics.tap()
                        if let log = habit.logs.first(where: { Calendar.current.isDate($0.date, inSameDayAs: day) }) {
                            context.delete(log)
                        } else {
                            let log = HabitLog(date: day)
                            log.habit = habit
                            context.insert(log)
                        }
                    } label: {
                        VStack(spacing: 2) {
                            Text(day, format: .dateTime.weekday(.narrow))
                                .font(.caption2).foregroundStyle(.secondary)
                            Circle()
                                .fill(logged ? Color.green : Color.gray.opacity(0.2))
                                .frame(width: 26, height: 26)
                                .overlay {
                                    if logged {
                                        Image(systemName: "checkmark")
                                            .font(.caption2.bold()).foregroundStyle(.white)
                                    }
                                }
                                .overlay {
                                    if isToday {
                                        Circle().stroke(Color.accentColor, lineWidth: 2)
                                    }
                                }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct NewHabitView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var name = ""
    @State private var emoji = "🔥"
    @State private var target = 7
    @State private var remind = false
    @State private var reminderHour = 21

    private let emojis = ["🔥", "💪", "📚", "🏃", "🧘", "💧", "😴", "✍️", "🎸", "🧹", "💊", "🌱"]

    var body: some View {
        NavigationStack {
            Form {
                TextField("習慣の名前(例: 筋トレ)", text: $name)
                Section("アイコン") {
                    LazyVGrid(columns: Array(repeating: .init(.flexible()), count: 6)) {
                        ForEach(emojis, id: \.self) { e in
                            Text(e).font(.title2)
                                .padding(6)
                                .background(emoji == e ? Color.accentColor.opacity(0.2) : .clear,
                                            in: RoundedRectangle(cornerRadius: 8))
                                .onTapGesture { emoji = e }
                        }
                    }
                }
                Section {
                    Stepper("週の目標: \(target) 回", value: $target, in: 1...7)
                    Toggle("毎日リマインド", isOn: $remind)
                    if remind {
                        Stepper("通知時刻: \(reminderHour):00", value: $reminderHour, in: 0...23)
                    }
                }
            }
            .navigationTitle("新しい習慣")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("キャンセル") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("追加") {
                        let habit = Habit(name: name, emoji: emoji, targetPerWeek: target,
                                          reminderHour: remind ? reminderHour : nil)
                        context.insert(habit)
                        if remind {
                            NotificationManager.shared.scheduleDailyHabitReminder(name: name, hour: reminderHour)
                        }
                        Haptics.success()
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
