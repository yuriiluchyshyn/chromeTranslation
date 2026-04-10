(function () {
  const i18n = {
    uk: { dict: "Словник", clear: "🗑️", stop: "🛑", hint: "Тут з’являться слова", pdfBtn: "📂 Відкрити в AI-рідері" },
    en: { dict: "Dictionary", clear: "🗑️", stop: "🛑", hint: "Words will appear here", pdfBtn: "📂 Open in AI Reader" }
  };

  let state = { panel: null, translations: [], isEnabled: false, uiLang: 'uk', toLang: 'uk', storageLoaded: false, showHints: true };

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'audio_ended') {
      document.querySelectorAll('.tr-speak.playing').forEach(el => el.classList.remove('playing'));
    }
  });

  const url = window.location.href;
  const isPdf = url.toLowerCase().includes('.pdf') || document.contentType === 'application/pdf';
  const isOurReader = url.includes('pdfjs/web/viewer.html');

  if (isPdf && !isOurReader) {
    const showBtn = () => {
      if (!state.storageLoaded || !state.isEnabled) {
        // Remove button if translator is disabled or storage not loaded
        const existingBtn = document.getElementById('tr-pdf-float-btn');
        if (existingBtn) existingBtn.remove();
        return;
      }
      
      if (document.getElementById('tr-pdf-float-btn')) return;
      const b = document.createElement('button');
      b.id = 'tr-pdf-float-btn';
      b.innerHTML = i18n.uk.pdfBtn;
      b.style.cssText = `position:fixed!important;top:70px!important;right:10px!important;z-index:2147483647!important;background:rgba(26, 115, 232, 0.8)!important;color:white!important;border:1px solid rgba(255,255,255,0.2)!important;padding:8px 14px!important;border-radius:6px!important;cursor:pointer!important;font-weight:500!important;font-family:system-ui,sans-serif!important;font-size:13px!important;box-shadow:0 2px 10px rgba(0,0,0,0.1)!important;backdrop-filter:blur(4px);`;
      b.onclick = () => chrome.runtime.sendMessage({ action: 'openPdfReader', pdfUrl: window.location.href });
      (document.documentElement || document.body).appendChild(b);
    };
    
    // Initial show - will be called after storage is loaded
    setTimeout(() => {
      showBtn();
      setTimeout(showBtn, 1000);
    }, 100);
  }

  chrome.storage.sync.get(['translationsArray', 'translatorEnabled', 'uiLang', 'toLang', 'showHints'], function (res) {
    if (chrome.runtime.lastError || !chrome.runtime.id) return;
    state.translations = res.translationsArray || [];
    state.isEnabled = res.translatorEnabled !== false;
    state.uiLang = res.uiLang || 'uk';
    state.toLang = res.toLang || 'uk';
    state.showHints = res.showHints !== false;
    state.storageLoaded = true; // Mark that storage has been loaded
    if (!isPdf || isOurReader) { createPanel(); setupSelectionHandler(); }
  });

  // Listen for storage changes to update the enabled state
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      if (changes.translatorEnabled) {
        state.isEnabled = changes.translatorEnabled.newValue !== false;
        
        // Hide panel if translator is disabled
        if (!state.isEnabled && state.panel) {
          state.panel.style.display = 'none';
        }
        
        // Update PDF button visibility if on PDF page
        if (isPdf && !isOurReader) {
          const existingBtn = document.getElementById('tr-pdf-float-btn');
          if (!state.isEnabled && existingBtn) {
            existingBtn.remove();
          } else if (state.isEnabled && !existingBtn) {
            const b = document.createElement('button');
            b.id = 'tr-pdf-float-btn';
            b.innerHTML = i18n.uk.pdfBtn;
            b.style.cssText = `position:fixed!important;top:70px!important;right:10px!important;z-index:2147483647!important;background:rgba(26, 115, 232, 0.8)!important;color:white!important;border:1px solid rgba(255,255,255,0.2)!important;padding:8px 14px!important;border-radius:6px!important;cursor:pointer!important;font-weight:500!important;font-family:system-ui,sans-serif!important;font-size:13px!important;box-shadow:0 2px 10px rgba(0,0,0,0.1)!important;backdrop-filter:blur(4px);`;
            b.onclick = () => chrome.runtime.sendMessage({ action: 'openPdfReader', pdfUrl: window.location.href });
            (document.documentElement || document.body).appendChild(b);
          }
        }
      }
      
      if (changes.showHints) {
        state.showHints = changes.showHints.newValue !== false;
      }
    }
  });

  function createPanel() {
    if (document.getElementById('my-translator-panel')) return;
    state.panel = document.createElement('div');
    state.panel.id = 'my-translator-panel';
    state.panel.style.cssText = `position:fixed;top:20px;right:20px;width:280px;max-height:500px;background:white;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:2147483647;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,sans-serif;border:1px solid #eee;`;

    const t = i18n[state.uiLang] || i18n.uk;
    state.panel.innerHTML = `
      <style>
        @keyframes tr-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .tr-loading-dots { display: inline-flex; gap: 2px; align-items: center; height: 14px; }
        .tr-dot { width: 4px; height: 4px; background: #1a73e8; border-radius: 50%; animation: tr-float 1s infinite ease-in-out; }
        .tr-dot:nth-child(2) { animation-delay: 0.2s; }
        .tr-dot:nth-child(3) { animation-delay: 0.4s; }

        .tr-speak { 
          background:none!important; border:none!important; cursor:pointer!important; 
          font-size:14px!important; padding:2px!important; /* Зменшено padding */
          margin:0 0 0 2px!important; opacity:0.6; transition: 0.2s; line-height:1; 
          display:inline-flex; align-items:center; justify-content:center; 
          border-radius: 50%; color: #888;
        }
        .tr-speak:hover { opacity:1; background: rgba(0,0,0,0.05)!important; }
        
        /* НОВИЙ, ПРИЄМНІШИЙ І МЕНШИЙ ФОН */
        .tr-speak.playing { 
          opacity:1!important; 
          color:#1a73e8!important; 
              background: rgba(26, 115, 232, 0.1) !important;
            box-shadow: 0 0 6px rgba(26, 115, 232, 0.1), 0 0 3px rgba(26, 115, 232, 0.2);

        }
        
        .lang-badge { font-size:9px;background:#f0f2f5;padding:2px 4px;border-radius:4px;margin-left:4px;color:#666;text-transform:uppercase;font-weight:bold; }
        .tr-header-btn { border:none; background:none; cursor:pointer; font-size:14px; padding:4px; opacity:0.7; transition:0.2s; }
        .tr-header-btn:hover { opacity:1; transform:scale(1.1); }
      </style>
      <div style="background:#f7f8f9;padding:10px 12px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;cursor:move;" id="tr-header">
        <strong style="color:black;font-size:14px;">${t.dict}</strong>
        <div style="display:flex;align-items:center;gap:4px;">
          <button id="tr-stop" class="tr-header-btn" title="Stop audio">${t.stop}</button>
          <button id="tr-clear" class="tr-header-btn" title="Clear list">${t.clear}</button>
          <button id="tr-close" style="border:none;background:none;cursor:pointer;font-size:20px;color:#999;line-height:1;margin-left:4px;">×</button>
        </div>
      </div>
      <div id="tr-list" style="padding:10px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:10px;"></div>`;

    document.documentElement.appendChild(state.panel);
    document.getElementById('tr-close').onclick = () => state.panel.style.display = 'none';
    document.getElementById('tr-clear').onclick = () => { state.translations = []; save(); };

    // ЛОГІКА КНОПКИ ЗУПИНКИ
    document.getElementById('tr-stop').onclick = () => {
      chrome.runtime.sendMessage({ action: 'stop_audio_global' });
    };

    renderList();
    makeDraggable(document.getElementById('tr-header'), state.panel);
  }

  function renderList() {
    const list = document.getElementById('tr-list');
    if (!list) return;
    if (state.translations.length === 0) { list.innerHTML = `<div style="text-align:center;color:#aaa;font-size:12px;margin-top:20px;">${(i18n[state.uiLang] || i18n.uk).hint}</div>`; return; }

    list.innerHTML = state.translations.map(i => {
      const isWait = i.trans === "...";
      return `
      <div style="border-bottom:1px solid #f0f2f5;padding-bottom:8px;">
        <div style="font-size:11px;color:#888;display:flex;align-items:center;">
          <span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(i.orig)}</span>
          <span class="lang-badge">${i.fromLang}</span> 
          <button class="tr-speak" data-t="${escapeHTML(i.orig)}" data-l="${i.fromLang}">🔊</button>
        </div>
        <div style="font-size:14px;font-weight:600;color:#1c1e21;display:flex;align-items:center;margin-top:4px;">
          ${isWait ? `<div class="tr-loading-dots"><div class="tr-dot"></div><div class="tr-dot"></div><div class="tr-dot"></div></div>` : `<span>${escapeHTML(i.trans)}</span>`} 
          ${isWait ? '' : `<span class="lang-badge">${i.actualToLang || i.toLang}</span> <button class="tr-speak" data-t="${escapeHTML(i.trans)}" data-l="${i.actualToLang || i.toLang}">🔊</button>`}
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.tr-speak').forEach(b => b.onclick = (e) => {
      const btn = e.currentTarget;
      chrome.runtime.sendMessage({ action: 'stop_audio_global' });
      document.querySelectorAll('.tr-speak.playing').forEach(el => el.classList.remove('playing'));
      btn.classList.add('playing');
      const langCode = (btn.dataset.l || 'en').split('-')[0].toLowerCase();
      chrome.runtime.sendMessage({ action: 'speakAI', text: btn.dataset.t, langCode: langCode });
    });
  }

  function setupSelectionHandler() {
    // Handle text selection on mouseup
    document.addEventListener('mouseup', (e) => {
      if (!state.storageLoaded || !state.isEnabled || (state.panel && state.panel.contains(e.target))) return;
      setTimeout(() => {
        const sel = window.getSelection().toString().trim();
        if (sel.length > 1) processText(sel, window.getSelection().getRangeAt(0).getBoundingClientRect());
      }, 10);
    });

    // Handle double-click for better word selection
    document.addEventListener('dblclick', (e) => {
      if (!state.storageLoaded || !state.isEnabled || (state.panel && state.panel.contains(e.target))) return;
      setTimeout(() => {
        const sel = window.getSelection().toString().trim();
        if (sel.length > 0) {
          const range = window.getSelection().getRangeAt(0);
          processText(sel, range.getBoundingClientRect());
        }
      }, 50); // Slightly longer delay for double-click
    });
  }

  function processText(text, rect) {
    if (!state.storageLoaded || !state.isEnabled) return; // Don't process if translator is disabled or storage not loaded
    
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
      
      state.translations.unshift({ orig: text, trans: "...", fromLang: "auto", toLang: state.toLang });
      renderList();
      chrome.runtime.sendMessage({ action: 'translateText', text }, (res) => {
        // Remove loading hint
        if (loadingHint) {
          loadingHint.style.opacity = '0';
          setTimeout(() => loadingHint.remove(), 400);
        }
        
        const item = state.translations.find(i => i.orig === text);
        if (item && res) {
          item.trans = res.translation; item.fromLang = res.detectedLang;
          item.actualToLang = res.targetLang || state.toLang; save();
          // Show translation hint after loading is complete (only if showHints is enabled)
          if (state.showHints) {
            setTimeout(() => showHint(res.translation, rect), 500);
          }
        }
      });
    }
  }

  function showHint(text, rect, isLoading = false) {
    // Add global styles for loading animation if not already added
    if (!document.getElementById('tr-global-styles')) {
      const style = document.createElement('style');
      style.id = 'tr-global-styles';
      style.textContent = `
        @keyframes tr-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .tr-loading-dots { display: inline-flex; gap: 2px; align-items: center; height: 14px; }
        .tr-dot { width: 4px; height: 4px; background: white; border-radius: 50%; animation: tr-float 1s infinite ease-in-out; }
        .tr-dot:nth-child(2) { animation-delay: 0.2s; }
        .tr-dot:nth-child(3) { animation-delay: 0.4s; }
      `;
      document.head.appendChild(style);
    }

    const h = document.createElement('div');
    const isShortText = text.length <= 20; // Define isShortText at the beginning
    
    if (isLoading) {
      const topPos = rect.top + window.pageYOffset - 40;
      h.style.cssText = `position:fixed;z-index:2147483647;background:rgba(0,0,0,0.9);color:white;padding:8px 12px;border-radius:6px;font-size:13px;pointer-events:none;transition:opacity 0.4s;left:${rect.left + window.pageXOffset}px;top:${topPos}px;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;`;
    } else {
      const maxWidth = isShortText ? 200 : Math.min(400, window.innerWidth - 40);
      const estimatedHeight = isShortText ? 30 : Math.ceil(text.length / 40) * 20 + 20;
      const topPos = rect.top + window.pageYOffset - estimatedHeight - 10;
      const finalTopPos = topPos < window.pageYOffset + 10 ? rect.bottom + window.pageYOffset + 10 : topPos;
      
      h.style.cssText = `position:fixed;z-index:2147483647;background:rgba(0,0,0,0.9);color:white;padding:6px 8px;border-radius:6px;font-size:13px;pointer-events:auto;transition:opacity 0.4s;left:${rect.left + window.pageXOffset}px;top:${finalTopPos}px;max-width:${maxWidth}px;word-wrap:break-word;line-height:1.3;box-shadow:0 2px 8px rgba(0,0,0,0.3);${isShortText ? 'white-space:nowrap;' : ''}`;
    }
    
    if (isLoading) {
      // Show loading animation with dots
      h.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span>Перекладаю...</span>
          <div class="tr-loading-dots">
            <div class="tr-dot"></div>
            <div class="tr-dot"></div>
            <div class="tr-dot"></div>
          </div>
        </div>
      `;
    } else {
      h.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position:absolute;top:2px;right:4px;background:rgba(255,255,255,0.2);border:none;color:white;cursor:pointer;font-size:14px;width:16px;height:16px;border-radius:2px;display:flex;align-items:center;justify-content:center;z-index:10;">×</button>
        <div style="padding-right:${isShortText ? '18px' : '20px'};">${escapeHTML(text)}</div>
      `;
      h.style.pointerEvents = 'auto'; // Enable pointer events for the close button
    }
    
    document.documentElement.appendChild(h);
    
    if (!isLoading) {
      // Better timing calculation - increased times for better readability
      const wordCount = text.split(/\s+/).length;
      let displayTime;
      
      if (wordCount === 1) {
        // Single word: 3-6 seconds (increased from 1.5-3)
        displayTime = Math.min(6000, 3000 + (text.length * 100));
      } else if (wordCount <= 3) {
        // Short phrases: 4-8 seconds (increased from 2-4)
        displayTime = Math.min(8000, 4000 + (text.length * 120));
      } else {
        // Longer text: 6-20 seconds (increased from 3-12)
        const baseTime = 6000;
        const timePerWord = 600; // 600ms per word (increased from 400ms)
        displayTime = Math.min(20000, baseTime + (wordCount * timePerWord));
      }
      
      setTimeout(() => { 
        h.style.opacity = '0'; 
        setTimeout(() => h.remove(), 400); 
      }, displayTime);
    }
    
    return h; // Return element so it can be controlled externally
  }

  function showLoadingHint(rect) {
    return showHint('', rect, true);
  }

  function save() { chrome.storage.sync.set({ translationsArray: state.translations }); renderList(); }
  function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function makeDraggable(header, panel) {
    let drag = false, x, y;
    header.onmousedown = (e) => { if (e.target.tagName !== 'BUTTON') { drag = true; x = e.clientX - panel.offsetLeft; y = e.clientY - panel.offsetTop; } };
    document.onmousemove = (e) => { if (drag) { panel.style.left = (e.clientX - x) + 'px'; panel.style.top = (e.clientY - y) + 'px'; panel.style.right = 'auto'; } };
    document.onmouseup = () => drag = false;
  }
})();