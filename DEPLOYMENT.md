# SpeechFlow - Deployment Guide

## Quick Deploy to Vercel (5 minutes)

### Step 1: Get Groq API Key
1. Visit [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up (free) or login
3. Click **Create API Key**
4. Copy your key (looks like `gsk_xxxx...`)

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **Add New → Project**
3. Select **Import Git Repository**
4. Paste: `https://github.com/AkashMs24/speechflow`
5. Click **Import**
6. Leave all settings as default
7. Click **Deploy**

### Step 3: Add Environment Variables
1. After deployment, go to **Settings → Environment Variables**
2. Add these variables:
   - `GROQ_API_KEY` = your key from Step 1
   - `GOOGLE_TTS_API_KEY` = (optional, for Google Text-to-Speech)
3. Click **Save**
4. Go to **Deployments** tab
5. Click the three dots on latest deployment → **Redeploy**

### Step 4: Done! 🎉
Your app is now live at `https://your-project.vercel.app`

---

## Features Included

✅ **Speech-to-Text Transcription**
- Powered by Groq Whisper API (10-20x faster than OpenAI)
- Supports 99+ languages
- Auto language detection
- Word-level timestamps

✅ **Export Options**
- Download as `.txt` (plain text)
- Download as `.srt` (subtitle format)
- Download as `.json` (structured data)

✅ **AI Voice Reply**
- Generate contextual responses
- Reply in any language
- Multiple tone options (Professional, Friendly, Formal, Casual)
- Voice output (requires Google TTS API key)

✅ **Production-Grade UI**
- Modern gradient design
- Smooth animations
- Responsive mobile layout
- Real-time progress indicators
- Toast notifications

---

## API Endpoints

### POST /api/transcribe
Transcribe audio to text.

**Request:**
```
Form Data:
- audio: File (required, max 25MB)
- model: 'whisper-large-v3-turbo' | 'whisper-large-v3' | 'distil-whisper-large-v3-en'
- language: ISO code (optional, e.g., 'en', 'hi', 'es')
```

**Response:**
```json
{
  "text": "Hello world...",
  "language": "en",
  "duration": 42.5,
  "segments": [{"start": 0, "end": 2.4, "text": "Hello world"}],
  "wordCount": 320,
  "processingTime": "1.2s",
  "model": "whisper-large-v3-turbo"
}
```

### POST /api/translate
Transcribe and translate audio to English.

**Request:**
```
Form Data:
- audio: File (required, max 25MB)
```

**Response:**
```json
{
  "text": "English translation...",
  "language": "en",
  "sourceLanguage": "auto",
  "translatedToEnglish": true,
  "segments": [...],
  "wordCount": 150
}
```

### POST /api/reply
Generate AI reply with optional voice output.

**Request:**
```json
{
  "text": "Your question or statement",
  "language": "en",
  "tone": "professional" | "friendly" | "formal" | "casual"
}
```

**Response:**
```json
{
  "reply": "Generated response text...",
  "language": "en",
  "tone": "professional",
  "audio": "base64_encoded_mp3_optional"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-10T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Supported Audio Formats
`mp3` · `mp4` · `wav` · `webm` · `ogg` · `flac` · `m4a` · up to **25MB**

---

## Groq Models Comparison

| Model | Speed | Accuracy | Languages | Best For |
|-------|-------|----------|-----------|----------|
| `whisper-large-v3-turbo` | ⚡⚡⚡ | High | 99 | **Default - Fast & Accurate** |
| `whisper-large-v3` | ⚡⚡ | Highest | 99 | Precise transcription |
| `distil-whisper-large-v3-en` | ⚡⚡⚡⚡ | Good | English only | English-only, ultra-fast |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla HTML/CSS/JS (no dependencies) |
| **Backend** | Vercel Serverless Functions (Node.js) |
| **AI Model** | Groq Whisper API |
| **Hosting** | Vercel (free tier) |
| **TTS** | Google Cloud Text-to-Speech (optional) |

---

## Pricing

- **Vercel Hosting**: Free tier (generous limits)
- **Groq API**: Free (daily limits apply, check console.groq.com)
- **Google TTS**: Pay-as-you-go ($0.000004/char, optional)
- **Total Cost**: **$0 - Can be completely free!**

---

## Troubleshooting

### "GROQ_API_KEY not configured"
1. Go to Vercel project Settings
2. Add `GROQ_API_KEY` environment variable
3. Redeploy

### "Microphone access denied"
- Browser blocked microphone access
- Go to browser settings → microphone permissions
- Allow microphone for your Vercel domain

### "File too large (>25MB)"
- Audio files limited to 25MB by Groq API
- Compress audio before uploading

### Slow transcription
- Try `distil-whisper-large-v3-en` for English-only
- Shorter audio files process faster
- Check Vercel logs for API rate limits

---

## License
MIT - Free to use and modify!

---

## Support
Having issues? Check:
1. [Groq Docs](https://console.groq.com/docs)
2. [Vercel Docs](https://vercel.com/docs)
3. Repository Issues
