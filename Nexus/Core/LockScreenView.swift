import SwiftUI
import LocalAuthentication

struct LockScreenView: View {
    let onUnlock: () -> Void
    @State private var failed = false

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 64))
                .foregroundStyle(.tint)
            Text("Nexus はロックされています").font(.headline)
            if failed {
                Text("認証に失敗しました").font(.caption).foregroundStyle(.red)
            }
            Button("ロック解除") { authenticate() }
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.ultraThinMaterial)
        .onAppear { authenticate() }
    }

    private func authenticate() {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            // 認証手段がない端末はそのまま解除
            onUnlock()
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthentication,
                               localizedReason: "Nexusのロックを解除") { success, _ in
            DispatchQueue.main.async {
                if success {
                    onUnlock()
                } else {
                    failed = true
                }
            }
        }
    }
}
