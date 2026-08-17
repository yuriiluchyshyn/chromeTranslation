const i18n = {
  uk: {
    t: "Налаштування",
    ui: "Мова розширення:",
    def: "Мова перекладу за замовчуванням:",
    model: "Модель перекладу (Gemini):",
    load: "Завантажити доступні моделі",
    loading: "Завантаження списку моделей…",
    btn: "Зберегти",
    ok: "Збережено!",
    noKey: "Спочатку введіть Gemini API-ключ, щоб завантажити моделі.",
    errKey: "Не вдалося отримати моделі: ключ не має доступу до Gemini (код %s).",
    errNet: "Не вдалося з'єднатися з сервером моделей.",
    picked: "Знайдено моделей: %n. За замовчуванням обрано найдешевшу: %m",
    autoNote: "«auto» — розширення саме підбере доступну модель.",
    keyGemini: "Gemini API-ключ (AI-переклад + читання):",
    keyCloud: "Cloud Text-to-Speech API-ключ (традиційне читання):",
    costNote: "* Приблизні ціни Gemini API у форматі вхід/вихід за 1M токенів (USD).",
    helpText: "Потрібна допомога з отриманням API-ключів?",
    guideLink: "Відкрити покрокову інструкцію →"
  },
  en: {
    t: "Settings",
    ui: "Extension Language:",
    def: "Default Translation Language:",
    model: "Translation Model (Gemini):",
    load: "Load available models",
    loading: "Loading model list…",
    btn: "Save",
    ok: "Saved!",
    noKey: "Enter a Gemini API key first to load models.",
    errKey: "Could not fetch models: the key has no Gemini access (code %s).",
    errNet: "Could not connect to the models server.",
    picked: "Models found: %n. Cheapest selected by default: %m",
    autoNote: "\"auto\" — the extension will pick an available model itself.",
    keyGemini: "Gemini API Key (AI translation + reading):",
    keyCloud: "Cloud Text-to-Speech API Key (traditional reading):",
    costNote: "* Approximate Gemini API prices in input/output per 1M tokens (USD).",
    helpText: "Need help getting your API keys?",
    guideLink: "Open the step-by-step guide →"
  },
  es: {
    t: "Configuración",
    ui: "Idioma de la extensión:",
    def: "Idioma de traducción predeterminado:",
    model: "Modelo de traducción (Gemini):",
    load: "Cargar modelos disponibles",
    loading: "Cargando lista de modelos…",
    btn: "Guardar",
    ok: "¡Guardado!",
    noKey: "Primero ingrese una clave API de Gemini para cargar modelos.",
    errKey: "No se pudieron obtener los modelos: la clave no tiene acceso a Gemini (código %s).",
    errNet: "No se pudo conectar al servidor de modelos.",
    picked: "Modelos encontrados: %n. Más barato seleccionado por defecto: %m",
    autoNote: "\"auto\" — la extensión elegirá un modelo disponible automáticamente.",
    keyGemini: "Clave API de Gemini (traducción IA + lectura):",
    keyCloud: "Clave API de Cloud Text-to-Speech (lectura tradicional):",
    costNote: "* Precios aproximados de la API de Gemini en entrada/salida por 1M tokens (USD).",
    helpText: "¿Necesitas ayuda para obtener tus claves API?",
    guideLink: "Abrir la guía paso a paso →"
  },
  de: {
    t: "Einstellungen",
    ui: "Erweiterungssprache:",
    def: "Standard-Übersetzungssprache:",
    model: "Übersetzungsmodell (Gemini):",
    load: "Verfügbare Modelle laden",
    loading: "Modellliste wird geladen…",
    btn: "Speichern",
    ok: "Gespeichert!",
    noKey: "Geben Sie zuerst einen Gemini API-Schlüssel ein, um Modelle zu laden.",
    errKey: "Modelle konnten nicht abgerufen werden: Der Schlüssel hat keinen Gemini-Zugriff (Code %s).",
    errNet: "Verbindung zum Modellserver konnte nicht hergestellt werden.",
    picked: "Modelle gefunden: %n. Günstigstes standardmäßig ausgewählt: %m",
    autoNote: "\"auto\" — die Erweiterung wählt automatisch ein verfügbares Modell aus.",
    keyGemini: "Gemini API-Schlüssel (KI-Übersetzung + Vorlesen):",
    keyCloud: "Cloud Text-to-Speech API-Schlüssel (traditionelles Vorlesen):",
    costNote: "* Ungefähre Gemini API-Preise in Eingabe/Ausgabe pro 1M Token (USD).",
    helpText: "Brauchen Sie Hilfe beim Erhalt Ihrer API-Schlüssel?",
    guideLink: "Schritt-für-Schritt-Anleitung öffnen →"
  }
};

