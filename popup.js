const i18n = {
  uk: { title: "Перекладач", label: "Напрямок перекладу:", auto: "Автовизначення", pdfT: "📄 Виявлено PDF", pdfB: "Відкрити рідер" },
  en: { title: "Translator", label: "Translation Direction:", auto: "Auto-detect", pdfT: "📄 PDF Detected", pdfB: "Open Reader" }
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Спочатку завантажуємо налаштування (працює паралельно)
  chrome.storage.sync.get(['translatorEnabled', 'fromLang', 'toLang', 'uiLang'], (res) => {
    const ui = res.uiLang || 'uk';
    const t = i18n[ui];

    // Миттєво оновлюємо тексти
    document.querySelector('.title').textContent = t.title;
    document.querySelector('.sub-label').textContent = t.label;
    const autoOption = document.querySelector('#lang-from option[value="auto"]');
    if (autoOption) autoOption.textContent = t.auto;
    
    const pdfTitle = document.getElementById('pdf-title');
    const pdfBtn = document.getElementById('open-current-pdf');
    if (pdfTitle) pdfTitle.textContent = t.pdfT;
    if (pdfBtn) pdfBtn.textContent = t.pdfB;

    // Встановлюємо значення перемикачів
    const toggle = document.getElementById('toggle-translator');
    const langFrom = document.getElementById('lang-from');
    const langTo = document.getElementById('lang-to');

    if (toggle) toggle.checked = res.translatorEnabled !== false;
    if (langFrom) langFrom.value = res.fromLang || 'auto'; 
    if (langTo) langTo.value = res.toLang || 'uk';

    // Слухачі подій (зберігання без затримок)
    const save = () => {
      chrome.storage.sync.set({
        translatorEnabled: toggle.checked,
        fromLang: langFrom.value,
        toLang: langTo.value
      });
    };

    toggle.addEventListener('change', save);
    langFrom.addEventListener('change', save);
    langTo.addEventListener('change', save);
  });

  // 2. Окремо перевіряємо вкладку на PDF (не блокує основний інтерфейс)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url && tab.url.toLowerCase().endsWith('.pdf')) {
      const alertBox = document.getElementById('pdf-alert');
      if (alertBox) alertBox.style.display = 'block';
    }
  });

  // 3. Обробка кнопки PDF
  const openPdfBtn = document.getElementById('open-current-pdf');
  if (openPdfBtn) {
    openPdfBtn.onclick = () => {
      chrome.runtime.sendMessage({ action: 'openPdfReader' });
      window.close();
    };
  }
});