let lastRequestId = 0;

const LANG_NAMES = {
  auto: 'the source language',
  uk: 'Ukrainian',
  en: 'English',
  pl: 'Polish',
  es: 'Spanish',
  de: 'German'
};

// Одноразова міграція налаштувань зі storage.sync до storage.local.
// Раніше конфіг зберігався в sync; тепер усе тримаємо в local. Копіюємо
// лише ті ключі, яких ще немає в local, щоб не перезаписати свіжі значення.
const CONFIG_KEYS = [
  'geminiApiKey', 'cloudTtsApiKey', 'uiLang', 'toLang', 'fromLang',
  'aiModel', 'translatorEnabled', 'showHints', 'aiEnabled',
  'aiReadingEnabled', 'aiStyle', 'aiPrompt', 'ttsVoice', 'audioSpeed',
  'translationsArray'
];

function migrateSyncToLocal() {
  try {
    chrome.storage.sync.get(CONFIG_KEYS, (syncData) => {
      if (chrome.runtime.lastError || !syncData) return;
      const hasAny = Object.keys(syncData).length > 0;
      if (!hasAny) return;
      chrome.storage.local.get(CONFIG_KEYS, (localData) => {
        const toCopy = {};
        for (const key of CONFIG_KEYS) {
          if (syncData[key] !== undefined && localData[key] === undefined) {
            toCopy[key] = syncData[key];
          }
        }
        if (Object.keys(toCopy).length > 0) {
          chrome.storage.local.set(toCopy);
        }
      });
    });
  } catch (e) {
    // storage.sync може бути недоступним — тоді просто пропускаємо міграцію
  }
}

chrome.runtime.onInstalled.addListener(migrateSyncToLocal);
chrome.runtime.onStartup.addListener(migrateSyncToLocal);

// Файли пресет-промптів для стилів перекладу (у папці prompts/).
const STYLE_PROMPT_FILES = {
  software_engineer: 'prompts/software_engineer.txt',
  solution_architect: 'prompts/solution_architect.txt'
};

// Повертає інструкцію стилю: для пресета — вміст відповідного файлу,
// для "standard" — кастомний промпт користувача.
async function getStyleInstruction(settings) {
  const style = settings.aiStyle || 'standard';
  const file = STYLE_PROMPT_FILES[style];
  if (file) {
    try {
      const resp = await fetch(chrome.runtime.getURL(file));
      if (resp.ok) return (await resp.text()).trim();
    } catch (e) { /* впадемо на кастомний/порожній нижче */ }
  }
  return (settings.aiPrompt || '').trim();
}

// Зберігає останній статус AI-перекладу, щоб попап міг його показати.
// null — очистити (AI вимкнено); { code: 'ok' | 'no_key' | 'error', status, message }.
function setAiStatus(status) {
  chrome.storage.local.set({ aiLastStatus: status ? { ...status, time: Date.now() } : null });
}

// Найшвидша модель для перекладу. Кеш робочої моделі на сесію.
const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash-8b'; // Найшвидша і найдешевша модель
let cachedGeminiModel = null;

// Запитує у Google список доступних моделей і повертає найшвидшу flash-модель.
async function pickAvailableModel(key) {
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  if (!resp.ok) throw new Error('ListModels HTTP ' + resp.status);
  const data = await resp.json();
  const models = (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'));
  
  // Фільтруємо deprecated моделі асинхронно
  const availableModels = [];
  for (const m of models) {
    if (!(await isDeprecatedModel(m.name))) {
      availableModels.push(m);
    }
  }
  
  if (!availableModels.length) return null;
  const name = (m) => (m.name || '').replace(/^models\//, '');
  
  // Пріоритет швидкості: flash-8b → flash → будь-яка інша
  const flash8b = availableModels.find(m => /flash.*8b/i.test(name(m)));
  const flash = availableModels.find(m => /flash/i.test(name(m)) && !/8b/i.test(name(m)));
  
  return name(flash8b || flash || availableModels[0]);
}

// Перевіряє, чи модель deprecated/shut down за відомими паттернами + динамічним blacklist.
async function isDeprecatedModel(name) {
  const id = (name || '').replace(/^models\//, '').toLowerCase();
  // Статичний список відомих deprecated моделей
  const staticDeprecated = [
    'gemini-2.0-flash', // shut down
    'gemini-1.0-pro',
    'gemini-1.0-pro-latest',
    'imagen-4' // deprecated
  ];
  
  // Динамічний blacklist із local storage (моделі, які давали 404)
  try {
    const { deprecatedModels } = await chrome.storage.local.get(['deprecatedModels']);
    const dynamicDeprecated = deprecatedModels || [];
    const allDeprecated = [...staticDeprecated, ...dynamicDeprecated];
    return allDeprecated.some(d => id === d || id.startsWith(d + '-'));
  } catch {
    // Fallback якщо storage недоступний
    return staticDeprecated.some(d => id === d || id.startsWith(d + '-'));
  }
}

// Додає модель до динамічного blacklist при 404 "no longer available".
function addToDeprecatedList(modelId) {
  chrome.storage.local.get(['deprecatedModels'], ({ deprecatedModels }) => {
    const list = deprecatedModels || [];
    if (!list.includes(modelId)) {
      list.push(modelId);
      chrome.storage.local.set({ deprecatedModels: list });
      console.log('[Translator] Додано до blacklist:', modelId);
    }
  });
}

// Один виклик generateContent для заданої моделі (оптимізовано для швидкості).
async function callGemini(model, key, system, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { 
        temperature: 0.1, // знижена температура для швидкості
        maxOutputTokens: 2048, // обмеження токенів
        topP: 0.8 // фокус на найвірогідніших варіантах
      }
    })
  });

  if (!resp.ok) {
    let detail = '';
    try { const e = await resp.json(); detail = e?.error?.message || ''; } catch (_) { }
    const err = new Error(detail || ('Gemini HTTP ' + resp.status));
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const out = data?.candidates?.[0]?.content?.parts
    ?.map(p => p.text || '')
    .join('')
    .trim();

  if (!out) throw new Error('Empty Gemini response');
  return out;
}

