(function () {
  'use strict';
  
  // ============================================================================
  // CONSTANTS AND CONFIGURATION
  // ============================================================================
  
  const CONFIG = {
    PANEL_WIDTH: 300,
    PANEL_MAX_HEIGHT: 500,
    MAX_TEXT_LENGTH: 500,
    MAX_STORAGE_TEXT_LENGTH: 10000,
    AUDIO_SPEED: {
      MIN: 0.1,
      MAX: 4,
      DEFAULT: 1
    },
    TIMEOUTS: {
      HINT_DISPLAY_BASE: 6000,
      HINT_DISPLAY_MAX: 20000,
      FADE_DURATION: 400
    },
    Z_INDEX: 2147483647
  };

  const i18n = {
    uk: { 
      dict: "Словник", 
      clear: "🗑️", 
      stop: "🛑", 
      hint: "Тут з'являться слова", 
      pdfBtn: "📂 Відкрити в AI-рідері", 
      pause: "⏸️", 
      play: "▶️", 
      speed: "Швидкість",
      translating: "Перекладаю...",
      translationFailed: "Переклад не вдався",
      translationError: "Помилка перекладу"
    },
    en: { 
      dict: "Dictionary", 
      clear: "🗑️", 
      stop: "🛑", 
      hint: "Words will appear here", 
      pdfBtn: "📂 Open in AI Reader", 
      pause: "⏸️", 
      play: "▶️", 
      speed: "Speed",
      translating: "Translating...",
      translationFailed: "Translation failed", 
      translationError: "Translation error"
    },
    es: {
      dict: "Diccionario",
      clear: "🗑️",
      stop: "🛑", 
      hint: "Las palabras aparecerán aquí",
      pdfBtn: "📂 Abrir en lector AI",
      pause: "⏸️",
      play: "▶️",
      speed: "Velocidad",
      translating: "Traduciendo...",
      translationFailed: "Traducción fallida",
      translationError: "Error de traducción"
    },
    de: {
      dict: "Wörterbuch",
      clear: "🗑️",
      stop: "🛑",
      hint: "Wörter werden hier erscheinen", 
      pdfBtn: "📂 In AI-Reader öffnen",
      pause: "⏸️",
      play: "▶️", 
      speed: "Geschwindigkeit",
      translating: "Übersetzen...",
      translationFailed: "Übersetzung fehlgeschlagen",
      translationError: "Übersetzungsfehler"
    }
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  let state = { 
    panel: null, 
    translations: [], 
    isEnabled: false, 
    uiLang: 'uk', 
    toLang: 'uk', 
    storageLoaded: false, 
    showHints: true, 
    audioSpeed: CONFIG.AUDIO_SPEED.DEFAULT, 
    isAudioPaused: false, 
    currentAudioElement: null,
    initialized: false,
    pdfButtonCreated: false,
    pdfButtonCreating: false,
    pdfButtonObserver: null,
    eventListeners: new Map(),
    dragHandlers: null,
    mouseUpHandler: null,
    dblClickHandler: null
  };

  // Positioning utilities for hints and tooltips
  const positionUtils = {
    // Calculate optimal position for tooltip within viewport
    calculateOptimalPosition: (rect, tooltipWidth, tooltipHeight) => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.pageXOffset || document.documentElement.scrollLeft,
        scrollY: window.pageYOffset || document.documentElement.scrollTop
      };
      
      // Default position above the selection
      let left = rect.left + viewport.scrollX;
      let top = rect.top + viewport.scrollY - tooltipHeight - 10;
      
      // Adjust horizontal position if tooltip goes outside viewport
      if (left + tooltipWidth > viewport.width + viewport.scrollX) {
        left = viewport.width + viewport.scrollX - tooltipWidth - 10;
      }
      if (left < viewport.scrollX + 10) {
        left = viewport.scrollX + 10;
      }
      
      // Adjust vertical position if tooltip goes outside viewport
      if (top < viewport.scrollY + 10) {
        // Position below if no space above
        top = rect.bottom + viewport.scrollY + 10;
        
        // If still outside viewport, position at top of viewport
        if (top + tooltipHeight > viewport.height + viewport.scrollY) {
          top = viewport.scrollY + 10;
        }
      }
      
      return { left, top };
    },
    
    // Get estimated tooltip dimensions
    getEstimatedDimensions: (text, isShortText) => {
      if (isShortText) {
        return { width: Math.min(200, text.length * 8 + 40), height: 30 };
      } else {
        const estimatedWidth = Math.min(400, window.innerWidth - 40);
        const lines = Math.ceil(text.length / 40);
        const height = lines * 20 + 20;
        return { width: estimatedWidth, height };
      }
    },
    
    // Ensure position values are valid numbers
    sanitizePosition: (pos) => {
      return {
        left: validationUtils.validateNumber(pos.left, 0, 50000, 100),
        top: validationUtils.validateNumber(pos.top, 0, 50000, 100)
      };
    }
  };
  const validationUtils = {
    // Sanitize text input to prevent XSS and other issues
    sanitizeText: (text) => {
      if (typeof text !== 'string') return '';
      
      // Remove null bytes and control characters except newlines and tabs
      text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Limit length to prevent memory issues
      if (text.length > 10000) {
        text = text.substring(0, 10000);
      }
      
      // Basic HTML entity encoding for safety
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    },
    
    // Validate and sanitize language codes
    sanitizeLangCode: (langCode) => {
      if (typeof langCode !== 'string') return 'en';
      
      // Allow only alphanumeric characters and hyphens
      langCode = langCode.replace(/[^a-zA-Z0-9-]/g, '');
      
      // Limit length
      if (langCode.length > 10) {
        langCode = langCode.substring(0, 10);
      }
      
      return langCode || 'en';
    },
    
    // Validate numeric input (like audio speed)
    validateNumber: (value, min = 0, max = 10, defaultValue = 1) => {
      const num = parseFloat(value);
      if (isNaN(num) || !isFinite(num)) return defaultValue;
      return Math.max(min, Math.min(max, num));
    },
    
    // Validate URL input
    validateUrl: (url) => {
      if (typeof url !== 'string') return '';
      
      try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return '';
        }
        return urlObj.href;
      } catch (error) {
        return '';
      }
    },
    
    // Validate HTML attributes to prevent injection
    sanitizeAttribute: (attr) => {
      if (typeof attr !== 'string') return '';
      
      // Remove dangerous characters and limit length
      return attr
        .replace(/[<>"'&]/g, '')
        .substring(0, 1000);
    }
  };
  const domUtils = {
    // Cache for DOM queries
    elementCache: new Map(),
    
    // Get cached element or query and cache it
    getElementById: (id) => {
      if (domUtils.elementCache.has(id)) {
        const element = domUtils.elementCache.get(id);
        // Check if element is still in DOM
        if (element && element.parentNode) {
          return element;
        } else {
          domUtils.elementCache.delete(id);
        }
      }
      
      const element = document.getElementById(id);
      if (element) {
        domUtils.elementCache.set(id, element);
      }
      return element;
    },
    
    // Clear cache
    clearCache: () => {
      domUtils.elementCache.clear();
    },
    
    // Batch DOM updates
    batchUpdate: (callback) => {
      // Use requestAnimationFrame for better performance
      if (window.requestAnimationFrame) {
        requestAnimationFrame(callback);
      } else {
        setTimeout(callback, 0);
      }
    }
  };

  // CSS management - inject styles only once
  const cssManager = {
    injected: new Set(),
    
    injectOnce: (id, css) => {
      if (cssManager.injected.has(id)) {
        return false; // Already injected
      }
      
      try {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        cssManager.injected.add(id);
        return true;
      } catch (error) {
        console.warn('Translator: Failed to inject CSS:', error);
        return false;
      }
    },
    
    remove: (id) => {
      try {
        const style = document.getElementById(id);
        if (style) {
          style.remove();
          cssManager.injected.delete(id);
        }
      } catch (error) {
        console.warn('Translator: Failed to remove CSS:', error);
      }
    }
  };
  const selectionUtils = {
    // Check if selection is valid and safe to process
    isValidSelection: (selection) => {
      if (!selection || selection.rangeCount === 0) return false;
      
      try {
        const range = selection.getRangeAt(0);
        const text = selection.toString().trim();
        
        // Check if text is meaningful
        if (!text || text.length === 0) return false;
        
        // Skip very short selections (single characters, whitespace)
        if (text.length === 1 && /\s/.test(text)) return false;
        
        // Skip selections that are just punctuation or numbers
        if (text.length <= 2 && /^[^\w\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FFF]*$/.test(text)) return false;
        
        // Check if selection is within editable elements (avoid forms, inputs)
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        
        if (element) {
          const tagName = element.tagName?.toLowerCase();
          const contentEditable = element.contentEditable === 'true';
          const isInput = ['input', 'textarea', 'select'].includes(tagName);
          const isEditable = contentEditable || isInput;
          
          // Skip editable elements unless explicitly allowed
          if (isEditable) return false;
          
          // Skip code blocks and pre-formatted text
          if (['code', 'pre', 'script', 'style'].includes(tagName)) return false;
        }
        
        return true;
      } catch (error) {
        console.warn('Translator: Error validating selection:', error);
        return false;
      }
    },
    
    // Get clean text from selection
    getCleanText: (selection) => {
      try {
        let text = selection.toString().trim();
        
        // Remove excessive whitespace
        text = text.replace(/\s+/g, ' ');
        
        // Remove leading/trailing punctuation but keep internal punctuation
        text = text.replace(/^[^\w\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FFF]+|[^\w\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FFF]+$/g, '');
        
        // Limit length to reasonable maximum
        if (text.length > 500) {
          text = text.substring(0, 500).trim();
        }
        
        return text;
      } catch (error) {
        console.warn('Translator: Error cleaning selection text:', error);
        return '';
      }
    },
    
    // Get safe bounding rect
    getSafeBoundingRect: (selection) => {
      try {
        if (!selection || selection.rangeCount === 0) {
          return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        }
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Ensure rect has valid coordinates
        if (rect.width === 0 && rect.height === 0) {
          // Fallback: get rect from range's start container
          const startContainer = range.startContainer;
          const element = startContainer.nodeType === Node.TEXT_NODE 
            ? startContainer.parentElement 
            : startContainer;
          
          if (element && element.getBoundingClientRect) {
            return element.getBoundingClientRect();
          }
        }
        
        return rect;
      } catch (error) {
        console.warn('Translator: Error getting selection rect:', error);
        return { left: 100, top: 100, right: 200, bottom: 120, width: 100, height: 20 };
      }
    }
  };
  /**
   * Event listener management system to prevent memory leaks
   */
  const eventManager = {
    /**
     * Add event listener with automatic cleanup tracking
     * @param {Element} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event listener options
     */
    add: (element, event, handler, options = {}) => {
      const key = `${element.constructor.name}-${event}-${handler.name || 'anonymous'}`;
      
      // Remove existing listener if it exists
      if (state.eventListeners.has(key)) {
        const existing = state.eventListeners.get(key);
        existing.element.removeEventListener(existing.event, existing.handler, existing.options);
      }
      
      // Add new listener
      element.addEventListener(event, handler, options);
      state.eventListeners.set(key, { element, event, handler, options });
    },
    
    /**
     * Remove specific event listener
     * @param {Element} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event listener options
     */
    remove: (element, event, handler, options = {}) => {
      const key = `${element.constructor.name}-${event}-${handler.name || 'anonymous'}`;
      element.removeEventListener(event, handler, options);
      state.eventListeners.delete(key);
    },
    
    /**
     * Clean up all tracked event listeners
     */
    cleanup: () => {
      for (const [key, listener] of state.eventListeners) {
        try {
          listener.element.removeEventListener(listener.event, listener.handler, listener.options);
        } catch (error) {
          console.warn('Translator: Error removing event listener:', error);
        }
      }
      state.eventListeners.clear();
    }
  };

  // ============================================================================
  // CORE FUNCTIONALITY
  // ============================================================================

  /**
   * Promise-based storage loading with validation
   * @returns {Promise} - Resolves with loaded state
   */
  const loadStorage = () => {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.id) {
        reject(new Error('Chrome runtime not available'));
        return;
      }
      
      chrome.storage.local.get(['translationsArray', 'translatorEnabled', 'uiLang', 'toLang', 'showHints', 'audioSpeed'], (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        // Validate and sanitize loaded data
        state.translations = Array.isArray(res.translationsArray) ? res.translationsArray.map(item => ({
          orig: validationUtils.sanitizeText(item.orig || ''),
          trans: validationUtils.sanitizeText(item.trans || ''),
          fromLang: validationUtils.sanitizeLangCode(item.fromLang || 'auto'),
          toLang: validationUtils.sanitizeLangCode(item.toLang || 'uk'),
          actualToLang: item.actualToLang ? validationUtils.sanitizeLangCode(item.actualToLang) : undefined,
          timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now()
        })).filter(item => item.orig.length > 0) : [];
        
        state.isEnabled = res.translatorEnabled !== false;
        state.uiLang = validationUtils.sanitizeLangCode(res.uiLang || 'uk');
        state.toLang = validationUtils.sanitizeLangCode(res.toLang || 'uk');
        state.showHints = res.showHints !== false;
        state.audioSpeed = validationUtils.validateNumber(res.audioSpeed, CONFIG.AUDIO_SPEED.MIN, CONFIG.AUDIO_SPEED.MAX, CONFIG.AUDIO_SPEED.DEFAULT);
        state.storageLoaded = true;
        
        resolve(state);
      });
    });
  };

  // ============================================================================
  // UTILITY MODULES
  // ============================================================================

  /**
   * Safe Chrome API wrapper functions to handle runtime availability and errors
   */
  const safeChromeAPI = {
    /**
     * Send message to background script with error handling
     * @param {Object} message - Message to send
     * @param {Function} callback - Optional callback function
     * @returns {boolean} - Success status
     */
    sendMessage: (message, callback) => {
      if (!chrome?.runtime?.id) {
        console.warn('Translator: Chrome runtime not available');
        return false;
      }
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Translator: Runtime message error:', chrome.runtime.lastError.message);
            if (callback) callback(null);
          } else {
            if (callback) callback(response);
          }
        });
        return true;
      } catch (error) {
        console.warn('Translator: Failed to send message:', error);
        return false;
      }
    },
    
    /**
     * Set data to Chrome storage with error handling
     * @param {Object} data - Data to store
     * @param {Function} callback - Optional callback function
     * @returns {boolean} - Success status
     */
    storageSet: (data, callback) => {
      if (!chrome?.storage?.local) {
        console.warn('Translator: Chrome storage not available');
        return false;
      }
      
      try {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            console.warn('Translator: Storage set error:', chrome.runtime.lastError.message);
          }
          if (callback) callback(!chrome.runtime.lastError);
        });
        return true;
      } catch (error) {
        console.warn('Translator: Failed to set storage:', error);
        return false;
      }
    }
  };

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      // Health check from the popup: confirms the content script is alive on
      // this page/frame so the popup can warn when a page can't be translated.
      if (msg.action === 'ping') {
        sendResponse({
          ok: true,
          enabled: state.isEnabled,
          isTop: window.top === window
        });
        return true;
      }
      if (msg.action === 'audio_ended') {
        document.querySelectorAll('.tr-speak.playing').forEach(el => el.classList.remove('playing'));
      }
    } catch (error) {
      console.warn('Translator: Error handling runtime message:', error);
    }
  });

  const url = window.location.href;
  const isPdf = url.toLowerCase().includes('.pdf') || document.contentType === 'application/pdf';
  const isOurReader = url.includes('pdfjs/web/viewer.html');

  // Safe PDF button creation with comprehensive duplicate prevention
  const createPdfButton = () => {
    if (!state.storageLoaded || !state.isEnabled) {
      removePdfButton();
      return;
    }
    
    // Prevent multiple calls
    if (state.pdfButtonCreating) {
      return;
    }
    
    state.pdfButtonCreating = true;
    
    try {
      // Always remove existing button first to prevent duplicates
      removePdfButton();
      
      // Double-check no button exists
      if (document.getElementById('tr-pdf-float-btn')) {
        console.warn('Translator: PDF button already exists, skipping creation');
        state.pdfButtonCreating = false;
        return;
      }
      
      const b = document.createElement('button');
      b.id = 'tr-pdf-float-btn';
      b.innerHTML = i18n[state.uiLang]?.pdfBtn || i18n.uk.pdfBtn;
      b.style.cssText = `position:fixed!important;top:70px!important;right:10px!important;z-index:2147483647!important;background:rgba(26, 115, 232, 0.8)!important;color:white!important;border:1px solid rgba(255,255,255,0.2)!important;padding:8px 14px!important;border-radius:6px!important;cursor:pointer!important;font-weight:500!important;font-family:system-ui,sans-serif!important;font-size:13px!important;box-shadow:0 2px 10px rgba(0,0,0,0.1)!important;backdrop-filter:blur(4px);`;
      
      b.onclick = () => {
        const validatedUrl = validationUtils.validateUrl(window.location.href);
        if (validatedUrl) {
          safeChromeAPI.sendMessage({ action: 'openPdfReader', pdfUrl: validatedUrl });
        }
      };
      
      const target = document.documentElement || document.body;
      if (target) {
        target.appendChild(b);
        state.pdfButtonCreated = true;
        
        // Set up observer to detect if button gets removed by other scripts
        if (window.MutationObserver) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                mutation.removedNodes.forEach((node) => {
                  if (node.id === 'tr-pdf-float-btn') {
                    state.pdfButtonCreated = false;
                    if (state.pdfButtonObserver) {
                      state.pdfButtonObserver.disconnect();
                      state.pdfButtonObserver = null;
                    }
                  }
                });
              }
            });
          });
          
          observer.observe(target, { childList: true, subtree: true });
          state.pdfButtonObserver = observer;
        }
      }
    } catch (error) {
      console.warn('Translator: Error creating PDF button:', error);
      state.pdfButtonCreated = false;
    } finally {
      state.pdfButtonCreating = false;
    }
  };

  const removePdfButton = () => {
    try {
      const existingBtn = document.getElementById('tr-pdf-float-btn');
      if (existingBtn) {
        existingBtn.remove();
      }
      
      // Clean up observer
      if (state.pdfButtonObserver) {
        state.pdfButtonObserver.disconnect();
        state.pdfButtonObserver = null;
      }
      
      state.pdfButtonCreated = false;
      state.pdfButtonCreating = false;
    } catch (error) {
      console.warn('Translator: Error removing PDF button:', error);
    }
  };

  // ============================================================================
  // INITIALIZATION AND LIFECYCLE
  // ============================================================================

  /**
   * Main initialization function
   * Sets up the extension based on page type and user settings
   */
  const initialize = async () => {
    if (state.initialized) return;
    
    try {
      await loadStorage();
      state.initialized = true;
      
      // Handle PDF pages
      if (isPdf && !isOurReader) {
        if (state.isEnabled) {
          // Wait for DOM to be ready before creating button
          if (document.readyState === 'loading') {
            const handleDOMContentLoaded = () => createPdfButton();
            eventManager.add(document, 'DOMContentLoaded', handleDOMContentLoaded, { once: true });
          } else {
            createPdfButton();
          }
        }
      } else {
        // Handle regular pages
        if (document.readyState === 'loading') {
          const handleDOMContentLoaded = () => {
            createPanel();
            setupSelectionHandler();
          };
          eventManager.add(document, 'DOMContentLoaded', handleDOMContentLoaded, { once: true });
        } else {
          createPanel();
          setupSelectionHandler();
        }
      }
    } catch (error) {
      console.warn('Translator extension: Failed to initialize:', error);
    }
  };

  /**
   * Cleanup function for extension shutdown
   * Removes all event listeners, DOM elements, and resets state
   */
  const cleanup = () => {
    eventManager.cleanup();
    domUtils.clearCache();
    
    // Remove PDF button and observer
    if (state.pdfButtonCreated || state.pdfButtonObserver) {
      removePdfButton();
    }
    
    // Hide panel
    if (state.panel) {
      state.panel.style.display = 'none';
    }
    
    // Reset state
    Object.assign(state, {
      initialized: false,
      pdfButtonCreated: false,
      pdfButtonCreating: false,
      pdfButtonObserver: null,
      dragHandlers: null,
      mouseUpHandler: null,
      dblClickHandler: null
    });
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Save translations to storage
   */
  function save() { 
    safeChromeAPI.storageSet({ translationsArray: state.translations });
    renderList(); 
  }
  
  /**
   * Enhanced HTML escaping using validation utilities
   * @param {string} str - String to escape
   * @returns {string} - Escaped string
   */
  function escapeHTML(str) { 
    return validationUtils.sanitizeText(str || '');
  }

  /**
   * Show loading hint for translations
   * @param {Object} rect - Bounding rectangle for positioning
   * @returns {Element} - Created hint element
   */
  function showLoadingHint(rect) {
    const t = i18n[state.uiLang] || i18n.uk;
    return showHint(t.translating, rect, true);
  }

  // Handle page unload
  const handleBeforeUnload = () => cleanup();
  eventManager.add(window, 'beforeunload', handleBeforeUnload);

  // Start initialization
  initialize();

  // Listen for storage changes to update the enabled state
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && state.storageLoaded) {
      if (changes.translatorEnabled) {
        const wasEnabled = state.isEnabled;
        state.isEnabled = changes.translatorEnabled.newValue !== false;
        
        // Hide panel if translator is disabled
        if (!state.isEnabled && state.panel) {
          state.panel.style.display = 'none';
        }
        
        // Update PDF button visibility if on PDF page
        if (isPdf && !isOurReader) {
          if (!state.isEnabled && state.pdfButtonCreated) {
            removePdfButton();
          } else if (state.isEnabled && !state.pdfButtonCreated) {
            createPdfButton();
          }
        }
      }
      
      if (changes.uiLang) {
        state.uiLang = validationUtils.sanitizeLangCode(changes.uiLang.newValue || 'uk');
        // Update PDF button text if it exists
        if (isPdf && !isOurReader && state.pdfButtonCreated) {
          const btn = domUtils.getElementById('tr-pdf-float-btn');
          if (btn) {
            btn.innerHTML = escapeHTML(i18n[state.uiLang]?.pdfBtn || i18n.uk.pdfBtn);
          }
        }
      }
      
      if (changes.toLang) {
        state.toLang = validationUtils.sanitizeLangCode(changes.toLang.newValue || 'uk');
      }
      
      if (changes.showHints) {
        state.showHints = changes.showHints.newValue !== false;
      }

      if (changes.audioSpeed) {
        state.audioSpeed = validationUtils.validateNumber(changes.audioSpeed.newValue, 0.1, 4, 1);
        if (typeof updateSpeedDisplay === 'function') {
          updateSpeedDisplay();
        }
      }
    }
  });

  function createPanel() {
    // Prevent duplicate panel creation
    if (document.getElementById('my-translator-panel') || state.panel) {
      console.warn('Translator: Panel already exists, skipping creation');
      return;
    }
    
    try {
      // Inject CSS styles once using CSS manager
      const panelCSS = `
        @keyframes tr-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .tr-loading-dots { display: inline-flex; gap: 2px; align-items: center; height: 14px; }
        .tr-dot { width: 4px; height: 4px; background: #1a73e8; border-radius: 50%; animation: tr-float 1s infinite ease-in-out; }
        .tr-dot:nth-child(2) { animation-delay: 0.2s; }
        .tr-dot:nth-child(3) { animation-delay: 0.4s; }

        .tr-speak { 
          background:none!important; border:none!important; cursor:pointer!important; 
          font-size:14px!important; padding:2px!important;
          margin:0 0 0 2px!important; opacity:0.6; transition: 0.2s; line-height:1; 
          display:inline-flex; align-items:center; justify-content:center; 
          border-radius: 50%; color: #888;
        }
        .tr-speak:hover { opacity:1; background: rgba(0,0,0,0.05)!important; }
        .tr-speak.playing { 
          opacity:1!important; color:#1a73e8!important; 
          background: rgba(26, 115, 232, 0.1) !important;
          box-shadow: 0 0 6px rgba(26, 115, 232, 0.1), 0 0 3px rgba(26, 115, 232, 0.2);
        }
        
        .lang-badge { font-size:9px;background:#f0f2f5;padding:2px 4px;border-radius:4px;margin-left:4px;color:#666;text-transform:uppercase;font-weight:bold; }
        .tr-header-btn { border:none; background:none; cursor:pointer; font-size:14px; padding:4px; opacity:0.7; transition:0.2s; }
        .tr-header-btn:hover { opacity:1; transform:scale(1.1); }
        .tr-speed-dropdown { position: relative; display: inline-block; }
        .tr-speed-btn { 
          border:none; background:rgba(26, 115, 232, 0.1); cursor:pointer; font-size:11px; 
          padding:4px 8px; opacity:0.8; transition:0.2s; border-radius:4px;
          color:#1a73e8; font-weight:bold; min-width:40px;
        }
        .tr-speed-btn:hover { opacity:1; background:rgba(26, 115, 232, 0.2); }
        .tr-speed-menu { 
          display:none; position:absolute; top:100%; right:0; background:white; 
          border:1px solid #ddd; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15); 
          z-index:10; min-width:100px;
        }
        .tr-speed-menu.show { display:block; }
        .tr-speed-option { 
          padding:8px 12px; cursor:pointer; font-size:12px; 
          border-bottom:1px solid #f0f2f5; transition:0.2s;
        }
        .tr-speed-option:last-child { border-bottom:none; }
        .tr-speed-option:hover { background:#f7f8f9; }
        .tr-speed-option.active { background:#1a73e8; color:white; }
        .tr-pause-btn { 
          border:none; background:none; cursor:pointer; font-size:14px; 
          padding:4px; opacity:0.7; transition:0.2s; 
        }
        .tr-pause-btn:hover { opacity:1; transform:scale(1.1); }
        .tr-pause-btn.paused { color:#1a73e8; opacity:1; }
        .tr-controls { display:flex; align-items:center; gap:4px; }
      `;
      
      cssManager.injectOnce('tr-panel-styles', panelCSS);

      state.panel = document.createElement('div');
      state.panel.id = 'my-translator-panel';
      
      // Calculate initial position to ensure it's within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = CONFIG.PANEL_WIDTH;
      const panelMaxHeight = CONFIG.PANEL_MAX_HEIGHT;
      
      let initialRight = 20;
      let initialTop = 20;
      
      // Adjust if panel would be outside viewport
      if (panelWidth + initialRight > viewportWidth) {
        initialRight = Math.max(10, viewportWidth - panelWidth - 10);
      }
      
      if (panelMaxHeight + initialTop > viewportHeight) {
        initialTop = Math.max(10, viewportHeight - panelMaxHeight - 10);
      }
      
      state.panel.style.cssText = `position:fixed;top:${initialTop}px;right:${initialRight}px;width:${panelWidth}px;max-height:${panelMaxHeight}px;background:white;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:2147483647;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,sans-serif;border:1px solid #eee;`;

      const t = i18n[state.uiLang] || i18n.uk;
    state.panel.innerHTML = `
      <div style="background:#f7f8f9;padding:10px 12px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;cursor:move;" id="tr-header">
        <strong style="color:black;font-size:14px;">${t.dict}</strong>
        <div class="tr-controls">
          <div class="tr-speed-dropdown">
            <button id="tr-speed" class="tr-speed-btn" title="${t.speed}">1x</button>
            <div id="tr-speed-menu" class="tr-speed-menu">
              <div class="tr-speed-option" data-speed="0.25">0.25x</div>
              <div class="tr-speed-option" data-speed="0.5">0.5x</div>
              <div class="tr-speed-option active" data-speed="1">1x</div>
              <div class="tr-speed-option" data-speed="1.25">1.25x</div>
              <div class="tr-speed-option" data-speed="1.5">1.5x</div>
              <div class="tr-speed-option" data-speed="2">2x</div>
              <div class="tr-speed-option" data-speed="custom">Custom</div>
            </div>
          </div>
          <button id="tr-pause" class="tr-pause-btn tr-header-btn" title="Pause/Resume">${t.play}</button>
          <button id="tr-stop" class="tr-header-btn" title="Stop audio">${t.stop}</button>
          <button id="tr-clear" class="tr-header-btn" title="Clear list">${t.clear}</button>
          <button id="tr-close" style="border:none;background:none;cursor:pointer;font-size:20px;color:#999;line-height:1;margin-left:4px;">×</button>
        </div>
      </div>
      <div id="tr-list" style="padding:10px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:10px;"></div>`;

    document.documentElement.appendChild(state.panel);
    
    // Set up event handlers with proper error handling
    const closeBtn = document.getElementById('tr-close');
    const clearBtn = document.getElementById('tr-clear');
    const stopBtn = document.getElementById('tr-stop');
    const pauseBtn = document.getElementById('tr-pause');
    const speedBtn = document.getElementById('tr-speed');
    const speedMenu = document.getElementById('tr-speed-menu');
    
    if (closeBtn) {
      closeBtn.onclick = () => state.panel.style.display = 'none';
    }
    
    if (clearBtn) {
      clearBtn.onclick = () => { 
        state.translations = []; 
        save(); 
      };
    }

    // ЛОГІКА КНОПКИ ЗУПИНКИ
    if (stopBtn) {
      stopBtn.onclick = () => {
        safeChromeAPI.sendMessage({ action: 'stop_audio_global' });
        state.isAudioPaused = false;
        updatePauseButton();
      };
    }

    // ЛОГІКА КНОПКИ ПАУЗИ/ВІДНОВЛЕННЯ
    if (pauseBtn) {
      pauseBtn.onclick = () => {
        if (state.isAudioPaused) {
          // Відновити програвання
          safeChromeAPI.sendMessage({ action: 'resume_audio' });
          state.isAudioPaused = false;
        } else {
          // Поставити на паузу
          safeChromeAPI.sendMessage({ action: 'pause_audio' });
          state.isAudioPaused = true;
        }
        updatePauseButton();
      };
    }

    // ЛОГІКА МЕНЮ ШВИДКОСТІ
    if (speedBtn && speedMenu) {
      speedBtn.onclick = (e) => {
        e.stopPropagation();
        speedMenu.classList.toggle('show');
      };
    }

    // Закрити меню при кліку поза ним
    const globalClickHandler = () => {
      const currentSpeedMenu = document.getElementById('tr-speed-menu');
      if (currentSpeedMenu) currentSpeedMenu.classList.remove('show');
    };
    eventManager.add(document, 'click', globalClickHandler);

    // Обробка вибору швидкості
    if (speedMenu) {
      const speedMenuClickHandler = (e) => {
        if (e.target.classList.contains('tr-speed-option')) {
          const speed = e.target.dataset.speed;
          if (speed === 'custom') {
            const customSpeedInput = prompt('Введіть швидкість (наприклад, 1.25):', state.audioSpeed);
            if (customSpeedInput !== null) {
              const customSpeed = validationUtils.validateNumber(customSpeedInput, 0.1, 4, state.audioSpeed);
              if (customSpeed !== state.audioSpeed) {
                setAudioSpeed(customSpeed);
              }
            }
          } else {
            const validatedSpeed = validationUtils.validateNumber(speed, 0.1, 4, 1);
            setAudioSpeed(validatedSpeed);
          }
          speedMenu.classList.remove('show');
        }
      };
      eventManager.add(speedMenu, 'click', speedMenuClickHandler);
    }

    updateSpeedDisplay();
    updatePauseButton();
    renderList();
    
    const headerEl = document.getElementById('tr-header');
    if (headerEl) {
      makeDraggable(headerEl, state.panel);
    }
    
    } catch (error) {
      console.warn('Translator: Error creating panel:', error);
      state.panel = null;
    }
  }

  function setAudioSpeed(speed) {
    const validatedSpeed = validationUtils.validateNumber(speed, CONFIG.AUDIO_SPEED.MIN, CONFIG.AUDIO_SPEED.MAX, CONFIG.AUDIO_SPEED.DEFAULT);
    state.audioSpeed = validatedSpeed;
    safeChromeAPI.storageSet({ audioSpeed: validatedSpeed });
    safeChromeAPI.sendMessage({ action: 'set_audio_speed', speed: validatedSpeed });
    updateSpeedDisplay();
  }

  function updateSpeedDisplay() {
    const speedBtn = domUtils.getElementById('tr-speed');
    const speedMenu = domUtils.getElementById('tr-speed-menu');
    if (speedBtn) {
      speedBtn.textContent = state.audioSpeed === 1 ? '1x' : state.audioSpeed + 'x';
    }
    if (speedMenu) {
      // Оновити активний пункт меню
      speedMenu.querySelectorAll('.tr-speed-option').forEach(option => {
        option.classList.remove('active');
        if (parseFloat(option.dataset.speed) === state.audioSpeed) {
          option.classList.add('active');
        }
      });
    }
  }

  function updatePauseButton() {
    const pauseBtn = domUtils.getElementById('tr-pause');
    const t = i18n[state.uiLang] || i18n.uk;
    if (pauseBtn) {
      pauseBtn.innerHTML = state.isAudioPaused ? t.play : t.pause;
      pauseBtn.classList.toggle('paused', state.isAudioPaused);
    }
  }

  function renderList() {
    const list = domUtils.getElementById('tr-list');
    if (!list) return;
    
    // Use batch update for better performance
    domUtils.batchUpdate(() => {
      if (state.translations.length === 0) { 
        list.innerHTML = `<div style="text-align:center;color:#aaa;font-size:12px;margin-top:20px;">${(i18n[state.uiLang] || i18n.uk).hint}</div>`; 
        return; 
      }

      // Create document fragment for efficient DOM manipulation
      const fragment = document.createDocumentFragment();
      
      state.translations.forEach(i => {
        const isWait = i.trans === "...";
        const div = document.createElement('div');
        div.style.cssText = 'border-bottom:1px solid #f0f2f5;padding-bottom:8px;';
        
        div.innerHTML = `
        <div style="font-size:11px;color:#888;display:flex;align-items:center;">
          <span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(i.orig)}</span>
          <span class="lang-badge">${escapeHTML(i.fromLang)}</span> 
          <button class="tr-speak" data-t="${escapeHTML(i.orig)}" data-l="${escapeHTML(i.fromLang)}">🔊</button>
        </div>
        <div style="font-size:14px;font-weight:600;color:#1c1e21;display:flex;align-items:center;margin-top:4px;">
          ${isWait ? `<div class="tr-loading-dots"><div class="tr-dot"></div><div class="tr-dot"></div><div class="tr-dot"></div></div>` : `<span>${escapeHTML(i.trans)}</span>`} 
          ${isWait ? '' : `<span class="lang-badge">${escapeHTML(i.actualToLang || i.toLang)}</span> <button class="tr-speak" data-t="${escapeHTML(i.trans)}" data-l="${escapeHTML(i.actualToLang || i.toLang)}">🔊</button>`}
        </div>`;
        
        fragment.appendChild(div);
      });
      
      // Clear and append all at once for better performance
      list.innerHTML = '';
      list.appendChild(fragment);

      // Attach event listeners after DOM update
      list.querySelectorAll('.tr-speak').forEach(b => b.onclick = (e) => {
        try {
          const btn = e.currentTarget;
          safeChromeAPI.sendMessage({ action: 'stop_audio_global' });
          document.querySelectorAll('.tr-speak.playing').forEach(el => el.classList.remove('playing'));
          btn.classList.add('playing');
          const langCode = (btn.dataset.l || 'en').split('-')[0].toLowerCase();
          safeChromeAPI.sendMessage({ 
            action: 'speakAI', 
            text: btn.dataset.t, 
            langCode: langCode, 
            speed: state.audioSpeed 
          });
          
          // Скинути стан паузи коли починається нове відтворення
          state.isAudioPaused = false;
          updatePauseButton();
        } catch (error) {
          console.warn('Translator: Error handling speak button:', error);
        }
      });
    });
  }

  function setupSelectionHandler() {
    // Remove existing selection handlers to prevent duplicates
    const existingMouseUpHandler = state.mouseUpHandler;
    const existingDblClickHandler = state.dblClickHandler;
    
    if (existingMouseUpHandler) {
      eventManager.remove(document, 'mouseup', existingMouseUpHandler);
    }
    if (existingDblClickHandler) {
      eventManager.remove(document, 'dblclick', existingDblClickHandler);
    }

    // Handle text selection on mouseup
    const mouseUpHandler = (e) => {
      try {
        if (!state.storageLoaded || !state.isEnabled || (state.panel && state.panel.contains(e.target))) return;
        
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selectionUtils.isValidSelection(selection)) return;
          
          const text = selectionUtils.getCleanText(selection);
          if (!text || text.length < 1) return;
          
          const rect = selectionUtils.getSafeBoundingRect(selection);
          processText(text, rect);
        }, 10);
      } catch (error) {
        console.warn('Translator: Error in mouseup handler:', error);
      }
    };

    // Handle double-click for better word selection
    const dblClickHandler = (e) => {
      try {
        if (!state.storageLoaded || !state.isEnabled || (state.panel && state.panel.contains(e.target))) return;
        
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selectionUtils.isValidSelection(selection)) return;
          
          const text = selectionUtils.getCleanText(selection);
          if (!text || text.length === 0) return;
          
          const rect = selectionUtils.getSafeBoundingRect(selection);
          processText(text, rect);
        }, 50); // Slightly longer delay for double-click
      } catch (error) {
        console.warn('Translator: Error in dblclick handler:', error);
      }
    };

    // Store handlers for cleanup
    state.mouseUpHandler = mouseUpHandler;
    state.dblClickHandler = dblClickHandler;

    // Add new handlers using event manager
    eventManager.add(document, 'mouseup', mouseUpHandler);
    eventManager.add(document, 'dblclick', dblClickHandler);
  }

  function processText(text, rect) {
    if (!state.storageLoaded || !state.isEnabled) return; // Don't process if translator is disabled or storage not loaded
    
    // Validate and sanitize text input
    if (!text || typeof text !== 'string') return;
    
    text = validationUtils.sanitizeText(text.trim());
    if (text.length === 0 || text.length > 500) return;
    
    // Skip if text contains only special characters or numbers
    if (/^[^\w\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FFF\s]+$/.test(text)) return;
    
    // Ensure rect is valid and sanitized
    if (!rect || typeof rect !== 'object') {
      rect = { left: 100, top: 100, right: 200, bottom: 120, width: 100, height: 20 };
    } else {
      // Validate rect properties
      rect = {
        left: validationUtils.validateNumber(rect.left, -10000, 10000, 100),
        top: validationUtils.validateNumber(rect.top, -10000, 10000, 100),
        right: validationUtils.validateNumber(rect.right, -10000, 10000, 200),
        bottom: validationUtils.validateNumber(rect.bottom, -10000, 10000, 120),
        width: validationUtils.validateNumber(rect.width, 0, 10000, 100),
        height: validationUtils.validateNumber(rect.height, 0, 10000, 20)
      };
    }
    
    try {
      if (!state.panel) createPanel();
      state.panel.style.display = 'flex';
      
      const existing = state.translations.find(i => i.orig === text);
      if (existing) {
        state.translations = [existing, ...state.translations.filter(i => i.orig !== text)];
        save(); 
        // Show hint only if showHints is enabled
        if (state.showHints) {
          setTimeout(() => showHint(existing.trans, rect), 100);
        }
      } else {
        // Show loading hint immediately for new translations (only if showHints is enabled)
        let loadingHint = null;
        if (state.showHints) {
          loadingHint = showLoadingHint(rect);
        }
        
        state.translations.unshift({ 
          orig: text, 
          trans: "...", 
          fromLang: "auto", 
          toLang: state.toLang,
          timestamp: Date.now() // Add timestamp for debugging
        });
        renderList();
        
        safeChromeAPI.sendMessage({ action: 'translateText', text }, (res) => {
          try {
            // Remove loading hint
            if (loadingHint && loadingHint.parentNode) {
              loadingHint.style.opacity = '0';
              setTimeout(() => {
                if (loadingHint && loadingHint.parentNode) {
                  loadingHint.remove();
                }
              }, 400);
            }
            
            const item = state.translations.find(i => i.orig === text);
            if (item && res && typeof res === 'object' && res.translation) {
              item.trans = validationUtils.sanitizeText(res.translation); 
              item.fromLang = validationUtils.sanitizeLangCode(res.detectedLang || 'auto');
              item.actualToLang = validationUtils.sanitizeLangCode(res.targetLang || state.toLang); 
              save();
              
              // Show translation hint after loading is complete (only if showHints is enabled)
              if (state.showHints && item.trans) {
                setTimeout(() => showHint(item.trans, rect), 500);
              }
            } else if (item) {
              // Handle translation failure
              item.trans = 'Translation failed';
              save();
            }
          } catch (error) {
            console.warn('Translator: Error processing translation response:', error);
            const item = state.translations.find(i => i.orig === text);
            if (item) {
              item.trans = 'Translation error';
              save();
            }
          }
        });
      }
    } catch (error) {
      console.warn('Translator: Error in processText:', error);
    }
  }

  function showHint(text, rect, isLoading = false) {
    // Inject global styles for loading animation using CSS manager
    const globalCSS = `
      @keyframes tr-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      .tr-loading-dots { display: inline-flex; gap: 2px; align-items: center; height: 14px; }
      .tr-dot { width: 4px; height: 4px; background: white; border-radius: 50%; animation: tr-float 1s infinite ease-in-out; }
      .tr-dot:nth-child(2) { animation-delay: 0.2s; }
      .tr-dot:nth-child(3) { animation-delay: 0.4s; }
    `;
    
    cssManager.injectOnce('tr-global-styles', globalCSS);

    const h = document.createElement('div');
    
    let content, dimensions, position;
    
    if (isLoading) {
      content = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span>Перекладаю...</span>
          <div class="tr-loading-dots">
            <div class="tr-dot"></div>
            <div class="tr-dot"></div>
            <div class="tr-dot"></div>
          </div>
        </div>
      `;
      dimensions = { width: 150, height: 40 };
    } else {
      const isShortText = text.length <= 20;
      dimensions = positionUtils.getEstimatedDimensions(text, isShortText);
      
      content = `
        <button class="tr-hint-close" style="position:absolute;top:2px;right:4px;background:rgba(255,255,255,0.2);border:none;color:white;cursor:pointer;font-size:14px;width:16px;height:16px;border-radius:2px;display:flex;align-items:center;justify-content:center;z-index:10;">×</button>
        <div style="padding-right:${isShortText ? '18px' : '20px'};">${escapeHTML(text)}</div>
      `;
    }
    
    // Calculate optimal position
    position = positionUtils.calculateOptimalPosition(rect, dimensions.width, dimensions.height);
    position = positionUtils.sanitizePosition(position);
    
    // Apply base styles
    const baseStyles = `
      position:fixed;
      z-index:2147483647;
      background:rgba(0,0,0,0.9);
      color:white;
      padding:${isLoading ? '8px 12px' : '6px 8px'};
      border-radius:6px;
      font-size:13px;
      transition:opacity 0.4s;
      left:${position.left}px;
      top:${position.top}px;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      max-width:${dimensions.width}px;
      word-wrap:break-word;
      line-height:1.3;
      pointer-events:${isLoading ? 'none' : 'auto'};
    `;
    
    h.style.cssText = baseStyles;
    h.innerHTML = content;
    
    // Add to DOM
    const target = document.documentElement || document.body;
    if (target) {
      target.appendChild(h);
    }

    // Кнопка закриття підказки. Вішаємо слухач у JS, а не через inline onclick,
    // бо на сайтах зі суворим CSP inline-обробники блокуються і кнопка не працює.
    if (!isLoading) {
      const closeBtn = h.querySelector('.tr-hint-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          h.remove();
        });
      }
    }
    
    if (!isLoading) {
      // Better timing calculation for auto-dismiss
      const wordCount = text.split(/\s+/).length;
      let displayTime;
      
      if (wordCount === 1) {
        displayTime = Math.min(6000, 3000 + (text.length * 100));
      } else if (wordCount <= 3) {
        displayTime = Math.min(8000, 4000 + (text.length * 120));
      } else {
        const baseTime = 6000;
        const timePerWord = 600;
        displayTime = Math.min(20000, baseTime + (wordCount * timePerWord));
      }
      
      setTimeout(() => { 
        if (h && h.parentNode) {
          h.style.opacity = '0'; 
          setTimeout(() => {
            if (h && h.parentNode) {
              h.remove();
            }
          }, 400); 
        }
      }, displayTime);
    }
    
    return h;
  }

  function showLoadingHint(rect) {
    return showHint('', rect, true);
  }

  function save() { 
    safeChromeAPI.storageSet({ translationsArray: state.translations });
    renderList(); 
  }
  
  // Enhanced HTML escaping using validation utilities
  function escapeHTML(str) { 
    return validationUtils.sanitizeText(str || '');
  }
  function makeDraggable(header, panel) {
    let drag = false, x, y, activePointerId = null;

    // Використовуємо Pointer Events + setPointerCapture, щоб перетягування
    // працювало навіть коли курсор проходить над iframe (напр., у PDF-рідері).
    // Раніше mousemove/mouseup слухалися на document і "губилися" над iframe —
    // через це панель не "відпускалася" (можна тягнути, але не кинути).
    const pointerDownHandler = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('.tr-speed-dropdown')) return;
      drag = true;
      activePointerId = e.pointerId;
      x = e.clientX - panel.offsetLeft;
      y = e.clientY - panel.offsetTop;
      try { header.setPointerCapture(activePointerId); } catch (_) {}
      e.preventDefault();
    };

    const pointerMoveHandler = (e) => {
      if (!drag) return;
      const newLeft = e.clientX - x;
      const newTop = e.clientY - y;

      const panelRect = panel.getBoundingClientRect();
      const panelWidth = panelRect.width || 300;
      const panelHeight = panelRect.height || 500;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const constrainedLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
      const constrainedTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));

      panel.style.left = constrainedLeft + 'px';
      panel.style.top = constrainedTop + 'px';
      panel.style.right = 'auto';
    };

    const pointerUpHandler = () => {
      drag = false;
      if (activePointerId !== null) {
        try { header.releasePointerCapture(activePointerId); } catch (_) {}
        activePointerId = null;
      }
    };

    // Уникаємо виділення тексту та жестів прокрутки під час перетягування
    header.style.touchAction = 'none';
    header.style.userSelect = 'none';

    // Remove existing drag handlers if they exist
    if (state.dragHandlers) {
      eventManager.remove(header, 'pointerdown', state.dragHandlers.pointerDown);
      eventManager.remove(header, 'pointermove', state.dragHandlers.pointerMove);
      eventManager.remove(header, 'pointerup', state.dragHandlers.pointerUp);
      eventManager.remove(header, 'pointercancel', state.dragHandlers.pointerUp);
    }

    // Store new handlers
    state.dragHandlers = {
      pointerDown: pointerDownHandler,
      pointerMove: pointerMoveHandler,
      pointerUp: pointerUpHandler
    };

    // Add new handlers. With pointer capture, move/up fire on the header
    // even when the pointer is over an iframe or leaves the window.
    eventManager.add(header, 'pointerdown', pointerDownHandler);
    eventManager.add(header, 'pointermove', pointerMoveHandler);
    eventManager.add(header, 'pointerup', pointerUpHandler);
    eventManager.add(header, 'pointercancel', pointerUpHandler);
    
    // Add window resize handler to reposition panel if needed
    const resizeHandler = () => {
      if (panel && panel.style.position === 'fixed') {
        const panelRect = panel.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let needsReposition = false;
        let newLeft = panel.offsetLeft;
        let newTop = panel.offsetTop;
        
        // Check if panel is outside viewport after resize
        if (panelRect.right > viewportWidth) {
          newLeft = Math.max(0, viewportWidth - panelRect.width);
          needsReposition = true;
        }
        
        if (panelRect.bottom > viewportHeight) {
          newTop = Math.max(0, viewportHeight - panelRect.height);
          needsReposition = true;
        }
        
        if (needsReposition) {
          panel.style.left = newLeft + 'px';
          panel.style.top = newTop + 'px';
          panel.style.right = 'auto';
        }
      }
    };
    
    eventManager.add(window, 'resize', resizeHandler);
  }
})();