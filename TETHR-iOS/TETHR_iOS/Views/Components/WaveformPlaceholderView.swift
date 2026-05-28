import SwiftUI

struct WaveformPlaceholderView: View {
    let isLoaded: Bool
    let playheadProgress: Double

    private let bars: [Double] = [
        0.18, 0.32, 0.24, 0.54, 0.78, 0.36, 0.28, 0.46,
        0.66, 0.42, 0.22, 0.58, 0.84, 0.52, 0.34, 0.48,
        0.74, 0.62, 0.26, 0.38, 0.56, 0.88, 0.44, 0.30,
        0.68, 0.76, 0.40, 0.24, 0.50, 0.70, 0.60, 0.34,
        0.22, 0.46, 0.64, 0.82, 0.58, 0.36, 0.28, 0.52,
        0.72, 0.44, 0.32, 0.66, 0.86, 0.48, 0.30, 0.42,
        0.62, 0.78, 0.54, 0.24, 0.36, 0.56, 0.74, 0.40,
        0.26, 0.50, 0.68, 0.80, 0.46, 0.34, 0.58, 0.72
    ]

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                waveform(in: geometry.size)

                Rectangle()
                    .fill(TethrTheme.cyan)
                    .frame(width: 2)
                    .shadow(color: TethrTheme.cyan.opacity(0.28), radius: 6)
                    .offset(x: max(0, min(1, playheadProgress)) * geometry.size.width)
                    .opacity(isLoaded ? 1 : 0.22)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 16)
        }
        .tethrPanel(isRaised: true)
    }

    private func waveform(in size: CGSize) -> some View {
        HStack(alignment: .center, spacing: 3) {
            ForEach(bars.indices, id: \.self) { index in
                Capsule(style: .continuous)
                    .fill(barColor(for: index))
                    .frame(maxWidth: .infinity)
                    .frame(height: max(8, size.height * bars[index] * 0.72))
            }
        }
    }

    private func barColor(for index: Int) -> Color {
        guard isLoaded else {
            return TethrTheme.textLow.opacity(0.46)
        }

        if index % 11 == 0 {
            return TethrTheme.purple.opacity(0.72)
        }
        if index % 7 == 0 {
            return TethrTheme.indigo.opacity(0.72)
        }
        return TethrTheme.cyan.opacity(0.70)
    }
}

#Preview {
    WaveformPlaceholderView(isLoaded: true, playheadProgress: 0.34)
        .frame(height: 190)
        .padding()
        .background(TethrTheme.matteBlack)
}
