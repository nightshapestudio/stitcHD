import Foundation

enum TethrCorrectionState: String, Equatable {
    case standby = "Standby"
    case analyzing = "Analyzing"
    case ready = "Ready"
    case conservative = "Conservative"
}

enum TethrImportState: String, Equatable {
    case empty = "Empty"
    case reading = "Reading"
    case loaded = "Loaded"
    case failed = "Failed"
}

enum TethrSignalTone: Equatable {
    case cyan
    case indigo
    case purple
    case muted
}

struct TethrProject: Equatable {
    var sourceName: String?
    var sourceDuration: TimeInterval?
    var importState: TethrImportState = .empty
    var detectedBpm: Double?
    var bpmConfidence: Double?
    var correctionState: TethrCorrectionState = .standby
    var segmentCount: Int = 0

    var hasSource: Bool {
        sourceName != nil
    }

    var durationText: String {
        guard let sourceDuration else { return "--:--" }
        let totalSeconds = max(0, Int(sourceDuration.rounded()))
        return String(format: "%02d:%02d", totalSeconds / 60, totalSeconds % 60)
    }

    var bpmText: String {
        guard let detectedBpm else { return "---" }
        return String(format: "%.1f", detectedBpm)
    }

    var confidenceText: String {
        guard let bpmConfidence else { return "No read" }
        return "\(Int((bpmConfidence * 100).rounded()))%"
    }
}

struct TethrTelemetryItem: Identifiable, Equatable {
    let id: String
    let label: String
    let value: String
    let detail: String
    let tone: TethrSignalTone
}
