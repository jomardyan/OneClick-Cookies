# Changelog

All notable changes to the OneClick Cookies extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-08

### Added
- Initial release of OneClick Cookies browser extension
- Manifest V3 implementation for Chrome and Edge compatibility
- Multi-layered cookie consent banner detection system:
  - Known CMP database (OneTrust, Cookiebot, Quantcast, TrustArc, Didomi, etc.)
  - Keyword-based detection in multiple languages (EN, PL, DE, FR, ES)
  - CSS pattern matching for generic banners
  - Shadow DOM support for hidden banners
  - Mutation observers for dynamically loaded content
- Three operating modes:
  - Manual: User controls each banner interaction
  - Auto-Accept: Automatically accept all cookie banners
  - Auto-Deny: Automatically deny all cookie banners
- User interface features:
  - Clean, modern popup design
  - Mode selection buttons
  - Manual action buttons (Accept/Deny)
  - Domain management (whitelist/blacklist)
  - Statistics tracking (banners detected, handled, sites visited)
  - Debug mode toggle
- Background service worker:
  - Statistics tracking and persistence
  - Configuration management
  - Message handling between components
  - Tab tracking for site visits
- Content scripts:
  - Banner detection engine with confidence scoring
  - Smart button interaction with fallback strategies
  - Realistic click event simulation
  - Multi-step flow handling
- Privacy features:
  - No telemetry or external connections
  - All data stored locally
  - No personal information collection
  - Privacy-first design principles
- Performance optimizations:
  - < 50ms banner detection
  - Minimal DOM queries
  - Efficient selector usage
  - Debounced mutation observers
- Comprehensive documentation:
  - README with usage instructions
  - DEVELOPMENT guide for contributors
  - CONTRIBUTING guidelines
  - INSTALLATION instructions
  - Inline JSDoc comments
- Development tools:
  - Validation script for checking extension integrity
  - Test page for manual testing
  - Icon assets in multiple sizes (16, 32, 48, 128px)

### Security
- No security vulnerabilities detected (CodeQL scan passed)
- Input validation for domain names
- Safe message passing between components
- Content Security Policy compliant code
- Minimal permission requirements

### Known Limitations
- Iframe-based banners not currently supported
- Some complex multi-step consent flows may require manual intervention
- Dark pattern detection is basic
- Limited to Chromium-based browsers (Chrome, Edge, Brave)

### Planned Features (Future Releases)
- Iframe support
- More CMP database entries
- Enhanced dark pattern detection
- Import/export settings
- Sync across devices (if user opts in)
- Firefox support
- Custom consent preferences (partial acceptance)

---

## Release Notes

### Version 1.0.0 - Initial Release

This is the first public release of OneClick Cookies, a privacy-focused browser extension that automatically handles cookie consent banners.

**Highlights:**
- ✅ Manifest V3 compliant
- ✅ Works on Chrome 88+ and Edge 88+
- ✅ Supports major CMPs and generic banners
- ✅ Multi-language support (5 languages)
- ✅ No tracking or telemetry
- ✅ Open source and transparent

**Installation:**
Load from source (Web Store submission coming soon):
1. Clone repository
2. Open chrome://extensions/ or edge://extensions/
3. Enable Developer mode
4. Load unpacked extension

**Feedback:**
Please report issues or suggestions on GitHub:
https://github.com/jomardyan/OneClick-Cookies/issues

---

[1.0.0]: https://github.com/jomardyan/OneClick-Cookies/releases/tag/v1.0.0
