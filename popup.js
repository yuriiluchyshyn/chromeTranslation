const i18n = {
  uk: { title: "Перекладач", label: "Напрямок перекладу:", auto: "Автовизначення", pdfT: "📄 Виявлено PDF", pdfB: "Відкрити рідер" },
  en: { title: "Translator", label: "Translation Direction:", auto: "Auto-detect", pdfT: "📄 PDF Detected", pdfB: "Open Reader" }
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Завантажуємо налаштування та оновлюємо інтерфейс
  chrome.storage.sync.get(['translatorEnabled', 'fromLang', 'toLang', 'uiLang', 'showHints'], (res) => {
    const ui = res.uiLang || 'uk';
    const t = i18n[ui];

    // Оновлюємо тексти інтерфейсу
    document.querySelector('.title').textContent = t.title;
    document.querySelector('.sub-label').textContent = t.label;
    const autoOption = document.querySelector('#lang-from option[value="auto"]');
    if (autoOption) autoOption.textContent = t.auto;
    
    const pdfTitle = document.getElementById('pdf-title');
    const pdfBtn = document.getElementById('open-current-pdf');
    if (pdfTitle) pdfTitle.textContent = t.pdfT;
    if (pdfBtn) pdfBtn.textContent = t.pdfB;

    // Встановлюємо значення елементів керування
    const toggle = document.getElementById('toggle-translator');
    const langFrom = document.getElementById('lang-from');
    const langTo = document.getElementById('lang-to');
    const showHints = document.getElementById('show-hints');

    if (toggle) toggle.checked = res.translatorEnabled !== false;
    if (langFrom) langFrom.value = res.fromLang || 'auto'; 
    if (langTo) langTo.value = res.toLang || 'uk';
    if (showHints) showHints.checked = res.showHints !== false;

    // Збереження налаштувань при зміні
    const save = () => {
      chrome.storage.sync.set({
        translatorEnabled: toggle.checked,
        fromLang: langFrom.value,
        toLang: langTo.value,
        showHints: showHints.checked
      });
    };

    toggle.addEventListener('change', save);
    langFrom.addEventListener('change', save);
    langTo.addEventListener('change', save);
    showHints.addEventListener('change', save);
  });

  // 2. Перевірка наявності PDF та приховування блоку, якщо рідер вже відкритий
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url) {
      const url = tab.url.toLowerCase();
      
      // Чи це PDF файл?
      const isPdf = url.endsWith('.pdf') || (url.startsWith('file://') && url.includes('.pdf'));
      // Чи це вже наш відкритий рідер?
      const isAlreadyInReader = url.includes('pdfjs/web/viewer.html');

      const alertBox = document.getElementById('pdf-alert');
      if (alertBox) {
        // Показуємо блок лише якщо це PDF І ми ще не в нашому рідері
        if (isPdf && !isAlreadyInReader) {
          alertBox.style.display = 'block';
        } else {
          alertBox.style.display = 'none';
        }
      }
    }
  });

  // 3. Обробка кнопки "Відкрити рідер"
  const openPdfBtn = document.getElementById('open-current-pdf');
  if (openPdfBtn) {
    openPdfBtn.onclick = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url) {
          // Передаємо URL поточної сторінки, щоб рідер знав, який файл відкрити
          chrome.runtime.sendMessage({ 
            action: 'openPdfReader', 
            pdfUrl: currentTab.url 
          });
          window.close();
        }
      });
    };
  }
});