// --- Gemini TTS (AI-озвучення через той самий Generative Language API / ключ) ---
const DEFAULT_TTS_VOICE = 'Kore'; // приємний, рівний голос
// Моделі TTS у порядку швидкості (перша найшвидша буде закешована)
const TTS_MODELS = ['gemini-2.5-flash-tts', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];
let cachedTtsModel = null;

function setTtsStatus(status) {
  chrome.storage.local.set({ ttsLastStatus: status ? { ...status, time: Date.now() } : null });
}

// Один виклик TTS для конкретної моделі. Повертає base64 PCM (24kHz, mono, 16-bit).
async function callGeminiTTS(model, key, text, voiceName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
      }
    })
  });

  if (!resp.ok) {
    let detail = '';
    try { const e = await resp.json(); detail = e?.error?.message || ''; } catch (_) { }
    const err = new Error(detail || ('Gemini TTS HTTP ' + resp.status));
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const audio = data?.candidates?.[0]?.content?.parts
    ?.map(p => p.inlineData?.data || '')
    .join('');
  if (!audio) throw new Error('Empty Gemini TTS response');
  return audio;
}

// Синтез мовлення з підбором робочої TTS-моделі (кеш на сесію).
async function geminiTTS(text, key, voiceName) {
  const order = cachedTtsModel
    ? [cachedTtsModel, ...TTS_MODELS.filter(m => m !== cachedTtsModel)]
    : TTS_MODELS.slice();

  let lastErr = null;
  for (const model of order) {
    try {
      const data = await callGeminiTTS(model, key, text, voiceName);
      cachedTtsModel = model;
      return { data, model };
    } catch (err) {
      lastErr = err;
      // 404 — модель недоступна для цього ключа: пробуємо наступну.
      // Інші помилки (403/401/429) — немає сенсу перебирати, кидаємо одразу.
      if (err.status !== 404) throw err;
    }
  }
  throw lastErr || new Error('No TTS model available');
}

// --- Класичний Google Cloud Text-to-Speech (WaveNet), як було до AI ---
const CLOUD_TTS_VOICES = {
  'pl': { code: 'pl-PL', name: 'pl-PL-Wavenet-A' },
  'uk': { code: 'uk-UA', name: 'uk-UA-Wavenet-A' },
  'en': { code: 'en-US', name: 'en-US-Wavenet-D' },
  'de': { code: 'de-DE', name: 'de-DE-Wavenet-B' },
  'es': { code: 'es-ES', name: 'es-ES-Wavenet-B' }
};

// Синтез через Cloud Text-to-Speech. Повертає base64 MP3.
async function cloudTTS(text, langCode, key) {
  const code = (langCode || 'en').split('-')[0];
  const voice = CLOUD_TTS_VOICES[code] || CLOUD_TTS_VOICES['en'];
  const resp = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: voice.code, name: voice.name },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 }
    })
  });

  if (!resp.ok) {
    let detail = '';
    try { const e = await resp.json(); detail = e?.error?.message || ''; } catch (_) { }
    const err = new Error(detail || ('Cloud TTS HTTP ' + resp.status));
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  if (!data.audioContent) throw new Error('Empty Cloud TTS response');
  return data.audioContent;
}

