# PurvaLuhar-event-talks-app

A sleek, dark-mode web application that fetches live **BigQuery Release Notes** from the Google Cloud feed and lets you browse and **tweet about any update** directly.

Built with **Python Flask** + vanilla HTML, CSS, and JavaScript.

## Features

- 📡 Fetches live BigQuery release notes from the Google Cloud Atom feed
- 🔄 Refresh button with animated spinner
- 🃏 Card-based UI with glassmorphism design
- ✅ Click any card to select it
- 🐦 Tweet any update via Twitter Web Intent (no API key needed)
- ✏️ Editable tweet composer with 280-char counter
- ⌨️ Keyboard shortcuts: `R` to refresh, `Esc` to close modal

## Tech Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Backend  | Python 3, Flask, requests   |
| Frontend | Vanilla HTML, CSS, JS       |
| Feed     | Google Cloud Atom/RSS XML   |
| Fonts    | Inter + JetBrains Mono      |

## Getting Started

```bash
# Install dependencies
pip install flask requests

# Run the app
python app.py
```


## Project Structure

```
├── app.py               # Flask backend — fetches & parses XML feed
├── requirements.txt     # Python dependencies
├── templates/
│   └── index.html       # Main page template
└── static/
    ├── style.css        # Dark glassmorphism design system
    └── app.js           # Fetch, render, tweet modal logic
```
