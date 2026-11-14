# Personal desktop design · 0.3.1

- Left navigation replaces the horizontal tabs. Content has a large contextual heading, two item cards or a dedicated adjustment card, a short workflow strip and a status line.
- Midnight navy / champagne gold match the generated wings icon. Selected presets have a gold border; an unapplied-change badge stays visible while navigating.
- Korean uses locally installed Noto Sans KR with Malgun Gothic fallback. Numeric values use Windows Bahnschrift. No network font request or font installation.
- Game connection controls are grouped under App settings. Item request and game-restart tuning semantics are unchanged.
- Native WinForms: no web renderer, animation loop or additional background worker. 1224×800 client area; this release was visually checked on the current PC, not every DPI/small-screen combination.
- The seven icon sizes are PNG-encoded ICO entries. The first GetHicon/Save conversion displayed incorrectly; direct PNG frames with explicit source pixel bounds fixed it, verified by extraction and the running app.
- Validation: existing suite 12 checks, executable self-test, actual item/settings/survival screens. No game values were applied during design verification.

Build outputs now live in bin/ so an open source preview cannot lock the compiler's output. Run Build.ps1, bin/IcarusSoloItems.exe --suite-test, then Package.ps1. See RELEASE.md for publishing.
