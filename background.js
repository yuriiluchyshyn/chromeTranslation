// const GOOGLE_API_KEY = "AIzaSyAYWXr3RQAbBD1tngyQW4vkXLTf72FngO0"; 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Логіка перекладу (залишається без змін)
  if (request.action === 'translateText') {
    chrome.storage.sync.get(['fromLang', 'toLang'], (settings) => {
      const from = settings.fromLang || 'autodetect';
      const to = settings.toLang || 'uk';
      fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(request.text)}&langpair=${from}|${to}`)
        .then(res => res.json())
        .then(data => sendResponse({ translation: data?.responseData?.translatedText || '❌' }))
        .catch(() => sendResponse({ translation: '❌' }));
    });
    return true; 
  }

  // 2. Озвучення через Google Cloud TTS
  if (request.action === 'speakAI') {
    const { text, langCode } = request;
    
    // Мапінг на голоси Google (Wavenet - це преміальна якість)
    const voiceMap = {
      'uk': { code: 'uk-UA', name: 'uk-UA-Wavenet-A' },
      'en': { code: 'en-US', name: 'en-US-Wavenet-D' },
      'de': { code: 'de-DE', name: 'de-DE-Wavenet-B' },
      'fr': { code: 'fr-FR', name: 'fr-FR-Wavenet-C' },
      'es': { code: 'es-ES', name: 'es-ES-Wavenet-B' },
      'pl': { code: 'pl-PL', name: 'pl-PL-Wavenet-A' }
    };

    const voice = voiceMap[langCode] || { code: 'en-US', name: 'en-US-Wavenet-D' };
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;

    const body = {
      input: { text: text },
      voice: { languageCode: voice.code, name: voice.name },
      audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 0.95 }
    };

    fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      if (data.audioContent) {
        sendResponse({ audio: data.audioContent });
      } else {
        console.error("Google TTS Error:", data);
        sendResponse({ error: true });
      }
    })
    .catch(err => {
      console.error("Fetch Error:", err);
      sendResponse({ error: true });
    });
    return true;
  }
  
  if (request.action === 'openPdfReader') {
    chrome.tabs.create({ url: chrome.runtime.getURL('pdfjs/web/viewer.html') });
  }
});