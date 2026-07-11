import SwiftUI
import SwiftData

@main
struct NexusApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @AppStorage("appLockEnabled") private var appLockEnabled = false
    @State private var unlocked = false
    @Environment(\.scenePhase) private var scenePhase

    static let sharedModelContainer: ModelContainer = {
        let schema = Schema([
            TaskItem.self, Habit.self, HabitLog.self, Note.self,
            Transaction.self, Conversation.self, ChatMessage.self,
            FocusSession.self
        ])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("SwiftData初期化失敗: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            Group {
                if appLockEnabled && !unlocked {
                    LockScreenView { unlocked = true }
                } else {
                    RootView()
                }
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .background { unlocked = false }
            }
        }
        .modelContainer(Self.sharedModelContainer)
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        NotificationManager.shared.requestAuthorization()
        return true
    }
}
