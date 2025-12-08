/**
 * OneClick Cookies - Background Service Worker
 * Handles storage, statistics, and communication between components
 */

'use strict';

// Statistics tracking
let stats = {
  bannersDetected: 0,
  bannersHandled: 0,
  sitesVisited: new Set(),
  lastReset: Date.now()
};

// Configuration defaults
const DEFAULT_CONFIG = {
  mode: 'manual', // 'auto-accept', 'auto-deny', 'manual'
  debugMode: false,
  whitelist: [],
  blacklist: []
};

function normalizeDomain(domain) {
  if (!domain || typeof domain !== 'string') return null;
  return domain.trim().toLowerCase();
}

function dedupeDomains(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.map(d => normalizeDomain(d)).filter(Boolean)));
}

/**
 * Initialize service worker
 */
async function init() {
  console.log('[OneClick Cookies] Service worker initialized');

  // Load statistics from storage
  await loadStats();

  // Setup listeners
  chrome.runtime.onMessage.addListener(handleMessage);
  chrome.runtime.onInstalled.addListener(handleInstall);
  
  // Track active tabs
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
}

/**
 * Handle extension installation or update
 * @param {Object} details
 */
async function handleInstall(details) {
  if (details.reason === 'install') {
    console.log('[OneClick Cookies] Extension installed');
    
    // Set default configuration
    await chrome.storage.sync.set(DEFAULT_CONFIG);
    
    // Initialize statistics
    await resetStats();
    
    // Open welcome page (optional)
    // chrome.tabs.create({ url: 'popup/popup.html' });
  } else if (details.reason === 'update') {
    console.log('[OneClick Cookies] Extension updated');
  }
}

/**
 * Handle messages from content scripts and popup
 * @param {Object} message
 * @param {Object} sender
 * @param {Function} sendResponse
 */
function handleMessage(message, sender, sendResponse) {
  (async () => {
    try {
      switch (message.action) {
        case 'bannerDetected':
          await handleBannerDetected(message);
          sendResponse({ success: true });
          break;

        case 'bannerHandled':
          await handleBannerHandled(message);
          sendResponse({ success: true });
          break;

        case 'getStats':
          const currentStats = await getStats();
          sendResponse({ success: true, stats: currentStats });
          break;

        case 'resetStats':
          await resetStats();
          const newStats = await getStats();
          sendResponse({ success: true, stats: newStats });
          break;

        case 'updateConfig':
          await updateConfig(message.config);
          await notifyConfigUpdate();
          sendResponse({ success: true });
          break;

        case 'getConfig':
          const config = await getConfig();
          sendResponse({ success: true, config: config });
          break;

        case 'addToWhitelist':
          await addToList('whitelist', message.domain);
          await notifyConfigUpdate();
          sendResponse({ success: true });
          break;

        case 'addToBlacklist':
          await addToList('blacklist', message.domain);
          await notifyConfigUpdate();
          sendResponse({ success: true });
          break;

        case 'removeFromWhitelist':
          await removeFromList('whitelist', message.domain);
          await notifyConfigUpdate();
          sendResponse({ success: true });
          break;

        case 'removeFromBlacklist':
          await removeFromList('blacklist', message.domain);
          await notifyConfigUpdate();
          sendResponse({ success: true });
          break;

        case 'exportSettings':
          const exportConfig = await getConfig();
          const exportStats = await getStats();
          const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            config: exportConfig,
            stats: {
              bannersDetected: exportStats.bannersDetected,
              bannersHandled: exportStats.bannersHandled,
              sitesVisited: exportStats.sitesVisited
            }
          };
          sendResponse({ success: true, data: exportData });
          break;

        case 'importSettings':
          try {
            await importSettings(message.data);
            sendResponse({ success: true, message: 'Settings imported successfully' });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
          break;
      }
    } catch (error) {
      console.error('[OneClick Cookies] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
}

/**
 * Handle banner detection event
 * @param {Object} message
 */
async function handleBannerDetected(message) {
  stats.bannersDetected++;
  stats.sitesVisited.add(message.domain);
  await saveStats();
  
  console.log(`[OneClick Cookies] Banner detected on ${message.domain}`, message.detection);
}

/**
 * Handle banner handled event
 * @param {Object} message
 */
async function handleBannerHandled(message) {
  stats.bannersHandled++;
  await saveStats();
  
  console.log(`[OneClick Cookies] Banner ${message.handledAction} on ${message.domain}`);
}

/**
 * Handle tab activation
 * @param {Object} activeInfo
 */
async function handleTabActivated(activeInfo) {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const url = new URL(tab.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        stats.sitesVisited.add(url.hostname);
        await saveStats();
      }
    }
  } catch (error) {
    // Ignore errors for special pages
  }
}

/**
 * Handle tab update
 * @param {number} tabId
 * @param {Object} changeInfo
 * @param {Object} tab
 */
async function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        stats.sitesVisited.add(url.hostname);
        await saveStats();
      }
    } catch (error) {
      // Ignore errors for special pages
    }
  }
}

