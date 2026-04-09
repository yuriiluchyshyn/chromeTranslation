const i18n = {
  uk: { t: "Налаштування", ui: "Мова розширення:", def: "Мова перекладу за замовчуванням:", btn: "Зберегти", ok: "Збережено!" },
  en: { t: "Settings", ui: "Extension Language:", def: "Default Translation Language:", btn: "Save", ok: "Saved!" }
};

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['googleApiKey', 'uiLang', 'toLang'], (res) => {
    if (res.googleApiKey) document.getElementById('apiKey').value = res.googleApiKey;
    if (res.uiLang) document.getElementById('uiLang').value = res.uiLang;
    if (res.toLang) document.getElementById('defLang').value = res.toLang;
    update(res.uiLang || 'uk');
  });
});

document.getElementById('save').onclick = () => {
  const ui = document.getElementById('uiLang').value;
  chrome.storage.sync.set({
    googleApiKey: document.getElementById('apiKey').value,
    uiLang: ui,
    toLang: document.getElementById('defLang').value
  }, () => {
    update(ui);
    const s = document.getElementById('status');
    s.style.display = 'block';
    setTimeout(() => s.style.display='none', 2000);
  });
};

function update(lang) {
  const t = i18n[lang];
  document.getElementById('title').textContent = t.t;
  document.getElementById('l-ui').textContent = t.ui;
  document.getElementById('l-def').textContent = t.def;
  document.getElementById('save').textContent = t.btn;
  document.getElementById('status').textContent = t.ok;
}