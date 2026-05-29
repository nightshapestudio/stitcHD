import Foundation

@MainActor
final class TethrEditorViewModel: ObservableObject {
    @Published private(set) var project = TethrProject()
    @Published private(set) var composition = TethrCompositionState()
    @Published private(set) var playheadProgress: Double = 0
    @Published private(set) var isPlaying = false
    @Published var isImportPresented = false

    private let bpmRange = 60...200
    private let audioEngine: TethrAudioEngineProtocol
    private let sharedSegmentPipeline: TethrSharedSegmentAnalysisPipeline
    private let compositePlanner: TethrCompositePlanning
    private var pendingImportSlot: TethrSourceSlot = .primary
    private var tapTempoHistory: [Date] = []

    init(
        audioEngine: TethrAudioEngineProtocol = TethrAudioEngine(),
        sharedSegmentPipeline: TethrSharedSegmentAnalysisPipeline = TethrSharedSegmentAnalysisPipeline(),
        compositePlanner: TethrCompositePlanning = TethrCompositePlanner()
    ) {
        self.audioEngine = audioEngine
        self.sharedSegmentPipeline = sharedSegmentPipeline
        self.compositePlanner = compositePlanner
    }

    var sourceTitle: String {
        project.sourceName ?? "No source"
    }

    var currentMasterBpm: Int {
        project.masterBpm ?? project.detectedBpm.map { Int($0.rounded()) } ?? 128
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
                tone: project.masterBpm == nil && project.detectedBpm == nil ? .muted : .indigo
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

    func presentImport(slot: TethrSourceSlot = .primary) {
        pendingImportSlot = slot
        isImportPresented = true
    }

    func cancelImport() {
        isImportPresented = false
    }

    func handleImport(result: Result<URL, Error>) {
        switch result {
        case .success(let url):
            let importSlot = pendingImportSlot
            project.importState = .reading
            if importSlot == .primary || project.sourceName == nil {
                project.sourceName = url.lastPathComponent
                project.sourceDuration = nil
                project.detectedBpm = nil
                project.masterBpm = nil
                project.isMasterBpmManual = false
                project.bpmConfidence = nil
            }
            project.correctionState = .analyzing
            project.segmentCount = 0
            playheadProgress = 0
            isPlaying = false

            Task {
                do {
                    let summary = try await audioEngine.inspectSource(at: url)
                    registerSource(summary, url: url, slot: importSlot)
                    if importSlot == .primary || project.sourceName == nil {
                        project.sourceName = summary.fileName
                        project.sourceDuration = summary.duration
                    }
                    project.importState = .loaded
                    project.correctionState = .conservative
                } catch {
                    project.importState = .failed
                    project.correctionState = .standby
                    if importSlot == .primary || project.sourceName == nil {
                        project.sourceDuration = nil
                    }
                }
            }
        case .failure:
            project.importState = .failed
            project.correctionState = .standby
        }
    }

    func setMasterBpm(_ bpm: Int) {
        project.masterBpm = clampedBpm(bpm)
        project.isMasterBpmManual = true
    }

    func adjustMasterBpm(from baseBpm: Int, verticalTranslation: Double) {
        let delta = Int((-verticalTranslation / 8).rounded())
        setMasterBpm(baseBpm + delta)
    }

    func registerTapTempo() {
        let now = Date()
        tapTempoHistory = tapTempoHistory.filter { now.timeIntervalSince($0) <= 2.2 }
        tapTempoHistory.append(now)

        guard tapTempoHistory.count >= 2 else { return }

        let intervals = zip(tapTempoHistory.dropFirst(), tapTempoHistory).map { current, previous in
            current.timeIntervalSince(previous)
        }
        let averageInterval = intervals.reduce(0, +) / Double(intervals.count)
        guard averageInterval > 0 else { return }

        setMasterBpm(Int((60 / averageInterval).rounded()))
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

    func registerSource(_ summary: TethrSourceSummary, url: URL?, slot: TethrSourceSlot) {
        let source = TethrSourceTrack(
            slot: slot,
            fileName: summary.fileName,
            duration: summary.duration,
            originalURL: url
        )
        composition.upsertSource(source)
        project.segmentCount = composition.sharedSegmentMap?.segments.count ?? 0

        Task {
            await analyzeSharedSegmentsIfReady()
        }
    }

    func selectSource(_ sourceID: TethrSourceTrack.ID, for segmentID: TethrSharedSegment.ID) {
        composition.selectSource(sourceID, for: segmentID)
        refreshCompositePlan()
    }

    private func analyzeSharedSegmentsIfReady() async {
        do {
            guard let segmentMap = try await sharedSegmentPipeline.analyzeIfReady(composition) else {
                refreshCompositePlan()
                return
            }

            composition.applySharedSegmentMap(segmentMap)
            project.segmentCount = segmentMap.segments.count
            project.detectedBpm = segmentMap.detectedBpm
            if project.masterBpm == nil {
                project.masterBpm = segmentMap.detectedBpm.map { clampedBpm(Int($0.rounded())) }
                project.isMasterBpmManual = false
            }
            project.bpmConfidence = segmentMap.confidence
            project.correctionState = .ready
            refreshCompositePlan()
        } catch {
            project.correctionState = .conservative
            refreshCompositePlan()
        }
    }

    private func refreshCompositePlan() {
        do {
            let plan = try compositePlanner.makePlan(from: composition)
            composition.updateCompositePlan(plan)
        } catch {
            composition.updateCompositePlan(.empty)
        }
    }

    private func clampedBpm(_ bpm: Int) -> Int {
        min(max(bpm, bpmRange.lowerBound), bpmRange.upperBound)
    }
}
