chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. ПЕРЕКЛАД GOOGLE (Free)
  if (request.action === 'translateText') {
    chrome.storage.sync.get(['fromLang', 'toLang'], (settings) => {
      const sl = settings.fromLang === 'auto' ? 'auto' : (settings.fromLang || 'auto');
      const tl = settings.toLang || 'uk';
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(request.text)}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          sendResponse({ 
            translation: data[0].map(x => x[0]).join(''),
            detectedLang: data[2].toLowerCase() 
          });
        })
        .catch(() => sendResponse({ translation: '❌ Error' }));
    });
    return true; 
  }

  // 2. ОЗВУЧЕННЯ GOOGLE CLOUD AI
  if (request.action === 'speakAI') {
    chrome.storage.sync.get(['googleApiKey'], (res) => {
      const key = res.googleApiKey;
      if (!key) return sendResponse({ error: "No API Key" });

      const voiceMap = {
        'pl': { code: 'pl-PL', name: 'pl-PL-Wavenet-A' },
        'uk': { code: 'uk-UA', name: 'uk-UA-Wavenet-A' },
        'en': { code: 'en-US', name: 'en-US-Wavenet-D' },
        'de': { code: 'de-DE', name: 'de-DE-Wavenet-B' }
      };

      const code = request.langCode.split('-')[0];
      const voice = voiceMap[code] || voiceMap['en'];

      fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
        method: 'POST',
        body: JSON.stringify({
          input: { text: request.text },
          voice: { languageCode: voice.code, name: voice.name },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 }
        })
      })
      .then(r => r.json())
      .then(data => sendResponse({ audio: data.audioContent }))
      .catch(() => sendResponse({ error: true }));
    });
    return true;
  }
  
  if (request.action === 'openPdfReader') {
    chrome.tabs.create({ url: chrome.runtime.getURL('pdfjs/web/viewer.html') });
  }
});