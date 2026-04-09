(function () {
  const i18n = {
    uk: { dict: "Словник", clear: "🗑️", stop: "🛑", hint: "Тут з’являться слова", pdfBtn: "📂 Відкрити в AI-рідері" },
    en: { dict: "Dictionary", clear: "🗑️", stop: "🛑", hint: "Words will appear here", pdfBtn: "📂 Open in AI Reader" }
  };

  let state = { panel: null, translations: [], isEnabled: true, uiLang: 'uk', toLang: 'uk' };

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
      if (document.getElementById('tr-pdf-float-btn')) return;
      const b = document.createElement('button');
      b.id = 'tr-pdf-float-btn';
      b.innerHTML = i18n.uk.pdfBtn;
      b.style.cssText = `position:fixed!important;top:70px!important;right:10px!important;z-index:2147483647!important;background:rgba(26, 115, 232, 0.8)!important;color:white!important;border:1px solid rgba(255,255,255,0.2)!important;padding:8px 14px!important;border-radius:6px!important;cursor:pointer!important;font-weight:500!important;font-family:system-ui,sans-serif!important;font-size:13px!important;box-shadow:0 2px 10px rgba(0,0,0,0.1)!important;backdrop-filter:blur(4px);`;
      b.onclick = () => chrome.runtime.sendMessage({ action: 'openPdfReader', pdfUrl: window.location.href });
      (document.documentElement || document.body).appendChild(b);
    };
    showBtn();
    setTimeout(showBtn, 1000);
  }

  chrome.storage.sync.get(['translationsArray', 'translatorEnabled', 'uiLang', 'toLang'], function (res) {
    if (chrome.runtime.lastError || !chrome.runtime.id) return;
    state.translations = res.translationsArray || [];
    state.isEnabled = res.translatorEnabled !== false;
    state.uiLang = res.uiLang || 'uk';
    state.toLang = res.toLang || 'uk';
    if (!isPdf || isOurReader) { createPanel(); setupSelectionHandler(); }
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
    document.addEventListener('mouseup', (e) => {
      if (!state.isEnabled || (state.panel && state.panel.contains(e.target))) return;
      setTimeout(() => {
        const sel = window.getSelection().toString().trim();
        if (sel.length > 1) processText(sel, window.getSelection().getRangeAt(0).getBoundingClientRect());
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
      state.translations.unshift({ orig: text, trans: "...", fromLang: "auto", toLang: state.toLang });
      renderList();
      chrome.runtime.sendMessage({ action: 'translateText', text }, (res) => {
        const item = state.translations.find(i => i.orig === text);
        if (item && res) {
          item.trans = res.translation; item.fromLang = res.detectedLang;
          item.actualToLang = res.targetLang || state.toLang; save();
        }
      });
    }
  }

  function showHint(text, rect) {
    const h = document.createElement('div');
    h.style.cssText = `position:fixed;z-index:2147483647;background:rgba(0,0,0,0.85);color:white;padding:8px 12px;border-radius:8px;font-size:14px;pointer-events:none;transform:translate(-50%,-100%);transition:opacity 0.4s;left:${rect.left + rect.width / 2 + window.pageXOffset}px;top:${rect.top + window.pageYOffset}px;`;
    h.textContent = text; document.documentElement.appendChild(h);
    setTimeout(() => { h.style.opacity = '0'; setTimeout(() => h.remove(), 400); }, 3000);
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