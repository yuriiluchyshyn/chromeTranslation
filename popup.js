document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('toggleExtension');
  const compactMode = document.getElementById('compactMode');
  const clearBtn = document.getElementById('clearTranslations');
  
  // Load saved state
  chrome.storage.sync.get(['translatorEnabled', 'compactMode'], function(result) {
    toggle.checked = result.translatorEnabled || false;
    compactMode.checked = result.compactMode || false;
  });
  
  // Save state when toggled
  toggle.addEventListener('change', function() {
    chrome.storage.sync.set({
      translatorEnabled: toggle.checked
    });
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleTranslator',
        enabled: toggle.checked
      });
    });
  });
  
  // Compact mode toggle
  compactMode.addEventListener('change', function() {
    chrome.storage.sync.set({
      compactMode: compactMode.checked
    });
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleCompactMode',
        compact: compactMode.checked
      });
    });
  });
  
  // Clear translations
  clearBtn.addEventListener('click', function() {
    chrome.storage.sync.set({
      translations: {}
    });
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'clearTranslations'
      });
    });
  });
});