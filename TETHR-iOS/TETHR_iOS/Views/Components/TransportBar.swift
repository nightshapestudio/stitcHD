import SwiftUI

struct TransportBar: View {
    let sourceTitle: String
    let durationText: String
    let isPlaying: Bool
    let playheadProgress: Double
    let onReset: () -> Void
    let onTogglePlayback: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                iconButton(systemName: "backward.end.fill", action: onReset)
                iconButton(systemName: isPlaying ? "pause.fill" : "play.fill", action: onTogglePlayback)

                VStack(alignment: .leading, spacing: 7) {
                    HStack {
                        Text(sourceTitle)
                            .font(TethrFont.regular(13))
                            .lineLimit(1)
                            .minimumScaleFactor(0.64)
                            .foregroundStyle(TethrTheme.text)

                        Spacer(minLength: 8)

                        Text(durationText)
                            .font(TethrFont.light(12))
                            .foregroundStyle(TethrTheme.textMid)
                    }

                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(TethrTheme.border)
                                .frame(height: 2)

                            Rectangle()
                                .fill(TethrTheme.cyan)
                                .frame(width: geometry.size.width * max(0, min(1, playheadProgress)), height: 2)
                        }
                    }
                    .frame(height: 2)
                }
            }
        }
        .padding(12)
        .tethrPanel(isRaised: true)
    }

    private func iconButton(systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 15, weight: .bold))
                .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .foregroundStyle(TethrTheme.cyan)
        .background(TethrTheme.cyan.opacity(0.08))
        .clipShape(Rectangle())
        .overlay(
            Rectangle()
                .stroke(TethrTheme.cyan.opacity(0.34), lineWidth: 1)
        )
    }
}

#Preview {
    TransportBar(
        sourceTitle: "source.wav",
        durationText: "03:42",
        isPlaying: false,
        playheadProgress: 0.28,
        onReset: {},
        onTogglePlayback: {}
    )
    .padding()
    .background(TethrTheme.matteBlack)
}
