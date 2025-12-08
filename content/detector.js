/**
 * Cookie Consent Banner Detector
 * Implements multi-layered detection strategy for identifying consent banners
 */

class ConsentDetector {
  constructor() {
    this.patterns = null;
    this.debugMode = false;
    this.detectionCache = new Map();
    this.lastDetectionTime = 0;
    this.cacheTimeout = 2000; // Cache results for 2 seconds
  }

  /**
   * Initialize detector with consent patterns
   * @param {Object} patterns - Consent patterns from JSON
   */
  async init(patterns) {
    this.patterns = patterns;
  }

  /**
   * Clear detection cache (useful when DOM changes significantly)
   */
  clearCache() {
    this.detectionCache.clear();
    this.lastDetectionTime = 0;
  }

  /**
   * Main detection method with confidence scoring
   * @returns {Object|null} Detection result with confidence score
   */
  detect() {
    // Use cache if available and fresh
    const now = Date.now();
    if (this.detectionCache.has('last') && (now - this.lastDetectionTime) < this.cacheTimeout) {
      this.log('Using cached detection result');
      return this.detectionCache.get('last');
    }

    const detectionResults = [
      this.detectKnownCMP(),
      this.detectByARIARoles(),
      this.detectByKeywords(),
      this.detectByCSSPatterns(),
      this.detectByBackdrop(),
      this.detectGenericBanners(),
      this.detectInShadowDOM()
    ];

    // Filter out null results and sort by confidence
    const validResults = detectionResults.filter(r => r !== null);
    if (validResults.length === 0) {
      this.detectionCache.set('last', null);
      this.lastDetectionTime = now;
      return null;
    }

    // Return highest confidence result
    validResults.sort((a, b) => b.confidence - a.confidence);
    const result = validResults[0];
    
    // Cache the result
    this.detectionCache.set('last', result);
    this.lastDetectionTime = now;
    
    return result;
  }

  /**
   * Detect known CMPs using selector database
   * @returns {Object|null} Detection result
   */
  detectKnownCMP() {
    if (!this.patterns?.knownCMPs) return null;

    for (const cmp of this.patterns.knownCMPs) {
      // Check for banner
      for (const selector of cmp.selectors.banner) {
        const banner = document.querySelector(selector);
        if (banner && this.isVisible(banner)) {
          this.log(`Detected known CMP: ${cmp.name}`);
          return {
            type: 'knownCMP',
            cmpName: cmp.name,
            banner: banner,
            acceptSelectors: cmp.selectors.acceptButton,
            rejectSelectors: cmp.selectors.rejectButton,
            confidence: 0.95
          };
        }
      }
    }
    return null;
  }

