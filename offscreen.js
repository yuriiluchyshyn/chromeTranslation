let currentAudio = null;

chrome.runtime.onMessage.addListener((request) => {
  const stopAllAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio.load();
      currentAudio = null;
      // Надсилаємо сигнал, що звук припинено, щоб зняти підсвітку іконок
      chrome.runtime.sendMessage({ action: 'audio_ended_internal' });
    }
  };

  if (request.action === 'play_audio') {
    stopAllAudio(); 

    currentAudio = new Audio("data:audio/mp3;base64," + request.data);
    
    currentAudio.onended = () => {
      chrome.runtime.sendMessage({ action: 'audio_ended_internal' });
      currentAudio = null;
    };

    currentAudio.onerror = () => {
      chrome.runtime.sendMessage({ action: 'audio_ended_internal' });
      currentAudio = null;
    };

    currentAudio.play();
  }

  if (request.action === 'stop_audio_now') {
    stopAllAudio();
  }
});