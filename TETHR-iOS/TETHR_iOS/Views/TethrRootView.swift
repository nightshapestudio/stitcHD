import SwiftUI
import UniformTypeIdentifiers

struct TethrRootView: View {
    @StateObject private var viewModel = TethrEditorViewModel()

    var body: some View {
        ZStack {
            TethrTheme.matteBlack.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                header
                WaveformPlaceholderView(
                    isLoaded: viewModel.project.hasSource,
                    playheadProgress: viewModel.playheadProgress
                )
                .frame(height: 190)

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
        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("TETHR")
                    .font(.system(size: 35, weight: .black, design: .default))
                    .tracking(5)
                    .foregroundStyle(TethrTheme.text)

                Text("AUDIO REPAIR")
                    .font(.system(size: 11, weight: .bold, design: .default))
                    .tracking(2)
                    .foregroundStyle(TethrTheme.indigo)
            }

            Spacer(minLength: 12)

            Button(action: viewModel.presentImport) {
                Label("Import", systemImage: "waveform")
                    .labelStyle(.titleAndIcon)
            }
            .buttonStyle(TethrSignalButtonStyle(tone: .cyan))
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

#Preview {
    TethrRootView()
}
