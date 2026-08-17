// Standalone instructions page. Reads uiLang from local storage and lets the
// user switch language on the fly. Covers both API keys with step-by-step help.

const AISTUDIO_URL = 'https://aistudio.google.com/';
const CLOUD_CONSOLE_URL = 'https://console.cloud.google.com/';

const i18n = {
  uk: {
    pageTitle: "Як отримати API-ключі",
    pageSubtitle: "Виконайте ці кроки, щоб налаштувати переклад і озвучування.",
    required: "Обов'язково",
    optional: "Опційно",
    ttsTitle: "Cloud Text-to-Speech API-ключ",
    ttsSteps: [
      `Відкрийте Google Cloud Console: <a href="${CLOUD_CONSOLE_URL}" target="_blank">console.cloud.google.com</a>`,
      "Увійдіть у свій акаунт Google.",
      "Створіть новий проєкт або оберіть наявний угорі сторінки.",
      "У пошуку вгорі знайдіть «Cloud Text-to-Speech API» і відкрийте його.",
      "Натисніть «Enable» (Увімкнути), щоб активувати цей API для проєкту.",
      "Перейдіть до «APIs & Services» → «Credentials» (Облікові дані).",
      "Натисніть «Create Credentials» → «API key».",
      "Скопіюйте згенерований ключ і вставте його в налаштуваннях розширення.",
      "Рекомендовано: обмежте ключ лише до Text-to-Speech API для безпеки."
    ],
    ttsNote: "⚠️ Цей ключ потрібен для традиційного (не-AI) озвучування тексту високої якості. Без нього функція читання буде недоступна.",
    geminiTitle: "Gemini API-ключ",
    geminiSteps: [
      `Відкрийте Google AI Studio: <a href="${AISTUDIO_URL}" target="_blank">aistudio.google.com</a>`,
      "Увійдіть зі своїм акаунтом Google.",
      "Натисніть «Get API key» у лівому меню.",
      "Натисніть «Create API key».",
      "Оберіть проєкт або створіть новий.",
      "Скопіюйте згенерований ключ (починається з <code>AIza</code>) і вставте його в налаштуваннях."
    ],
    geminiNote: "🔥 Gemini API має щедрий безкоштовний рівень і потрібен для AI-перекладу та AI-читання. Опційний, якщо ви не користуєтеся AI-функціями."
  },
  en: {
    pageTitle: "How to Get API Keys",
    pageSubtitle: "Follow these steps to set up translation and reading.",
    required: "Required",
    optional: "Optional",
    ttsTitle: "Cloud Text-to-Speech API Key",
    ttsSteps: [
      `Open the Google Cloud Console: <a href="${CLOUD_CONSOLE_URL}" target="_blank">console.cloud.google.com</a>`,
      "Sign in with your Google account.",
      "Create a new project or pick an existing one at the top of the page.",
      "Use the top search bar to find \"Cloud Text-to-Speech API\" and open it.",
      "Click \"Enable\" to activate this API for the project.",
      "Go to \"APIs & Services\" → \"Credentials\".",
      "Click \"Create Credentials\" → \"API key\".",
      "Copy the generated key and paste it into the extension settings.",
      "Recommended: restrict the key to the Text-to-Speech API for security."
    ],
    ttsNote: "⚠️ This key is required for high-quality traditional (non-AI) text reading. Without it, the reading feature is unavailable.",
    geminiTitle: "Gemini API Key",
    geminiSteps: [
      `Open Google AI Studio: <a href="${AISTUDIO_URL}" target="_blank">aistudio.google.com</a>`,
      "Sign in with your Google account.",
      "Click \"Get API key\" in the left menu.",
      "Click \"Create API key\".",
      "Select a project or create a new one.",
      "Copy the generated key (starts with <code>AIza</code>) and paste it into the settings."
    ],
    geminiNote: "🔥 The Gemini API has a generous free tier and is required for AI translation and AI reading. Optional if you don't use the AI features."
  },
  es: {
    pageTitle: "Cómo obtener claves API",
    pageSubtitle: "Sigue estos pasos para configurar la traducción y la lectura.",
    required: "Obligatorio",
    optional: "Opcional",
    ttsTitle: "Clave API de Cloud Text-to-Speech",
    ttsSteps: [
      `Abre la Google Cloud Console: <a href="${CLOUD_CONSOLE_URL}" target="_blank">console.cloud.google.com</a>`,
      "Inicia sesión con tu cuenta de Google.",
      "Crea un nuevo proyecto o elige uno existente en la parte superior.",
      "Usa la barra de búsqueda superior para encontrar \"Cloud Text-to-Speech API\" y ábrela.",
      "Haz clic en \"Enable\" (Habilitar) para activar esta API en el proyecto.",
      "Ve a \"APIs & Services\" → \"Credentials\".",
      "Haz clic en \"Create Credentials\" → \"API key\".",
      "Copia la clave generada y pégala en la configuración de la extensión.",
      "Recomendado: restringe la clave solo a la API de Text-to-Speech por seguridad."
    ],
    ttsNote: "⚠️ Esta clave es necesaria para la lectura de texto tradicional (sin IA) de alta calidad. Sin ella, la función de lectura no está disponible.",
    geminiTitle: "Clave API de Gemini",
    geminiSteps: [
      `Abre Google AI Studio: <a href="${AISTUDIO_URL}" target="_blank">aistudio.google.com</a>`,
      "Inicia sesión con tu cuenta de Google.",
      "Haz clic en \"Get API key\" en el menú izquierdo.",
      "Haz clic en \"Create API key\".",
      "Selecciona un proyecto o crea uno nuevo.",
      "Copia la clave generada (empieza con <code>AIza</code>) y pégala en la configuración."
    ],
    geminiNote: "🔥 La API de Gemini tiene un nivel gratuito generoso y es necesaria para la traducción y lectura con IA. Opcional si no usas las funciones de IA."
  },
  de: {
    pageTitle: "So erhalten Sie API-Schlüssel",
    pageSubtitle: "Befolgen Sie diese Schritte, um Übersetzung und Vorlesen einzurichten.",
    required: "Erforderlich",
    optional: "Optional",
    ttsTitle: "Cloud Text-to-Speech API-Schlüssel",
    ttsSteps: [
      `Öffnen Sie die Google Cloud Console: <a href="${CLOUD_CONSOLE_URL}" target="_blank">console.cloud.google.com</a>`,
      "Melden Sie sich mit Ihrem Google-Konto an.",
      "Erstellen Sie ein neues Projekt oder wählen Sie oben ein vorhandenes aus.",
      "Suchen Sie über die obere Suchleiste nach \"Cloud Text-to-Speech API\" und öffnen Sie sie.",
      "Klicken Sie auf \"Enable\" (Aktivieren), um diese API für das Projekt zu aktivieren.",
      "Gehen Sie zu \"APIs & Services\" → \"Credentials\".",
      "Klicken Sie auf \"Create Credentials\" → \"API key\".",
      "Kopieren Sie den generierten Schlüssel und fügen Sie ihn in die Erweiterungseinstellungen ein.",
      "Empfohlen: Beschränken Sie den Schlüssel aus Sicherheitsgründen auf die Text-to-Speech API."
    ],
    ttsNote: "⚠️ Dieser Schlüssel wird für das hochwertige traditionelle (nicht-KI) Vorlesen benötigt. Ohne ihn ist die Vorlesefunktion nicht verfügbar.",
    geminiTitle: "Gemini API-Schlüssel",
    geminiSteps: [
      `Öffnen Sie Google AI Studio: <a href="${AISTUDIO_URL}" target="_blank">aistudio.google.com</a>`,
      "Melden Sie sich mit Ihrem Google-Konto an.",
      "Klicken Sie im linken Menü auf \"Get API key\".",
      "Klicken Sie auf \"Create API key\".",
      "Wählen Sie ein Projekt aus oder erstellen Sie ein neues.",
      "Kopieren Sie den generierten Schlüssel (beginnt mit <code>AIza</code>) und fügen Sie ihn in die Einstellungen ein."
    ],
    geminiNote: "🔥 Die Gemini API bietet ein großzügiges kostenloses Kontingent und wird für KI-Übersetzung und KI-Vorlesen benötigt. Optional, wenn Sie die KI-Funktionen nicht nutzen."
  }
};