// Приблизні ціни Gemini API, USD за 1M токенів (вхід / вихід).
// Порядок важливий: спочатку найконкретніші збіги. Content rephrased for compliance.
const MODEL_PRICES = [
  { re: /1\.5-flash-8b/, in: 0.0375, out: 0.15 }, // найшвидша і найдешевша
  { re: /2\.0-flash-lite/, in: 0.075, out: 0.30 },
  { re: /flash-lite/, in: 0.10, out: 0.40 },
  { re: /2\.0-flash/, in: 0.10, out: 0.40 },
  { re: /1\.5-flash/, in: 0.075, out: 0.30 },
  { re: /gemini-3.*pro/, in: 2.00, out: 12.00 },
  { re: /1\.5-pro/, in: 1.25, out: 5.00 },
  { re: /(2\.5-pro|pro-latest)/, in: 1.25, out: 10.00 },
  { re: /(2\.5-flash|flash-latest|flash$)/, in: 0.30, out: 2.50 },
  { re: /pro/, in: 1.25, out: 10.00 }
];

function priceForModel(id) {
  const s = (id || '').toLowerCase();
  for (const p of MODEL_PRICES) {
    if (p.re.test(s)) return { in: p.in, out: p.out };
  }
  return null;
}

// Евристика «найшвидшої» моделі: менший бал = швидше/дешевше/пріоритетніше.
function cheapestModelId(models) {
  const score = (id) => {
    const s = id.toLowerCase();
    // Виключаємо deprecated моделі
    if (isDeprecated(s)) return Infinity;
    // Пріоритет швидкості та ціни
    if (s.includes('flash') && s.includes('8b')) return 0; // gemini-1.5-flash-8b - найшвидша
    if (s.includes('flash-lite')) return 1;
    if (s.includes('lite')) return 2;
    if (s.includes('flash')) return 3;
    if (s.includes('pro')) return 6;
    return 5;
  };
  let best = null, bestScore = Infinity;
  for (const m of models) {
    const sc = score(m.id);
    if (sc < bestScore) { bestScore = sc; best = m; }
  }
  return best ? best.id : '';
}

function isDeprecated(id) {
  const deprecated = ['gemini-2.0-flash', 'gemini-1.0-pro', 'imagen-4'];
  return deprecated.some(d => id === d || id.startsWith(d + '-'));
}

let currentLang = 'uk';

// Прості SVG-іконки для перемикача показу ключа (стиль Feather).
// EYE — ключ прихований (клік показує); EYE_OFF — ключ видимий (клік ховає).
const EYE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function setEyeIcon(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (input && btn) btn.innerHTML = input.type === 'text' ? EYE_OFF_ICON : EYE_ICON;
}

function tr(key) { return i18n[currentLang][key]; }

function setHint(text, isError) {
  const h = document.getElementById('model-hint');
  h.textContent = text || '';
  h.className = isError ? 'error' : '';
}

// Заповнює дропдаун моделями з цінами; повертає id найдешевшої.
function populateModels(models, selectedId) {
  const sel = document.getElementById('aiModel');
  // Лишаємо перший пункт "— auto —", решту перебудовуємо
  sel.length = 1;
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    const price = priceForModel(m.id);
    const priceText = price ? ` — $${price.in.toFixed(2)}/$${price.out.toFixed(2)}` : '';
    opt.textContent = `${m.displayName || m.id}${priceText}`;
    sel.appendChild(opt);
  });
  const cheapest = cheapestModelId(models);
  // Якщо збережена модель є у списку — обираємо її; інакше найдешевшу
  const has = (id) => id && models.some(m => m.id === id);
  sel.value = has(selectedId) ? selectedId : cheapest;
  return cheapest;
}

// Запитує список моделей у background за поточним ключем.
function loadModels({ auto } = {}) {
  const key = document.getElementById('geminiKey').value.trim();
  const btn = document.getElementById('loadModels');
  if (!key) {
    if (!auto) setHint(tr('noKey'), true);
    return;
  }
  btn.disabled = true;
  setHint(tr('loading'), false);

  chrome.storage.local.get(['aiModel'], ({ aiModel }) => {
    chrome.runtime.sendMessage({ action: 'listGeminiModels', key }, (res) => {
      btn.disabled = false;
      if (!res || res.error) {
        if (res && res.error === 'http') setHint(tr('errKey').replace('%s', res.status), true);
        else if (res && res.error === 'no_key') setHint(tr('noKey'), true);
        else setHint(tr('errNet'), true);
        return;
      }
      const models = res.models || [];
      const cheapest = populateModels(models, aiModel);
      // Якщо користувач ще не обирав модель — фіксуємо найдешевшу як дефолт
      if (!aiModel && cheapest) {
        chrome.storage.local.set({ aiModel: cheapest });
      }
      setHint(
        tr('picked').replace('%n', models.length).replace('%m', cheapest || '—') +
        ' · ' + tr('autoNote') + ' ' + tr('costNote'),
        false
      );
    });
  });
}

