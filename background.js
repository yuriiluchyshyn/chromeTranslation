chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. ПЕРЕКЛАД + ВИЗНАЧЕННЯ МОВИ
  if (request.action === 'translateText') {
    chrome.storage.sync.get(['fromLang', 'toLang'], (settings) => {
      const from = settings.fromLang || 'autodetect';
      const to = settings.toLang || 'uk';
      
      fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(request.text)}&langpair=${from}|${to}`)
        .then(res => res.json())
        .then(data => {
          // MyMemory повертає код визначеної мови у matches
          const detected = data.responseData.detectedSourceLanguage || 'en';
          sendResponse({ 
            translation: data?.responseData?.translatedText || '❌',
            detectedLang: detected // Передаємо визначену мову назад у словник
          });
        })
        .catch(() => sendResponse({ translation: '❌' }));
    });
    return true; 
  }

  // 2. ОЗВУЧЕННЯ
  if (request.action === 'speakAI') {
    const { text, langCode } = request;

    chrome.storage.sync.get(['googleApiKey'], (settings) => {
      const apiKey = settings.googleApiKey;
      if (!apiKey) return sendResponse({ error: "No API Key" });

      // Розширений мапінг мов
      const voiceMap = {
        'uk': { code: 'uk-UA', name: 'uk-UA-Wavenet-A' },
        'en': { code: 'en-US', name: 'en-US-Wavenet-D' },
        'pl': { code: 'pl-PL', name: 'pl-PL-Wavenet-A' }, // Польська
        'de': { code: 'de-DE', name: 'de-DE-Wavenet-B' },
        'fr': { code: 'fr-FR', name: 'fr-FR-Wavenet-C' },
        'es': { code: 'es-ES', name: 'es-ES-Wavenet-B' }
      };

      // Якщо прийшов код 'pl-PL' або просто 'pl', ми його почистимо
      const shortCode = langCode.split('-')[0].toLowerCase();
      const voice = voiceMap[shortCode] || voiceMap['en'];

      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      const body = {
        input: { text: text },
        voice: { languageCode: voice.code, name: voice.name },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 }
      };

      fetch(url, { method: 'POST', body: JSON.stringify(body) })
        .then(res => res.json())
        .then(data => sendResponse({ audio: data.audioContent }))
        .catch(() => sendResponse({ error: true }));
    });
    return true;
  }
  
  if (request.action === 'openPdfReader') {
    chrome.tabs.create({ url: chrome.runtime.getURL('pdfjs/web/viewer.html') });
  }
});