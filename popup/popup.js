/**
 * OneClick Cookies - Popup Script
 * Handles user interactions in the popup UI
 */

'use strict';

// UI Elements
const elements = {
  // Mode buttons
  modeManual: document.getElementById('mode-manual'),
  modeAutoAccept: document.getElementById('mode-auto-accept'),
  modeAutoDeny: document.getElementById('mode-auto-deny'),
  
  // Manual controls
  btnAccept: document.getElementById('btn-accept'),
  btnDeny: document.getElementById('btn-deny'),
  manualStatus: document.getElementById('manual-status'),
  manualControls: document.getElementById('manual-controls'),
  
  // Site controls
  currentDomain: document.getElementById('current-domain'),
  btnWhitelist: document.getElementById('btn-whitelist'),
  btnBlacklist: document.getElementById('btn-blacklist'),
  whitelistDisplay: document.getElementById('whitelist-display'),
  blacklistDisplay: document.getElementById('blacklist-display'),
  
  // Statistics
  statDetected: document.getElementById('stat-detected'),
  statHandled: document.getElementById('stat-handled'),
  statSites: document.getElementById('stat-sites'),
  btnResetStats: document.getElementById('btn-reset-stats'),
  
  // Settings
  debugMode: document.getElementById('debug-mode'),
  btnExport: document.getElementById('btn-export'),
  btnImport: document.getElementById('btn-import'),
  importFile: document.getElementById('import-file')
};

let currentConfig = null;
let currentDomain = null;

/**
 * Initialize popup
 */
async function init() {
  try {
    // Load current configuration
    await loadConfig();
    
    // Get current tab domain
    await loadCurrentDomain();
    
    // Load statistics
    await loadStatistics();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update UI
    updateUI();
  } catch (error) {
    console.error('[OneClick Cookies] Popup initialization error:', error);
  }
}

/**
 * Load configuration from background
 */
async function loadConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (response.success) {
      currentConfig = response.config;
    }
  } catch (error) {
    console.error('[OneClick Cookies] Failed to load config:', error);
    // Use defaults
    currentConfig = {
      mode: 'manual',
      debugMode: false,
      whitelist: [],
      blacklist: []
    };
  }
}

/**
 * Load current tab domain
 */
async function loadCurrentDomain() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      currentDomain = url.hostname;
      elements.currentDomain.textContent = currentDomain;
    } else {
      elements.currentDomain.textContent = 'Unknown';
    }
  } catch (error) {
    console.error('[OneClick Cookies] Failed to get current domain:', error);
    elements.currentDomain.textContent = 'Error';
  }
}

/**
 * Load statistics
 */
async function loadStatistics() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    if (response.success) {
      elements.statDetected.textContent = response.stats.bannersDetected;
      elements.statHandled.textContent = response.stats.bannersHandled;
      elements.statSites.textContent = response.stats.sitesVisited;
    }
  } catch (error) {
    console.error('[OneClick Cookies] Failed to load statistics:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Mode buttons
  elements.modeManual.addEventListener('click', () => setMode('manual'));
  elements.modeAutoAccept.addEventListener('click', () => setMode('auto-accept'));
  elements.modeAutoDeny.addEventListener('click', () => setMode('auto-deny'));
  
  // Manual control buttons
  elements.btnAccept.addEventListener('click', handleManualAccept);
  elements.btnDeny.addEventListener('click', handleManualDeny);
  
  // Site control buttons
  elements.btnWhitelist.addEventListener('click', handleAddToWhitelist);
  elements.btnBlacklist.addEventListener('click', handleAddToBlacklist);
  
  // Statistics
  elements.btnResetStats.addEventListener('click', handleResetStats);
  
  // Settings
  elements.debugMode.addEventListener('change', handleDebugModeToggle);
  
  // Import/Export
  elements.btnExport.addEventListener('click', handleExportSettings);
  elements.btnImport.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', handleImportSettings);
}

/**
 * Update UI based on current configuration
 */
function updateUI() {
  // Update mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeMode = currentConfig.mode;
  const activeModeBtn = document.querySelector(`[data-mode="${activeMode}"]`);
  if (activeModeBtn) {
    activeModeBtn.classList.add('active');
  }
  
  // Show/hide manual controls
  if (activeMode === 'manual') {
    elements.manualControls.style.display = 'block';
  } else {
    elements.manualControls.style.display = 'none';
  }
  
  // Update debug mode checkbox
  elements.debugMode.checked = currentConfig.debugMode;
  
  // Update whitelist/blacklist display
  updateListDisplay();
}

/**
 * Update whitelist/blacklist display
 */
function updateListDisplay() {
  // Whitelist
  if (currentConfig.whitelist && currentConfig.whitelist.length > 0) {
    elements.whitelistDisplay.innerHTML = currentConfig.whitelist
      .map(domain => `
        <div class="list-entry">
          ${domain}
          <button class="remove-btn" data-list="whitelist" data-domain="${domain}">×</button>
        </div>
      `)
      .join('');
  } else {
    elements.whitelistDisplay.textContent = 'None';
  }
  
  // Blacklist
  if (currentConfig.blacklist && currentConfig.blacklist.length > 0) {
    elements.blacklistDisplay.innerHTML = currentConfig.blacklist
      .map(domain => `
        <div class="list-entry">
          ${domain}
          <button class="remove-btn" data-list="blacklist" data-domain="${domain}">×</button>
        </div>
      `)
      .join('');
  } else {
    elements.blacklistDisplay.textContent = 'None';
  }
  
  // Add remove button listeners
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const list = e.target.dataset.list;
      const domain = e.target.dataset.domain;
      handleRemoveFromList(list, domain);
    });
  });
}