// Переклад через Gemini з урахуванням стилю та кастомного промпту.
// При 404 (модель недоступна) сам підбирає робочу модель через ListModels і повторює.
async function translateWithGemini(text, sl, tl, settings) {
  const key = settings.googleApiKey;
  const targetName = LANG_NAMES[tl] || tl;
  const sourceName = sl === 'auto' ? '' : (LANG_NAMES[sl] || sl);

  let system =
    `You are a professional translator of technical literature. ` +
    `Translate the user's text ${sourceName ? 'from ' + sourceName + ' ' : ''}into ${targetName}. ` +
    `Preserve the meaning, tone and technical accuracy. ` +
    `Return ONLY the translated text, without quotes, explanations, or any extra commentary.`;

  const styleInstruction = await getStyleInstruction(settings);
  if (styleInstruction) {
    system += ` Additional instructions:\n${styleInstruction}`;
  }

  // Пріоритет: обрана користувачем модель → підібрана раніше → дефолт
  const model = settings.aiModel || cachedGeminiModel || DEFAULT_GEMINI_MODEL;
  try {
    return await callGemini(model, key, system, text);
  } catch (err) {
    // Модель deprecated — додаємо до blacklist і підбираємо нову
    if (err.status === 404 && /no longer available/i.test(err.message)) {
      console.warn('[Translator] Модель', model, 'більше не доступна. Додаю до blacklist...');
      addToDeprecatedList(model);
      const picked = await pickAvailableModel(key);
      if (picked && picked !== model) {
        cachedGeminiModel = picked;
        console.log('[Translator] Обрано модель:', picked);
        return await callGemini(picked, key, system, text);
      }
    }
    // Інша 404 (модель не знайдено) — підбираємо доступну
    else if (err.status === 404) {
      console.warn('[Translator] Модель', model, 'недоступна (404). Підбираю доступну...');
      const picked = await pickAvailableModel(key);
      if (picked && picked !== model) {
        cachedGeminiModel = picked;
        console.log('[Translator] Обрано модель:', picked);
        return await callGemini(picked, key, system, text);
      }
    }
    throw err;
  }
}

