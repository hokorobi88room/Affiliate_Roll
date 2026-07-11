import SwiftUI
import SwiftData

struct FocusTimerView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \FocusSession.startedAt, order: .reverse) private var sessions: [FocusSession]

    @State private var selectedMinutes = 25
    @State private var remaining = 0
    @State private var running = false
    @State private var timer: Timer?
    @State private var label = "集中"

    private let presets = [15, 25, 45, 60, 90]

    private var todayTotal: Int {
        sessions.filter { Calendar.current.isDateInToday($0.startedAt) }
            .reduce(0) { $0 + $1.durationMinutes }
    }

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.15), lineWidth: 14)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: remaining)
                VStack {
                    Text(timeString).font(.system(size: 52, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    Text(running ? label : "準備OK").foregroundStyle(.secondary)
                }
            }
            .frame(width: 260, height: 260)
            .padding(.top, 24)

            if !running {
                HStack {
                    ForEach(presets, id: \.self) { min in
                        Button("\(min)分") {
                            selectedMinutes = min
                        }
                        .buttonStyle(.bordered)
                        .tint(selectedMinutes == min ? .accentColor : .gray)
                    }
                }
                TextField("ラベル(例: 勉強)", text: $label)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 200)
            }

            Button {
                running ? stop(save: remaining < selectedMinutes * 60) : start()
            } label: {
                Text(running ? "終了" : "スタート")
                    .font(.headline)
                    .frame(width: 200)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .tint(running ? .red : .accentColor)

            VStack(spacing: 4) {
                Text("今日の合計: \(todayTotal) 分").font(.subheadline.bold())
                Text("累計セッション: \(sessions.count) 回").font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
        }
        .navigationTitle("集中タイマー")
        .onDisappear { timer?.invalidate() }
    }

    private var progress: CGFloat {
        guard selectedMinutes > 0 else { return 0 }
        return running ? CGFloat(remaining) / CGFloat(selectedMinutes * 60) : 1
    }

    private var timeString: String {
        let total = running ? remaining : selectedMinutes * 60
        return String(format: "%02d:%02d", total / 60, total % 60)
    }

    private func start() {
        remaining = selectedMinutes * 60
        running = true
        Haptics.tap()
        UIApplication.shared.isIdleTimerDisabled = true
        NotificationManager.shared.scheduleFocusEnd(after: TimeInterval(remaining), label: label)
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if remaining > 0 {
                remaining -= 1
            } else {
                stop(save: true)
            }
        }
    }

    private func stop(save: Bool) {
        timer?.invalidate()
        timer = nil
        UIApplication.shared.isIdleTimerDisabled = false
        if save {
            let elapsed = (selectedMinutes * 60 - remaining + 59) / 60
            if elapsed > 0 {
                context.insert(FocusSession(durationMinutes: min(elapsed, selectedMinutes), label: label))
                Haptics.success()
            }
        }
        running = false
        remaining = 0
    }
}
