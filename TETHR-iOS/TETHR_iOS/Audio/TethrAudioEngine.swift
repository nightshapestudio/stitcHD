import AVFoundation
import Foundation

struct TethrSourceSummary: Equatable {
    let fileName: String
    let duration: TimeInterval
}

protocol TethrAudioEngineProtocol {
    func inspectSource(at url: URL) async throws -> TethrSourceSummary
}

final class TethrAudioEngine: TethrAudioEngineProtocol {
    func inspectSource(at url: URL) async throws -> TethrSourceSummary {
        let didAccess = url.startAccessingSecurityScopedResource()
        defer {
            if didAccess {
                url.stopAccessingSecurityScopedResource()
            }
        }

        let asset = AVURLAsset(url: url)
        let duration = try await asset.load(.duration).seconds

        return TethrSourceSummary(
            fileName: url.lastPathComponent,
            duration: duration.isFinite ? duration : 0
        )
    }
}
