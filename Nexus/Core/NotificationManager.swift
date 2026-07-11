import Foundation
import UserNotifications

final class NotificationManager {
    static let shared = NotificationManager()
    private init() {}

    func requestAuthorization() {
        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
    }

    func scheduleTaskReminder(title: String, at date: Date) {
        guard date > .now else { return }
        let content = UNMutableNotificationContent()
        content.title = "⏰ タスクの期限"
        content.body = title
        content.sound = .default
        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: "task-\(UUID().uuidString)",
                                            content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    func scheduleDailyHabitReminder(name: String, hour: Int) {
        let content = UNMutableNotificationContent()
        content.title = "🔥 習慣の時間"
        content.body = "「\(name)」を忘れずに!"
        content.sound = .default
        var components = DateComponents()
        components.hour = hour
        components.minute = 0
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        let request = UNNotificationRequest(identifier: "habit-\(name)", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    func scheduleFocusEnd(after interval: TimeInterval, label: String) {
        guard interval > 1 else { return }
        let content = UNMutableNotificationContent()
        content.title = "✅ 集中セッション完了"
        content.body = "「\(label)」お疲れさまでした!"
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let request = UNNotificationRequest(identifier: "focus-end", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }
}
