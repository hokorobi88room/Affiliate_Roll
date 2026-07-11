import SwiftUI

struct RootView: View {
    @AppStorage("accentColorName") private var accentColorName = "indigo"

    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("ホーム", systemImage: "square.grid.2x2.fill") }
            TaskListView()
                .tabItem { Label("タスク", systemImage: "checklist") }
            AssistantView()
                .tabItem { Label("AI", systemImage: "sparkles") }
            FinanceView()
                .tabItem { Label("家計", systemImage: "yensign.circle.fill") }
            MoreView()
                .tabItem { Label("その他", systemImage: "ellipsis.circle.fill") }
        }
        .tint(Theme.color(named: accentColorName))
    }
}

struct MoreView: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink { InsightsView() } label: { Label("インサイト", systemImage: "chart.bar.xaxis") }
                NavigationLink { HabitsView() } label: { Label("習慣トラッカー", systemImage: "flame.fill") }
                NavigationLink { NotesView() } label: { Label("ノート", systemImage: "note.text") }
                NavigationLink { FocusTimerView() } label: { Label("集中タイマー", systemImage: "timer") }
                NavigationLink { SettingsView() } label: { Label("設定", systemImage: "gearshape.fill") }
            }
            .navigationTitle("その他")
        }
    }
}

enum Theme {
    static func color(named name: String) -> Color {
        switch name {
        case "blue": return .blue
        case "purple": return .purple
        case "pink": return .pink
        case "orange": return .orange
        case "green": return .green
        case "teal": return .teal
        default: return .indigo
        }
    }
    static let allNames = ["indigo", "blue", "purple", "pink", "orange", "green", "teal"]
}
