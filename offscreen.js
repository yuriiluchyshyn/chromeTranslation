let currentAudio = null;
let currentSpeed = 1; // Зберігаємо поточну швидкість між відтвореннями

// Застосовує швидкість зі збереженням тону голосу (щоб звук не був "як бурундук"
// і звуки не зливалися). preservesPitch використовує time-stretching замість
// простого прискорення відтворення.
function applyPlaybackRate(audio, speed) {
  audio.preservesPitch = true;
  audio.mozPreservesPitch = true;      // старий Firefox
  audio.webkitPreservesPitch = true;   // старий WebKit/Safari
  audio.playbackRate = speed;
}

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

    currentSpeed = request.speed || currentSpeed || 1;
    currentAudio = new Audio("data:audio/mp3;base64," + request.data);

    // Застосовуємо швидкість одразу після завантаження метаданих
    currentAudio.onloadedmetadata = () => {
      applyPlaybackRate(currentAudio, currentSpeed);
    };

    currentAudio.onended = () => {
      chrome.runtime.sendMessage({ action: 'audio_ended_internal' });
      currentAudio = null;
    };

    currentAudio.onerror = () => {
      chrome.runtime.sendMessage({ action: 'audio_ended_internal' });
      currentAudio = null;
    };

    currentAudio.play().then(() => {
      // Дублюємо застосування швидкості після старту (деякі браузери скидають її)
      applyPlaybackRate(currentAudio, currentSpeed);
    }).catch(() => { });
  }

  if (request.action === 'stop_audio_now') {
    stopAllAudio();
  }

  if (request.action === 'pause_audio_now') {
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
    }
  }

  if (request.action === 'resume_audio_now') {
    if (currentAudio && currentAudio.paused) {
      currentAudio.play();
    }
  }

  if (request.action === 'set_audio_speed_now') {
    currentSpeed = request.speed || 1;
    if (currentAudio) {
      applyPlaybackRate(currentAudio, currentSpeed);
    }
  }
});