/**
 * Get current configuration
 * @returns {Promise<Object>}
 */
async function getConfig() {
  const result = await chrome.storage.sync.get(DEFAULT_CONFIG);
  return result;
}

/**
 * Update configuration
 * @param {Object} config
 */
async function updateConfig(config) {
  const current = await getConfig();
  const nextConfig = {
    ...current,
    ...config,
    whitelist: dedupeDomains(config?.whitelist ?? current.whitelist),
    blacklist: dedupeDomains(config?.blacklist ?? current.blacklist)
  };

  await chrome.storage.sync.set(nextConfig);
  console.log('[OneClick Cookies] Config updated:', nextConfig);
}

/**
 * Add domain to whitelist or blacklist
 * @param {string} listName - 'whitelist' or 'blacklist'
 * @param {string} domain
 */
async function addToList(listName, domain) {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return;

  const config = await getConfig();
  const list = Array.isArray(config[listName]) ? [...config[listName]] : [];
  const oppositeListName = listName === 'whitelist' ? 'blacklist' : 'whitelist';
  const oppositeList = Array.isArray(config[oppositeListName]) ? [...config[oppositeListName]] : [];

  if (!list.includes(normalizedDomain)) {
    list.push(normalizedDomain);
    const next = {
      [listName]: dedupeDomains(list),
      [oppositeListName]: dedupeDomains(oppositeList.filter(d => d !== normalizedDomain))
    };
    await chrome.storage.sync.set(next);
  }
}

/**
 * Remove domain from whitelist or blacklist
 * @param {string} listName - 'whitelist' or 'blacklist'
 * @param {string} domain
 */
async function removeFromList(listName, domain) {
  const normalizedDomain = normalizeDomain(domain);
  const config = await getConfig();
  const list = Array.isArray(config[listName]) ? [...config[listName]] : [];

  if (!normalizedDomain || list.length === 0) return;

  const filtered = list.filter(d => d !== normalizedDomain);
  await chrome.storage.sync.set({ [listName]: filtered });
}

/**
 * Notify all content scripts about config update
 */
async function notifyConfigUpdate() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'configUpdated' });
        } catch (error) {
          // Ignore errors for tabs without content script
        }
      }
    }
  } catch (error) {
    console.error('[OneClick Cookies] Error notifying config update:', error);
  }
}

/**
 * Load statistics from storage
 */
async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['stats']);
    if (result.stats) {
      stats = {
        ...result.stats,
        sitesVisited: new Set(result.stats.sitesVisited || [])
      };
    }
  } catch (error) {
    console.error('[OneClick Cookies] Error loading stats:', error);
  }
}

/**
 * Save statistics to storage
 */
async function saveStats() {
  try {
    const statsToSave = {
      ...stats,
      sitesVisited: Array.from(stats.sitesVisited)
    };
    await chrome.storage.local.set({ stats: statsToSave });
  } catch (error) {
    console.error('[OneClick Cookies] Error saving stats:', error);
  }
}

/**
 * Get current statistics
 * @returns {Promise<Object>}
 */
async function getStats() {
  return {
    bannersDetected: stats.bannersDetected,
    bannersHandled: stats.bannersHandled,
    sitesVisited: stats.sitesVisited.size,
    lastReset: stats.lastReset
  };
}

/**
 * Reset statistics
 */
async function resetStats() {
  stats = {
    bannersDetected: 0,
    bannersHandled: 0,
    sitesVisited: new Set(),
    lastReset: Date.now()
  };
  await saveStats();
}

/**
 * Import settings from export file
 * @param {Object} importData - Data from export
 */
async function importSettings(importData) {
  if (!importData || !importData.config) {
    throw new Error('Invalid import data format');
  }

  // Validate structure
  if (typeof importData.config !== 'object') {
    throw new Error('Invalid config structure');
  }

  // Import configuration
  const configToImport = {
    mode: importData.config.mode || DEFAULT_CONFIG.mode,
    debugMode: importData.config.debugMode || DEFAULT_CONFIG.debugMode,
    whitelist: Array.isArray(importData.config.whitelist) ? importData.config.whitelist : [],
    blacklist: Array.isArray(importData.config.blacklist) ? importData.config.blacklist : []
  };

  await chrome.storage.sync.set(configToImport);

  // Optionally import statistics if provided
  if (importData.stats) {
    stats.bannersDetected = importData.stats.bannersDetected || 0;
    stats.bannersHandled = importData.stats.bannersHandled || 0;
    // Don't merge sitesVisited as it's based on current session
    await saveStats();
  }

  // Notify all content scripts about update
  await notifyConfigUpdate();

  console.log('[OneClick Cookies] Settings imported successfully');
}

/**
 * Export settings to JSON
 * @param {Object} exportData
 * @returns {string} JSON string for download
 */
function getExportJSON(exportData) {
  return JSON.stringify(exportData, null, 2);
}

// Initialize the service worker
init();
