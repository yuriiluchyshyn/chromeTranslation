class TextTranslator {
  constructor() {
    this.panel = null;
    this.translations = []; 
    this.isEnabled = true;
    this.animatingText = null;
    this.audioPlayer = new Audio();
    this.init();
  }

  async init() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.sync) return;
    try {
      const result = await chrome.storage.sync.get(['translationsArray', 'translatorEnabled']);
      this.translations = result.translationsArray || [];
      this.isEnabled = result.translatorEnabled !== false; 

      if (window.location.pathname.toLowerCase().endsWith('.pdf') && !window.location.href.includes('pdfjs/web/viewer.html')) {
        if (this.isEnabled) this.showFloatingPdfButton();
        return; 
      }

      chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'toggleTranslator') {
          this.isEnabled = request.enabled;
          if (!this.isEnabled && this.panel) this.panel.style.display = 'none';
        }
      });

      this.createPanel();
      document.addEventListener('mouseup', (e) => {
        if (!this.isEnabled || (this.panel && this.panel.contains(e.target))) return;
        setTimeout(() => {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && sel.toString().trim().length > 1) {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            this.processText(sel.toString().trim(), rect);
          }
        }, 10);
      });
    } catch (e) {}
  }

  showFloatingPdfButton() {
    if (document.getElementById('tr-pdf-float-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'tr-pdf-float-btn';
    btn.innerHTML = '📂 Перейти до інтерактивного перегляду';
    btn.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 2147483647; background: #007bff; color: white; border: none; border-radius: 8px; padding: 12px 20px; font-family: system-ui; font-weight: 600; font-size: 14px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: 0.2s;`;
    btn.onclick = () => chrome.runtime.sendMessage({ action: 'openPdfReader' });
    document.documentElement.appendChild(btn);
  }

  createPanel() {
    if (document.getElementById('my-translator-panel')) return;
    this.panel = document.createElement('div');
    this.panel.id = 'my-translator-panel';
    this.panel.style.cssText = `position: fixed; top: 20px; right: 20px; width: 280px; max-height: 500px; background: white; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 2147483647; font-family: system-ui; display: none; flex-direction: column; overflow: hidden;`;
    this.panel.innerHTML = `
      <style>
        @keyframes bounce-dots { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
        .loading-dots span { display: inline-block; animation: bounce-dots 1.2s infinite ease-in-out both; font-weight: bold; font-size: 16px; color: #007bff; }
        .loading-dots span:nth-child(1) { animation-delay: -0.32s; } .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes smooth-slide-in { 0% { opacity: 0; transform: translateX(-15px); } 100% { opacity: 1; transform: translateX(0); } }
        .animate-new-item { animation: smooth-slide-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; will-change: transform, opacity; }
        .tr-speak-btn { background: none; border: none; cursor: pointer; padding: 2px 4px; font-size: 12px; opacity: 0.5; transition: 0.2s; border-radius: 4px; }
        .tr-speak-btn:hover { opacity: 1; background: #f0f0f0; transform: scale(1.1); }
        .tr-speak-btn.playing { color: #007bff; opacity: 1; filter: drop-shadow(0 0 2px rgba(0,123,255,0.4)); }
        .floating-hint { position: fixed; z-index: 2147483647; background: rgba(30, 30, 30, 0.9); color: white; padding: 6px 12px; border-radius: 6px; font-size: 14px; pointer-events: none; transform: translate(-50%, -100%); margin-top: -10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.4s; line-height: 1.4; text-align: center; max-width: 250px; font-family: system-ui; }
      </style>
      <div style="background: #fafafa; padding: 10px 14px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: move;" id="tr-header">
        <strong id="tr-count" style="font-size: 13px;">Словник (0)</strong>
        <div style="display: flex; gap: 10px;">
          <button id="tr-clear" style="border:none; background:none; cursor:pointer;">🗑️</button>
          <button id="tr-close" style="border:none; background:none; cursor:pointer; font-size:18px; color:#999;">×</button>
        </div>
      </div>
      <div id="tr-list" style="padding: 10px 14px; overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column; gap: 6px; background: #fff;"></div>`;
    document.documentElement.appendChild(this.panel);
    document.getElementById('tr-close').onclick = () => this.panel.style.display = 'none';
    document.getElementById('tr-clear').onclick = () => { this.translations = []; this.saveAndRender(); };
    this.renderList();
    this.makeDraggable();
  }

  async processText(text, rect) {
    if (!this.panel) this.createPanel();
    this.panel.style.display = 'flex';
    const settings = await chrome.storage.sync.get(['fromLang', 'toLang']);
    this.animatingText = text;
    
    const existingIndex = this.translations.findIndex(i => i.orig === text);
    if (existingIndex !== -1) {
      const item = this.translations.splice(existingIndex, 1)[0];
      this.translations.unshift(item);
      this.saveAndRender();
      this.showFloatingHint(item.trans, rect);
    } else {
      this.translations.unshift({ orig: text, trans: "loading", fromLang: settings.fromLang || 'en', toLang: settings.toLang || 'uk' });
      this.renderList();
      const res = await chrome.runtime.sendMessage({ action: 'translateText', text });
      const item = this.translations.find(i => i.orig === text);
      if (item) {
        item.trans = res?.translation || "❌";
        this.saveAndRender();
        this.showFloatingHint(item.trans, rect);
      }
    }
  }

  showFloatingHint(text, rect) {
    if (!text || text === "loading") return;
    const hint = document.createElement('div');
    hint.className = 'floating-hint';
    hint.textContent = text;
    hint.style.left = `${rect.left + rect.width / 2 + window.pageXOffset}px`;
    hint.style.top = `${rect.top + window.pageYOffset}px`;
    document.documentElement.appendChild(hint);
    setTimeout(() => { hint.style.opacity = '0'; setTimeout(() => hint.remove(), 400); }, Math.max(2000, text.length * 100));
  }

  async speakText(text, langCode, buttonElement) {
    if (this.audioPlayer.src) this.audioPlayer.pause();
    buttonElement.classList.add('playing');

    chrome.runtime.sendMessage({ action: 'speakAI', text, langCode }, (response) => {
      if (response && response.audio) {
        this.audioPlayer.src = "data:audio/mp3;base64," + response.audio;
        this.audioPlayer.play();
        this.audioPlayer.onended = () => buttonElement.classList.remove('playing');
      } else {
        buttonElement.classList.remove('playing');
        alert("Помилка Google TTS. Перевірте API Key.");
      }
    });
  }

  saveAndRender() {
    chrome.storage.sync.set({ translationsArray: this.translations });
    this.renderList();
  }

  renderList() {
    if (!this.panel) return;
    const list = document.getElementById('tr-list');
    document.getElementById('tr-count').textContent = `Словник (${this.translations.length})`;
    list.innerHTML = this.translations.map((item, index) => `
      <div class="${item.orig === this.animatingText ? 'animate-new-item' : ''}" style="border-bottom: 1px solid #f7f7f7; padding: 4px 0 8px 0; position: relative; padding-right: 20px;">
        <button class="tr-del-btn" data-index="${index}" style="position: absolute; right: -5px; top: 2px; border:none; background:none; cursor:pointer; color:#ccc; font-size:14px;">×</button>
        <div style="font-size: 11px; color: #888; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
          <span>${item.orig}</span> <button class="tr-speak-btn" data-text="${item.orig}" data-lang="${item.fromLang}">🔊</button>
        </div>
        <div style="font-size: 14px; color: #111; font-weight: 500; display: flex; align-items: center; gap: 6px;">
          <span>${item.trans === 'loading' ? '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>' : item.trans}</span>
          ${item.trans !== 'loading' && !item.trans.startsWith('❌') ? `<button class="tr-speak-btn" data-text="${item.trans}" data-lang="${item.toLang}">🔊</button>` : ''}
        </div>
      </div>`).join('');
    this.animatingText = null;
    list.querySelectorAll('.tr-del-btn').forEach(b => b.onclick = (e) => { this.translations.splice(e.target.dataset.index, 1); this.saveAndRender(); });
    list.querySelectorAll('.tr-speak-btn').forEach(b => b.onclick = (e) => this.speakText(e.currentTarget.dataset.text, e.currentTarget.dataset.lang, e.currentTarget));
  }

  escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  makeDraggable() {
    const h = document.getElementById('tr-header');
    let drag = false, x, y;
    h.onmousedown = (e) => { if (e.target.tagName !== 'BUTTON') { drag = true; x = e.clientX - this.panel.offsetLeft; y = e.clientY - this.panel.offsetTop; } };
    document.onmousemove = (e) => { if (drag) { this.panel.style.left = (e.clientX - x) + 'px'; this.panel.style.top = (e.clientY - y) + 'px'; this.panel.style.right = 'auto'; } };
    document.onmouseup = () => drag = false;
  }
}
new TextTranslator();