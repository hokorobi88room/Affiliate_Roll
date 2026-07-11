import Foundation

/// Claude API クライアント(個人利用・APIキーはKeychainに保存)
/// https://docs.claude.com/en/api/messages
final class ClaudeService {
    static let shared = ClaudeService()
    private init() {}

    struct APIMessage: Codable {
        let role: String
        let content: String
    }

    enum ServiceError: LocalizedError {
        case noAPIKey
        case badResponse(Int, String)

        var errorDescription: String? {
            switch self {
            case .noAPIKey:
                return "APIキーが未設定です。設定画面から Claude API キーを登録してください。"
            case .badResponse(let code, let body):
                return "APIエラー (\(code)): \(body)"
            }
        }
    }

    /// ストリーミングでアシスタント応答を受け取る
    func streamReply(messages: [APIMessage],
                     system: String,
                     model: String = "claude-sonnet-5") -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    guard let apiKey = KeychainHelper.load(key: "claude_api_key"), !apiKey.isEmpty else {
                        throw ServiceError.noAPIKey
                    }
                    var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "content-type")
                    request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
                    request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

                    let body: [String: Any] = [
                        "model": model,
                        "max_tokens": 4096,
                        "system": system,
                        "stream": true,
                        "messages": messages.map { ["role": $0.role, "content": $0.content] }
                    ]
                    request.httpBody = try JSONSerialization.data(withJSONObject: body)

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                        var errorBody = ""
                        for try await line in bytes.lines { errorBody += line }
                        let code = (response as? HTTPURLResponse)?.statusCode ?? -1
                        throw ServiceError.badResponse(code, errorBody)
                    }

                    for try await line in bytes.lines {
                        guard line.hasPrefix("data: ") else { continue }
                        let payload = String(line.dropFirst(6))
                        guard payload != "[DONE]",
                              let data = payload.data(using: .utf8),
                              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                              let type = json["type"] as? String else { continue }
                        if type == "content_block_delta",
                           let delta = json["delta"] as? [String: Any],
                           let text = delta["text"] as? String {
                            continuation.yield(text)
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
}
