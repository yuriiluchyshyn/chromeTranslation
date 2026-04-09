const i18n = {
  uk: { title: "Перекладач", label: "Напрямок перекладу:", auto: "Автовизначення", pdfT: "📄 Виявлено PDF", pdfB: "Відкрити рідер" },
  en: { title: "Translator", label: "Translation Direction:", auto: "Auto-detect", pdfT: "📄 PDF Detected", pdfB: "Open Reader" }
};

document.addEventListener('DOMContentLoaded', async () => {
  const res = await chrome.storage.sync.get(['translatorEnabled', 'fromLang', 'toLang', 'uiLang']);
  const ui = res.uiLang || 'uk';
  const t = i18n[ui];

  // Оновлення текстів
  document.querySelector('.title').textContent = t.title;
  document.querySelector('.sub-label').textContent = t.label;
  document.querySelector('#lang-from option[value="auto"]').textContent = t.auto;
  document.getElementById('pdf-title').textContent = t.pdfT;
  document.getElementById('open-current-pdf').textContent = t.pdfB;

  const toggle = document.getElementById('toggle-translator');
  const langFrom = document.getElementById('lang-from');
  const langTo = document.getElementById('lang-to');

  // Встановлюємо значення: якщо в базі пусто, ставимо 'auto'
  toggle.checked = res.translatorEnabled !== false;
  langFrom.value = res.fromLang || 'auto'; 
  langTo.value = res.toLang || 'uk';

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

  // Перевірка на PDF
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.toLowerCase().endsWith('.pdf')) {
    document.getElementById('pdf-alert').style.display = 'block';
  }

  document.getElementById('open-current-pdf').onclick = () => {
    chrome.runtime.sendMessage({ action: 'openPdfReader' });
    window.close();
  };
});