// Модель перекладу (Gemini) та кнопка завантаження доступні лише коли
// введено Gemini API-ключ. Без ключа блокуємо ці елементи.
function updateModelAvailability() {
  const keyInput = document.getElementById('geminiKey');
  const hasKey = !!(keyInput && keyInput.value.trim().length > 0);
  const sel = document.getElementById('aiModel');
  const loadBtn = document.getElementById('loadModels');
  if (sel) sel.disabled = !hasKey;
  if (loadBtn) loadBtn.disabled = !hasKey;
}

// Відкриває окрему сторінку інструкцій у новій вкладці.
// section (необов'язково): 'tts' — прокрутити до блоку Cloud TTS.
function openInstructionsPage(section) {
  const suffix = section ? ('?section=' + encodeURIComponent(section)) : '';
  const url = chrome.runtime.getURL('instructions.html' + suffix);
  if (chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['geminiApiKey', 'cloudTtsApiKey', 'uiLang', 'toLang', 'aiModel'], (res) => {
    if (res.geminiApiKey) document.getElementById('geminiKey').value = res.geminiApiKey;
    if (res.cloudTtsApiKey) document.getElementById('cloudTtsKey').value = res.cloudTtsApiKey;
    if (res.uiLang) document.getElementById('uiLang').value = res.uiLang;
    if (res.toLang) document.getElementById('defLang').value = res.toLang;
    update(res.uiLang || 'uk');
    updateModelAvailability();

    // Якщо вже є Gemini ключ — одразу підвантажуємо моделі
    if (res.geminiApiKey) loadModels({ auto: true });
    else if (res.aiModel) {
      // Показуємо збережену модель навіть без списку
      const sel = document.getElementById('aiModel');
      const opt = document.createElement('option');
      opt.value = res.aiModel; opt.textContent = res.aiModel;
      sel.appendChild(opt); sel.value = res.aiModel;
    }
  });

  // Update UI when language is changed
  document.getElementById('uiLang').addEventListener('change', (e) => {
    update(e.target.value);
  });

  document.getElementById('loadModels').onclick = () => loadModels();

  // Модель перекладу вмикається/вимикається залежно від наявності ключа
  document.getElementById('geminiKey').addEventListener('input', updateModelAvailability);

  // Показати/сховати Gemini API-ключ
  document.getElementById('toggleGeminiKey').onclick = () => {
    const input = document.getElementById('geminiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
    setEyeIcon('geminiKey', 'toggleGeminiKey');
  };

  // Показати/сховати Cloud TTS API-ключ
  document.getElementById('toggleCloudKey').onclick = () => {
    const input = document.getElementById('cloudTtsKey');
    input.type = input.type === 'password' ? 'text' : 'password';
    setEyeIcon('cloudTtsKey', 'toggleCloudKey');
  };

  // Кнопки "ℹ️" біля кожного ключа та посилання внизу — відкривають інструкцію
  document.getElementById('infoGeminiKey').onclick = () => openInstructionsPage('gemini');
  document.getElementById('infoCloudKey').onclick = () => openInstructionsPage('tts');
  document.getElementById('openInstructions').onclick = (e) => {
    e.preventDefault();
    openInstructionsPage();
  };
});

document.getElementById('save').onclick = () => {
  const ui = document.getElementById('uiLang').value;
  chrome.storage.local.set({
    geminiApiKey: document.getElementById('geminiKey').value.trim(),
    cloudTtsApiKey: document.getElementById('cloudTtsKey').value.trim(),
    uiLang: ui,
    toLang: document.getElementById('defLang').value,
    aiModel: document.getElementById('aiModel').value
  }, () => {
    update(ui);
    const s = document.getElementById('status');
    s.style.display = 'block';
    setTimeout(() => s.style.display = 'none', 2000);
  });
};

function update(lang) {
  currentLang = i18n[lang] ? lang : 'uk';
  const t = i18n[currentLang];
  
  // Main settings
  document.getElementById('title').textContent = t.t;
  document.getElementById('l-ui').textContent = t.ui;
  document.getElementById('l-def').textContent = t.def;
  document.getElementById('l-model').textContent = t.model;
  document.getElementById('l-key-gemini').textContent = t.keyGemini;
  document.getElementById('l-key-cloud').textContent = t.keyCloud;
  document.getElementById('loadModels').textContent = t.load;
  document.getElementById('save').textContent = t.btn;
  document.getElementById('status').textContent = t.ok;

  // Help row (link to the standalone instructions page)
  document.getElementById('help-text').textContent = t.helpText;
  document.getElementById('openInstructions').textContent = t.guideLink;

  // Іконки кнопок показу ключів залежно від поточного стану полів
  setEyeIcon('geminiKey', 'toggleGeminiKey');
  setEyeIcon('cloudTtsKey', 'toggleCloudKey');
}
