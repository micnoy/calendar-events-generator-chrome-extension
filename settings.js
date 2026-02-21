document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key-input');
  const modelSelect = document.getElementById('model-select');
  const defaultTzInput = document.getElementById('default-tz-input');
  const saveBtn = document.getElementById('save-btn');

  // Load existing settings
  const settings = await chrome.storage.local.get([
    'openaiApiKey',
    'openaiModel',
    'defaultTimezone',
  ]);

  if (settings.openaiApiKey) {
    apiKeyInput.value = settings.openaiApiKey;
  }
  if (settings.openaiModel) {
    modelSelect.value = settings.openaiModel;
  }
  defaultTzInput.value = settings.defaultTimezone || 'Asia/Jerusalem';

  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('API key cannot be empty.', 'error');
      return;
    }

    await chrome.storage.local.set({
      openaiApiKey: apiKey,
      openaiModel: modelSelect.value,
      defaultTimezone: defaultTzInput.value.trim() || 'Asia/Jerusalem',
    });

    showStatus('Settings saved!', 'success');
  });

  function showStatus(message, type) {
    const el = document.getElementById('status-message');
    el.textContent = message;
    el.className = `status ${type}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
  }
});
