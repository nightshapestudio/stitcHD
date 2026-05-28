import Foundation

@MainActor
final class TethrEditorViewModel: ObservableObject {
    @Published private(set) var project = TethrProject()
    @Published private(set) var playheadProgress: Double = 0
    @Published private(set) var isPlaying = false
    @Published var isImportPresented = false

    private let audioEngine: TethrAudioEngineProtocol

    init(audioEngine: TethrAudioEngineProtocol = TethrAudioEngine()) {
        self.audioEngine = audioEngine
    }

    var sourceTitle: String {
        project.sourceName ?? "No source"
    }

    var telemetryItems: [TethrTelemetryItem] {
        [
            TethrTelemetryItem(
                id: "source",
                label: "Source",
                value: project.importState.rawValue,
                detail: project.sourceName ?? "Waiting",
                tone: project.hasSource ? .cyan : .muted
            ),
            TethrTelemetryItem(
                id: "bpm",
                label: "BPM",
                value: project.bpmText,
                detail: project.confidenceText,
                tone: project.detectedBpm == nil ? .muted : .indigo
            ),
            TethrTelemetryItem(
                id: "correction",
                label: "Correction",
                value: project.correctionState.rawValue,
                detail: project.hasSource ? "Queued" : "Standby",
                tone: project.hasSource ? .purple : .muted
            ),
            TethrTelemetryItem(
                id: "structure",
                label: "Structure",
                value: project.segmentCount == 0 ? "--" : "\(project.segmentCount)",
                detail: project.segmentCount == 0 ? "No segments" : "Segments",
                tone: project.segmentCount == 0 ? .muted : .indigo
            )
        ]
    }

    func presentImport() {
        isImportPresented = true
    }

    func cancelImport() {
        isImportPresented = false
    }

    func handleImport(result: Result<URL, Error>) {
        switch result {
        case .success(let url):
            project.importState = .reading
            project.sourceName = url.lastPathComponent
            project.sourceDuration = nil
            project.detectedBpm = nil
            project.bpmConfidence = nil
            project.correctionState = .analyzing
            project.segmentCount = 0
            playheadProgress = 0
            isPlaying = false

            Task {
                do {
                    let summary = try await audioEngine.inspectSource(at: url)
                    project.sourceName = summary.fileName
                    project.sourceDuration = summary.duration
                    project.importState = .loaded
                    project.correctionState = .conservative
                } catch {
                    project.importState = .failed
                    project.correctionState = .standby
                    project.sourceDuration = nil
                }
            }
        case .failure:
            project.importState = .failed
            project.correctionState = .standby
        }
    }

    func togglePlayback() {
        guard project.hasSource else {
            presentImport()
            return
        }

        isPlaying.toggle()
        playheadProgress = isPlaying ? max(playheadProgress, 0.08) : playheadProgress
    }

    func resetPlayhead() {
        isPlaying = false
        playheadProgress = 0
    }
}
