# 🍪 OneClick Cookies

**OneClick Cookies** is a privacy-focused browser extension that automatically detects and handles cookie consent banners on websites. Built with Manifest V3 for Microsoft Edge and Chrome.

## Features

### 🎯 Core Functionality
- **Automatic Detection**: Multi-layered detection strategy identifies cookie consent banners from major CMPs (OneTrust, Cookiebot, Quantcast, TrustArc, Didomi, and more)
- **One-Click Control**: Accept or deny all cookies with a single click
- **Three Modes**:
  - **Manual**: Manually control each banner
  - **Auto-Accept**: Automatically accept all cookie banners
  - **Auto-Deny**: Automatically deny all cookie banners
- **Multi-Language Support**: Works with banners in English, Polish, German, French, and Spanish

### 🔧 Advanced Features
- **Domain Management**: Whitelist domains for auto-accept, or blacklist to skip
- **Statistics Tracking**: Monitor banners detected, handled, and sites visited
- **Shadow DOM Support**: Detects banners even in shadow DOM elements
- **Dynamic Detection**: Mutation observers catch dynamically loaded banners
- **Performance Optimized**: < 50ms detection time, minimal DOM queries

### 🛡️ Privacy First
- No telemetry or tracking
- All data stored locally
- No external connections
- Open source and transparent

## Installation

### From Source (Development)

1. Clone the repository:
```bash
git clone https://github.com/jomardyan/OneClick-Cookies.git
cd OneClick-Cookies
```

2. Load the extension in your browser:

**Chrome:**
- Open `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `OneClick-Cookies` folder

**Edge:**
- Open `edge://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `OneClick-Cookies` folder

## Usage

### Quick Start

1. Click the extension icon in your browser toolbar
2. Select your preferred mode:
   - **Manual**: Control each banner individually
   - **Auto-Accept**: Automatically accept all banners
   - **Auto-Deny**: Automatically deny all banners

### Manual Mode

1. Navigate to any website with a cookie banner
2. Click the extension icon
3. Click "Accept All Cookies" or "Deny All Cookies"

### Domain Management

- **Whitelist**: Domains where cookies are always accepted
- **Blacklist**: Domains where the extension won't take action

Add the current domain by clicking:
- "Add to Whitelist" - always accept cookies on this site
- "Add to Blacklist" - never handle banners on this site

### Statistics

Track your privacy:
- **Banners Detected**: Total number of cookie banners found
- **Banners Handled**: Number of banners you've accepted/denied
- **Sites Visited**: Unique domains visited

Reset statistics anytime with the "Reset Statistics" button.

## Technical Details

### Architecture

- **Manifest V3**: Modern extension format for Edge and Chrome
- **Service Worker**: Background processing without persistent pages
- **Content Scripts**: DOM manipulation and banner detection
- **Storage API**: Synced preferences across devices

### Detection Strategy

1. **Known CMP Database**: Matches against selectors for major consent platforms
2. **Keyword Detection**: Finds banners by matching multilingual keywords
3. **CSS Pattern Matching**: Identifies overlays with consent-like characteristics
4. **Shadow DOM Support**: Searches within shadow roots for hidden banners
5. **Mutation Observers**: Detects dynamically loaded content

### Supported CMPs

- OneTrust
- Cookiebot
- Quantcast Choice
- TrustArc
- Didomi
- Cookie Information
- Osano
- Klaro
- CookieConsent
- And many more through generic detection

## File Structure

```
OneClick-Cookies/
├── manifest.json           # Extension configuration
├── background/
│   └── service-worker.js  # Background service worker
├── content/
│   ├── detector.js        # Banner detection engine
│   └── content-script.js  # Main content script
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── rules/
│   └── consent-patterns.json  # CMP database
└── assets/
    └── icons/             # Extension icons
```

## Development

### Debug Mode

Enable debug mode in the popup settings to see console logs:
1. Open the popup
2. Check "Debug Mode (Console Logging)"
3. Open the browser console (F12) to see detection logs

### Adding New CMPs

Edit `rules/consent-patterns.json` to add new consent management platforms:

```json
{
  "name": "NewCMP",
  "selectors": {
    "banner": ["#new-cmp-banner"],
    "acceptButton": [".accept-btn"],
    "rejectButton": [".reject-btn"]
  }
}
```

## Browser Compatibility

- ✅ Google Chrome 88+
- ✅ Microsoft Edge 88+
- ✅ Brave Browser
- ✅ Other Chromium-based browsers

## Permissions

The extension requires these permissions:
- **storage**: Save user preferences and statistics
- **activeTab**: Access current tab for manual actions
- **scripting**: Inject content scripts dynamically
- **host_permissions**: Access all websites to detect banners

## Privacy Policy

OneClick Cookies:
- Does NOT collect any personal data
- Does NOT send any data to external servers
- Does NOT track your browsing history
- Stores preferences locally on your device only

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

Built with privacy in mind for users who value their online privacy and want a cleaner browsing experience.

## Support

If you encounter any issues or have suggestions:
- Open an issue on [GitHub](https://github.com/jomardyan/OneClick-Cookies/issues)
- Check existing issues for solutions

---

Made with ❤️ for privacy-conscious users