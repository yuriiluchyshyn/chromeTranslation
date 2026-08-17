const i18n = {
  uk: {
    title: "Перекладач", 
    label: "Напрямок перекладу:", 
    auto: "Автовизначення",
    pdfT: "📄 Виявлено PDF", 
    pdfB: "Відкрити рідер",
    showHintsLabel: "Показувати переклад над текстом",
    aiLabel: "AI-переклад (Gemini)",
    aiReadingLabel: "AI-читання (Gemini)",
    aiStyle: "Стиль перекладу:",
    aiPrompt: "Інструкція для перекладу:",
    aiHint: "Використовує Gemini API-ключ із налаштувань. Якщо ключ не задано або сталася помилка — переклад виконає Google Translate.",
    aiStatusOk: "✓ Gemini працює.",
    aiStatusNoKey: "⚠️ AI увімкнено, але не вказано Gemini API-ключ. Додайте його в налаштуваннях розширення.",
    aiStatus403: "⚠️ Ключ не має доступу до Gemini. Увімкніть «Generative Language API» у Google Cloud для цього проєкту. Поки що перекладає Google Translate.",
    aiStatus429: "⚠️ Перевищено квоту Gemini (429). Спробуйте пізніше. Поки що перекладає Google Translate.",
    aiStatusBadKey: "⚠️ Ключ недійсний або некоректний запит (код %s). Поки що перекладає Google Translate.",
    aiStatusOther: "⚠️ Gemini недоступний (код %s). Поки що перекладає Google Translate.",
    styleStandard: "Стандартний",
    styleSoftwareEngineer: "Програміст",
    styleSolutionArchitect: "Системний архітект",
    ttsKeyWarning: "⚠️ Для озвучування потрібен Cloud Text-to-Speech API-ключ.",
    ttsKeyWarningLink: "Як його налаштувати →",
    aiNeedsKey: "⚠️ Додайте Gemini API-ключ, щоб увімкнути AI-функції.",
    aiNeedsKeyLink: "Як його налаштувати →",
    pageSystem: "⚠️ Це службова сторінка браузера. Розширення тут не працюють, тому переклад недоступний.",
    pageWebstore: "⚠️ На сторінках Chrome Web Store переклад недоступний.",
    pageReader: "⚠️ У вбудованому PDF-рідері виділення тексту для перекладу поки не підтримується.",
    pageFile: "⚠️ Щоб перекладати локальні файли, увімкніть «Дозволити доступ до файлів URL» для цього розширення.",
    pageFileLink: "Відкрити сторінку розширень →",
    pageBlocked: "⚠️ Ця сторінка не дала перекладачу завантажитися. Оновіть сторінку (F5). Деякі сайти обмежують розширення."
  },
  en: {
    title: "Translator", 
    label: "Translation Direction:", 
    auto: "Auto-detect",
    pdfT: "📄 PDF Detected", 
    pdfB: "Open Reader",
    showHintsLabel: "Show translation above text",
    aiLabel: "AI translation (Gemini)",
    aiReadingLabel: "AI reading (Gemini)",
    aiStyle: "Translation style:",
    aiPrompt: "Translation instructions:",
    aiHint: "Uses the Gemini API key from settings. If no key is set or an error occurs, Google Translate is used instead.",
    aiStatusOk: "✓ Gemini is working.",
    aiStatusNoKey: "⚠️ AI is on but no Gemini API key is set. Add it in the extension settings.",
    aiStatus403: "⚠️ The key has no access to Gemini. Enable the \"Generative Language API\" in Google Cloud for this project. Falling back to Google Translate for now.",
    aiStatus429: "⚠️ Gemini quota exceeded (429). Try again later. Falling back to Google Translate for now.",
    aiStatusBadKey: "⚠️ Invalid key or bad request (code %s). Falling back to Google Translate for now.",
    aiStatusOther: "⚠️ Gemini unavailable (code %s). Falling back to Google Translate for now.",
    styleStandard: "Standard",
    styleSoftwareEngineer: "Software Engineer",
    styleSolutionArchitect: "Solution Architect",
    ttsKeyWarning: "⚠️ A Cloud Text-to-Speech API key is required for reading aloud.",
    ttsKeyWarningLink: "How to set it up →",
    aiNeedsKey: "⚠️ Add a Gemini API key to enable AI features.",
    aiNeedsKeyLink: "How to set it up →",
    pageSystem: "⚠️ This is a browser system page. Extensions can't run here, so translation isn't available.",
    pageWebstore: "⚠️ Translation isn't available on Chrome Web Store pages.",
    pageReader: "⚠️ Selecting text to translate isn't supported yet inside the built-in PDF reader.",
    pageFile: "⚠️ To translate local files, enable \"Allow access to file URLs\" for this extension.",
    pageFileLink: "Open the extensions page →",
    pageBlocked: "⚠️ This page prevented the translator from loading. Reload the page (F5). Some sites restrict extensions."
  },
  es: {
    title: "Traductor", 
    label: "Dirección de traducción:", 
    auto: "Detección automática",
    pdfT: "📄 PDF Detectado", 
    pdfB: "Abrir Lector",
    showHintsLabel: "Mostrar traducción sobre el texto",
    aiLabel: "Traducción IA (Gemini)",
    aiReadingLabel: "Lectura IA (Gemini)",
    aiStyle: "Estilo de traducción:",
    aiPrompt: "Instrucciones de traducción:",
    aiHint: "Usa la clave API de Gemini de la configuración. Si no se establece ninguna clave o ocurre un error, se usa Google Translate en su lugar.",
    aiStatusOk: "✓ Gemini está funcionando.",
    aiStatusNoKey: "⚠️ La IA está activada pero no se ha establecido ninguna clave API de Gemini. Agréguela en la configuración de la extensión.",
    aiStatus403: "⚠️ La clave no tiene acceso a Gemini. Habilite la \"Generative Language API\" en Google Cloud para este proyecto. Usando Google Translate por ahora.",
    aiStatus429: "⚠️ Cuota de Gemini excedida (429). Inténtelo más tarde. Usando Google Translate por ahora.",
    aiStatusBadKey: "⚠️ Clave inválida o solicitud incorrecta (código %s). Usando Google Translate por ahora.",
    aiStatusOther: "⚠️ Gemini no disponible (código %s). Usando Google Translate por ahora.",
    styleStandard: "Estándar",
    styleSoftwareEngineer: "Ingeniero de Software",
    styleSolutionArchitect: "Arquitecto de Soluciones",
    ttsKeyWarning: "⚠️ Se requiere una clave API de Cloud Text-to-Speech para la lectura en voz alta.",
    ttsKeyWarningLink: "Cómo configurarla →",
    aiNeedsKey: "⚠️ Agrega una clave API de Gemini para activar las funciones de IA.",
    aiNeedsKeyLink: "Cómo configurarla →",
    pageSystem: "⚠️ Esta es una página del sistema del navegador. Las extensiones no funcionan aquí, así que la traducción no está disponible.",
    pageWebstore: "⚠️ La traducción no está disponible en las páginas de Chrome Web Store.",
    pageReader: "⚠️ La selección de texto para traducir aún no es compatible dentro del lector de PDF integrado.",
    pageFile: "⚠️ Para traducir archivos locales, active \"Permitir acceso a URL de archivos\" para esta extensión.",
    pageFileLink: "Abrir la página de extensiones →",
    pageBlocked: "⚠️ Esta página impidió que el traductor se cargara. Recargue la página (F5). Algunos sitios restringen las extensiones."
  },
  de: {
    title: "Übersetzer", 
    label: "Übersetzungsrichtung:", 
    auto: "Automatische Erkennung",
    pdfT: "📄 PDF Erkannt", 
    pdfB: "Reader Öffnen",
    showHintsLabel: "Übersetzung über Text anzeigen",
    aiLabel: "KI-Übersetzung (Gemini)",
    aiReadingLabel: "KI-Vorlesen (Gemini)",
    aiStyle: "Übersetzungsstil:",
    aiPrompt: "Übersetzungsanweisungen:",
    aiHint: "Verwendet den Gemini API-Schlüssel aus den Einstellungen. Wenn kein Schlüssel gesetzt ist oder ein Fehler auftritt, wird stattdessen Google Translate verwendet.",
    aiStatusOk: "✓ Gemini funktioniert.",
    aiStatusNoKey: "⚠️ KI ist aktiviert, aber kein Gemini API-Schlüssel ist gesetzt. Fügen Sie ihn in den Erweiterungseinstellungen hinzu.",
    aiStatus403: "⚠️ Der Schlüssel hat keinen Zugriff auf Gemini. Aktivieren Sie die \"Generative Language API\" in Google Cloud für dieses Projekt. Verwende vorerst Google Translate.",
    aiStatus429: "⚠️ Gemini-Kontingent überschritten (429). Versuchen Sie es später erneut. Verwende vorerst Google Translate.",
    aiStatusBadKey: "⚠️ Ungültiger Schlüssel oder fehlerhafte Anfrage (Code %s). Verwende vorerst Google Translate.",
    aiStatusOther: "⚠️ Gemini nicht verfügbar (Code %s). Verwende vorerst Google Translate.",
    styleStandard: "Standard",
    styleSoftwareEngineer: "Software-Ingenieur",
    styleSolutionArchitect: "Lösungsarchitekt",
    ttsKeyWarning: "⚠️ Für das Vorlesen wird ein Cloud Text-to-Speech API-Schlüssel benötigt.",
    ttsKeyWarningLink: "So richten Sie ihn ein →",
    aiNeedsKey: "⚠️ Fügen Sie einen Gemini API-Schlüssel hinzu, um KI-Funktionen zu aktivieren.",
    aiNeedsKeyLink: "So richten Sie ihn ein →",
    pageSystem: "⚠️ Dies ist eine System-Seite des Browsers. Erweiterungen funktionieren hier nicht, daher ist keine Übersetzung möglich.",
    pageWebstore: "⚠️ Auf Chrome Web Store-Seiten ist keine Übersetzung verfügbar.",
    pageReader: "⚠️ Das Auswählen von Text zum Übersetzen wird im integrierten PDF-Reader noch nicht unterstützt.",
    pageFile: "⚠️ Um lokale Dateien zu übersetzen, aktivieren Sie \"Zugriff auf Datei-URLs erlauben\" für diese Erweiterung.",
    pageFileLink: "Erweiterungsseite öffnen →",
    pageBlocked: "⚠️ Diese Seite hat das Laden des Übersetzers verhindert. Laden Sie die Seite neu (F5). Einige Websites schränken Erweiterungen ein."
  }
};

