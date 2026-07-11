import Foundation

/// Claude API クライアント(tool use対応エージェントループ + ストリーミング)
final class ClaudeService {
    static let shared = ClaudeService()
    private init() {}

    struct APIMessage {
        let role: String
        let content: Any   // String または content block の配列
    }

    enum ServiceError: LocalizedError {
        case noAPIKey
        case badResponse(Int, String)
        case malformed

        var errorDescription: String? {
            switch self {
            case .noAPIKey:
                return "APIキーが未設定です。設定画面から Claude API キーを登録してください。"
            case .badResponse(let code, let body):
                return "APIエラー (\(code)): \(body.prefix(300))"
            case .malformed:
                return "APIレスポンスの解析に失敗しました。"
            }
        }
    }

    private func makeRequest(body: [String: Any]) throws -> URLRequest {
        guard let apiKey = KeychainHelper.load(key: "claude_api_key"), !apiKey.isEmpty else {
            throw ServiceError.noAPIKey
        }
        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return request
    }

    // MARK: - エージェントループ(tool use)

    /// ツールを使いながら最終回答まで自走する。
    /// onStatus: 「📋 タスクを確認中…」のような進捗をUIへ通知
    func runAgent(userMessages: [[String: Any]],
                  system: String,
                  tools: [[String: Any]],
                  model: String = "claude-sonnet-5",
                  executeTool: @escaping (String, [String: Any]) async -> String,
                  onStatus: @escaping (String) -> Void) async throws -> String {
        var messages = userMessages
        var finalText = ""

        for _ in 0..<8 {  // 無限ループ防止
            let body: [String: Any] = [
                "model": model,
                "max_tokens": 4096,
                "system": system,
                "tools": tools,
                "messages": messages
            ]
            let request = try makeRequest(body: body)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                let code = (response as? HTTPURLResponse)?.statusCode ?? -1
                throw ServiceError.badResponse(code, String(data: data, encoding: .utf8) ?? "")
            }
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let content = json["content"] as? [[String: Any]] else {
                throw ServiceError.malformed
            }
            let stopReason = json["stop_reason"] as? String

            // テキストを回収
            for block in content where block["type"] as? String == "text" {
                if let text = block["text"] as? String { finalText = text }
            }

            guard stopReason == "tool_use" else { return finalText }

            // アシスタントターンをそのまま履歴へ
            messages.append(["role": "assistant", "content": content])

            // 各tool_useを実行して結果を返す
            var results: [[String: Any]] = []
            for block in content where block["type"] as? String == "tool_use" {
                guard let id = block["id"] as? String,
                      let name = block["name"] as? String else { continue }
                let input = block["input"] as? [String: Any] ?? [:]
                onStatus(NexusTools.statusLabel(for: name))
                let output = await executeTool(name, input)
                results.append([
                    "type": "tool_result",
                    "tool_use_id": id,
                    "content": output
                ])
            }
            messages.append(["role": "user", "content": results])
        }
        return finalText.isEmpty ? "(処理が長すぎたため中断しました)" : finalText
    }

    // MARK: - シンプルなストリーミング(ツールなし高速応答用)

    func streamReply(messages: [[String: Any]],
                     system: String,
                     model: String = "claude-sonnet-5") -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    let body: [String: Any] = [
                        "model": model,
                        "max_tokens": 4096,
                        "system": system,
                        "stream": true,
                        "messages": messages
                    ]
                    let request = try makeRequest(body: body)
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
                        guard let data = payload.data(using: .utf8),
                              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                              json["type"] as? String == "content_block_delta",
                              let delta = json["delta"] as? [String: Any],
                              let text = delta["text"] as? String else { continue }
                        continuation.yield(text)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
}