  /**
   * Detect banners using ARIA roles (accessibility-compliant banners)
   * @returns {Object|null} Detection result
   */
  detectByARIARoles() {
    const ariaRoles = ['dialog', 'alertdialog', 'region', 'banner', 'complementary'];
    
    for (const role of ariaRoles) {
      const elements = document.querySelectorAll(`[role="${role}"]`);
      
      for (const element of elements) {
        if (!this.isVisible(element)) continue;
        
        const text = (element.innerText || element.textContent || '').toLowerCase();
        const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
        const ariaDescribedBy = element.getAttribute('aria-describedby');
        
        // Check for cookie/consent related ARIA labels
        const combinedText = text + ' ' + ariaLabel;
        
        if (this.hasConsentKeywords(combinedText) && this.hasActionButtons(element)) {
          this.log(`Detected via ARIA role: ${role}`);
          return {
            type: 'aria',
            banner: element,
            role: role,
            confidence: 0.85
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Detect banners by keyword matching in visible overlays
   * @returns {Object|null} Detection result
   */
  detectByKeywords() {
    if (!this.patterns?.keywords) return null;

    // Combine all keywords from all languages with weights
    const allKeywords = [];
    for (const lang in this.patterns.keywords) {
      allKeywords.push(...this.patterns.keywords[lang]);
    }

    // Find visible overlays with high z-index
    const overlays = this.findOverlays();
    
    for (const overlay of overlays) {
      const text = (overlay.innerText || overlay.textContent || '').toLowerCase();
      
      // Count keyword matches with word boundary regex
      let matchCount = 0;
      let matchedKeywords = [];
      
      for (const keyword of allKeywords) {
        // Use regex with word boundaries for more accurate matching
        const regex = new RegExp('\\b' + keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (regex.test(text)) {
          matchCount++;
          matchedKeywords.push(keyword);
        }
      }

      // If we have 2+ keyword matches, likely a consent banner
      if (matchCount >= 2) {
        this.log(`Detected by keywords: ${matchCount} matches (${matchedKeywords.join(', ')})`);
        return {
          type: 'keyword',
          banner: overlay,
          matchCount: matchCount,
          matchedKeywords: matchedKeywords,
          confidence: Math.min(0.7 + (matchCount * 0.05), 0.9)
        };
      }
    }

    return null;
  }

  /**
   * Detect banners using CSS selector patterns
   * @returns {Object|null} Detection result
   */
  detectByCSSPatterns() {
    if (!this.patterns?.cssPatterns) return null;

    // Try banner patterns
    for (const selector of this.patterns.cssPatterns.banner) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (this.isVisible(element) && this.looksLikeBanner(element)) {
          this.log(`Detected by CSS pattern: ${selector}`);
          return {
            type: 'cssPattern',
            banner: element,
            selector: selector,
            confidence: 0.6
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect banners by finding backdrop/overlay with consent content
   * @returns {Object|null} Detection result
   */
  detectByBackdrop() {
    // Find elements that look like backdrops (full-screen overlays)
    const backdrops = document.querySelectorAll('div, section, aside');
    
    for (const backdrop of backdrops) {
      if (!this.isVisible(backdrop)) continue;
      
      const style = window.getComputedStyle(backdrop);
      const rect = backdrop.getBoundingClientRect();
      
      // Check if it's a backdrop (large, semi-transparent, covers viewport)
      const isBackdropStyle = (
        (style.position === 'fixed' || style.position === 'absolute') &&
        rect.width >= window.innerWidth * 0.8 &&
        rect.height >= window.innerHeight * 0.8 &&
        (parseFloat(style.opacity) < 1 || style.backgroundColor.includes('rgba'))
      );
      
      if (isBackdropStyle) {
        // Look for consent content in children
        const children = backdrop.querySelectorAll('*');
        for (const child of children) {
          if (this.isVisible(child) && this.hasConsent(child)) {
            this.log('Detected via backdrop method');
            return {
              type: 'backdrop',
              banner: child,
              backdrop: backdrop,
              confidence: 0.75
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Detect banners in Shadow DOM
   * @returns {Object|null} Detection result
   */
  detectInShadowDOM() {
    const shadowHosts = this.findShadowHosts();
    
    for (const host of shadowHosts) {
      if (host.shadowRoot) {
        const shadowBanner = this.detectInShadowRoot(host.shadowRoot);
        if (shadowBanner) {
          this.log('Detected in Shadow DOM');
          return {
            type: 'shadowDOM',
            banner: shadowBanner,
            shadowHost: host,
            confidence: 0.7
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect generic banners created by individual developers
   * Uses heuristic patterns and structural analysis
   * @returns {Object|null} Detection result
   */
  detectGenericBanners() {
    // Find all potential banner containers
    const potentialBanners = [];
    const overlays = this.findOverlays();

    for (const overlay of overlays) {
      // Check if it looks like a banner
      if (this.looksLikeBanner(overlay) && this.hasConsent(overlay)) {
        const confidence = this.calculateBannerConfidence(overlay);
        if (confidence >= 0.5) {
          potentialBanners.push({
            element: overlay,
            confidence: confidence,
            reason: 'heuristic'
          });
        }
      }
    }

    // Also check iframes for banners
    const iframeBanners = this.detectInIframes();
    if (iframeBanners) {
      potentialBanners.push({
        element: iframeBanners.element,
        confidence: iframeBanners.confidence,
        reason: 'iframe',
        isIframe: true
      });
    }

    if (potentialBanners.length === 0) {
      return null;
    }

    // Return highest confidence result
    potentialBanners.sort((a, b) => b.confidence - a.confidence);
    const best = potentialBanners[0];

    this.log(`Detected generic banner via ${best.reason} (confidence: ${best.confidence})`);

    return {
      type: 'generic',
      banner: best.element,
      confidence: best.confidence,
      isIframe: best.isIframe || false,
      reason: best.reason
    };
  }

  /**
   * Check if text contains consent-related keywords
   * @param {string} text
   * @returns {boolean}
   */
  hasConsentKeywords(text) {
    const lowerText = text.toLowerCase();
    
    if (this.patterns?.keywords) {
      for (const lang in this.patterns.keywords) {
        if (this.patterns.keywords[lang].some(k => {
          const regex = new RegExp('\\b' + k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
          return regex.test(lowerText);
        })) {
          return true;
        }
      }
    } else {
      // Fallback keywords
      const fallbackKeywords = ['consent', 'cookie', 'privacy', 'gdpr', 'tracking', 'data protection'];
      return fallbackKeywords.some(k => lowerText.includes(k));
    }
    
    return false;
  }

  /**
   * Check if element has action buttons
   * @param {Element} element
   * @returns {boolean}
   */
  hasActionButtons(element) {
    const buttons = element.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
    return buttons.length >= 1;
  }

  /**
   * Check if element has consent-related text or buttons
   * @param {Element} element
   * @returns {boolean}
   */
  hasConsent(element) {
    const text = (element.innerText || element.textContent || '').toLowerCase();
    return this.hasConsentKeywords(text) && this.hasActionButtons(element);
  }

  /**
   * Calculate confidence score for generic banner
   * @param {Element} element
   * @returns {number} Confidence between 0 and 1
   */
  calculateBannerConfidence(element) {
    let confidence = 0.4; // Base confidence for overlay elements

    const text = (element.innerText || element.textContent || '').toLowerCase();
    const buttons = element.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');

    // Award points for consent-related keywords with word boundaries
    let keywordMatches = 0;
    const highValueKeywords = ['gdpr', 'cookie consent', 'privacy policy', 'data protection'];
    
    if (this.patterns?.keywords) {
      const allKeywords = Object.values(this.patterns.keywords).flat();
      for (const keyword of allKeywords) {
        const regex = new RegExp('\\b' + keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (regex.test(text)) {
          keywordMatches++;
          // Boost confidence for high-value keywords
          if (highValueKeywords.some(hv => keyword.toLowerCase().includes(hv))) {
            keywordMatches += 0.5;
          }
        }
      }
    } else {
      const consentKeywords = ['consent', 'cookie', 'privacy', 'tracking', 'data protection', 'gdpr'];
      for (const keyword of consentKeywords) {
        if (text.includes(keyword)) keywordMatches++;
      }
    }
    
    confidence += Math.min(keywordMatches * 0.06, 0.2);

    // Award points for action buttons
    if (buttons.length >= 2) {
      confidence += 0.15; // Likely has accept/reject pair
    } else if (buttons.length >= 1) {
      confidence += 0.08; // At least has one button
    }

    // Check for typical button text patterns with regex
    const buttonTexts = Array.from(buttons).map(b => (b.textContent || b.innerText || '').toLowerCase()).join(' ');
    let actionMatches = 0;
    
    if (this.patterns?.buttonPatterns) {
      const allActions = [
        ...Object.values(this.patterns.buttonPatterns.accept).flat(),
        ...Object.values(this.patterns.buttonPatterns.reject).flat()
      ];
      for (const word of allActions) {
        const regex = new RegExp('\\b' + word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (regex.test(buttonTexts)) actionMatches++;
      }
    } else {
      const actionWords = ['accept', 'reject', 'agree', 'disagree', 'allow', 'deny', 'ok', 'decline', 'refuse'];
      for (const word of actionWords) {
        if (buttonTexts.includes(word)) actionMatches++;
      }
    }
    
    confidence += Math.min(actionMatches * 0.06, 0.18);

    // Check size - should not be tiny
    const rect = element.getBoundingClientRect();
    if (rect.width > 200 && rect.height > 100) {
      confidence += 0.1;
    }

    // Boost for typical banner positioning
    const style = window.getComputedStyle(element);
    if (style.position === 'fixed' || style.position === 'sticky') {
      confidence += 0.05;
    }

    // Check for form elements (checkboxes for preferences)
    const hasCheckboxes = element.querySelectorAll('input[type="checkbox"]').length > 0;
    if (hasCheckboxes) {
      confidence += 0.08;
    }

    // Cap at 1.0
    return Math.min(confidence, 0.95);
  }

  /**
   * Detect banners in iframes
   * @returns {Object|null} Detection result with iframe reference
   */
  detectInIframes() {
    try {
      // Note: Can only access same-origin iframes
      const iframes = document.querySelectorAll('iframe');
      
      for (const iframe of iframes) {
        if (!this.isVisible(iframe)) continue;

        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) continue;

          // Search for consent patterns in iframe
          const elements = iframeDoc.querySelectorAll('*');
          for (const element of elements) {
            if (!this.isVisible(element)) continue;

            const text = (element.innerText || element.textContent || '').toLowerCase();
            const hasConsent = text.includes('consent') || 
                              text.includes('cookie') ||
                              text.includes('privacy');

            if (hasConsent && this.hasConsent(element)) {
              this.log('Detected banner in iframe');
              return {
                element: element,
                confidence: 0.65,
                iframe: iframe,
                iframeDoc: iframeDoc
              };
            }
          }
        } catch (e) {
          // Cross-origin iframe, skip
          continue;
        }
      }
    } catch (e) {
      // Iframes not accessible, continue with other detection methods
    }

    return null;
  }

  /**
   * Detect within a shadow root
   * @param {ShadowRoot} shadowRoot
   * @returns {Element|null}
   */
  detectInShadowRoot(shadowRoot) {
    if (!this.patterns?.keywords) return null;

    const allKeywords = [];
    for (const lang in this.patterns.keywords) {
      allKeywords.push(...this.patterns.keywords[lang]);
    }

    const elements = shadowRoot.querySelectorAll('*');
    for (const element of elements) {
      if (!this.isVisible(element)) continue;
      
      const text = element.innerText?.toLowerCase() || '';
      let matchCount = 0;
      
      for (const keyword of allKeywords) {
        const regex = new RegExp('\\b' + keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (regex.test(text)) {
          matchCount++;
        }
      }

      if (matchCount >= 2 && this.hasActionButtons(element)) {
        return element;
      }
      
      // Recursively check nested shadow roots
      if (element.shadowRoot) {
        const nestedResult = this.detectInShadowRoot(element.shadowRoot);
        if (nestedResult) return nestedResult;
      }
    }

    return null;
  }

  /**
   * Find overlay elements (high z-index, fixed/sticky position)
   * @returns {Array<Element>}
   */
  findOverlays() {
    const overlays = [];
    const elements = document.querySelectorAll('div, section, aside, header, footer, [role="dialog"], [role="alertdialog"]');

    for (const element of elements) {
      if (!this.isVisible(element)) continue;
      
      const style = window.getComputedStyle(element);
      const zIndex = parseInt(style.zIndex, 10);
      const position = style.position;
      const rect = element.getBoundingClientRect();

      // More sophisticated overlay detection
      const isOverlay = (
        // Fixed or sticky positioning (common for banners)
        (position === 'fixed' || position === 'sticky') ||
        // Absolute with high z-index
        (position === 'absolute' && !isNaN(zIndex) && zIndex > 50) ||
        // High z-index regardless of position
        (!isNaN(zIndex) && zIndex > 100)
      );

      // Additional checks for typical banner characteristics
      const isPotentialBanner = (
        isOverlay &&
        rect.width >= 250 && // Minimum reasonable width
        rect.height >= 80 &&  // Minimum reasonable height
        rect.height <= window.innerHeight * 0.9 // Not full screen
      );

      if (isPotentialBanner) {
        overlays.push({
          element: element,
          zIndex: isNaN(zIndex) ? 0 : zIndex,
          position: position
        });
      }
    }

    // Sort by z-index (highest first), then by position priority
    overlays.sort((a, b) => {
      if (b.zIndex !== a.zIndex) {
        return b.zIndex - a.zIndex;
      }
      // Prefer fixed over sticky over absolute
      const positionPriority = { 'fixed': 3, 'sticky': 2, 'absolute': 1 };
      return (positionPriority[b.position] || 0) - (positionPriority[a.position] || 0);
    });

    return overlays.map(o => o.element);
  }

  /**
   * Find elements with shadow DOM
   * @returns {Array<Element>}
   */
  findShadowHosts() {
    const hosts = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    let node = walker.nextNode();
    while (node !== null) {
      if (node.shadowRoot) {
        hosts.push(node);
      }
      node = walker.nextNode();
    }

    return hosts;
  }

  /**
   * Check if element is visible
   * @param {Element} element
   * @returns {boolean}
   */
  isVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Heuristic check if element looks like a banner
   * @param {Element} element
   * @returns {boolean}
   */
  looksLikeBanner(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Should be reasonably sized
    const minSize = 100;
    const maxHeight = viewportHeight * 0.8;

    if (rect.width < minSize || rect.height < minSize || rect.height > maxHeight) {
      return false;
    }

    // Should contain buttons or links
    const buttons = element.querySelectorAll('button, a, [role="button"]');
    if (buttons.length < 1) {
      return false;
    }

    return true;
  }

  /**
   * Log debug messages
   * @param {string} message
   */
  log(message) {
    if (this.debugMode) {
      console.log(`[OneClick Cookies] ${message}`);
    }
  }
}

// Make available globally
window.ConsentDetector = ConsentDetector;
