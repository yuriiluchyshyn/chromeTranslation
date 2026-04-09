let lastRequestId = 0;

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

  if (request.action === 'speakAI') {
    const currentId = ++lastRequestId; // Фіксуємо цей запит

    setupOffscreen().then(() => {
      chrome.storage.sync.get(['googleApiKey'], (res) => {
        const key = res.googleApiKey;
        if (!key) return;

        const voiceMap = {
          'pl': { code: 'pl-PL', name: 'pl-PL-Wavenet-A' },
          'uk': { code: 'uk-UA', name: 'uk-UA-Wavenet-A' },
          'en': { code: 'en-US', name: 'en-US-Wavenet-D' },
          'de': { code: 'de-DE', name: 'de-DE-Wavenet-B' },
          'es': { code: 'es-ES', name: 'es-ES-Wavenet-B' }
        };

        const code = (request.langCode || 'en').split('-')[0];
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
          .then(data => {
            // ПЕРЕВІРКА: Якщо за цей час користувач не натиснув на інше слово
            if (currentId === lastRequestId && data.audioContent) {
              chrome.runtime.sendMessage({ action: 'play_audio', data: data.audioContent });
            }
          })
          .catch(() => { });
      });
    });
    return true;
  }

  // Інші обробники (translateText, openPdfReader) залишаються без змін
  if (request.action === 'translateText') {
    chrome.storage.sync.get(['fromLang', 'toLang'], (settings) => {
      const sl = settings.fromLang === 'auto' ? 'auto' : (settings.fromLang || 'auto');
      const tl = settings.toLang || 'uk';
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(request.text)}`;
      fetch(url).then(res => res.json()).then(data => {
        sendResponse({ translation: data[0].map(x => x[0]).join(''), detectedLang: data[2].toLowerCase(), targetLang: tl });
      }).catch(() => sendResponse({ translation: '❌ Error' }));
    });
    return true;
  }

  if (request.action === 'openPdfReader') {
    const pdfUrl = request.pdfUrl || sender.tab.url;
    const tabId = sender.tab.id;
    const viewerUrl = chrome.runtime.getURL(`pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`);
    chrome.tabs.update(tabId, { url: viewerUrl });
  }
});