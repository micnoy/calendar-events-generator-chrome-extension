document.addEventListener('DOMContentLoaded', init);

let currentMode = 'text';

async function init() {
  const { openaiApiKey } = await chrome.storage.local.get('openaiApiKey');
  if (!openaiApiKey) {
    document.getElementById('api-key-warning').classList.remove('hidden');
  }

  // Set default datetime picker value to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('datetime-picker').value = now.toISOString().slice(0, 16);

  // Load default timezone into picker
  const { defaultTimezone } = await chrome.storage.local.get('defaultTimezone');
  if (defaultTimezone) {
    const tzSelect = document.getElementById('timezone-select');
    if (tzSelect.querySelector(`option[value="${defaultTimezone}"]`)) {
      tzSelect.value = defaultTimezone;
    }
  }

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  // Settings
  document.getElementById('open-settings-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'settings.html' });
  });
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
  });

  // Generate & Copy
  document.getElementById('generate-btn').addEventListener('click', handleGenerate);
  document.getElementById('copy-btn').addEventListener('click', handleCopy);
}

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.getElementById('text-mode').classList.toggle('hidden', mode !== 'text');
  document.getElementById('picker-mode').classList.toggle('hidden', mode !== 'picker');
}

async function handleGenerate() {
  const eventName = document.getElementById('event-name-input').value.trim();
  const generateBtn = document.getElementById('generate-btn');
  const resultArea = document.getElementById('result-area');

  resultArea.classList.add('hidden');

  let parsed;

  if (currentMode === 'text') {
    const dateInput = document.getElementById('date-input').value.trim();
    if (!dateInput) {
      showStatus('Please enter a date/time.', 'error');
      return;
    }

    const { openaiApiKey } = await chrome.storage.local.get('openaiApiKey');
    if (!openaiApiKey) {
      showStatus('No API key found. Please configure it in Settings.', 'error');
      return;
    }

    showStatus('Parsing date with AI...', 'loading');
    generateBtn.disabled = true;

    try {
      parsed = await parseDateWithOpenAI(openaiApiKey, dateInput);
    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
      generateBtn.disabled = false;
      return;
    }

    generateBtn.disabled = false;
  } else {
    const datetimeValue = document.getElementById('datetime-picker').value;
    if (!datetimeValue) {
      showStatus('Please select a date and time.', 'error');
      return;
    }

    const timezone = document.getElementById('timezone-select').value;
    const duration = parseFloat(document.getElementById('duration-input').value) || 1;

    const startDate = datetimeValue.replace(/[-:]/g, '').replace('T', 'T');
    // startDate is like "20260221T1430" — pad seconds
    const startFormatted = startDate.length === 13 ? startDate + '00' : startDate;

    // Calculate end time
    const startDt = new Date(datetimeValue);
    startDt.setMinutes(startDt.getMinutes() + duration * 60);
    const endIso = startDt.toISOString().slice(0, 16);
    const endDate = endIso.replace(/[-:]/g, '').replace('T', 'T');
    const endFormatted = endDate.length === 13 ? endDate + '00' : endDate;

    parsed = {
      startDate: startFormatted,
      endDate: endFormatted,
      timezone: timezone,
      allDay: false,
    };
  }

  const calendarUrl = buildGoogleCalendarUrl(parsed, eventName);
  const resultLink = document.getElementById('result-link');
  resultLink.href = calendarUrl;
  resultArea.classList.remove('hidden');
  showStatus('Link generated!', 'success');

  chrome.tabs.create({ url: calendarUrl });
}

async function parseDateWithOpenAI(apiKey, naturalDateString) {
  const { openaiModel, defaultTimezone } = await chrome.storage.local.get([
    'openaiModel',
    'defaultTimezone',
  ]);
  const model = openaiModel || 'gpt-4o-mini';
  const tz = defaultTimezone || 'Asia/Jerusalem';

  const today = new Date();
  const currentDateInfo = today.toISOString();
  const currentDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

  const systemPrompt = `You are a date/time parsing assistant. The current date and time is ${currentDateInfo} (${currentDayOfWeek}).

Parse the user's natural language date/time string into a structured JSON object. Return ONLY valid JSON with these exact fields:

{
  "startDate": "YYYYMMDDTHHmmss",
  "endDate": "YYYYMMDDTHHmmss",
  "timezone": "IANA timezone string",
  "allDay": false
}

Rules:
- If no end time is specified, default to 1 hour after the start time.
- If no timezone is mentioned, use "${tz}" as the default.
- If the input specifies a timezone abbreviation (EST, PST, CST, GMT, UTC, IST, etc.), convert it to a valid IANA timezone name (e.g., EST -> America/New_York, PST -> America/Los_Angeles, CST -> America/Chicago, GMT/UTC -> Etc/UTC, CET -> Europe/Berlin, IST -> Asia/Jerusalem, JST -> Asia/Tokyo).
- If the event is all-day (no time component given, e.g. "next Tuesday"), set allDay to true and use format "YYYYMMDD" for both startDate and endDate. For all-day events, endDate should be the day AFTER the event (Google Calendar convention).
- Use 24-hour time format in the output.
- Resolve relative dates like "next Tuesday", "tomorrow", "in 3 days" relative to the current date provided above.
- Return ONLY the JSON object, no markdown fences, no explanation.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: naturalDateString },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your key in Settings.');
    }
    if (response.status === 429) {
      throw new Error('Rate limited. Please wait a moment and try again.');
    }
    throw new Error(errBody.error?.message || `API error (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from AI. Please try rephrasing.');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Could not parse AI response. Please try rephrasing.');
  }

  if (!parsed.startDate || !parsed.endDate || !parsed.timezone) {
    throw new Error('Incomplete date parsing result. Please try rephrasing.');
  }

  return parsed;
}

function buildGoogleCalendarUrl(parsed, eventName) {
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', eventName || 'New Event');
  params.set('dates', `${parsed.startDate}/${parsed.endDate}`);

  if (!parsed.allDay) {
    params.set('ctz', parsed.timezone);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function handleCopy() {
  const link = document.getElementById('result-link').href;
  try {
    await navigator.clipboard.writeText(link);
    showStatus('Link copied to clipboard!', 'success');
  } catch {
    showStatus('Failed to copy. Please copy the link manually.', 'error');
  }
}

function showStatus(message, type) {
  const el = document.getElementById('status-message');
  el.textContent = message;
  el.className = `status ${type}`;
  el.classList.remove('hidden');
}
