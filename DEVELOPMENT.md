# Development Guide

## Getting Started

### Prerequisites
- Chrome 88+ or Edge 88+
- Basic knowledge of browser extensions
- Text editor or IDE

### Loading the Extension

1. Open your browser's extension page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. Enable "Developer mode" (toggle in the top-right corner)

3. Click "Load unpacked" and select this directory

4. The extension icon should appear in your toolbar

## Project Structure

### manifest.json
The extension's configuration file. Key sections:
- `manifest_version`: Must be 3 for modern browsers
- `permissions`: Storage, activeTab, scripting
- `host_permissions`: Access to all HTTP/HTTPS sites
- `background`: Service worker configuration
- `content_scripts`: Scripts injected into web pages
- `action`: Popup configuration

### Background Service Worker
File: `background/service-worker.js`

The service worker:
- Manages storage and statistics
- Handles messages from content scripts and popup
- Tracks user preferences
- Coordinates between components

**Important**: Service workers are stateless and may be terminated at any time. Store all state in chrome.storage.

### Content Scripts
Files: `content/detector.js`, `content/content-script.js`

These scripts run on every webpage:
- `detector.js`: Detection engine for finding consent banners
- `content-script.js`: Main orchestration, handles user actions

Detection strategy:
1. Known CMP selectors (fastest, most accurate)
2. Keyword matching in overlays
3. CSS pattern matching
4. Shadow DOM inspection

### Popup UI
Files: `popup/popup.html`, `popup/popup.css`, `popup/popup.js`

The extension popup:
- Mode selection (manual, auto-accept, auto-deny)
- Manual action buttons
- Domain whitelist/blacklist management
- Statistics display
- Settings

### CMP Database
File: `rules/consent-patterns.json`

JSON database of known consent management platforms with their selectors.

Structure:
```json
{
  "knownCMPs": [...],
  "buttonPatterns": {...},
  "cssPatterns": {...},
  "keywords": {...}
}
```

## Development Workflow

### Making Changes

1. Edit the files
2. Go to browser extensions page
3. Click the refresh icon on the extension card
4. Test your changes

### Debugging

#### Enable Debug Mode
1. Click the extension icon
2. Check "Debug Mode (Console Logging)"
3. Open DevTools console (F12)

#### View Service Worker Logs
- Chrome/Edge: Extensions page → Extension card → "service worker" link

#### View Content Script Logs
- Open DevTools on any webpage
- Logs appear in the console with `[OneClick Cookies]` prefix

#### Inspect Popup
- Right-click the extension icon
- Select "Inspect popup"

### Common Issues

**Extension not detecting banners:**
- Check debug logs in console
- Verify the banner is visible (not display:none)
- Check if it's in an iframe (not currently supported)
- Add the CMP to consent-patterns.json

**Click not working:**
- Some sites use complex click handlers
- Try adjusting the click simulation in `clickElement()`
- Check if the button requires hover state first

**Service worker not responding:**
- Service workers can be terminated by the browser
- They restart on the next message
- Don't rely on global state outside of chrome.storage

## Testing

### Manual Testing Checklist

Test on various websites:
- [ ] News sites (e.g., bbc.com, cnn.com)
- [ ] E-commerce (e.g., amazon.com)
- [ ] Polish sites (e.g., wp.pl, onet.pl)
- [ ] German sites (e.g., spiegel.de)
- [ ] Sites with OneTrust
- [ ] Sites with Cookiebot
- [ ] Sites with Quantcast

Test scenarios:
- [ ] Auto-accept mode
- [ ] Auto-deny mode
- [ ] Manual accept
- [ ] Manual deny
- [ ] Whitelist a domain
- [ ] Blacklist a domain
- [ ] View statistics
- [ ] Reset statistics
- [ ] Toggle debug mode

### Performance Testing

The extension should:
- Detect banners in < 50ms
- Not cause visible page lag
- Use minimal memory (< 10MB)
- Not impact battery life

Check with:
- Chrome DevTools Performance tab
- Task Manager (chrome://system/)

## Adding New CMPs

To add support for a new consent platform:

1. Find the banner's unique selectors (ID or class)
2. Find the accept/reject button selectors
3. Add to `rules/consent-patterns.json`:

```json
{
  "name": "NewCMP",
  "selectors": {
    "banner": ["#new-cmp-dialog", ".new-cmp-container"],
    "acceptButton": ["#accept-btn", ".accept-all"],
    "rejectButton": ["#reject-btn", ".reject-all"]
  }
}
```

4. Test on a site using that CMP
5. Submit a pull request

## Code Style

- Use JSDoc comments for functions
- Handle errors with try-catch
- Log to console only in debug mode
- Use async/await for promises
- Keep functions focused and small
- Use meaningful variable names

## Security Considerations

- Never inject remote code
- Sanitize user input (domain names)
- Don't store sensitive data
- Minimize permissions
- Validate message sources
- Use CSP-compliant code

## Performance Tips

- Minimize DOM queries
- Use event delegation
- Debounce mutation observers
- Cache selectors when possible
- Avoid synchronous operations
- Use efficient CSS selectors

## Distribution

### Before Publishing

1. Test on all supported browsers
2. Verify all permissions are necessary
3. Update version in manifest.json
4. Create privacy policy
5. Prepare store listing materials
6. Create promotional images

### Chrome Web Store

1. Create developer account
2. Prepare store listing
3. Upload ZIP file
4. Submit for review

### Edge Add-ons Store

1. Register as Microsoft Partner
2. Prepare store listing
3. Upload ZIP file
4. Submit for review

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Edge Extensions](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/)
- [Web Extensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

## Support

For questions or issues:
- Check the [README.md](README.md)
- Search existing GitHub issues
- Open a new issue with details and logs
