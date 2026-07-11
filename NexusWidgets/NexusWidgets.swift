import WidgetKit
import SwiftUI

@main
struct NexusWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NexusTodayWidget()
    }
}

struct TodayEntry: TimelineEntry {
    let date: Date
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry { TodayEntry(date: .now) }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(TodayEntry(date: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        // 1時間ごとに更新
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: .now)!
        completion(Timeline(entries: [TodayEntry(date: .now)], policy: .after(next)))
    }
}

struct NexusTodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NexusToday", provider: TodayProvider()) { entry in
            NexusTodayView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Nexus Today")
        .description("今日の日付とクイックアクセス")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct NexusTodayView: View {
    let entry: TodayEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "sparkles").foregroundStyle(.indigo)
                Text("Nexus").font(.headline)
                Spacer()
            }
            Text(entry.date, format: .dateTime.month(.wide).day())
                .font(.title2.bold())
            Text(entry.date, format: .dateTime.weekday(.wide))
                .font(.subheadline).foregroundStyle(.secondary)
            Spacer()
            Text("タップして開く").font(.caption2).foregroundStyle(.tertiary)
        }
        .padding(4)
        .widgetURL(URL(string: "nexus://today"))
    }
}
