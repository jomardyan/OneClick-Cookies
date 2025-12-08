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
      const text = overlay.innerText?.toLowerCase() || '';
      
      // Count keyword matches
      let matchCount = 0;
      for (const keyword of allKeywords) {
        if (text.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }

      // If we have 2+ keyword matches, likely a consent banner
      if (matchCount >= 2) {
        this.log(`Detected by keywords: ${matchCount} matches`);
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

      if ((position === 'fixed' || position === 'sticky') && 
          !isNaN(zIndex) && zIndex > 100 &&
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

    let node;
    while (node = walker.nextNode()) {
      if (node.shadowRoot) {
        hosts.push(node);
      }
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
