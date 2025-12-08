/**
 * Cookie Consent Banner Detector
 * Implements multi-layered detection strategy for identifying consent banners
 */

class ConsentDetector {
  constructor() {
    this.patterns = null;
    this.debugMode = false;
  }

  /**
   * Initialize detector with consent patterns
   * @param {Object} patterns - Consent patterns from JSON
   */
  async init(patterns) {
    this.patterns = patterns;
  }

  /**
   * Main detection method with confidence scoring
   * @returns {Object|null} Detection result with confidence score
   */
  detect() {
    const detectionResults = [
      this.detectKnownCMP(),
      this.detectByKeywords(),
      this.detectByCSSPatterns(),
      this.detectGenericBanners(),
      this.detectInShadowDOM()
    ];

    // Filter out null results and sort by confidence
    const validResults = detectionResults.filter(r => r !== null);
    if (validResults.length === 0) {
      return null;
    }

    // Return highest confidence result
    validResults.sort((a, b) => b.confidence - a.confidence);
    return validResults[0];
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
   * Detect banners by keyword matching in visible overlays
   * @returns {Object|null} Detection result
   */
  detectByKeywords() {
    if (!this.patterns?.keywords) return null;

    // Combine all keywords from all languages
    const allKeywords = [];
    for (const lang in this.patterns.keywords) {
      allKeywords.push(...this.patterns.keywords[lang]);
    }

    // Find visible overlays with high z-index
    const overlays = this.findOverlays();
    
    for (const overlay of overlays) {
      const text = (overlay.innerText || overlay.textContent || '').toLowerCase();
      
      // Count keyword matches
      let matchCount = 0;
      for (const keyword of allKeywords) {
        // Use word boundary matching to avoid partial matches
        if (text.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }

      // If we have 2+ keyword matches, likely a consent banner
      if (matchCount >= 2) {
        this.log(`Detected by keywords: ${matchCount} matches in overlay`);
        return {
          type: 'keyword',
          banner: overlay,
          matchCount: matchCount,
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
   * Check if element has consent-related text or buttons
   * @param {Element} element
   * @returns {boolean}
   */
  hasConsent(element) {
    const text = (element.innerText || element.textContent || '').toLowerCase();
    
    let hasConsentText = false;
    
    // Use patterns if available
    if (this.patterns?.keywords) {
      for (const lang in this.patterns.keywords) {
        if (this.patterns.keywords[lang].some(k => text.includes(k.toLowerCase()))) {
          hasConsentText = true;
          break;
        }
      }
    } else {
      // Fallback
      hasConsentText = text.includes('consent') || 
                       text.includes('cookie') || 
                       text.includes('privacy') ||
                       text.includes('agree') ||
                       text.includes('accept') ||
                       text.includes('decline');
    }
    
    const hasButtons = element.querySelectorAll('button, a, [role="button"]').length >= 1;
    
    return hasConsentText && hasButtons;
  }

  /**
   * Calculate confidence score for generic banner
   * @param {Element} element
   * @returns {number} Confidence between 0 and 1
   */
  calculateBannerConfidence(element) {
    let confidence = 0.4; // Base confidence for overlay elements

    const text = (element.innerText || element.textContent || '').toLowerCase();
    const buttons = element.querySelectorAll('button, a, [role="button"]');

    // Award points for consent-related keywords
    let keywordMatches = 0;
    
    if (this.patterns?.keywords) {
      const allKeywords = Object.values(this.patterns.keywords).flat();
      for (const keyword of allKeywords) {
        if (text.includes(keyword.toLowerCase())) keywordMatches++;
      }
    } else {
      const consentKeywords = ['consent', 'cookie', 'privacy', 'tracking', 'data protection', 'gdpr'];
      for (const keyword of consentKeywords) {
        if (text.includes(keyword)) keywordMatches++;
      }
    }
    
    confidence += Math.min(keywordMatches * 0.05, 0.15);

    // Award points for action buttons
    if (buttons.length >= 2) {
      confidence += 0.15; // Likely has accept/reject pair
    } else if (buttons.length >= 1) {
      confidence += 0.08; // At least has one button
    }

    // Check for typical button text patterns
    const buttonTexts = Array.from(buttons).map(b => (b.textContent || b.innerText || '').toLowerCase()).join(' ');
    let actionMatches = 0;
    
    if (this.patterns?.buttonPatterns) {
      const allActions = [
        ...Object.values(this.patterns.buttonPatterns.accept).flat(),
        ...Object.values(this.patterns.buttonPatterns.reject).flat()
      ];
      for (const word of allActions) {
        if (buttonTexts.includes(word.toLowerCase())) actionMatches++;
      }
    } else {
      const actionWords = ['accept', 'reject', 'agree', 'disagree', 'allow', 'deny', 'ok', 'decline', 'refuse'];
      for (const word of actionWords) {
        if (buttonTexts.includes(word)) actionMatches++;
      }
    }
    
    confidence += Math.min(actionMatches * 0.05, 0.15);

    // Check size - should not be tiny
    const rect = element.getBoundingClientRect();
    if (rect.width > 200 && rect.height > 100) {
      confidence += 0.1;
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
      const text = element.innerText?.toLowerCase() || '';
      let matchCount = 0;
      
      for (const keyword of allKeywords) {
        if (text.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }

      if (matchCount >= 2 && this.isVisible(element)) {
        return element;
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
    const elements = document.querySelectorAll('*');

    for (const element of elements) {
      const style = window.getComputedStyle(element);
      const zIndex = parseInt(style.zIndex, 10);
      const position = style.position;

      // Include fixed, sticky, and absolute positioned elements with reasonable z-index
      // Lowered threshold to catch more potential banners
      if ((position === 'fixed' || position === 'sticky' || 
           (position === 'absolute' && zIndex > 50)) && 
          !isNaN(zIndex) && zIndex > 50 &&
          this.isVisible(element)) {
        overlays.push(element);
      }
    }

    // Sort by z-index (highest first)
    overlays.sort((a, b) => {
      const zA = parseInt(window.getComputedStyle(a).zIndex, 10);
      const zB = parseInt(window.getComputedStyle(b).zIndex, 10);
      return zB - zA;
    });

    return overlays;
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
