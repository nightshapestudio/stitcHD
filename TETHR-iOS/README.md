# TETHR iOS

Native SwiftUI foundation for NIGHTSHAPE TETHR.

TETHR shares the NIGHTSHAPE visual universe with DRUMKIT, but this app is a separate precision audio repair instrument. The existing React/Web Audio project remains a prototype/reference for workflow and algorithm behavior.

## Validate

```sh
xcodebuild -project TETHR_iOS.xcodeproj -scheme TETHR_iOS -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/tethr-ios-derived build
```
