(function() {
  console.log("%c[AI Translator] Скрипт активовано!", "color: white; background: #1a73e8; padding: 2px 5px; border-radius: 3px;");

  class TextTranslator {
    constructor() {
      this.panel = null;
      this.translations = [];
      this.isEnabled = true;
      this.uiLang = 'uk';
      this.toLang = 'uk';
      this.audioPlayer = new Audio();
      
      this.i18n = {
        uk: { dict: "Словник", clear: "Очистити", hint: "Тут з’являться слова", pdfBtn: "📂 Відкрити в AI-рідері" },
        en: { dict: "Dictionary", clear: "Clear", hint: "Words will appear here", pdfBtn: "📂 Open in AI Reader" }
      };

      this.init();
    }

    async init() {
      const url = window.location.href.toLowerCase();
      const isPdf = url.includes('.pdf') || document.contentType === 'application/pdf';
      const isOurReader = url.includes('pdfjs/web/viewer.html');

      // 1. Якщо це PDF — показуємо кнопку негайно
      if (isPdf && !isOurReader) {
        console.log("[AI Translator] Виявлено PDF, малюю кнопку.");
        this.showPdfBtn();
        return; 
      }

      // 2. Для звичайних сторінок — завантажуємо налаштування
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['translationsArray', 'translatorEnabled', 'uiLang', 'toLang'], (res) => {
          this.translations = res.translationsArray || [];
          this.isEnabled = res.translatorEnabled !== false;
          this.uiLang = res.uiLang || 'uk';
          this.toLang = res.toLang || 'uk';
          
          console.log("[AI Translator] Налаштування завантажено, створюю панель.");
          this.createPanel();
          this.setupEvents();
        });
      }
    }

    showPdfBtn() {
      if (document.getElementById('tr-pdf-float-btn')) return;
      const b = document.createElement('button');
      b.id = 'tr-pdf-float-btn';
      b.innerHTML = this.i18n[this.uiLang].pdfBtn;
      b.style.cssText = `position:fixed; top:30px; right:30px; z-index:2147483647; background:#1a73e8; color:white; border:2px solid white; padding:12px 24px; border-radius:50px; cursor:pointer; font-weight:bold; font-family:system-ui; box-shadow:0 4px 15px rgba(0,0,0,0.4); display:block !important;`;
      b.onclick = () => chrome.runtime.sendMessage({ action: 'openPdfReader' });
      (document.documentElement || document.body).appendChild(b);
    }

    createPanel() {
      if (document.getElementById('my-translator-panel')) return;
      this.panel = document.createElement('div');
      this.panel.id = 'my-translator-panel';
      this.panel.style.cssText = `position:fixed; top:20px; right:20px; width:280px; max-height:500px; background:white; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.15); z-index:2147483647; display:none; flex-direction:column; overflow:hidden; font-family:system-ui; border:1px solid #eee;`;
      
      const t = this.i18n[this.uiLang] || this.i18n.uk;
      this.panel.innerHTML = `
        <style>
          @keyframes slideIn { 0% { opacity:0; transform:translateX(-15px); } 100% { opacity:1; transform:translateX(0); } }
          .animate-new { animation: slideIn 0.3s forwards; }
          .tr-btn { background:none; border:none; cursor:pointer; font-size:12px; opacity:0.5; }
          .lang-badge { font-size:9px; background:#f0f2f5; padding:2px 4px; border-radius:4px; font-weight:bold; margin-left:4px; border:1px solid #ddd; text-transform:uppercase; color:#666; }
          .tr-hint { position:fixed; z-index:2147483647; background:rgba(0,0,0,0.85); color:white; padding:8px 12px; border-radius:8px; font-size:14px; pointer-events:none; transform:translate(-50%, -100%); transition:opacity 0.4s; text-align:center; max-width:250px; }
        </style>
        <div style="background:#f7f8f9; padding:12px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; cursor:move;" id="tr-header">
          <strong style="font-size:14px;">${t.dict}</strong>
          <div style="display:flex; align-items:center;">
            <button id="tr-clear" style="border:none; background:none; cursor:pointer; font-size:13px; margin-right:8px; color:#1a73e8;">${t.clear}</button>
            <button id="tr-close" style="border:none; background:none; cursor:pointer; font-size:20px; color:#999;">×</button>
          </div>
        </div>
        <div id="tr-list" style="padding:10px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px;"></div>`;
      
      document.documentElement.appendChild(this.panel);
      document.getElementById('tr-close').onclick = () => this.panel.style.display = 'none';
      document.getElementById('tr-clear').onclick = () => { this.translations = []; this.save(); };
      this.renderList();
      this.makeDraggable();
    }

    setupEvents() {
      document.addEventListener('mouseup', (e) => {
        if (!this.isEnabled || (this.panel && this.panel.contains(e.target))) return;
        setTimeout(() => {
          const sel = window.getSelection().toString().trim();
          if (sel.length > 1) {
            const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
            this.processText(sel, rect);
          }
        }, 10);
      });

      chrome.runtime.onMessage.addListener((req) => {
        if (req.action === 'toggleTranslator') {
          this.isEnabled = req.enabled;
          if (this.panel) this.panel.style.display = this.isEnabled ? 'flex' : 'none';
        }
      });
    }

    async processText(text, rect) {
      if (!this.panel) this.createPanel();
      this.panel.style.display = 'flex';
      const existing = this.translations.find(i => i.orig === text);
      if (existing) {
        this.translations = [existing, ...this.translations.filter(i => i.orig !== text)];
        this.save();
        this.showHint(existing.trans, rect);
      } else {
        this.translations.unshift({ orig: text, trans: "...", fromLang: "auto", toLang: this.toLang });
        this.renderList();
        chrome.runtime.sendMessage({ action: 'translateText', text }, (res) => {
          const item = this.translations.find(i => i.orig === text);
          if (item && res) {
            item.trans = res.translation;
            item.fromLang = res.detectedLang;
            this.save();
            this.showHint(item.trans, rect);
          }
        });
      }
    }

    showHint(text, rect) {
      const h = document.createElement('div');
      h.className = 'tr-hint'; h.textContent = text;
      h.style.left = `${rect.left + rect.width/2 + window.pageXOffset}px`;
      h.style.top = `${rect.top + window.pageYOffset}px`;
      document.documentElement.appendChild(h);
      setTimeout(() => { h.style.opacity = '0'; setTimeout(() => h.remove(), 400); }, 3000);
    }

    save() {
      chrome.storage.sync.set({ translationsArray: this.translations });
      this.renderList();
    }

    renderList() {
      const list = document.getElementById('tr-list');
      if (!list) return;
      const t = this.i18n[this.uiLang] || this.i18n.uk;
      if (this.translations.length === 0) { list.innerHTML = `<div style="text-align:center;color:#aaa;font-size:12px;margin-top:20px;">${t.hint}</div>`; return; }
      
      list.innerHTML = this.translations.map(i => `
        <div style="border-bottom:1px solid #f0f2f5; padding-bottom:8px;">
          <div style="font-size:11px; color:#888; display:flex; align-items:center; gap:4px; margin-bottom:2px;">
            <span>${i.orig}</span><span class="lang-badge">${i.fromLang}</span>
            <button class="tr-speak" data-t="${i.orig}" data-l="${i.fromLang}">🔊</button>
          </div>
          <div style="font-size:14px; font-weight:600; color:#1c1e21; display:flex; align-items:center; gap:4px;">
            <span>${i.trans}</span><span class="lang-badge">${i.toLang || 'uk'}</span>
            <button class="tr-speak" data-t="${i.trans}" data-l="${i.toLang || 'uk'}">🔊</button>
          </div>
        </div>`).join('');

      list.querySelectorAll('.tr-speak').forEach(b => b.onclick = (e) => {
        const btn = e.currentTarget;
        chrome.runtime.sendMessage({ action: 'speakAI', text: btn.dataset.t, langCode: btn.dataset.l }, (r) => {
          if (r?.audio) {
            this.audioPlayer.src = "data:audio/mp3;base64," + r.audio;
            this.audioPlayer.play();
          }
        });
      });
    }

    makeDraggable() {
      const h = document.getElementById('tr-header');
      let drag = false, x, y;
      h.onmousedown = (e) => { if (e.target.tagName !== 'BUTTON') { drag = true; x = e.clientX - this.panel.offsetLeft; y = e.clientY - this.panel.offsetTop; } };
      document.onmousemove = (e) => { if (drag) { this.panel.style.left = (e.clientX - x) + 'px'; this.panel.style.top = (e.clientY - y) + 'px'; this.panel.style.right = 'auto'; } };
      document.onmouseup = () => drag = false;
    }
  }

  // Запуск
  new TextTranslator();
})();