// Класифікує активну вкладку: чи взагалі можливий переклад на цій сторінці.
// Повертає: 'system' | 'webstore' | 'reader' | 'file' | 'web'
function classifyPage(url) {
  if (!url) return 'blocked';
  const u = url.toLowerCase();
  if (u.startsWith('chrome://') || u.startsWith('edge://') || u.startsWith('brave://') ||
      u.startsWith('about:') || u.startsWith('view-source:') || u.startsWith('devtools://') ||
      u.startsWith('data:')) return 'system';
  if (/^https?:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/.test(u)) return 'webstore';
  if (u.includes('pdfjs/web/viewer.html')) return 'reader';
  if (u.startsWith('chrome-extension://')) return 'system';
  if (u.startsWith('file://')) return 'file';
  if (u.startsWith('http://') || u.startsWith('https://')) return 'web';
  return 'system';
}

// Пінгує content script на активній вкладці. Якщо він не відповідає — сторінка
// заблокувала завантаження розширення (напр., сувора CSP або службова сторінка).
function pingTab(tab, onAlive, onDead) {
  if (!tab || tab.id == null) { onDead(); return; }
  let answered = false;
  const settle = (alive) => {
    if (answered) return;
    answered = true;
    alive ? onAlive() : onDead();
  };
  try {
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (res) => {
      settle(!chrome.runtime.lastError && res && res.ok);
    });
  } catch (e) {
    settle(false);
  }
  // Підстраховка, якщо колбек не спрацює
  setTimeout(() => settle(false), 1200);
}

