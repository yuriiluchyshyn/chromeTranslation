document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('toggle-translator');
  const pdfAlert = document.getElementById('pdf-alert');
  const openCurrentPdfBtn = document.getElementById('open-current-pdf');
  const langFrom = document.getElementById('lang-from');
  const langTo = document.getElementById('lang-to');

  // Визначаємо дефолтну мову системи (наприклад, "uk", "en")
  const browserLang = navigator.language.split('-')[0];
  const supportedTargets = ['uk', 'en', 'de', 'fr', 'pl'];
  const defaultTarget = supportedTargets.includes(browserLang) ? browserLang : 'uk';

  // Завантажуємо налаштування з пам'яті
  const storage = await chrome.storage.sync.get(['translatorEnabled', 'fromLang', 'toLang']);
  
  toggle.checked = storage.translatorEnabled !== false;
  langFrom.value = storage.fromLang || 'autodetect'; // Авто за замовчуванням
  langTo.value = storage.toLang || defaultTarget;    // Беремо системну або збережену

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let isPdfTab = tab?.url?.toLowerCase().endsWith('.pdf') && !tab.url.includes('pdfjs/web/viewer.html');

  function updateUI() {
    pdfAlert.style.display = (isPdfTab && toggle.checked) ? 'block' : 'none';
  }

  updateUI();

  // Збереження змін
  const saveSettings = () => {
    chrome.storage.sync.set({
      translatorEnabled: toggle.checked,
      fromLang: langFrom.value,
      toLang: langTo.value
    });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleTranslator', enabled: toggle.checked }).catch(() => {});
    }
    updateUI();
  };

  toggle.addEventListener('change', saveSettings);
  langFrom.addEventListener('change', saveSettings);
  langTo.addEventListener('change', saveSettings);

  openCurrentPdfBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('pdfjs/web/viewer.html') });
    window.close();
  });
});