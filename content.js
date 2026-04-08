class TextTranslator {
  constructor() {
    this.isEnabled = false;
    this.isCompact = false;
    this.isMinimized = false;
    this.translations = {};
    this.panel = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.init();
  }

  async init() {
    // Load saved state and translations
    const result = await chrome.storage.sync.get(['translatorEnabled', 'translations', 'compactMode', 'panelPosition']);
    this.isEnabled = result.translatorEnabled || false;
    this.isCompact = result.compactMode || false;
    this.translations = result.translations || {};
    this.panelPosition = result.panelPosition || { x: 20, y: 20 };
    
    // Force PDF text selection immediately
    this.forcePDFTextSelection();
    
    if (this.isEnabled) {
      this.createPanel();
      this.attachEventListeners();
    }
    
    // Additional PDF setup after page load
    setTimeout(() => {
      this.forcePDFTextSelection();
      if (this.isEnabled) {
        this.attachPDFListeners();
      }
    }, 2000);
  }

  forcePDFTextSelection() {
    // Inject CSS to force text selection
    const style = document.createElement('style');
    style.textContent = `
      .textLayer, .textLayer *, #viewer, #viewer *, .page, .page * {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
    
    // Override any JavaScript that might disable text selection
    if (window.PDFViewerApplication) {
      console.log('PDFViewerApplication detected, overriding text selection');
      
      // Wait for PDF to load
      const checkPDFReady = () => {
        if (window.PDFViewerApplication.pdfDocument) {
          console.log('PDF document loaded, enabling text selection');
          this.enableAllTextSelection();
        } else {
          setTimeout(checkPDFReady, 1000);
        }
      };
      checkPDFReady();
    }
  }

  enableAllTextSelection() {
    // Remove any event listeners that might prevent text selection
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      // Remove common selection-blocking events
      el.style.userSelect = 'text';
      el.style.webkitUserSelect = 'text';
      el.style.mozUserSelect = 'text';
      el.style.msUserSelect = 'text';
      
      // Remove selectstart event listeners that return false
      const newEl = el.cloneNode(true);
      if (el.parentNode) {
        el.parentNode.replaceChild(newEl, el);
      }
    });
  }

  createPanel() {
    if (this.panel) return;
    
    this.panel = document.createElement('div');
    this.panel.id = 'translator-panel';
    if (this.isCompact) {
      this.panel.classList.add('compact');
    }
    
    this.panel.style.left = this.panelPosition.x + 'px';
    this.panel.style.top = this.panelPosition.y + 'px';
    
    this.panel.innerHTML = `
      <div id="translator-header">
        <span>Translations (${Object.keys(this.translations).length})</span>
        <div id="translator-controls">
          <button id="test-translate" title="Test Translation" style="background: none; border: none; color: white; font-size: 12px; cursor: pointer; padding: 2px 5px;">T</button>
          <button id="minimize-translator" title="Minimize">−</button>
          <button id="close-translator" title="Close">×</button>
        </div>
      </div>
      <div id="translator-content"></div>
    `;
    
    document.body.appendChild(this.panel);
    
    this.setupPanelControls();
    this.makeDraggable();
    this.updatePanel();
  }

  setupPanelControls() {
    // Close button
    document.getElementById('close-translator').addEventListener('click', () => {
      this.panel.style.display = 'none';
    });
    
    // Minimize button
    document.getElementById('minimize-translator').addEventListener('click', () => {
      this.toggleMinimize();
    });
    
    // Test translate button
    document.getElementById('test-translate').addEventListener('click', () => {
      console.log('Test translate clicked');
      this.testTranslation();
    });
  }

  testTranslation() {
    // Force translation of current selection or test text
    const selection = window.getSelection().toString().trim();
    if (selection) {
      console.log('Testing translation with selected text:', selection);
      this.handleTextSelection();
    } else {
      console.log('No selection, testing with sample text');
      // Test with sample text
      this.translations['test'] = 'Translating...';
      this.updatePanel();
      this.showPanel();
      
      setTimeout(async () => {
        try {
          const translation = await this.translateText('test');
          this.translations['test'] = translation;
          this.saveTranslations();
          this.updatePanel();
        } catch (error) {
          this.translations['test'] = 'Translation failed';
          this.updatePanel();
        }
      }, 500);
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const minimizeBtn = document.getElementById('minimize-translator');
    
    if (this.isMinimized) {
      this.panel.classList.add('minimized');
      minimizeBtn.textContent = '+';
      minimizeBtn.title = 'Expand';
    } else {
      this.panel.classList.remove('minimized');
      minimizeBtn.textContent = '−';
      minimizeBtn.title = 'Minimize';
    }
  }

  makeDraggable() {
    const header = document.getElementById('translator-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      this.isDragging = true;
      const rect = this.panel.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      
      document.addEventListener('mousemove', this.handleDrag.bind(this));
      document.addEventListener('mouseup', this.handleDragEnd.bind(this));
      
      e.preventDefault();
    });
  }

  handleDrag(e) {
    if (!this.isDragging) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    // Keep panel within viewport
    const maxX = window.innerWidth - this.panel.offsetWidth;
    const maxY = window.innerHeight - this.panel.offsetHeight;
    
    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));
    
    this.panel.style.left = boundedX + 'px';
    this.panel.style.top = boundedY + 'px';
    
    this.panelPosition = { x: boundedX, y: boundedY };
  }

  handleDragEnd() {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.handleDragEnd);
    
    // Save position
    chrome.storage.sync.set({ panelPosition: this.panelPosition });
  }

  removePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  attachEventListeners() {
    // Double click event
    document.addEventListener('dblclick', (e) => {
      if (!this.isEnabled || this.isClickOnPanel(e)) return;
      console.log('Double click detected');
      this.handleTextSelection();
    });

    // Text selection event
    document.addEventListener('mouseup', (e) => {
      if (!this.isEnabled || this.isClickOnPanel(e)) return;
      console.log('Mouse up detected');
      setTimeout(() => this.handleTextSelection(), 100);
    });

    // Selection change event (important for PDFs)
    document.addEventListener('selectionchange', () => {
      if (!this.isEnabled) return;
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 1) {
          console.log('Selection change detected:', selection.toString().trim());
          this.handleTextSelection();
        }
      }, 200);
    });

    // PDF specific event listeners
    this.attachPDFListeners();
  }

  attachPDFListeners() {
    // Enhanced PDF detection
    const isPDFPage = () => {
      const indicators = [
        window.location.href.includes('.pdf'),
        document.querySelector('.textLayer'),
        document.querySelector('#viewer'),
        document.querySelector('.page'),
        document.querySelector('[data-page-number]'),
        document.querySelector('#viewerContainer'),
        document.querySelector('.pdfViewer'),
        window.PDFViewerApplication,
        document.title.includes('.pdf'),
        document.querySelector('embed[type="application/pdf"]'),
        document.querySelector('object[type="application/pdf"]')
      ];
      
      return indicators.some(indicator => indicator);
    };

    console.log('PDF detection result:', isPDFPage());

    if (isPDFPage()) {
      console.log('PDF detected, setting up PDF listeners');
      
      // Force enable text selection on PDF elements
      this.enablePDFTextSelection();
      
      // Multiple strategies for PDF text selection
      this.setupPDFTextSelection();
      
      // Monitor for dynamically loaded PDF content
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) { // Element node
                if (node.classList && (
                    node.classList.contains('textLayer') || 
                    node.classList.contains('page') ||
                    node.classList.contains('canvasWrapper') ||
                    (node.querySelector && node.querySelector('.textLayer'))
                )) {
                  console.log('New PDF content detected');
                  setTimeout(() => {
                    this.enablePDFTextSelection();
                    this.setupPDFTextSelection();
                  }, 500);
                }
              }
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Periodic check for PDF content
      const checkInterval = setInterval(() => {
        this.enablePDFTextSelection();
        this.setupPDFTextSelection();
      }, 3000);
      
      // Clean up after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        observer.disconnect();
      }, 60000);
    }
  }

  enablePDFTextSelection() {
    // Force enable text selection on all PDF-related elements
    const selectors = [
      '.textLayer',
      '.textLayer span',
      '.textLayer div',
      '.page',
      '#viewer',
      '#viewerContainer',
      '.pdfViewer',
      '[data-page-number]',
      '.canvasWrapper'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.userSelect = 'text';
        element.style.webkitUserSelect = 'text';
        element.style.mozUserSelect = 'text';
        element.style.msUserSelect = 'text';
        element.style.pointerEvents = 'auto';
      });
    });
  }

  setupPDFTextSelection() {
    // Strategy 1: Text layers (PDF.js)
    const textLayers = document.querySelectorAll('.textLayer, .textLayer > span, .textLayer > div');
    console.log('Found text layers:', textLayers.length);
    
    textLayers.forEach(layer => {
      if (!layer.dataset.translatorListenerAdded) {
        layer.dataset.translatorListenerAdded = 'true';
        console.log('Adding listeners to text layer');
        
        layer.addEventListener('mouseup', (e) => {
          if (!this.isEnabled) return;
          console.log('Text layer mouseup');
          setTimeout(() => this.handleTextSelection(), 200);
        });
        
        layer.addEventListener('dblclick', (e) => {
          if (!this.isEnabled) return;
          console.log('Text layer double click');
          setTimeout(() => this.handleTextSelection(), 100);
        });
        
        layer.addEventListener('selectstart', (e) => {
          console.log('Text selection started');
        });
      }
    });
    
    // Strategy 2: PDF viewer containers
    const pdfContainers = document.querySelectorAll('#viewer, .page, [data-page-number], #viewerContainer, .pdfViewer');
    console.log('Found PDF containers:', pdfContainers.length);
    
    pdfContainers.forEach(container => {
      if (!container.dataset.translatorListenerAdded) {
        container.dataset.translatorListenerAdded = 'true';
        console.log('Adding listeners to PDF container');
        
        container.addEventListener('mouseup', (e) => {
          if (!this.isEnabled) return;
          console.log('PDF container mouseup');
          setTimeout(() => this.handleTextSelection(), 200);
        });
        
        container.addEventListener('dblclick', (e) => {
          if (!this.isEnabled) return;
          console.log('PDF container double click');
          setTimeout(() => this.handleTextSelection(), 100);
        });
      }
    });
    
    // Strategy 3: Direct event listeners on document for PDF pages
    if (!document.dataset.pdfListenersAdded) {
      document.dataset.pdfListenersAdded = 'true';
      console.log('Adding document-level PDF listeners');
      
      // Context menu event (right-click selection)
      document.addEventListener('contextmenu', (e) => {
        if (!this.isEnabled) return;
        setTimeout(() => this.handleTextSelection(), 100);
      });
      
      // Keyboard selection (Ctrl+A, Shift+arrows, etc.)
      document.addEventListener('keyup', (e) => {
        if (!this.isEnabled) return;
        if (e.ctrlKey || e.shiftKey) {
          setTimeout(() => this.handleTextSelection(), 200);
        }
      });
    }
  }

  isClickOnPanel(e) {
    return this.panel && this.panel.contains(e.target);
  }

  async handleTextSelection() {
    let selectedText;
    try {
      selectedText = window.getSelection().toString();
    } catch (error) {
      console.error('Error getting selection:', error);
      return;
    }
    
    if (!selectedText) {
      console.log('No text selected');
      return;
    }
    
    selectedText = selectedText.trim();
    if (!selectedText || selectedText.length < 2) {
      console.log('Selected text too short:', selectedText);
      return;
    }

    // Enhanced text cleaning for PDFs
    let cleanText;
    try {
      cleanText = selectedText
        .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
        .replace(/\n+/g, ' ')  // Replace newlines with spaces
        .replace(/\r+/g, ' ')  // Replace carriage returns
        .replace(/\t+/g, ' ')  // Replace tabs
        .trim();
      
      // Remove common PDF artifacts
      cleanText = cleanText
        .replace(/^\d+\s*/, '')  // Remove leading page numbers
        .replace(/\s*\d+$/, '')  // Remove trailing page numbers
        .replace(/[^\w\s\.,!?;:'"()-]/g, ' ')  // Remove special characters but keep punctuation
        .replace(/\s+/g, ' ')  // Clean up multiple spaces again
        .trim();
    } catch (error) {
      console.error('Error cleaning text:', error);
      cleanText = selectedText.trim();
    }
    
    if (!cleanText || cleanText.length < 2) {
      console.log('Cleaned text too short:', cleanText);
      return;
    }
    
    console.log('Selected text:', cleanText);
    
    // Highlight selected text briefly
    try {
      this.highlightSelection();
    } catch (error) {
      console.error('Error highlighting selection:', error);
    }

    // Check if already translated - if so, move to top
    if (this.translations && this.translations[cleanText]) {
      this.moveToTop(cleanText);
      this.showPanel();
      return;
    }

    // Initialize translations object if undefined
    if (!this.translations) {
      this.translations = {};
    }

    // Add to translations with loading state
    this.translations[cleanText] = 'Translating...';
    this.updatePanel();
    this.showPanel();

    // Translate text
    try {
      const translation = await this.translateText(cleanText);
      this.translations[cleanText] = translation || 'Translation failed';
      this.saveTranslations();
      this.updatePanel();
    } catch (error) {
      console.error('Translation error:', error);
      this.translations[cleanText] = 'Translation failed';
      this.updatePanel();
    }
  }

  highlightSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.className = 'selected-text';
      
      try {
        range.surroundContents(span);
        setTimeout(() => {
          const parent = span.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(span.textContent), span);
            parent.normalize();
          }
        }, 1000);
      } catch (e) {
        // Ignore errors for complex selections
      }
    }
  }

  async translateText(text) {
    if (!text || typeof text !== 'string') {
      console.error('Invalid text for translation:', text);
      return 'Invalid text';
    }

    // Using multiple translation APIs with fallbacks
    const apis = [
      () => this.translateWithMyMemory(text),
      () => this.translateWithLibreTranslate(text),
      () => this.fallbackTranslation(text)
    ];
    
    for (const api of apis) {
      try {
        const result = await api();
        if (result && result !== text && typeof result === 'string') {
          return result;
        }
      } catch (error) {
        console.error('API translation failed:', error);
        continue;
      }
    }
    
    return this.fallbackTranslation(text);
  }

  async translateWithMyMemory(text) {
    try {
      const encodedText = encodeURIComponent(text);
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|uk`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
      throw new Error('MyMemory API returned invalid response');
    } catch (error) {
      console.error('MyMemory translation error:', error);
      throw error;
    }
  }

  async translateWithLibreTranslate(text) {
    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: 'uk',
          format: 'text'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.translatedText && typeof data.translatedText === 'string') {
        return data.translatedText;
      }
      throw new Error('LibreTranslate API returned invalid response');
    } catch (error) {
      console.error('LibreTranslate translation error:', error);
      throw error;
    }
  }

  fallbackTranslation(text) {
    const simpleTranslations = {
      'hello': 'привіт',
      'world': 'світ',
      'good': 'добре',
      'bad': 'погано',
      'yes': 'так',
      'no': 'ні',
      'thank you': 'дякую',
      'please': 'будь ласка',
      'water': 'вода',
      'food': 'їжа',
      'house': 'дім',
      'car': 'машина',
      'book': 'книга',
      'computer': 'комп\'ютер',
      'document': 'документ',
      'page': 'сторінка',
      'text': 'текст',
      'translate': 'перекласти',
      'language': 'мова'
    };
    
    const lowerText = text.toLowerCase();
    return simpleTranslations[lowerText] || `[UA] ${text}`;
  }

  moveToTop(text) {
    try {
      if (!this.translations || !text || typeof text !== 'string') {
        console.error('Invalid parameters for moveToTop:', text, this.translations);
        return;
      }

      // Store the translation
      const translation = this.translations[text];
      
      if (!translation) {
        console.error('Translation not found for text:', text);
        return;
      }
      
      // Remove from current position
      delete this.translations[text];
      
      // Create new object with this translation first
      this.translations = { [text]: translation, ...this.translations };
      
      // Save and update
      this.saveTranslations();
      this.updatePanel();
    } catch (error) {
      console.error('Error in moveToTop:', error);
    }
  }

  removeTranslation(text) {
    try {
      if (!this.translations || !text) {
        console.error('Invalid parameters for removeTranslation:', text);
        return;
      }
      
      delete this.translations[text];
      this.saveTranslations();
      this.updatePanel();
    } catch (error) {
      console.error('Error in removeTranslation:', error);
    }
  }

  updatePanel() {
    if (!this.panel) return;
    
    try {
      const header = this.panel.querySelector('#translator-header span');
      if (header && this.translations) {
        header.textContent = `Translations (${Object.keys(this.translations).length})`;
      }
      
      const content = document.getElementById('translator-content');
      if (!content) return;
      
      content.innerHTML = '';
      
      if (!this.translations) {
        this.translations = {};
      }
      
      const entries = Object.entries(this.translations);
      
      if (entries.length === 0) {
        content.innerHTML = '<p style="color: #666; text-align: center; font-size: 12px; margin: 10px;">No translations yet.<br>Double-click or select text to translate.</p>';
        return;
      }
      
      entries.forEach(([original, translation]) => {
        try {
          const item = document.createElement('div');
          item.className = 'translation-item';
          item.innerHTML = `
            <button class="remove-translation" title="Remove translation">×</button>
            <div class="original-text">${this.escapeHtml(original || '')}</div>
            <div class="translated-text ${translation === 'Translating...' ? 'loading' : ''}">${this.escapeHtml(translation || '')}</div>
          `;
          
          // Add remove functionality
          const removeBtn = item.querySelector('.remove-translation');
          if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.removeTranslation(original);
            });
          }
          
          content.appendChild(item);
        } catch (error) {
          console.error('Error creating translation item:', error);
        }
      });
    } catch (error) {
      console.error('Error updating panel:', error);
    }
  }

  escapeHtml(text) {
    try {
      if (!text || typeof text !== 'string') {
        return '';
      }
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    } catch (error) {
      console.error('Error escaping HTML:', error);
      return String(text || '');
    }
  }

  showPanel() {
    if (this.panel) {
      this.panel.style.display = 'block';
    }
  }

  async saveTranslations() {
    try {
      if (this.translations && typeof this.translations === 'object') {
        await chrome.storage.sync.set({ translations: this.translations });
      }
    } catch (error) {
      console.error('Error saving translations:', error);
    }
  }

  setCompactMode(compact) {
    this.isCompact = compact;
    if (this.panel) {
      if (compact) {
        this.panel.classList.add('compact');
      } else {
        this.panel.classList.remove('compact');
      }
    }
  }

  clearTranslations() {
    this.translations = {};
    this.updatePanel();
  }

  toggle(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.createPanel();
      this.attachEventListeners();
    } else {
      this.removePanel();
    }
  }
}

// Initialize translator
const translator = new TextTranslator();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleTranslator') {
    translator.toggle(request.enabled);
  } else if (request.action === 'toggleCompactMode') {
    translator.setCompactMode(request.compact);
  } else if (request.action === 'clearTranslations') {
    translator.clearTranslations();
  }
});