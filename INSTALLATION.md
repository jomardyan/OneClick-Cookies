# Installation Guide

## Quick Start

### For Users

#### Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "OneClick Cookies"
3. Click "Add to Chrome"
4. Confirm installation

#### Edge Add-ons (Coming Soon)
1. Visit Microsoft Edge Add-ons
2. Search for "OneClick Cookies"
3. Click "Get"
4. Confirm installation

### For Developers

#### Install from Source

1. **Download the Extension**
   ```bash
   git clone https://github.com/jomardyan/OneClick-Cookies.git
   cd OneClick-Cookies
   ```

2. **Validate the Extension**
   ```bash
   chmod +x validate.sh
   ./validate.sh
   ```

3. **Load in Chrome**
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `OneClick-Cookies` directory
   - The extension icon should appear in your toolbar

4. **Load in Edge**
   - Open Microsoft Edge
   - Navigate to `edge://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `OneClick-Cookies` directory
   - The extension icon should appear in your toolbar

## First Time Setup

1. **Click the Extension Icon**
   - The popup will open showing three mode options

2. **Choose Your Mode**
   - **Manual**: You control when to accept/deny (recommended for first-time users)
   - **Auto-Accept**: Automatically accept all cookie banners
   - **Auto-Deny**: Automatically deny all cookie banners

3. **Optional: Enable Debug Mode**
   - Scroll to Settings section
   - Check "Debug Mode (Console Logging)"
   - Open browser console (F12) to see detection logs

## Testing the Extension

1. **Visit a Test Site**
   - Open `file:///path/to/OneClick-Cookies/test/test-page.html` in your browser
   - Or visit any major news site (e.g., bbc.com, cnn.com)

2. **Test Manual Mode**
   - Click the extension icon
   - Select "Manual" mode
   - Click "Accept All Cookies" or "Deny All Cookies"
   - Check the console for logs

3. **Test Auto Modes**
   - Click the extension icon
   - Select "Auto Accept" or "Auto Deny"
   - Reload the page
   - The banner should be handled automatically

## Troubleshooting

### Extension Not Loading

**Problem**: "Manifest file is missing or unreadable"
- **Solution**: Make sure you selected the root `OneClick-Cookies` folder, not a subfolder

**Problem**: "Failed to load extension"
- **Solution**: Run `./validate.sh` to check for missing files or syntax errors

### Banner Not Detected

**Problem**: Extension doesn't detect a cookie banner
- **Solution 1**: Enable Debug Mode and check console logs
- **Solution 2**: The banner might be in an iframe (not currently supported)
- **Solution 3**: Submit an issue with the website URL so we can add support

### Buttons Not Clicking

**Problem**: Extension detects banner but doesn't click buttons
- **Solution 1**: Try manual mode and check console logs
- **Solution 2**: Some sites use complex click handlers - report the issue
- **Solution 3**: The site might have a new CMP not in our database

### Statistics Not Updating

**Problem**: Statistics show 0 even after visiting sites
- **Solution**: Statistics only track sites with detected banners

### Popup Not Opening

**Problem**: Clicking extension icon does nothing
- **Solution 1**: Check if popup.html exists in the popup folder
- **Solution 2**: Right-click the icon and select "Inspect popup" to see errors
- **Solution 3**: Reload the extension

## Advanced Configuration

### Adding Domains to Whitelist

1. Navigate to the domain you want to whitelist
2. Click the extension icon
3. Click "Add to Whitelist"
4. The domain will always auto-accept cookies from now on

### Adding Domains to Blacklist

1. Navigate to the domain you want to blacklist
2. Click the extension icon
3. Click "Add to Blacklist"
4. The extension will ignore banners on this domain

### Removing from Lists

1. Click the extension icon
2. Find the domain in Whitelisted or Blacklisted section
3. Click the × button next to the domain

## Permissions Explained

### Why does the extension need these permissions?

- **storage**: Save your preferences and statistics locally
- **activeTab**: Access the current tab when you click manual buttons
- **scripting**: Inject content scripts to detect and interact with banners
- **host_permissions (http://*/* and https://*/*)**: Access all websites to detect cookie banners

### Privacy Guarantee

- ✅ All data stored locally on your device
- ✅ No data sent to external servers
- ✅ No tracking or telemetry
- ✅ No personal information collected
- ✅ Open source - verify the code yourself

## Uninstallation

### Chrome
1. Go to `chrome://extensions/`
2. Find "OneClick Cookies"
3. Click "Remove"
4. Confirm removal

### Edge
1. Go to `edge://extensions/`
2. Find "OneClick Cookies"
3. Click "Remove"
4. Confirm removal

**Note**: Uninstalling will delete all your preferences and statistics.

## Getting Help

- **Documentation**: See [README.md](README.md) for usage guide
- **Development**: See [DEVELOPMENT.md](DEVELOPMENT.md) for technical details
- **Issues**: Report bugs on [GitHub Issues](https://github.com/jomardyan/OneClick-Cookies/issues)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines

## System Requirements

- **Chrome**: Version 88 or higher
- **Edge**: Version 88 or higher
- **Brave**: Latest version
- **Other Chromium browsers**: Latest version

## What's Next?

After installation:
1. Browse normally and let the extension work for you
2. Check statistics periodically to see how many banners were handled
3. Adjust whitelist/blacklist as needed
4. Report any sites where detection doesn't work
5. Consider contributing to improve the CMP database

Enjoy a cleaner browsing experience! 🍪✨