/**
 * Set mode
 * @param {string} mode - 'manual', 'auto-accept', or 'auto-deny'
 */
async function setMode(mode) {
  try {
    currentConfig.mode = mode;
    await chrome.runtime.sendMessage({
      action: 'updateConfig',
      config: currentConfig
    });
    updateUI();
  } catch (error) {
    console.error('[OneClick Cookies] Failed to set mode:', error);
  }
}

/**
 * Handle manual accept
 */
async function handleManualAccept() {
  try {
    showStatus('Detecting banner...', 'info');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // First, check if banner is detected
    const checkResponse = await chrome.tabs.sendMessage(tab.id, { action: 'detectBanner' });
    
    if (checkResponse.detected) {
      showStatus('Accepting cookies...', 'info');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'manualAccept' });
      
      if (response.success) {
        showStatus('✓ Cookies accepted successfully!', 'success');
      } else {
        showStatus('✗ Failed to accept cookies', 'error');
      }
    } else {
      showStatus('✗ No banner detected on this page', 'error');
    }
  } catch (error) {
    console.error('[OneClick Cookies] Error:', error);
    showStatus('✗ Error: ' + error.message, 'error');
  }
}

/**
 * Handle manual deny
 */
async function handleManualDeny() {
  try {
    showStatus('Detecting banner...', 'info');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // First, check if banner is detected
    const checkResponse = await chrome.tabs.sendMessage(tab.id, { action: 'detectBanner' });
    
    if (checkResponse.detected) {
      showStatus('Denying cookies...', 'info');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'manualDeny' });
      
      if (response.success) {
        showStatus('✓ Cookies denied successfully!', 'success');
      } else {
        showStatus('✗ Failed to deny cookies', 'error');
      }
    } else {
      showStatus('✗ No banner detected on this page', 'error');
    }
  } catch (error) {
    console.error('[OneClick Cookies] Error:', error);
    showStatus('✗ Error: ' + error.message, 'error');
  }
}

/**
 * Handle add to whitelist
 */
async function handleAddToWhitelist() {
  if (!currentDomain) return;
  
  try {
    await chrome.runtime.sendMessage({
      action: 'addToWhitelist',
      domain: currentDomain
    });
    
    // Reload config and update UI
    await loadConfig();
    updateUI();
  } catch (error) {
    console.error('[OneClick Cookies] Failed to add to whitelist:', error);
  }
}

/**
 * Handle add to blacklist
 */
async function handleAddToBlacklist() {
  if (!currentDomain) return;
  
  try {
    await chrome.runtime.sendMessage({
      action: 'addToBlacklist',
      domain: currentDomain
    });
    
    // Reload config and update UI
    await loadConfig();
    updateUI();
  } catch (error) {
    console.error('[OneClick Cookies] Failed to add to blacklist:', error);
  }
}

/**
 * Handle remove from list
 * @param {string} listName - 'whitelist' or 'blacklist'
 * @param {string} domain
 */
async function handleRemoveFromList(listName, domain) {
  try {
    const action = listName === 'whitelist' ? 'removeFromWhitelist' : 'removeFromBlacklist';
    await chrome.runtime.sendMessage({
      action: action,
      domain: domain
    });
    
    // Reload config and update UI
    await loadConfig();
    updateUI();
  } catch (error) {
    console.error(`[OneClick Cookies] Failed to remove from ${listName}:`, error);
  }
}

/**
 * Handle reset statistics
 */
async function handleResetStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'resetStats' });
    if (response.success) {
      await loadStatistics();
    }
  } catch (error) {
    console.error('[OneClick Cookies] Failed to reset statistics:', error);
  }
}

/**
 * Handle debug mode toggle
 */
async function handleDebugModeToggle() {
  try {
    currentConfig.debugMode = elements.debugMode.checked;
    await chrome.runtime.sendMessage({
      action: 'updateConfig',
      config: currentConfig
    });
  } catch (error) {
    console.error('[OneClick Cookies] Failed to toggle debug mode:', error);
  }
}

/**
 * Handle export settings
 */
async function handleExportSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportSettings' });
    
    if (response.success) {
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oneclick-cookies-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showStatus('✓ Settings exported successfully!', 'success');
    }
  } catch (error) {
    console.error('[OneClick Cookies] Export failed:', error);
    showStatus('✗ Export failed: ' + error.message, 'error');
  }
}

/**
 * Handle import settings
 */
async function handleImportSettings() {
  try {
    const file = elements.importFile.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        const response = await chrome.runtime.sendMessage({
          action: 'importSettings',
          data: importData
        });

        if (response.success) {
          // Reload configuration
          await loadConfig();
          updateUI();
          showStatus('✓ Settings imported successfully!', 'success');
        } else {
          showStatus('✗ Import failed: ' + response.error, 'error');
        }
      } catch (error) {
        showStatus('✗ Invalid file format', 'error');
        console.error('[OneClick Cookies] Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    elements.importFile.value = '';
  } catch (error) {
    showStatus('✗ Import error: ' + error.message, 'error');
  }
}

/**
 * Show status message
 * @param {string} message
 * @param {string} type - 'info', 'success', or 'error'
 */
function showStatus(message, type) {
  elements.manualStatus.textContent = message;
  elements.manualStatus.className = `status-message status-${type}`;
  
  // Clear after 3 seconds
  setTimeout(() => {
    elements.manualStatus.textContent = '';
    elements.manualStatus.className = 'status-message';
  }, 3000);
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', init);
