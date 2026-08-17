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

// Декодує base64 у Uint8Array.
function base64ToBytes(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Обгортає сирий PCM (16-bit mono) у WAV-контейнер і повертає Blob.
function pcmToWavBlob(pcmBytes, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const dataLength = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);      // розмір fmt-блоку
  view.setUint16(20, 1, true);       // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);
  new Uint8Array(buffer, 44).set(pcmBytes);
  return new Blob([buffer], { type: 'audio/wav' });
}

chrome.runtime.onMessage.addListener((request) => {
  const stopAllAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      if (currentAudio._objectUrl) { URL.revokeObjectURL(currentAudio._objectUrl); }
      currentAudio.src = "";
      currentAudio.load();
      currentAudio = null;
      // Надсилаємо сигнал, що звук припинено, щоб зняти підсвітку іконок
      chrome.runtime.sendMessage({ action: 'audio_ended_internal' });
    }
  };

  // Відтворення сирого PCM від Gemini TTS (конвертуємо у WAV)
  if (request.action === 'play_audio_pcm') {
    stopAllAudio();

    currentSpeed = request.speed || currentSpeed || 1;
    const blob = pcmToWavBlob(base64ToBytes(request.data), request.sampleRate || 24000);
    const objectUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(objectUrl);
    currentAudio._objectUrl = objectUrl;

    currentAudio.onloadedmetadata = () => applyPlaybackRate(currentAudio, currentSpeed);

    const cleanup = () => {
      chrome.runtime.sendMessage({ action: 'audio_ended_internal' });
      if (currentAudio && currentAudio._objectUrl) URL.revokeObjectURL(currentAudio._objectUrl);
      currentAudio = null;
    };
    currentAudio.onended = cleanup;
    currentAudio.onerror = cleanup;

    currentAudio.play()
      .then(() => applyPlaybackRate(currentAudio, currentSpeed))
      .catch(() => { });
    return;
  }

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