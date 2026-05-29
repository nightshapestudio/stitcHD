import CoreText
import SwiftUI

enum TethrTheme {
    static let matteBlack = Color(red: 12 / 255, green: 12 / 255, blue: 14 / 255)
    static let panel = Color(red: 15 / 255, green: 15 / 255, blue: 18 / 255)
    static let panelRaised = Color(red: 18 / 255, green: 18 / 255, blue: 22 / 255)

    static let text = Color(red: 224 / 255, green: 223 / 255, blue: 242 / 255)
    static let textMid = Color(red: 194 / 255, green: 192 / 255, blue: 218 / 255)
    static let textLow = Color(red: 170 / 255, green: 166 / 255, blue: 200 / 255)
    static let textGhost = Color(red: 47 / 255, green: 45 / 255, blue: 64 / 255)

    static let border = textLow.opacity(0.16)
    static let borderStrong = textMid.opacity(0.42)
    static let cyan = Color(red: 0 / 255, green: 215 / 255, blue: 212 / 255)
    static let cyanHigh = Color(red: 22 / 255, green: 242 / 255, blue: 234 / 255)
    static let indigo = Color(red: 79 / 255, green: 99 / 255, blue: 255 / 255)
    static let purple = Color(red: 166 / 255, green: 77 / 255, blue: 255 / 255)

    private static let fontResourceNames = [
        "NIGHTSHAPE-UI-Bold",
        "NIGHTSHAPE-UI-Regular",
        "NIGHTSHAPE-UI-Light"
    ]

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

    static func registerFonts() {
        for fontName in fontResourceNames {
            guard let fontURL = Bundle.main.url(
                forResource: fontName,
                withExtension: "ttf",
                subdirectory: "Fonts"
            ) ?? Bundle.main.url(
                forResource: fontName,
                withExtension: "ttf"
            ) else {
                continue
            }

            _ = CTFontManagerRegisterFontsForURL(fontURL as CFURL, .process, nil)
        }
    }
}

enum TethrFont {
    static func display(_ size: CGFloat) -> Font {
        .custom("NIGHTSHAPEUI-Bold", size: size)
    }

    static func bold(_ size: CGFloat) -> Font {
        .custom("NIGHTSHAPEUI-Bold", size: size)
    }

    static func regular(_ size: CGFloat) -> Font {
        .custom("NIGHTSHAPEUI-Regular", size: size)
    }

    static func light(_ size: CGFloat) -> Font {
        .custom("NIGHTSHAPEUI-Light", size: size)
    }
}

struct TethrPanelModifier: ViewModifier {
    var isRaised = false

    func body(content: Content) -> some View {
        content
            .background(isRaised ? TethrTheme.panelRaised : TethrTheme.panel)
            .clipShape(Rectangle())
            .overlay(
                Rectangle()
                    .stroke(isRaised ? TethrTheme.borderStrong : TethrTheme.border, lineWidth: 1)
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
            .font(TethrFont.bold(13))
            .textCase(.uppercase)
            .tracking(1.2)
            .foregroundStyle(color)
            .frame(minHeight: 46)
            .padding(.horizontal, 14)
            .background(
                Rectangle()
                    .fill(color.opacity(configuration.isPressed ? 0.12 : 0.055))
            )
            .overlay(
                Rectangle()
                    .stroke(color.opacity(configuration.isPressed ? 0.70 : 0.48), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
    }
}