async function setupOffscreen() {
  if (!(await chrome.offscreen.hasDocument?.())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playing synthesized text voice'
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Повертає список Gemini-моделей, що підтримують generateContent (для дропдауна в налаштуваннях).
  if (request.action === 'listGeminiModels') {
    const key = request.key;
    if (!key) { sendResponse({ error: 'no_key' }); return true; }
    
    (async () => {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const d = await r.json();
        if (!r.ok) {
          sendResponse({ error: 'http', status: r.status, message: d?.error?.message || '' });
          return;
        }
        
        const allModels = (d.models || [])
          .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'));
        
        // Фільтруємо deprecated моделі асинхронно
        const models = [];
        for (const m of allModels) {
          if (!(await isDeprecatedModel(m.name))) {
            models.push({
              id: (m.name || '').replace(/^models\//, ''),
              displayName: m.displayName || (m.name || '').replace(/^models\//, '')
            });
          }
        }
        
        sendResponse({ models });
      } catch (e) {
        sendResponse({ error: 'network', message: String(e && e.message || e) });
      }
    })();
    return true;
  }

  if (request.action === 'audio_ended_internal') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'audio_ended' }).catch(() => { });
      });
    });
    return;
  }

  // МИТТЄВА ЗУПИНКА ПРИ НАТИСКАННІ
  if (request.action === 'stop_audio_global') {
    lastRequestId++;
    setupOffscreen().then(() => {
      chrome.runtime.sendMessage({ action: 'stop_audio_now' });
    });
    return;
  }

  // ПАУЗА АУДІО
  if (request.action === 'pause_audio') {
    setupOffscreen().then(() => {
      chrome.runtime.sendMessage({ action: 'pause_audio_now' });
    });
    return;
  }

  // ВІДНОВЛЕННЯ АУДІО
  if (request.action === 'resume_audio') {
    setupOffscreen().then(() => {
      chrome.runtime.sendMessage({ action: 'resume_audio_now' });
    });
    return;
  }

  // ВСТАНОВЛЕННЯ ШВИДКОСТІ АУДІО
  if (request.action === 'set_audio_speed') {
    setupOffscreen().then(() => {
      chrome.runtime.sendMessage({ action: 'set_audio_speed_now', speed: request.speed });
    });
    return;
  }

  if (request.action === 'speakAI') {
    const currentId = ++lastRequestId; // Фіксуємо цей запит

    setupOffscreen().then(() => {
      chrome.storage.local.get(['geminiApiKey', 'cloudTtsApiKey', 'ttsVoice', 'aiReadingEnabled'], (res) => {
        const speed = request.speed || 1;
        
        // Логіка вибору TTS рушія:
        // AI reading увімкнено → Gemini TTS (потребує geminiApiKey)
        // AI reading вимкнено → Cloud Text-to-Speech (потребує cloudTtsApiKey)
        if (res.aiReadingEnabled && res.geminiApiKey) {
          const voiceName = res.ttsVoice || DEFAULT_TTS_VOICE;
          console.log('[TTS] Рушій: Gemini TTS (AI reading увімкнено)');
          geminiTTS(request.text, res.geminiApiKey, voiceName)
            .then(({ data }) => {
              if (currentId === lastRequestId && data) {
                setTtsStatus({ code: 'ok' });
                // Gemini повертає сирий PCM 24kHz/mono/16-bit — конвертуємо у WAV в offscreen
                chrome.runtime.sendMessage({
                  action: 'play_audio_pcm', data, speed, sampleRate: 24000
                });
              }
            })
            .catch((err) => {
              console.warn('[TTS] Gemini TTS помилка:', err.status || '', err.message);
              setTtsStatus({ code: 'error', status: err.status || 0, message: err.message || '' });
            });
        } else if (!res.aiReadingEnabled && res.cloudTtsApiKey) {
          console.log('[TTS] Рушій: Cloud Text-to-Speech (AI reading вимкнено)');
          cloudTTS(request.text, request.langCode, res.cloudTtsApiKey)
            .then((audioContent) => {
              if (currentId === lastRequestId && audioContent) {
                setTtsStatus({ code: 'ok' });
                chrome.runtime.sendMessage({ action: 'play_audio', data: audioContent, speed });
              }
            })
            .catch((err) => {
              console.warn('[TTS] Cloud TTS помилка:', err.status || '', err.message);
              setTtsStatus({ code: 'error', status: err.status || 0, message: err.message || '' });
            });
        } else {
          // Відсутні необхідні ключі
          const missing = res.aiReadingEnabled ? 'Gemini API-ключ' : 'Cloud TTS API-ключ';
          console.warn(`[TTS] ${missing} відсутній — озвучення недоступне`);
          setTtsStatus({ code: 'no_key', message: `${missing} не налаштовано` });
        }
      });
    });
    return true;
  }

  // Переклад: AI (Gemini) з кастомним промптом/глосарієм або звичайний Google Translate
  if (request.action === 'translateText') {
    chrome.storage.local.get(
      ['fromLang', 'toLang', 'aiEnabled', 'aiStyle', 'aiPrompt', 'aiModel', 'geminiApiKey'],
      (settings) => {
        const sl = settings.fromLang === 'auto' ? 'auto' : (settings.fromLang || 'auto');
        const tl = settings.toLang || 'uk';

        // Запасний варіант — безкоштовний Google Translate
        const googleTranslate = () => {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(request.text)}`;
          fetch(url)
            .then(res => res.json())
            .then(data => {
              sendResponse({
                translation: data[0].map(x => x[0]).join(''),
                detectedLang: data[2].toLowerCase(),
                targetLang: tl
              });
            })
            .catch(() => sendResponse({ translation: '❌ Error' }));
        };

        // Якщо AI вимкнено — одразу Google Translate (без статусу помилки)
        if (!settings.aiEnabled) {
          console.log('[Translator] Рушій: Google Translate (AI вимкнено)');
          setAiStatus(null);
          googleTranslate();
          return;
        }

        // AI увімкнено, але немає ключа
        if (!settings.geminiApiKey) {
          console.warn('[Translator] AI увімкнено, але немає Gemini API-ключа');
          setAiStatus({ code: 'no_key' });
          googleTranslate();
          return;
        }

        console.log('[Translator] Рушій: Gemini AI | стиль:', settings.aiStyle || 'standard');
        // Передаємо Gemini ключ як googleApiKey для зворотної сумісності з translateWithGemini
        const geminiSettings = { ...settings, googleApiKey: settings.geminiApiKey };
        translateWithGemini(request.text, sl, tl, geminiSettings)
          .then((translation) => {
            console.log('[Translator] ✅ Gemini відповів:', translation);
            setAiStatus({ code: 'ok' });
            sendResponse({
              translation,
              detectedLang: sl === 'auto' ? '' : sl,
              targetLang: tl
            });
          })
          .catch((err) => {
            // Будь-яка помилка AI (немає доступу, ліміт, тощо) — тихий відкат
            console.warn('[Translator] ⚠️ Gemini не спрацював, відкат на Google Translate:', err.message);
            setAiStatus({ code: 'error', status: err.status || 0, message: err.message || '' });
            googleTranslate();
          });
      }
    );
    return true;
  }

  if (request.action === 'openPdfReader') {
    const pdfUrl = request.pdfUrl || sender.tab.url;
    const tabId = sender.tab.id;
    const viewerUrl = chrome.runtime.getURL(`pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`);
    chrome.tabs.update(tabId, { url: viewerUrl });
  }
});