// Показує/ховає попередження про непідтримувану сторінку у попапі.
function checkPageTranslatable() {
  chrome.storage.local.get(['uiLang'], ({ uiLang }) => {
    const t = i18n[uiLang] || i18n.uk;
    const box = document.getElementById('page-warning');
    const textEl = document.getElementById('page-warning-text');
    const linkEl = document.getElementById('page-warning-link');
    if (!box || !textEl || !linkEl) return;

    const hide = () => { box.style.display = 'none'; };
    const show = (msg, link) => {
      textEl.textContent = msg;
      if (link) {
        linkEl.textContent = ' ' + link.text;
        linkEl.style.display = '';
        linkEl.onclick = (e) => { e.preventDefault(); link.onClick(); };
      } else {
        linkEl.textContent = '';
        linkEl.style.display = 'none';
      }
      box.style.display = 'block';
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      const kind = classifyPage(tab && tab.url);

      if (kind === 'system') return show(t.pageSystem);
      if (kind === 'webstore') return show(t.pageWebstore);
      if (kind === 'reader') return show(t.pageReader);
      if (kind === 'file') {
        const decide = (allowed) => {
          if (allowed) pingTab(tab, hide, () => show(t.pageBlocked));
          else show(t.pageFile, {
            text: t.pageFileLink,
            onClick: () => chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id })
          });
        };
        if (chrome.extension && chrome.extension.isAllowedFileSchemeAccess) {
          chrome.extension.isAllowedFileSchemeAccess(decide);
        } else {
          decide(false);
        }
        return;
      }
      // Звичайна веб-сторінка — переконуємось, що content script завантажився
      pingTab(tab, hide, () => show(t.pageBlocked));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // 0. Перевіряємо, чи можна перекладати активну сторінку
  checkPageTranslatable();

  // 1. Завантажуємо налаштування та оновлюємо інтерфейс
  chrome.storage.local.get(['translatorEnabled', 'fromLang', 'toLang', 'uiLang', 'showHints', 'aiEnabled', 'aiReadingEnabled', 'aiStyle', 'aiPrompt', 'geminiApiKey', 'cloudTtsApiKey'], (res) => {
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

    // Тексти блоку AI
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    setText('ai-label', t.aiLabel);
    setText('ai-reading-label', t.aiReadingLabel);
    setText('ai-style-label', t.aiStyle);
    setText('ai-prompt-label', t.aiPrompt);
    setText('ai-hint', t.aiHint);

    // Попередження на головному екрані, якщо не заданий Cloud TTS API-ключ.
    // Цей ключ потрібен для традиційного озвучування — без нього читання не працює.
    const ttsWarning = document.getElementById('tts-key-warning');
    if (ttsWarning) {
      const hasTtsKey = typeof res.cloudTtsApiKey === 'string' && res.cloudTtsApiKey.trim().length > 0;
      if (!hasTtsKey) {
        setText('tts-key-warning-text', t.ttsKeyWarning);
        const link = document.getElementById('tts-key-warning-link');
        if (link) {
          link.textContent = t.ttsKeyWarningLink;
          link.onclick = (e) => {
            e.preventDefault();
            const url = chrome.runtime.getURL('instructions.html?section=tts');
            chrome.tabs.create({ url });
            window.close();
          };
        }
        ttsWarning.style.display = 'block';
      } else {
        ttsWarning.style.display = 'none';
      }
    }

    // Встановлюємо значення елементів керування
    const toggle = document.getElementById('toggle-translator');
    const langFrom = document.getElementById('lang-from');
    const langTo = document.getElementById('lang-to');
    const showHints = document.getElementById('show-hints');
    const aiEnabled = document.getElementById('ai-enabled');
    const aiReadingEnabled = document.getElementById('ai-reading-enabled');
    const aiStyle = document.getElementById('ai-style');
    const aiPrompt = document.getElementById('ai-prompt');
    const aiFields = document.getElementById('ai-fields');
    const aiPromptSection = document.getElementById('ai-prompt-section');

    if (toggle) toggle.checked = res.translatorEnabled !== false;
    if (langFrom) langFrom.value = res.fromLang || 'auto'; 
    if (langTo) langTo.value = res.toLang || 'uk';
    if (showHints) showHints.checked = res.showHints !== false;
    if (aiEnabled) aiEnabled.checked = res.aiEnabled === true;
    if (aiReadingEnabled) aiReadingEnabled.checked = res.aiReadingEnabled === true;
    if (aiStyle) aiStyle.value = res.aiStyle || 'standard';
    if (aiPrompt) aiPrompt.value = res.aiPrompt || '';

    // AI-функції (переклад і читання через Gemini) доступні лише за наявності
    // Gemini API-ключа. Без ключа блокуємо перемикачі й показуємо підказку.
    const hasGeminiKey = typeof res.geminiApiKey === 'string' && res.geminiApiKey.trim().length > 0;
    const aiKeyHint = document.getElementById('ai-key-hint');
    if (!hasGeminiKey) {
      if (aiEnabled) { aiEnabled.checked = false; aiEnabled.disabled = true; }
      if (aiReadingEnabled) { aiReadingEnabled.checked = false; aiReadingEnabled.disabled = true; }
      document.getElementById('ai-label')?.parentElement?.parentElement?.classList.add('ai-toggle-disabled');
      document.getElementById('ai-reading-label')?.parentElement?.parentElement?.classList.add('ai-toggle-disabled');
      if (aiKeyHint) {
        setText('ai-key-hint-text', t.aiNeedsKey);
        const link = document.getElementById('ai-key-hint-link');
        if (link) {
          link.textContent = t.aiNeedsKeyLink;
          link.onclick = (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('instructions.html?section=gemini') });
            window.close();
          };
        }
        aiKeyHint.style.display = 'block';
      }
    } else if (aiKeyHint) {
      aiKeyHint.style.display = 'none';
    }

    // Показуємо/ховаємо весь AI-блок залежно від перемикача
    const toggleAiFields = () => {
      if (aiFields) aiFields.classList.toggle('hidden', !aiEnabled.checked);
    };
    // Поле кастомного промпту показуємо лише для стилю "Стандартний"
    const togglePromptSection = () => {
      if (aiPromptSection) aiPromptSection.classList.toggle('hidden', aiStyle.value !== 'standard');
    };
    toggleAiFields();
    togglePromptSection();

    // Збереження налаштувань при зміні
    const save = () => {
      chrome.storage.local.set({
        translatorEnabled: toggle.checked,
        fromLang: langFrom.value,
        toLang: langTo.value,
        showHints: showHints.checked,
        aiEnabled: aiEnabled.checked,
        aiReadingEnabled: aiReadingEnabled.checked,
        aiStyle: aiStyle.value,
        aiPrompt: aiPrompt.value
      });
    };

    toggle.addEventListener('change', save);
    langFrom.addEventListener('change', save);
    langTo.addEventListener('change', save);
    showHints.addEventListener('change', save);
    aiEnabled.addEventListener('change', () => { toggleAiFields(); save(); });
    aiReadingEnabled.addEventListener('change', save);
    aiStyle.addEventListener('change', () => { togglePromptSection(); save(); });
    // Зберігаємо текстове поле на льоту
    aiPrompt.addEventListener('input', save);

    // --- Статус AI-перекладу (успіх/помилка останнього запиту) ---
    const statusEl = document.getElementById('ai-status');
    const renderAiStatus = (s) => {
      if (!statusEl) return;
      statusEl.className = 'ai-status';
      if (!s || !s.code) { statusEl.textContent = ''; return; }

      let text = '';
      let kind = 'error';
      if (s.code === 'ok') { text = t.aiStatusOk; kind = 'ok'; }
      else if (s.code === 'no_key') { text = t.aiStatusNoKey; }
      else if (s.code === 'error') {
        if (s.status === 403) text = t.aiStatus403;
        else if (s.status === 429) text = t.aiStatus429;
        else if (s.status === 400 || s.status === 401) text = t.aiStatusBadKey.replace('%s', s.status);
        else text = t.aiStatusOther.replace('%s', s.status || '?');
      }
      statusEl.textContent = text;
      statusEl.classList.add('show', kind);
    };

    chrome.storage.local.get(['aiLastStatus'], (r) => renderAiStatus(r.aiLastStatus));
    // Живе оновлення, якщо попап відкритий під час перекладу
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.aiLastStatus) {
        renderAiStatus(changes.aiLastStatus.newValue);
      }
    });
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