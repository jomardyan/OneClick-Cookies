# Contributing to OneClick Cookies

Thank you for your interest in contributing to OneClick Cookies! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check if the bug has already been reported
2. Verify you're using the latest version
3. Test in a clean browser profile (no other extensions)

When creating a bug report, include:
- Browser name and version
- Extension version
- Steps to reproduce
- Expected vs. actual behavior
- Console logs (enable debug mode)
- Screenshots if applicable
- Website URL where the issue occurs

### Suggesting Features

Feature requests are welcome! Please:
1. Check if the feature has been requested
2. Explain the use case
3. Describe the expected behavior
4. Consider privacy implications

### Adding CMP Support

To add support for a new Consent Management Platform:

1. **Identify the CMP**
   - Find the CMP name and vendor
   - Test on multiple sites using this CMP

2. **Find Selectors**
   - Open DevTools on a site with the banner
   - Identify unique selectors for:
     - Banner container
     - Accept button(s)
     - Reject button(s)

3. **Update consent-patterns.json**
   ```json
   {
     "name": "CMPName",
     "selectors": {
       "banner": ["#banner-id", ".banner-class"],
       "acceptButton": ["#accept-btn"],
       "rejectButton": ["#reject-btn"]
     }
   }
   ```

4. **Test Thoroughly**
   - Test auto-accept mode
   - Test auto-deny mode
   - Test manual mode
   - Test on multiple sites using this CMP

5. **Submit Pull Request**
   - Include test URLs
   - Document any special behavior
   - Add screenshots if helpful

### Code Contributions

1. **Fork the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OneClick-Cookies.git
   cd OneClick-Cookies
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow the existing code style
   - Add JSDoc comments for functions
   - Handle errors gracefully
   - Test your changes

4. **Test**
   - Load the extension in your browser
   - Test affected functionality
   - Check console for errors
   - Verify no regressions

5. **Commit**
   ```bash
   git add .
   git commit -m "Add: Clear description of changes"
   ```

   Commit message format:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for improvements
   - `Docs:` for documentation
   - `Refactor:` for code restructuring

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub

## Development Guidelines

### Code Style

**JavaScript:**
- Use modern ES6+ syntax
- Prefer `const` over `let`, avoid `var`
- Use async/await over callbacks
- Use template literals for string interpolation
- Maximum line length: 100 characters
- Use 2 spaces for indentation

**Comments:**
- Use JSDoc for function documentation
- Add inline comments for complex logic
- Keep comments up to date with code

**Error Handling:**
- Use try-catch for async operations
- Log errors to console with context
- Fail gracefully (don't break the page)

**Performance:**
- Minimize DOM queries
- Cache frequently used selectors
- Avoid synchronous operations
- Use efficient algorithms

### Testing

Before submitting:
- [ ] Test in Chrome
- [ ] Test in Edge
- [ ] Test on at least 5 different websites
- [ ] Test all three modes (manual, auto-accept, auto-deny)
- [ ] Check console for errors
- [ ] Verify no memory leaks
- [ ] Test with debug mode enabled

### Pull Request Process

1. **Update Documentation**
   - Update README.md if needed
   - Add JSDoc comments
   - Update DEVELOPMENT.md for API changes

2. **PR Description**
   - Describe what changed and why
   - Link to related issues
   - Include test results
   - Add screenshots for UI changes

3. **Review Process**
   - Address review comments
   - Keep discussion constructive
   - Be patient - reviews take time

4. **Merging**
   - PRs require at least one approval
   - Must pass all checks
   - Squash commits when merging

## Privacy Guidelines

All contributions must respect user privacy:
- ✅ All data stored locally only
- ✅ No external network requests
- ✅ No telemetry or analytics
- ✅ No tracking of user behavior
- ❌ No sending data to external servers
- ❌ No including third-party libraries that track
- ❌ No logging sensitive information

## Security Guidelines

Keep the extension secure:
- Validate all user inputs
- Don't inject remote code
- Use minimal permissions
- Sanitize data from web pages
- Review third-party code before adding
- Report security issues privately

## Adding Dependencies

Before adding a new dependency:
1. Evaluate if it's necessary
2. Check the license (must be compatible)
3. Review the code for security/privacy
4. Consider the bundle size impact
5. Document why it's needed

Prefer:
- Vanilla JavaScript over frameworks
- Small, focused libraries
- Well-maintained projects
- Privacy-respecting code

## Questions?

- Check [DEVELOPMENT.md](DEVELOPMENT.md)
- Search existing issues
- Open a discussion issue

## Recognition

Contributors will be:
- Listed in release notes
- Credited in the repository
- Thanked in the community

Thank you for contributing! 🎉
