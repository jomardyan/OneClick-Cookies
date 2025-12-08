/**
 * OneClick Cookies - Content Script
 * Main script for detecting and interacting with cookie consent banners
 */

(async () => {
  'use strict';

  // Configuration
  let config = {
    mode: 'manual', // 'auto-accept', 'auto-deny', 'manual'
    debugMode: false,
    whitelist: [],
    blacklist: []
  };

  let detector = null;
  let patterns = null;
  let observer = null;
  let mutationTimeout = null;
  let processingBanner = false;

  const FALLBACK_PATTERNS = {
    knownCMPs: [],
    buttonPatterns: {
      accept: {
        en: ['accept all', 'allow all', 'accept', 'agree', 'ok']
      },
      reject: {
        en: ['reject all', 'deny all', 'decline', 'only necessary']
      }
    },
    cssPatterns: {
      banner: ["[class*='cookie']", "[id*='cookie']"],
      overlay: []
    },
    keywords: {
      en: ['cookie', 'consent', 'gdpr', 'privacy', 'tracking']
    }
  };

  /**
   * Initialize the content script
   */
  async function init() {
    try {
      // Load consent patterns
      patterns = await loadConsentPatterns();
      
      // Initialize detector
      detector = new window.ConsentDetector();
      await detector.init(patterns);
      detector.debugMode = config.debugMode;

      // Load user configuration
      await loadConfig();

      // Start detection
      detectAndProcess();

      // Setup mutation observer for dynamic banners
      setupMutationObserver();

      // Listen for messages from popup
      chrome.runtime.onMessage.addListener(handleMessage);

      log('OneClick Cookies initialized');
    } catch (error) {
      console.error('[OneClick Cookies] Initialization error:', error);
    }
  }

  /**
   * Load consent patterns from JSON file
   * @returns {Promise<Object>}
   */
  async function loadConsentPatterns() {
    try {
      const url = chrome.runtime.getURL('rules/consent-patterns.json');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[OneClick Cookies] Failed to load patterns:', error);
      return FALLBACK_PATTERNS;
    }
  }

  /**
   * Load user configuration from storage
   */
  async function loadConfig() {
    try {
      const result = await chrome.storage.sync.get({
        mode: 'manual',
        debugMode: false,
        whitelist: [],
        blacklist: []
      });

      config = result;
      if (detector) {
        detector.debugMode = config.debugMode;
      }

      log(`Config loaded: mode=${config.mode}`);
    } catch (error) {
      console.error('[OneClick Cookies] Failed to load config:', error);
    }
  }

  /**
   * Detect and process cookie banners
   */
  async function detectAndProcess() {
    if (processingBanner || !detector) {
      return;
    }

    try {
      processingBanner = true;

      // Small delay to let page settle
      await sleep(500);

      const detection = detector.detect();

      if (detection) {
        log(`Banner detected: type=${detection.type}, confidence=${detection.confidence}`);

        // Check domain rules
        const currentDomain = window.location.hostname;
        
        if (config.blacklist.includes(currentDomain)) {
          log(`Domain ${currentDomain} is blacklisted, skipping`);
          processingBanner = false;
          return;
        }

        // Notify background script
        await notifyBannerDetected(detection);

        // Process based on mode
        if (config.mode === 'auto-accept') {
          await handleAccept(detection);
        } else if (config.mode === 'auto-deny') {
          await handleDeny(detection);
        } else if (config.whitelist.includes(currentDomain)) {
          // Auto-accept for whitelisted domains
          await handleAccept(detection);
        }
      } else {
        log('No banner detected on page');
      }

      processingBanner = false;
    } catch (error) {
      console.error('[OneClick Cookies] Detection error:', error);
      processingBanner = false;
    }
  }

  /**
   * Handle accept action
   * @param {Object} detection - Detection result
   */
  async function handleAccept(detection) {
    log('Attempting to accept cookies...');

    let clicked = false;

    // Try known CMP selectors first
    if (detection.acceptSelectors) {
      for (const selector of detection.acceptSelectors) {
        const button = detection.banner.querySelector(selector) || 
                      document.querySelector(selector);
        
        if (button && detector.isVisible(button)) {
          await clickElement(button);
          clicked = true;
          break;
        }
      }
    }

    // Fallback: find by button text patterns
    if (!clicked) {
      clicked = await findAndClickButton(detection.banner, 'accept');
    }

    if (clicked) {
      log('Successfully accepted cookies');
      await notifyBannerHandled('accept');
      // Clear detection cache after handling
      if (detector) detector.clearCache();
    } else {
      log('Failed to find accept button');
    }
  }

  /**
   * Handle deny action
   * @param {Object} detection - Detection result
   */
  async function handleDeny(detection) {
    log('Attempting to deny cookies...');

    let clicked = false;

    // Try known CMP selectors first
    if (detection.rejectSelectors) {
      for (const selector of detection.rejectSelectors) {
        const button = detection.banner.querySelector(selector) || 
                      document.querySelector(selector);
        
        if (button && detector.isVisible(button)) {
          await clickElement(button);
          clicked = true;
          break;
        }
      }
    }

    // Fallback: find by button text patterns
    if (!clicked) {
      clicked = await findAndClickButton(detection.banner, 'reject');
    }

    if (clicked) {
      log('Successfully denied cookies');
      await notifyBannerHandled('deny');
      // Clear detection cache after handling
      if (detector) detector.clearCache();
    } else {
      log('Failed to find deny button, trying accept as fallback');
      // Some sites only have accept, better to accept than leave banner
      await handleAccept(detection);
    }
  }

  /**
   * Find and click button by text patterns
   * @param {Element} container - Container element to search in
   * @param {string} type - 'accept' or 'reject'
   * @returns {Promise<boolean>} Success status
   */
  async function findAndClickButton(container, type) {
    if (!patterns?.buttonPatterns) return false;

    const textPatterns = [];
    for (const lang in patterns.buttonPatterns[type]) {
      textPatterns.push(...patterns.buttonPatterns[type][lang]);
    }

    // Find all clickable elements
    const searchContainer = container || document;
    const buttons = searchContainer.querySelectorAll(
      'button, a, [role="button"], input[type="button"], input[type="submit"]'
    );

    for (const button of buttons) {
      if (!detector.isVisible(button)) continue;

      const buttonText = (button.textContent || button.value || '').toLowerCase().trim();
      
      for (const pattern of textPatterns) {
        if (buttonText.includes(pattern.toLowerCase())) {
          await clickElement(button);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Click element with proper event simulation
   * @param {Element} element
   */
  async function clickElement(element) {
    try {
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(100);

      // Simulate realistic click sequence
      const events = ['mousedown', 'mouseup', 'click'];
      
      for (const eventType of events) {
        const event = new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        });
        element.dispatchEvent(event);
        await sleep(50);
      }

      // Also try direct click as fallback
      if (element.click) {
        element.click();
      }

      log(`Clicked element: ${element.tagName}`);
    } catch (error) {
      console.error('[OneClick Cookies] Click error:', error);
    }
  }

  /**
   * Setup mutation observer to detect dynamically loaded banners
   */
  function setupMutationObserver() {
    // Disconnect existing observer
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      // Debounce detection calls
      if (processingBanner) return;
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
      mutationTimeout = setTimeout(() => {
        mutationTimeout = null;
        detectAndProcess();
      }, 500);
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
  }

  /**
   * Handle messages from popup or background
   * @param {Object} message
   * @param {Object} sender
   * @param {Function} sendResponse
   */
  function handleMessage(message, sender, sendResponse) {
    (async () => {
      try {
        switch (message.action) {
          case 'configUpdated':
            await loadConfig();
            sendResponse({ success: true });
            break;

          case 'manualAccept':
            log('Manual accept requested from popup');
            // Try to detect banner with retry logic
            let detection = detector.detect();
            
            // If not detected, wait a moment and try again
            if (!detection) {
              log('Banner not detected on first attempt, retrying...');
              await sleep(300);
              detection = detector.detect();
            }
            
            if (detection) {
              log('Banner found, executing accept action');
              await handleAccept(detection);
              sendResponse({ success: true });
            } else {
              log('No banner detected after retry');
              sendResponse({ success: false, error: 'No banner detected' });
            }
            break;

          case 'manualDeny':
            log('Manual deny requested from popup');
            // Try to detect banner with retry logic
            let detection2 = detector.detect();
            
            // If not detected, wait a moment and try again
            if (!detection2) {
              log('Banner not detected on first attempt, retrying...');
              await sleep(300);
              detection2 = detector.detect();
            }
            
            if (detection2) {
              log('Banner found, executing deny action');
              await handleDeny(detection2);
              sendResponse({ success: true });
            } else {
              log('No banner detected after retry');
              sendResponse({ success: false, error: 'No banner detected' });
            }
            break;

          case 'detectBanner':
            const detection3 = detector.detect();
            sendResponse({ 
              detected: !!detection3,
              detection: detection3 
            });
            break;

          default:
            sendResponse({ error: 'Unknown action' });
        }
      } catch (error) {
        console.error('[OneClick Cookies] Message handler error:', error);
        sendResponse({ error: error.message });
      }
    })();

    return true; // Keep message channel open for async response
  }

  /**
   * Notify background script about detected banner
   * @param {Object} detection
   */
  async function notifyBannerDetected(detection) {
    try {
      await chrome.runtime.sendMessage({
        action: 'bannerDetected',
        domain: window.location.hostname,
        detection: {
          type: detection.type,
          cmpName: detection.cmpName,
          confidence: detection.confidence
        }
      });
    } catch (error) {
      // Ignore errors if background script is not ready
    }
  }

  /**
   * Notify background script about handled banner
   * @param {string} action - 'accept' or 'deny'
   */
  async function notifyBannerHandled(action) {
    try {
      await chrome.runtime.sendMessage({
        action: 'bannerHandled',
        domain: window.location.hostname,
        handledAction: action,
        timestamp: Date.now()
      });
    } catch (error) {
      // Ignore errors if background script is not ready
    }
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log debug messages
   * @param {string} message
   */
  function log(message) {
    if (config.debugMode) {
      console.log(`[OneClick Cookies] ${message}`);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
