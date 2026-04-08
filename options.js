// Завантажуємо збережений ключ при відкритті сторінки
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['googleApiKey'], (result) => {
    if (result.googleApiKey) {
      document.getElementById('apiKey').value = result.googleApiKey;
    }
  });
});

// Зберігаємо ключ
document.getElementById('save').addEventListener('click', () => {
  const key = document.getElementById('apiKey').value;
  
  chrome.storage.sync.set({ googleApiKey: key }, () => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
});