(function() {
  const i18n = {
    uk: { dict: "Словник", clear: "🗑️ Очистити", hint: "Тут з’являться слова", pdfBtn: "📂 Відкрити в AI-рідері" },
    en: { dict: "Dictionary", clear: "🗑️ Clear", hint: "Words will appear here", pdfBtn: "📂 Open in AI Reader" }
  };

  let state = {
    panel: null,
    translations: [],
    isEnabled: true,
    uiLang: 'uk',
    toLang: 'uk',
    audio: null
  };

  // Initialize audio object safely
  try {
    state.audio = new Audio();
  } catch (error) {
    console.log('Audio initialization error:', error);
    state.audio = null;
  }

  const url = window.location.href.toLowerCase();
  const isPdf = url.includes('.pdf') || document.contentType === 'application/pdf';
  const isOurReader = () => window.location.href.includes('pdfjs/web/viewer.html');

  if (isPdf && !isOurReader()) {
    showPdfBtnSync();
    setTimeout(showPdfBtnSync, 1000);
    setTimeout(showPdfBtnSync, 3000);
  }

  function showPdfBtnSync() {
    if (document.getElementById('tr-pdf-float-btn')) return;
    const b = document.createElement('button');
    b.id = 'tr-pdf-float-btn';
    b.innerHTML = i18n.uk.pdfBtn;
    b.style.cssText = `
      position: fixed !important; top: 70px !important; right: 10px !important;
      z-index: 2147483647 !important; background: rgba(26, 115, 232, 0.8) !important;
      color: white !important; border: 1px solid rgba(255,255,255,0.2) !important;
      padding: 8px 14px !important; border-radius: 6px !important;
      cursor: pointer !important; font-weight: 500 !important;
      font-family: system-ui, sans-serif !important; font-size: 13px !important;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important; display: block !important;
      backdrop-filter: blur(4px); transition: all 0.2s ease; opacity: 0.8;
    `;
    b.onmouseover = () => { b.style.opacity = '1'; b.style.background = '#1a73e8'; };
    b.onmouseout = () => { b.style.opacity = '0.8'; b.style.background = 'rgba(26, 115, 232, 0.8)'; };
    b.onclick = () => {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'openPdfReader' });
      }
    };
    const target = document.documentElement || document.body;
    if (target) target.appendChild(b);
  }

  chrome.storage.sync.get(['translationsArray', 'translatorEnabled', 'uiLang', 'toLang', 'fromLang'], function(res) {
    if (chrome.runtime.lastError || !chrome.runtime.id) {
      console.log('Extension context invalidated, reloading...');
      return;
    }
    state.translations = res.translationsArray || [];
    
    // Міграція: додаємо actualToLang для існуючих перекладів
    let needsUpdate = false;
    state.translations.forEach(item => {
      if (!item.actualToLang) {
        item.actualToLang = item.toLang || 'uk';
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      chrome.storage.sync.set({ translationsArray: state.translations });
    }
    
    state.isEnabled = res.translatorEnabled !== false;
    state.uiLang = res.uiLang || 'uk';
    state.toLang = res.toLang || 'uk';

    const pdfBtn = document.getElementById('tr-pdf-float-btn');
    if (pdfBtn) pdfBtn.innerHTML = i18n[state.uiLang].pdfBtn;

    if (!isPdf || isOurReader()) {
      createPanel();
      setupSelectionHandler();
    }
  });

  function createPanel() {
    if (document.getElementById('my-translator-panel')) return;
    state.panel = document.createElement('div');
    state.panel.id = 'my-translator-panel';
    state.panel.style.cssText = `position:fixed; top:20px; right:20px; width:280px; max-height:500px; background:white; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.15); z-index:2147483647; display:none; flex-direction:column; overflow:hidden; font-family:system-ui, sans-serif; border:1px solid #eee;`;
    
    const t = i18n[state.uiLang] || i18n.uk;
    state.panel.innerHTML = `
      <style>
        @keyframes slideIn { 0% { opacity:0; transform:translateX(-15px); } 100% { opacity:1; transform:translateX(0); } }
        .animate-new { animation: slideIn 0.3s forwards; }
        .tr-speak { background: none !important; border: none !important; cursor: pointer !important; font-size: 14px !important; padding: 0 !important; margin: 0 0 0 4px !important; opacity: 0.6; transition: 0.2s; line-height: 1; vertical-align: middle; }
        .tr-speak:hover { opacity: 1; transform: scale(1.2); }
        .tr-speak.playing { filter: drop-shadow(0 0 2px #1a73e8); opacity: 1; }
        .lang-badge { font-size:9px; background:#f0f2f5; padding:2px 4px; border-radius:4px; font-weight:bold; margin-left:4px; border:1px solid #ddd; text-transform:uppercase; color:#666; vertical-align: middle; }
        .tr-hint { position:fixed; z-index:2147483647; background:rgba(0,0,0,0.85); color:white; padding:8px 12px; border-radius:8px; font-size:14px; pointer-events:none; transform:translate(-50%, -100%); transition:opacity 0.4s; text-align:center; max-width:250px; }
      </style>
      <div style="background:#f7f8f9; padding:12px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; cursor:move;" id="tr-header">
        <strong style="font-size:14px;color: black;">${t.dict}</strong>
        <div style="display:flex; align-items:center;">
          <button id="tr-clear" style="border:none; background:none; cursor:pointer; font-size:13px; margin-right:8px; color:#1a73e8;">${t.clear}</button>
          <button id="tr-close" style="border:none; background:none; cursor:pointer; font-size:20px; color:#999;">×</button>
        </div>
      </div>
      <div id="tr-list" style="padding:10px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px;"></div>`;
    
    document.documentElement.appendChild(state.panel);
    document.getElementById('tr-close').onclick = () => state.panel.style.display = 'none';
    document.getElementById('tr-clear').onclick = () => { state.translations = []; save(); };
    renderList();
    makeDraggable(document.getElementById('tr-header'), state.panel);
  }

  function setupSelectionHandler() {
    document.addEventListener('mouseup', (e) => {
      if (!state.isEnabled || (state.panel && state.panel.contains(e.target))) return;
      setTimeout(() => {
        const sel = window.getSelection().toString().trim();
        if (sel.length > 1) {
          const range = window.getSelection().getRangeAt(0);
          const rect = range.getBoundingClientRect();
          processText(sel, rect);
        }
      }, 10);
    });
  }

  function processText(text, rect) {
    if (!state.panel) createPanel();
    state.panel.style.display = 'flex';
    const existing = state.translations.find(i => i.orig === text);
    if (existing) {
      state.translations = [existing, ...state.translations.filter(i => i.orig !== text)];
      save(); showHint(existing.trans, rect);
    } else {
      // Тут завжди Auto-detect за замовчуванням для нових слів
      state.translations.unshift({ orig: text, trans: "...", fromLang: "auto", toLang: state.toLang, actualToLang: state.toLang });
      renderList();
      chrome.runtime.sendMessage({ action: 'translateText', text }, (res) => {
        if (chrome.runtime.lastError || !chrome.runtime.id) {
          console.log('Extension context invalidated during translation');
          return;
        }
        const item = state.translations.find(i => i.orig === text);
        if (item && res) {
          item.trans = res.translation; 
          item.fromLang = res.detectedLang;
          item.actualToLang = res.targetLang || state.toLang; // Зберігаємо фактичну мову перекладу
          save(); showHint(item.trans, rect);
        }
      });
    }
  }

  function showHint(text, rect) {
    const h = document.createElement('div');
    h.className = 'tr-hint'; h.textContent = text;
    h.style.left = `${rect.left + rect.width/2 + window.pageXOffset}px`;
    h.style.top = `${rect.top + window.pageYOffset}px`;
    document.documentElement.appendChild(h);
    setTimeout(() => { h.style.opacity = '0'; setTimeout(() => h.remove(), 400); }, 3000);
  }

  function save() {
    if (chrome.runtime && chrome.runtime.id) {
      chrome.storage.sync.set({ translationsArray: state.translations });
    }
    renderList();
  }

  function renderList() {
    const list = document.getElementById('tr-list');
    if (!list) return;
    const t = i18n[state.uiLang] || i18n.uk;
    if (state.translations.length === 0) { list.innerHTML = `<div style="text-align:center;color:#aaa;font-size:12px;margin-top:20px;">${t.hint}</div>`; return; }
    
    list.innerHTML = state.translations.map(i => `
      <div style="border-bottom:1px solid #f0f2f5; padding-bottom:8px;">
        <div style="font-size:11px; color:#888; display:flex; align-items:center; gap:2px; margin-bottom:2px;">
          <span style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(i.orig)}</span>
          <span class="lang-badge">${i.fromLang}</span>
          <button class="tr-speak" data-t="${escapeHTML(i.orig)}" data-l="${i.fromLang}">🔊</button>
        </div>
        <div style="font-size:14px; font-weight:600; color:#1c1e21; display:flex; align-items:center; gap:2px;">
          <span>${escapeHTML(i.trans)}</span>
          <span class="lang-badge">${i.actualToLang || i.toLang || 'uk'}</span>
          <button class="tr-speak" data-t="${escapeHTML(i.trans)}" data-l="${i.actualToLang || i.toLang || 'uk'}">🔊</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('.tr-speak').forEach(b => b.onclick = (e) => {
      const btn = e.currentTarget;
      
      // Очищуємо всі попередні підсвічування
      list.querySelectorAll('.tr-speak.playing').forEach(prevBtn => {
        prevBtn.classList.remove('playing');
      });
      
      // Зупиняємо попереднє аудіо якщо грає
      if (state.audio) {
        state.audio.pause();
        state.audio.currentTime = 0;
      }
      
      btn.classList.add('playing');
      
      chrome.runtime.sendMessage({ action: 'speakAI', text: btn.dataset.t, langCode: btn.dataset.l }, (r) => {
        if (chrome.runtime.lastError || !chrome.runtime.id) {
          console.log('Extension context invalidated during audio request');
          btn.classList.remove('playing');
          return;
        }
        if (r?.audio && state.audio) {
          try {
            state.audio.src = "data:audio/mp3;base64," + r.audio;
            state.audio.onended = () => btn.classList.remove('playing');
            state.audio.onerror = () => btn.classList.remove('playing');
            state.audio.play().catch(() => btn.classList.remove('playing'));
          } catch (error) {
            console.log('Audio playback error:', error);
            btn.classList.remove('playing');
          }
        } else {
          btn.classList.remove('playing');
        }
      });
    });
  }

  function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function makeDraggable(header, panel) {
    let drag = false, x, y;
    header.onmousedown = (e) => { if (e.target.tagName !== 'BUTTON') { drag = true; x = e.clientX - panel.offsetLeft; y = e.clientY - panel.offsetTop; } };
    document.onmousemove = (e) => { if (drag) { panel.style.left = (e.clientX - x) + 'px'; panel.style.top = (e.clientY - y) + 'px'; panel.style.right = 'auto'; } };
    document.onmouseup = () => drag = false;
  }
})();