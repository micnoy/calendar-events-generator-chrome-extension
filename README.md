# Calendar Event Link Generator

A Chrome extension that generates Google Calendar event links from natural language dates or a date/time picker.

## Features

- **Natural Language Input** — Type dates like "next Tuesday at 3pm EST" or "tomorrow at noon" and have them parsed by OpenAI
- **Date/Time Picker** — Use a standard date picker with timezone selection (no API call needed)
- **Google Calendar Integration** — Generates and opens a pre-filled Google Calendar event link
- **Configurable** — Choose your OpenAI model, default timezone, and store your API key locally

## Setup

1. Clone this repo
2. Go to `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder
5. Click the extension icon → **Settings** → enter your OpenAI API key

## Usage

1. Click the extension icon in your toolbar
2. Choose an input mode:
   - **Natural Language** — type a date/time description (e.g. "March 15 at 10am PST", "next Friday", "in 3 hours")
   - **Date Picker** — select a date, time, duration, and timezone
3. Optionally enter an event/meeting name
4. Click **Generate Link** — Google Calendar opens with the event pre-filled

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| OpenAI API Key | — | Required for natural language mode |
| Model | gpt-4o-mini | OpenAI model used for date parsing |
| Default Timezone | Asia/Jerusalem | Used when no timezone is specified |

Your API key is stored locally on your device only (`chrome.storage.local`) and is never sent anywhere except the OpenAI API.

## Permissions

- `storage` — Save your API key and preferences locally
