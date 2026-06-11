# 🎙️ VoiceScript — AI-Powered Speech Recognition

> **Transcribe speech in 99+ languages, get AI-generated replies, and hear them spoken back — all in your browser.**
>
> Powered by Groq Whisper (10–20× faster than OpenAI) + Llama 3 for intelligent replies.

![Node.js](https://img.shields.io/badge/Node.js->=18.0.0-green?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-blue)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success)

---

## ✨ Features

### 🎤 Speech-to-Text Transcription
- **Blazing Fast** — Groq Whisper runs 10–20× faster than OpenAI's API
- **99+ Languages** — auto-detects Hindi, Tamil, Telugu, Kannada, and more
- **Multiple Models** — choose speed (turbo) or maximum accuracy (large-v3)
- **Segment Export** — download results as TXT, SRT subtitles, or JSON

### 🤖 AI Voice Reply
- **Real LLM Replies** — Llama 3 (via Groq) generates contextual responses to your transcription
- **Four Tones** — Professional, Friendly, Formal, or Casual
- **Voice Playback** — replies are spoken aloud using the browser's built-in Web Speech API (no extra API keys)
- **Multilingual Output** — voice playback respects your chosen language

### 📤 Export Options
- **TXT** — plain text transcript
- **SRT** — subtitle file for video editors
- **JSON** — full metadata including segments, word count, and timing

### 📱 Upload or Record
- Drag & drop or click to upload
- Record directly from your microphone in the browser
- Supports MP3, MP4, WAV, WebM, OGG, FLAC, M4A (up to 25 MB)

---

## 🚀 Deploy in 5 Minutes

### Prerequisites
- GitHub account
- Vercel account (free tier is enough)
- Groq API key (free at [console.groq.com](https://console.groq.com/keys))

### Step 1 — Get a Groq API Key
1. Visit [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up (free) → **Create API Key**
3. Copy the key — it starts with `gsk_...`

### Step 2 — Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repository
3. Click **Deploy** (no build settings needed)

### Step 3 — Add Environment Variable
In your Vercel project dashboard:
- **Settings → Environment Variables**
- Add `GROQ_API_KEY` = your key from Step 1
- Click **Save** → **Redeploy**

### Step 4 — Done 🎉
Your app is live at `https://your-project.vercel.app`

---

## 🏗️ Project Structure

```
voicescript/
├── public/
│   ├── index.html        # UI — glassmorphism design, fully responsive
│   └── app.js            # Frontend logic — recording, transcription, voice reply
├── api/
│   ├── transcribe.js     # Groq Whisper transcription (multipart/form-data)
│   ├── reply.js          # Llama 3 reply generation via Groq Chat API
│   ├── translate.js      # Audio translation to English
│   └── health.js         # Health check endpoint
├── vercel.json           # Routing config — /api/* and static files
├── package.json
└── .env.example
```

---

## 📖 API Reference

### `POST /api/transcribe`
Transcribe an audio file to text.

**Request** — `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `audio` | File | ✅ | MP3, WAV, WebM, OGG, FLAC, M4A, MP4 |
| `model` | string | — | Default: `whisper-large-v3-turbo` |
| `language` | string | — | BCP-47 code e.g. `en`, `hi`, `ta` |

**Response**
```json
{
  "text": "Hello world...",
  "language": "en",
  "duration": 42.5,
  "segments": [{ "start": 0, "end": 2.4, "text": "Hello world" }],
  "wordCount": 320,
  "processingTime": "1.2s",
  "model": "whisper-large-v3-turbo"
}
```

---

### `POST /api/reply`
Generate an AI reply to transcribed text using Llama 3.

**Request** — `application/json`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `text` | string | ✅ | The transcribed text to reply to |
| `language` | string | `"en"` | Target language for voice playback |
| `tone` | string | `"professional"` | `professional`, `friendly`, `formal`, `casual` |

**Response**
```json
{
  "reply": "Thank you for sharing that...",
  "language": "en",
  "tone": "professional",
  "audio": null,
  "timestamp": "2026-06-10T12:00:00.000Z"
}
```

> Voice playback is handled client-side via the Web Speech API. The `audio` field is `null` by design.

---

### `POST /api/translate`
Transcribe audio and translate to English.

**Request** — same as `/api/transcribe`

**Response**
```json
{
  "text": "English translation...",
  "language": "en",
  "sourceLanguage": "auto",
  "translatedToEnglish": true,
  "wordCount": 150
}
```

---

### `GET /api/health`
```json
{ "status": "ok", "timestamp": "2026-06-10T12:00:00.000Z", "version": "1.0.0" }
```

---

## 🧠 Groq Models

| Model | Speed | Accuracy | Languages | Best For |
|-------|-------|----------|-----------|----------|
| `whisper-large-v3-turbo` | ⚡⚡⚡ | High | 99 | **Default** — fast & accurate |
| `whisper-large-v3` | ⚡⚡ | Highest | 99 | Maximum precision |
| `distil-whisper-large-v3-en` | ⚡⚡⚡⚡ | Good | English only | Ultra-fast English |

---

## 🌍 Supported Languages (sample)

🇺🇸 English · 🇪🇸 Spanish · 🇫🇷 French · 🇩🇪 German · 🇮🇹 Italian · 🇵🇹 Portuguese · 🇷🇺 Russian · 🇯🇵 Japanese · 🇨🇳 Chinese · 🇮🇳 Hindi / Tamil / Telugu / Kannada · 🇰🇷 Korean · 🇹🇭 Thai · 🇻🇳 Vietnamese — and 85+ more.

---

## 💻 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML / CSS / JavaScript |
| Backend | Vercel Serverless Functions (Node.js 18+) |
| Transcription | Groq Whisper API |
| AI Reply | Groq Chat API — Llama 3 8B |
| Voice Playback | Browser Web Speech API |
| Hosting | Vercel (free tier) |

---

## 💰 Cost

| Service | Cost |
|---------|------|
| Vercel Hosting | Free |
| Groq API (Whisper + Llama 3) | Free (daily limits apply) |
| **Total** | **Free** |

---

## 🛠️ Local Development

```bash
# Clone
git clone https://github.com/AkashMs24/speechflow.git
cd speechflow

# Install dependencies
npm install

# Install Vercel CLI
npm install -g vercel

# Set up environment
cp .env.example .env
# Add GROQ_API_KEY=your_key to .env

# Run locally
vercel dev
# → http://localhost:3000
```

---

## 🐛 Troubleshooting

**"GROQ_API_KEY not configured"**
Add `GROQ_API_KEY` in Vercel → Settings → Environment Variables, then redeploy.

**Microphone access denied**
Allow microphone permission for your domain in browser settings, then refresh.

**Voice reply button does nothing**
Your browser may not support the Web Speech API. Try Chrome or Edge — both have full support. Safari works on macOS/iOS too.

**File too large (> 25 MB)**
Compress or trim the audio before uploading. Groq's hard limit is 25 MB per request.

**Slow transcription**
Switch to `distil-whisper-large-v3-en` for English-only audio — it's the fastest model available.

---

## 📊 Performance

| Audio Length | Transcription Time |
|---|---|
| 1 minute | ~2–3 seconds |
| 10 minutes | ~15–20 seconds |
| 60 minutes | ~3–5 minutes |

Accuracy: 95%+ English · 90%+ European languages · 85%+ Asian languages

---

## 🔐 Security & Privacy

- Audio files are sent directly to Groq and never stored on the server
- All traffic is HTTPS-only
- API keys are stored as Vercel environment secrets — never exposed to the client
- Microphone access is browser-controlled — the app cannot record without your permission
- Zero analytics or user tracking

---

## 🗺️ Roadmap

- [ ] Real-time streaming transcription
- [ ] Speaker diarization (identify multiple speakers)
- [ ] Custom vocabulary / hotwords
- [ ] Batch processing API
- [ ] History with local storage
- [ ] Video subtitle generation

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 👨‍💻 Author

**AKASH M S**
GitHub: [@AkashMs24](https://github.com/AkashMs24) · Email: manigarakash@gmail.com

---

*Made with ❤️ · Powered by Groq*
