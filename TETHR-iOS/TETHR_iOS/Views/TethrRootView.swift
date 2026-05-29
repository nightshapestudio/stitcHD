import SwiftUI
import UniformTypeIdentifiers

struct TethrRootView: View {
    @StateObject private var viewModel = TethrEditorViewModel()

    var body: some View {
        ZStack {
            TethrTheme.matteBlack.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                header
                importTargets

                WaveformPlaceholderView(
                    isLoaded: viewModel.project.hasSource,
                    playheadProgress: viewModel.playheadProgress
                )
                .frame(height: 188)

                TelemetryPanel(items: viewModel.telemetryItems)

                Spacer(minLength: 0)

                TransportBar(
                    sourceTitle: viewModel.sourceTitle,
                    durationText: viewModel.project.durationText,
                    isPlaying: viewModel.isPlaying,
                    playheadProgress: viewModel.playheadProgress,
                    onReset: viewModel.resetPlayhead,
                    onTogglePlayback: viewModel.togglePlayback
                )
            }
            .padding(.horizontal, 18)
            .padding(.top, 18)
            .padding(.bottom, 12)
        }
        .preferredColorScheme(.dark)
        .fileImporter(
            isPresented: $viewModel.isImportPresented,
            allowedContentTypes: [.audio],
            allowsMultipleSelection: false,
            onCompletion: handleImport
        )
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 16) {
            TethrWordmark(size: 46)
                .padding(.top, 2)

            Spacer(minLength: 10)

            TethrBpmReadout(viewModel: viewModel)
        }
    }

    private var importTargets: some View {
        HStack(spacing: 10) {
            TethrImportTargetCard(
                title: "TAKE A",
                subtitle: viewModel.composition.source(in: .primary)?.fileName ?? "IMPORT FILE",
                isLoaded: viewModel.composition.source(in: .primary) != nil,
                tone: .cyan,
                action: { viewModel.presentImport(slot: .primary) }
            )

            TethrImportTargetCard(
                title: "TAKE B",
                subtitle: viewModel.composition.source(in: .alternate)?.fileName ?? "IMPORT FILE",
                isLoaded: viewModel.composition.source(in: .alternate) != nil,
                tone: .purple,
                action: { viewModel.presentImport(slot: .alternate) }
            )
        }
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else {
                viewModel.cancelImport()
                return
            }
            viewModel.handleImport(result: .success(url))
        case .failure(let error):
            viewModel.handleImport(result: .failure(error))
        }
    }
}

private struct TethrWordmark: View {
    let size: CGFloat

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("TETHR")
                .font(TethrFont.display(size))
                .tracking(size * 0.035)
                .foregroundStyle(
                    LinearGradient(
                        colors: [TethrTheme.cyanHigh, TethrTheme.indigo, TethrTheme.purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .lineLimit(1)
                .minimumScaleFactor(0.72)

            Text("B  Y     N  I  G  H  T  S  H  A  P  E")
                .font(TethrFont.light(10.5))
                .tracking(0)
                .foregroundStyle(TethrTheme.textMid.opacity(0.76))
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                .accessibilityLabel("BY NIGHTSHAPE")
        }
        .accessibilityElement(children: .combine)
    }
}

private struct TethrBpmReadout: View {
    @ObservedObject var viewModel: TethrEditorViewModel
    @State private var dragBaseBpm: Int?
    @State private var isEditing = false
    @State private var draftBpm = ""
    @FocusState private var isFieldFocused: Bool

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            Text("BPM")
                .font(TethrFont.light(9))
                .tracking(2.4)
                .foregroundStyle(TethrTheme.textLow.opacity(0.78))

