# macOS Notarization & DMG Stapling Specification

This document details the macOS codesigning, notarization, and DMG stapling procedure required for Gatekeeper compliance on modern macOS versions (macOS 12 through macOS 15+ Sequoia).

---

## Overview

macOS Gatekeeper requires all distributed binary bundles (.app) and disk image wrappers (.dmg) to be:
1. Signed with a valid Apple Developer ID Application certificate.
2. Hardened with runtime flags (`--options runtime`).
3. Notarized via Apple's Notary Service (`notarytool`).
4. Stapled with the cryptographic notarization ticket embedded directly into the DMG wrapper.

---

## Bundler & Notarization Pipeline

### 1. App Bundle Signing & Notarization
Tauri v2 signs the embedded `.app` binary and inner framework libraries using `codesign` and submits the bundle to Apple's notarization service.

### 2. DMG Container Notarization & Stapling
When distributing via Disk Image (.dmg), the outer DMG container must be explicitly submitted and stapled:

```bash
# Submit DMG to Apple Notary API
xcrun notarytool submit "$DMG_PATH" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait

# Staple notarization ticket to the DMG
xcrun stapler staple "$DMG_PATH"

# Validate ticket attachment
xcrun stapler validate "$DMG_PATH"
spctl --assess --type open --context context:primary-signature -v "$DMG_PATH"
```

---

## Homebrew Cask Verification

For distribution via Homebrew Cask, verify:
- `spctl` assessment succeeds without network lookups.
- Quarantine flags (`xattr -d com.apple.quarantine`) are not required by end-users.

---

© 2026 MasterZ1311 · Rheo — Sovereign Local-First AI Voice Studio
