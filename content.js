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
    
    if (this.isEnabled) {
      this.createPanel();
      this.attachEventListeners();
    }
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
      this.handleTextSelection();
    });

    // Text selection event
    document.addEventListener('mouseup', (e) => {
      if (!this.isEnabled || this.isClickOnPanel(e)) return;
      setTimeout(() => this.handleTextSelection(), 100);
    });

    // PDF specific event listeners
    this.attachPDFListeners();
  }

  attachPDFListeners() {
    // Enhanced PDF detection
    const isPDFPage = () => {
      return window.location.href.includes('.pdf') || 
             document.querySelector('.textLayer') ||
             document.querySelector('#viewer') ||
             document.querySelector('.page') ||
             document.querySelector('[data-page-number]') ||
             window.PDFViewerApplication;
    };

    if (isPDFPage()) {
      console.log('PDF detected, setting up PDF listeners');
      
      // Multiple strategies for PDF text selection
      this.setupPDFTextSelection();
      
      // Monitor for dynamically loaded PDF content
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) { // Element node
                if (node.classList && (node.classList.contains('textLayer') || 
                    node.classList.contains('page') ||
                    node.querySelector && node.querySelector('.textLayer'))) {
                  setTimeout(() => this.setupPDFTextSelection(), 500);
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
        this.setupPDFTextSelection();
      }, 2000);
      
      // Clean up after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        observer.disconnect();
      }, 30000);
    }
  }

  setupPDFTextSelection() {
    // Strategy 1: Text layers (PDF.js)
    const textLayers = document.querySelectorAll('.textLayer, .textLayer > span, .textLayer > div');
    textLayers.forEach(layer => {
      if (!layer.dataset.translatorListenerAdded) {
        layer.dataset.translatorListenerAdded = 'true';
        
        layer.addEventListener('mouseup', (e) => {
          if (!this.isEnabled) return;
          setTimeout(() => this.handleTextSelection(), 200);
        });
        
        layer.addEventListener('dblclick', (e) => {
          if (!this.isEnabled) return;
          setTimeout(() => this.handleTextSelection(), 100);
        });
      }
    });
    
    // Strategy 2: PDF viewer containers
    const pdfContainers = document.querySelectorAll('#viewer, .page, [data-page-number]');
    pdfContainers.forEach(container => {
      if (!container.dataset.translatorListenerAdded) {
        container.dataset.translatorListenerAdded = 'true';
        
        container.addEventListener('mouseup', (e) => {
          if (!this.isEnabled) return;
          setTimeout(() => this.handleTextSelection(), 200);
        });
        
        container.addEventListener('dblclick', (e) => {
          if (!this.isEnabled) return;
          setTimeout(() => this.handleTextSelection(), 100);
        });
      }
    });
    
    // Strategy 3: Document-wide listeners for PDF
    if (window.location.href.includes('.pdf') || window.PDFViewerApplication) {
      document.addEventListener('selectionchange', () => {
        if (!this.isEnabled) return;
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.toString().trim().length > 1) {
            this.handleTextSelection();
          }
        }, 300);
      });
    }
  }

  isClickOnPanel(e) {
    return this.panel && this.panel.contains(e.target);
  }

  async handleTextSelection() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText || selectedText.length < 2) return;

    // Enhanced text cleaning for PDFs
    let cleanText = selectedText
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
    
    if (!cleanText || cleanText.length < 2) return;
    
    console.log('Selected text:', cleanText);
    
    // Highlight selected text briefly
    this.highlightSelection();

    // Check if already translated - if so, move to top
    if (this.translations[cleanText]) {
      this.moveToTop(cleanText);
      this.showPanel();
      return;
    }

    // Add to translations with loading state
    this.translations[cleanText] = 'Translating...';
    this.updatePanel();
    this.showPanel();

    // Translate text
    try {
      const translation = await this.translateText(cleanText);
      this.translations[cleanText] = translation;
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
    // Using multiple translation APIs with fallbacks
    const apis = [
      () => this.translateWithMyMemory(text),
      () => this.translateWithLibreTranslate(text),
      () => this.fallbackTranslation(text)
    ];
    
    for (const api of apis) {
      try {
        const result = await api();
        if (result && result !== text) {
          return result;
        }
      } catch (error) {
        continue;
      }
    }
    
    return this.fallbackTranslation(text);
  }

  async translateWithMyMemory(text) {
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|uk`);
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    throw new Error('MyMemory API failed');
  }

  async translateWithLibreTranslate(text) {
    // Alternative free translation API
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
    
    const data = await response.json();
    if (data.translatedText) {
      return data.translatedText;
    }
    throw new Error('LibreTranslate API failed');
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
    // Store the translation
    const translation = this.translations[text];
    
    // Remove from current position
    delete this.translations[text];
    
    // Create new object with this translation first
    this.translations = { [text]: translation, ...this.translations };
    
    // Save and update
    this.saveTranslations();
    this.updatePanel();
  }

  removeTranslation(text) {
    delete this.translations[text];
    this.saveTranslations();
    this.updatePanel();
  }

  updatePanel() {
    if (!this.panel) return;
    
    const header = this.panel.querySelector('#translator-header span');
    header.textContent = `Translations (${Object.keys(this.translations).length})`;
    
    const content = document.getElementById('translator-content');
    content.innerHTML = '';
    
    const entries = Object.entries(this.translations);
    
    if (entries.length === 0) {
      content.innerHTML = '<p style="color: #666; text-align: center; font-size: 12px; margin: 10px;">No translations yet.<br>Double-click or select text to translate.</p>';
      return;
    }
    
    entries.forEach(([original, translation]) => {
      const item = document.createElement('div');
      item.className = 'translation-item';
      item.innerHTML = `
        <button class="remove-translation" title="Remove translation">×</button>
        <div class="original-text">${this.escapeHtml(original)}</div>
        <div class="translated-text ${translation === 'Translating...' ? 'loading' : ''}">${this.escapeHtml(translation)}</div>
      `;
      
      // Add remove functionality
      const removeBtn = item.querySelector('.remove-translation');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTranslation(original);
      });
      
      content.appendChild(item);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showPanel() {
    if (this.panel) {
      this.panel.style.display = 'block';
    }
  }

  async saveTranslations() {
    await chrome.storage.sync.set({ translations: this.translations });
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