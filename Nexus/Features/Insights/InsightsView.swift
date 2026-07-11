import SwiftUI
import SwiftData
import Charts

/// 分析ダッシュボード: 支出トレンド・習慣ヒートマップ・集中時間・タスク消化
struct InsightsView: View {
    @Query private var transactions: [Transaction]
    @Query private var habits: [Habit]
    @Query private var focusSessions: [FocusSession]
    @Query private var tasks: [TaskItem]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                spendingTrendCard
                habitHeatmapCard
                focusCard
                taskVelocityCard
            }
            .padding()
        }
        .navigationTitle("インサイト")
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - 支出トレンド(6か月)

    private var monthlySpending: [(month: Date, total: Double)] {
        let cal = Calendar.current
        return (0..<6).reversed().compactMap { offset in
            guard let month = cal.date(byAdding: .month, value: -offset, to: .now) else { return nil }
            let total = transactions
                .filter { $0.kind == .expense && cal.isDate($0.date, equalTo: month, toGranularity: .month) }
                .reduce(Decimal(0)) { $0 + $1.amount }
            return (cal.dateInterval(of: .month, for: month)?.start ?? month,
                    NSDecimalNumber(decimal: total).doubleValue)
        }
    }

    private var spendingTrendCard: some View {
        InsightCard(title: "支出トレンド(6か月)", symbol: "chart.line.uptrend.xyaxis") {
            Chart(monthlySpending, id: \.month) { item in
                BarMark(
                    x: .value("月", item.month, unit: .month),
                    y: .value("支出", item.total)
                )
                .foregroundStyle(.red.gradient)
                .cornerRadius(4)
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .month)) { _ in
                    AxisValueLabel(format: .dateTime.month(.narrow))
                }
            }
            .frame(height: 160)
        }
    }

    // MARK: - 習慣ヒートマップ(12週・GitHub草スタイル)

    private var heatmapWeeks: [[Date]] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: .now)
        // 今週の週初めから11週前まで
        guard let thisWeekStart = cal.dateInterval(of: .weekOfYear, for: today)?.start else { return [] }
        return (0..<12).reversed().compactMap { weekOffset in
            guard let weekStart = cal.date(byAdding: .weekOfYear, value: -weekOffset, to: thisWeekStart) else { return nil }
            return (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: weekStart) }
        }
    }

    private func completionRatio(on date: Date) -> Double {
        guard !habits.isEmpty, date <= .now else { return -1 }  // 未来は-1で非表示扱い
        let done = habits.filter { $0.isLogged(on: date) }.count
        return Double(done) / Double(habits.count)
    }

    private var habitHeatmapCard: some View {
        InsightCard(title: "習慣ヒートマップ(12週)", symbol: "flame.fill") {
            if habits.isEmpty {
                Text("習慣を追加すると表示されます").font(.caption).foregroundStyle(.secondary)
            } else {
                HStack(alignment: .top, spacing: 3) {
                    ForEach(Array(heatmapWeeks.enumerated()), id: \.offset) { _, week in
                        VStack(spacing: 3) {
                            ForEach(week, id: \.self) { day in
                                let ratio = completionRatio(on: day)
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(cellColor(ratio))
                                    .frame(width: 14, height: 14)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                HStack {
                    Text("少").font(.caption2).foregroundStyle(.secondary)
                    ForEach([0.01, 0.34, 0.67, 1.0], id: \.self) { ratio in
                        RoundedRectangle(cornerRadius: 2).fill(cellColor(ratio)).frame(width: 10, height: 10)
                    }
                    Text("多").font(.caption2).foregroundStyle(.secondary)
                    Spacer()
                }
            }
        }
    }

    private func cellColor(_ ratio: Double) -> Color {
        switch ratio {
        case ..<0: return .clear
        case 0: return Color.gray.opacity(0.15)
        case ..<0.34: return .green.opacity(0.3)
        case ..<0.67: return .green.opacity(0.55)
        case ..<1.0: return .green.opacity(0.8)
        default: return .green
        }
    }

    // MARK: - 集中時間(14日)

    private var dailyFocus: [(day: Date, minutes: Int)] {
        let cal = Calendar.current
        return (0..<14).reversed().compactMap { offset in
            guard let day = cal.date(byAdding: .day, value: -offset, to: cal.startOfDay(for: .now)) else { return nil }
            let minutes = focusSessions
                .filter { cal.isDate($0.startedAt, inSameDayAs: day) }
                .reduce(0) { $0 + $1.durationMinutes }
            return (day, minutes)
        }
    }

    private var focusCard: some View {
        InsightCard(title: "集中時間(14日)", symbol: "timer") {
            Chart(dailyFocus, id: \.day) { item in
                BarMark(
                    x: .value("日", item.day, unit: .day),
                    y: .value("分", item.minutes)
                )
                .foregroundStyle(.orange.gradient)
                .cornerRadius(3)
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: 2)) { _ in
                    AxisValueLabel(format: .dateTime.day())
                }
            }
            .frame(height: 140)
            let total = dailyFocus.reduce(0) { $0 + $1.minutes }
            Text("合計 \(total)分(1日平均 \(total / 14)分)")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    // MARK: - タスク消化ペース(8週)

    private var weeklyCompleted: [(week: Date, count: Int)] {
        let cal = Calendar.current
        guard let thisWeekStart = cal.dateInterval(of: .weekOfYear, for: .now)?.start else { return [] }
        return (0..<8).reversed().compactMap { offset in
            guard let weekStart = cal.date(byAdding: .weekOfYear, value: -offset, to: thisWeekStart),
                  let weekEnd = cal.date(byAdding: .weekOfYear, value: 1, to: weekStart) else { return nil }
            let count = tasks.filter {
                guard let done = $0.completedAt else { return false }
                return done >= weekStart && done < weekEnd
            }.count
            return (weekStart, count)
        }
    }

    private var taskVelocityCard: some View {
        InsightCard(title: "タスク完了ペース(8週)", symbol: "checkmark.seal.fill") {
            Chart(weeklyCompleted, id: \.week) { item in
                LineMark(
                    x: .value("週", item.week, unit: .weekOfYear),
                    y: .value("完了", item.count)
                )
                .symbol(.circle)
                .foregroundStyle(.blue)
                AreaMark(
                    x: .value("週", item.week, unit: .weekOfYear),
                    y: .value("完了", item.count)
                )
                .foregroundStyle(.blue.opacity(0.12))
            }
            .frame(height: 140)
        }
    }
}

struct InsightCard<Content: View>: View {
    let title: String
    let symbol: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: symbol).font(.headline)
            content
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
    }
}
