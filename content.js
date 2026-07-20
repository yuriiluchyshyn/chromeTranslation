(function () {
  const i18n = {
    uk: { dict: "Словник", clear: "🗑️", stop: "🛑", hint: "Тут з'являться слова", pdfBtn: "📂 Відкрити в AI-рідері", pause: "⏸️", play: "▶️", speed: "Швидкість" },
    en: { dict: "Dictionary", clear: "🗑️", stop: "🛑", hint: "Words will appear here", pdfBtn: "📂 Open in AI Reader", pause: "⏸️", play: "▶️", speed: "Speed" }
  };

  let state = { panel: null, translations: [], isEnabled: false, uiLang: 'uk', toLang: 'uk', storageLoaded: false, showHints: true, audioSpeed: 1, isAudioPaused: false, currentAudioElement: null };

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

  chrome.storage.sync.get(['translationsArray', 'translatorEnabled', 'uiLang', 'toLang', 'showHints', 'audioSpeed'], function (res) {
    if (chrome.runtime.lastError || !chrome.runtime.id) return;
    state.translations = res.translationsArray || [];
    state.isEnabled = res.translatorEnabled !== false;
    state.uiLang = res.uiLang || 'uk';
    state.toLang = res.toLang || 'uk';
    state.showHints = res.showHints !== false;
    state.audioSpeed = res.audioSpeed || 1;
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

      if (changes.audioSpeed) {
        state.audioSpeed = changes.audioSpeed.newValue || 1;
        updateSpeedDisplay();
      }
    }
  });

  function createPanel() {
    if (document.getElementById('my-translator-panel')) return;
    state.panel = document.createElement('div');
    state.panel.id = 'my-translator-panel';
    state.panel.style.cssText = `position:fixed;top:20px;right:20px;width:300px;max-height:500px;background:white;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:2147483647;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,sans-serif;border:1px solid #eee;`;

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
        .tr-speed-dropdown { 
          position: relative; 
          display: inline-block; 
        }
        .tr-speed-btn { 
          border:none; 
          background:rgba(26, 115, 232, 0.1); 
          cursor:pointer; 
          font-size:11px; 
          padding:4px 8px; 
          opacity:0.8; 
          transition:0.2s; 
          border-radius:4px;
          color:#1a73e8;
          font-weight:bold;
          min-width:40px;
        }
        .tr-speed-btn:hover { opacity:1; background:rgba(26, 115, 232, 0.2); }
        .tr-speed-menu { 
          display:none; 
          position:absolute; 
          top:100%; 
          right:0; 
          background:white; 
          border:1px solid #ddd; 
          border-radius:6px; 
          box-shadow:0 4px 12px rgba(0,0,0,0.15); 
          z-index:10; 
          min-width:100px;
        }
        .tr-speed-menu.show { display:block; }
        .tr-speed-option { 
          padding:8px 12px; 
          cursor:pointer; 
          font-size:12px; 
          border-bottom:1px solid #f0f2f5; 
          transition:0.2s;
        }
        .tr-speed-option:last-child { border-bottom:none; }
        .tr-speed-option:hover { background:#f7f8f9; }
        .tr-speed-option.active { background:#1a73e8; color:white; }
        .tr-pause-btn { 
          border:none; 
          background:none; 
          cursor:pointer; 
          font-size:14px; 
          padding:4px; 
          opacity:0.7; 
          transition:0.2s; 
        }
        .tr-pause-btn:hover { opacity:1; transform:scale(1.1); }
        .tr-pause-btn.paused { color:#1a73e8; opacity:1; }
        .tr-controls { display:flex; align-items:center; gap:4px; }
      </style>
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
    document.getElementById('tr-close').onclick = () => state.panel.style.display = 'none';
    document.getElementById('tr-clear').onclick = () => { state.translations = []; save(); };

    // ЛОГІКА КНОПКИ ЗУПИНКИ
    document.getElementById('tr-stop').onclick = () => {
      chrome.runtime.sendMessage({ action: 'stop_audio_global' });
      state.isAudioPaused = false;
      updatePauseButton();
    };

    // ЛОГІКА КНОПКИ ПАУЗИ/ВІДНОВЛЕННЯ
    document.getElementById('tr-pause').onclick = () => {
      if (state.isAudioPaused) {
        // Відновити програвання
        chrome.runtime.sendMessage({ action: 'resume_audio' });
        state.isAudioPaused = false;
      } else {
        // Поставити на паузу
        chrome.runtime.sendMessage({ action: 'pause_audio' });
        state.isAudioPaused = true;
      }
      updatePauseButton();
    };

    // ЛОГІКА МЕНЮ ШВИДКОСТІ
    const speedBtn = document.getElementById('tr-speed');
    const speedMenu = document.getElementById('tr-speed-menu');
    
    speedBtn.onclick = (e) => {
      e.stopPropagation();
      speedMenu.classList.toggle('show');
    };

    // Закрити меню при кліку поза ним
    document.addEventListener('click', () => {
      speedMenu.classList.remove('show');
    });

    // Обробка вибору швидкості
    speedMenu.addEventListener('click', (e) => {
      if (e.target.classList.contains('tr-speed-option')) {
        const speed = e.target.dataset.speed;
        if (speed === 'custom') {
          const customSpeed = prompt('Введіть швидкість (наприклад, 1.25):', state.audioSpeed);
          if (customSpeed && !isNaN(customSpeed) && customSpeed > 0 && customSpeed <= 4) {
            setAudioSpeed(parseFloat(customSpeed));
          }
        } else {
          setAudioSpeed(parseFloat(speed));
        }
        speedMenu.classList.remove('show');
      }
    });

    updateSpeedDisplay();
    updatePauseButton();
    renderList();
    makeDraggable(document.getElementById('tr-header'), state.panel);
  }

  function setAudioSpeed(speed) {
    state.audioSpeed = speed;
    chrome.storage.sync.set({ audioSpeed: speed });
    chrome.runtime.sendMessage({ action: 'set_audio_speed', speed: speed });
    updateSpeedDisplay();
  }

  function updateSpeedDisplay() {
    const speedBtn = document.getElementById('tr-speed');
    const speedMenu = document.getElementById('tr-speed-menu');
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
    const pauseBtn = document.getElementById('tr-pause');
    const t = i18n[state.uiLang] || i18n.uk;
    if (pauseBtn) {
      pauseBtn.innerHTML = state.isAudioPaused ? t.play : t.pause;
      pauseBtn.classList.toggle('paused', state.isAudioPaused);
    }
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
      chrome.runtime.sendMessage({ action: 'speakAI', text: btn.dataset.t, langCode: langCode, speed: state.audioSpeed });
      
      // Скинути стан паузи коли починається нове відтворення
      state.isAudioPaused = false;
      updatePauseButton();
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
    header.onmousedown = (e) => { if (e.target.tagName !== 'BUTTON' && !e.target.closest('.tr-speed-dropdown')) { drag = true; x = e.clientX - panel.offsetLeft; y = e.clientY - panel.offsetTop; } };
    document.onmousemove = (e) => { if (drag) { panel.style.left = (e.clientX - x) + 'px'; panel.style.top = (e.clientY - y) + 'px'; panel.style.right = 'auto'; } };
    document.onmouseup = () => drag = false;
  }
})();