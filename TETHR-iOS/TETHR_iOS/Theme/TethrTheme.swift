import SwiftUI

enum TethrTheme {
    static let matteBlack = Color(red: 12 / 255, green: 12 / 255, blue: 14 / 255)
    static let panel = Color(red: 18 / 255, green: 18 / 255, blue: 22 / 255)
    static let panelRaised = Color(red: 24 / 255, green: 24 / 255, blue: 29 / 255)
    static let border = Color.white.opacity(0.12)
    static let borderStrong = Color.white.opacity(0.22)
    static let text = Color.white.opacity(0.92)
    static let textMid = Color.white.opacity(0.58)
    static let textLow = Color.white.opacity(0.34)
    static let cyan = Color(red: 51 / 255, green: 204 / 255, blue: 204 / 255)
    static let indigo = Color(red: 102 / 255, green: 102 / 255, blue: 255 / 255)
    static let purple = Color(red: 153 / 255, green: 51 / 255, blue: 255 / 255)

    static func color(for tone: TethrSignalTone) -> Color {
        switch tone {
        case .cyan:
            return cyan
        case .indigo:
            return indigo
        case .purple:
            return purple
        case .muted:
            return textLow
        }
    }
}

struct TethrPanelModifier: ViewModifier {
    var isRaised = false

    func body(content: Content) -> some View {
        content
            .background(isRaised ? TethrTheme.panelRaised : TethrTheme.panel)
            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .stroke(TethrTheme.border, lineWidth: 1)
            )
    }
}

extension View {
    func tethrPanel(isRaised: Bool = false) -> some View {
        modifier(TethrPanelModifier(isRaised: isRaised))
    }
}

struct TethrSignalButtonStyle: ButtonStyle {
    var tone: TethrSignalTone = .cyan

    func makeBody(configuration: Configuration) -> some View {
        let color = TethrTheme.color(for: tone)

        configuration.label
            .font(.system(size: 13, weight: .bold, design: .default))
            .textCase(.uppercase)
            .tracking(1.2)
            .foregroundStyle(color)
            .frame(minHeight: 46)
            .padding(.horizontal, 14)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(color.opacity(configuration.isPressed ? 0.16 : 0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .stroke(color.opacity(configuration.isPressed ? 0.72 : 0.44), lineWidth: 1)
            )
            .shadow(color: color.opacity(configuration.isPressed ? 0.16 : 0.08), radius: 8, y: 0)
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
    }
}