function renderSteps(listEl, steps) {
  listEl.innerHTML = '';
  steps.forEach((step) => {
    const li = document.createElement('li');
    li.innerHTML = step; // strings are hard-coded above (trusted), safe HTML for links
    listEl.appendChild(li);
  });
}

function render(lang) {
  const t = i18n[lang] || i18n.en;
  document.documentElement.lang = lang;

  document.getElementById('page-title').textContent = t.pageTitle;
  document.getElementById('page-subtitle').textContent = t.pageSubtitle;

  document.getElementById('tts-title').textContent = t.ttsTitle;
  document.getElementById('tts-badge').textContent = t.required;
  renderSteps(document.getElementById('tts-steps'), t.ttsSteps);
  document.getElementById('tts-note').textContent = t.ttsNote;

  document.getElementById('gemini-title').textContent = t.geminiTitle;
  document.getElementById('gemini-badge').textContent = t.optional;
  renderSteps(document.getElementById('gemini-steps'), t.geminiSteps);
  document.getElementById('gemini-note').textContent = t.geminiNote;
}

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('uiLang');

  // If ?section=tts is present, scroll the TTS card into view (used by the
  // "required" warning link in the popup).
  const params = new URLSearchParams(location.search);
  const focusTts = params.get('section') === 'tts';

  chrome.storage.local.get(['uiLang'], (res) => {
    const lang = i18n[res.uiLang] ? res.uiLang : 'uk';
    langSelect.value = lang;
    render(lang);
    if (focusTts) {
      document.getElementById('tts-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  langSelect.addEventListener('change', (e) => {
    const lang = e.target.value;
    render(lang);
    // Persist the choice so the rest of the extension stays consistent.
    chrome.storage.local.set({ uiLang: lang });
  });
});