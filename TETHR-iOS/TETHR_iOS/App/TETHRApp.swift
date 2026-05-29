import SwiftUI

@main
struct TETHRApp: App {
    init() {
        TethrTheme.registerFonts()
    }

    var body: some Scene {
        WindowGroup {
            TethrRootView()
        }
    }
}
