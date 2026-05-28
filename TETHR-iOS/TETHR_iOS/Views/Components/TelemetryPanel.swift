import SwiftUI

struct TelemetryPanel: View {
    let items: [TethrTelemetryItem]

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(items) { item in
                TelemetryCell(item: item)
            }
        }
    }
}

private struct TelemetryCell: View {
    let item: TethrTelemetryItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(item.label)
                .font(.system(size: 10, weight: .bold, design: .default))
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(TethrTheme.textLow)

            Text(item.value)
                .font(.system(size: 18, weight: .bold, design: .default))
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                .foregroundStyle(TethrTheme.color(for: item.tone))

            Text(item.detail)
                .font(.system(size: 12, weight: .medium, design: .default))
                .lineLimit(1)
                .minimumScaleFactor(0.62)
                .foregroundStyle(TethrTheme.textMid)
        }
        .frame(maxWidth: .infinity, minHeight: 92, alignment: .topLeading)
        .padding(12)
        .tethrPanel()
    }
}

#Preview {
    TelemetryPanel(items: [
        TethrTelemetryItem(id: "source", label: "Source", value: "Loaded", detail: "track.wav", tone: .cyan),
        TethrTelemetryItem(id: "bpm", label: "BPM", value: "128.0", detail: "92%", tone: .indigo),
        TethrTelemetryItem(id: "correction", label: "Correction", value: "Ready", detail: "Queued", tone: .purple),
        TethrTelemetryItem(id: "structure", label: "Structure", value: "06", detail: "Segments", tone: .indigo)
    ])
    .padding()
    .background(TethrTheme.matteBlack)
}
