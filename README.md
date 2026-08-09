# AI-Take-Notes 🚀
### Real-Time AI Meeting & Interview Copilot for Google Chrome

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)
![License](https://img.shields.io/badge/License-MIT-orange.svg)
![OpenRouter Supported](https://img.shields.io/badge/OpenRouter-Models-purple.svg)
![Deepgram STT](https://img.shields.io/badge/Deepgram-STT-cyan.svg)

**AI-Take-Notes** is an intelligent, privacy-focused Chrome Extension that acts as your live co-pilot during video meetings, technical interviews, sales calls, and lectures. It captures tab audio, transcribes conversation in real time, grounds responses using your uploaded knowledge base documents, and generates contextual cues, comprehensive summaries, and smart follow-up questions.

---

## ✨ Key Features

### 🎯 1. Real-Time Meeting & Interview Cues
* **Instant AI Guidance**: Automatically detects incoming questions and complex topics during live meetings and displays suggested answers or key talking points.
* **On-Screen Floating Overlay**: Toggle a minimal floating PiP overlay over Google Meet, Zoom, or Teams so you never lose eye contact with your interviewers.

### 📝 2. Crisp Live Transcription & Speaker Recognition
* Powered by **Deepgram Nova-2 STT** for high-accuracy, low-latency speech recognition.
* Separates speaker lines ("YOU" vs "Interviewer/Speaker") with line merging and deduplication.

### 📂 3. Knowledge Base Grounding (Up to 10 Files)
* Upload resumes, job descriptions, project documentation, or meeting agendas (`.txt`, `.md`, `.docx`, `.rtf`, `.pdf`).
* AI responses are strictly grounded in your provided context to prevent hallucinations.

### 🎙️ 4. Transcript Import (Audio & Text Files)
* Import previous text transcripts (`.txt`, `.json`, `.srt`, `.vtt`) directly into the side panel.
* Upload audio files (`.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg`) for automatic transcription and analysis.

### 📄 5. Export Transcripts (PDF & TXT)
* Export live or imported meeting transcripts into clean, formatted **.txt** or **.pdf** files with timestamps and speaker tags.

### 🎭 6. Custom System Prompts & Personas
* Select from specialized AI personas (**Executive Assistant**, **Technical Interviewer**, **Sales Lead**, **Academic Note-Taker**, or **Custom**).
* Generate comprehensive summaries complete with **Key Takeaways**, **Action Items**, and **Executive Summaries** powered by your chosen OpenRouter AI model.

### 💡 7. Copilot Question Suggestions
* Real-time AI copilot analyzes ongoing transcriptions or imported files to suggest 3-5 intelligent, context-aware follow-up questions.
* Click any suggested question chip to generate an instant response cue!

---

## 🛠️ Supported Meeting Platforms

* 🟢 **Google Meet** (`meet.google.com`)
* 🔵 **Zoom** (`zoom.us`)
* 🟣 **Microsoft Teams** (`teams.microsoft.com` & `teams.live.com`)
* 🔷 **Cisco Webex**, **GoToMeeting**, **Skype**, **Jitsi Meet**, **Chime**, **BlueJeans**, **Whereby**, **Gather Town**, **Riverside.fm**, and more!

---

## 📥 Installation Guide

### Option 1: Load Unpacked Extension (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/IamJesssie/AI-Take-Notes.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the root directory of this repository (`AI-Take-Notes`).
5. Pin **AI-Take-Notes** to your Chrome toolbar.

---

## ⚙️ Configuration & Setup

1. Click the **AI-Take-Notes** icon in your toolbar to open the Chrome Side Panel.
2. Go to the **Settings** tab.
3. Enter your API Keys:
   * **Deepgram API Key** *(Required for real-time speech-to-text)*: Get a free key at [deepgram.com](https://deepgram.com).
   * **OpenRouter API Key** *(Required for AI cues & summaries)*: Get a key at [openrouter.ai](https://openrouter.ai).
   * **OpenRouter Model**: Set your preferred model (e.g. `google/gemini-2.0-flash-lite-preview-02-05:free` or `anthropic/claude-3.5-sonnet`).

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut | Description |
| :--- | :--- | :--- |
| **Start Session** | <kbd>Alt</kbd> + <kbd>S</kbd> | Start tab audio capture and transcription on current meeting tab |
| **Pause / Resume** | <kbd>Alt</kbd> + <kbd>P</kbd> | Pause or resume real-time audio capture and cue generation |

*(Shortcuts can be customized in Chrome via `chrome://extensions/shortcuts`)*

---

## 📂 Project Architecture

```
AI-Take-Notes/
├── manifest.json         # Extension Manifest V3 configuration
├── sidepanel.html        # Main side panel UI (Tabs: Cues, Knowledge, Settings)
├── sidepanel.js          # Main display client & UI controller
├── sidepanel.css         # Modern, dark/light theme CSS styling
├── background.js         # Service worker & tab capture coordinator
├── offscreen.html        # Offscreen document host
├── offscreen.js          # Audio processor, Deepgram WebSocket & OpenRouter client
├── content-overlay.js    # Floating PiP overlay injection for meeting tabs
├── content-overlay.css   # Styling for floating overlay UI
├── lib/
│   ├── file-reader.js    # Document text extractor (.txt, .md, .docx, .rtf, .pdf)
│   ├── pdf.min.js        # PDF parser engine
│   ├── pdf.worker.min.js # PDF worker script
│   └── knowledge-sync.js # Cloud/local knowledge base synchronizer
└── logo/                 # Application icons and branding assets
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more details.

---

## 🔗 Repository & Contributing

* **GitHub Repository**: [https://github.com/IamJesssie/AI-Take-Notes](https://github.com/IamJesssie/AI-Take-Notes)
* Issues, feature requests, and pull requests are welcome!