            Group {
                if isEditing {
                    TextField("", text: $draftBpm)
                        .font(TethrFont.bold(38))
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .focused($isFieldFocused)
                        .foregroundStyle(TethrTheme.text)
                        .frame(width: 88, height: 46, alignment: .trailing)
                        .onChange(of: draftBpm) { _, newValue in
                            filterAndApplyDraft(newValue)
                        }
                        .onChange(of: isFieldFocused) { _, focused in
                            if !focused { isEditing = false }
                        }
                } else {
                    Text(viewModel.project.bpmText)
                        .font(TethrFont.bold(40))
                        .foregroundStyle(TethrTheme.text)
                        .frame(width: 88, height: 46, alignment: .trailing)
                        .contentShape(Rectangle())
                        .onTapGesture(count: 2, perform: beginEditing)
                        .gesture(
                            DragGesture(minimumDistance: 2)
                                .onChanged { value in
                                    if dragBaseBpm == nil {
                                        dragBaseBpm = viewModel.currentMasterBpm
                                    }

                                    if let dragBaseBpm {
                                        viewModel.adjustMasterBpm(
                                            from: dragBaseBpm,
                                            verticalTranslation: Double(value.translation.height)
                                        )
                                    }
                                }
                                .onEnded { _ in
                                    dragBaseBpm = nil
                                }
                        )
                }
            }

            Button("TAP", action: viewModel.registerTapTempo)
                .buttonStyle(TethrSignalButtonStyle(tone: .indigo))
                .frame(width: 88)
        }
    }

    private func beginEditing() {
        draftBpm = "\(viewModel.currentMasterBpm)"
        isEditing = true
        isFieldFocused = true
    }

    private func filterAndApplyDraft(_ newValue: String) {
        let filtered = String(newValue.filter(\.isNumber))
        if filtered != newValue {
            draftBpm = filtered
            return
        }

        guard let bpm = Int(filtered) else { return }
        viewModel.setMasterBpm(bpm)
    }
}

private struct TethrImportTargetCard: View {
    let title: String
    let subtitle: String
    let isLoaded: Bool
    let tone: TethrSignalTone
    let action: () -> Void

    private var accent: Color {
        TethrTheme.color(for: tone)
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(TethrFont.bold(13))
                    .tracking(2.2)
                    .foregroundStyle(isLoaded ? accent : TethrTheme.textMid)

                Text(subtitle)
                    .font(TethrFont.light(10))
                    .tracking(1.5)
                    .lineLimit(1)
                    .minimumScaleFactor(0.62)
                    .foregroundStyle(isLoaded ? TethrTheme.text : TethrTheme.textLow.opacity(0.70))
            }
            .frame(maxWidth: .infinity, minHeight: 84, alignment: .leading)
            .padding(14)
            .background(TethrTheme.panel.opacity(isLoaded ? 1 : 0.92))
            .overlay(
                Rectangle()
                    .stroke(isLoaded ? accent.opacity(0.56) : TethrTheme.border, lineWidth: 1)
            )
            .overlay(TethrCornerCaps(color: TethrTheme.cyan))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(title), \(subtitle)")
    }
}

private struct TethrCornerCaps: View {
    let color: Color
    private let length: CGFloat = 26
    private let thickness: CGFloat = 2

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                cap(rotation: .degrees(0))
                    .position(x: length / 2, y: length / 2)

                cap(rotation: .degrees(90))
                    .position(x: geometry.size.width - length / 2, y: length / 2)

                cap(rotation: .degrees(270))
                    .position(x: length / 2, y: geometry.size.height - length / 2)

                cap(rotation: .degrees(180))
                    .position(x: geometry.size.width - length / 2, y: geometry.size.height - length / 2)
            }
        }
        .allowsHitTesting(false)
    }

    private func cap(rotation: Angle) -> some View {
        ZStack(alignment: .topLeading) {
            Rectangle()
                .fill(color)
                .frame(width: length, height: thickness)

            Rectangle()
                .fill(color)
                .frame(width: thickness, height: length)
        }
        .frame(width: length, height: length)
        .rotationEffect(rotation)
    }
}

#Preview {
    TethrRootView()
}
