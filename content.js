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
      // Спочатку ставимо дефолтну мову з налаштувань
      this.translations.unshift({ 
        orig: text, 
        trans: "loading", 
        fromLang: settings.fromLang || 'autodetect', 
        toLang: settings.toLang || 'uk' 
      });
      this.renderList();

      const res = await chrome.runtime.sendMessage({ action: 'translateText', text });
      const item = this.translations.find(i => i.orig === text);
      if (item) {
        item.trans = res?.translation || "❌";
        // МАГІЯ: Оновлюємо мову оригіналу на ту, яку реально визначив AI
        if (res.detectedLang) {
          item.fromLang = res.detectedLang;
        }
        this.saveAndRender();
        this.showFloatingHint(item.trans, rect);
      }
    }
  }