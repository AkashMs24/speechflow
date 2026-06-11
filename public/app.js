// SpeechFlow - Production-Grade Speech Recognition & Voice Reply
// ============================================================

class SpeechFlow {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.currentTranscription = null;
        this.isRecording = false;
        this.isProcessing = false;
        this.voiceReplyText = null;

        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.audioInput = document.getElementById('audioInput');
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.transcribeBtn = document.getElementById('transcribeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.modelSelect = document.getElementById('modelSelect');
        this.languageSelect = document.getElementById('languageSelect');
        this.transcriptOutput = document.getElementById('transcriptOutput');
        this.wordCount = document.getElementById('wordCount');
        this.duration = document.getElementById('duration');
        this.processingTime = document.getElementById('processingTime');
        this.detectedLanguage = document.getElementById('detectedLanguage');
        this.progressFill = document.getElementById('progressFill');
        this.exportTxt = document.getElementById('exportTxt');
        this.exportSrt = document.getElementById('exportSrt');
        this.exportJson = document.getElementById('exportJson');
        this.segmentsList = document.getElementById('segmentsList');
        this.segmentsSection = document.getElementById('segmentsSection');
        this.replyLanguage = document.getElementById('replyLanguage');
        this.replyTone = document.getElementById('replyTone');
        this.generateReplyBtn = document.getElementById('generateReplyBtn');
        this.replyOutput = document.getElementById('replyOutput');
        this.playReplyBtn = document.getElementById('playReplyBtn');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.recordingTime = document.getElementById('recordingTime');
    }

    attachEventListeners() {
        this.uploadArea.addEventListener('click', () => this.audioInput.click());
        this.uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); this.uploadArea.classList.add('active'); });
        this.uploadArea.addEventListener('dragleave', () => this.uploadArea.classList.remove('active'));
        this.uploadArea.addEventListener('drop', (e) => { e.preventDefault(); this.uploadArea.classList.remove('active'); if (e.dataTransfer.files[0]) this.processFile(e.dataTransfer.files[0]); });
        this.audioInput.addEventListener('change', (e) => { if (e.target.files[0]) this.processFile(e.target.files[0]); });
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.transcribeBtn.addEventListener('click', () => this.transcribe());
        this.clearBtn.addEventListener('click', () => this.clear());
        this.exportTxt.addEventListener('click', () => this.exportAsText());
        this.exportSrt.addEventListener('click', () => this.exportAsSRT());
        this.exportJson.addEventListener('click', () => this.exportAsJSON());
        this.generateReplyBtn.addEventListener('click', () => this.generateVoiceReply());
        this.playReplyBtn.addEventListener('click', () => this.playVoiceReply());
    }

    // ============= File Handling =============
    processFile(file) {
        if (file.size > 25 * 1024 * 1024) { this.showToast('File too large! Max 25MB', 'error'); return; }
        this.audioFile = file;
        this.uploadArea.classList.add('active');
        this.transcribeBtn.disabled = false;
        this.showToast(`📁 ${file.name} loaded (${this.formatFileSize(file.size)})`, 'info');
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + ['Bytes','KB','MB'][i];
    }

    // ============= Recording =============
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Pick the best supported MIME type
            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
                t => MediaRecorder.isTypeSupported(t)
            ) || '';

            this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            this.audioChunks = [];
            this.isRecording = true;

            this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data); };

            this.mediaRecorder.onstop = () => {
                const type = this.mediaRecorder.mimeType || 'audio/webm';
                this.audioFile = new Blob(this.audioChunks, { type });
                this.transcribeBtn.disabled = false;
            };

            this.mediaRecorder.start(250);
            this.recordBtn.classList.add('hidden');
            this.stopBtn.classList.remove('hidden');
            this.recordingIndicator.classList.add('active');
            this.startRecordingTimer();
            this.showToast('🎙️ Recording started...', 'info');
        } catch (err) {
            this.showToast('Microphone access denied!', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
            this.isRecording = false;
            this.stopRecordingTimer();
            this.recordBtn.classList.remove('hidden');
            this.stopBtn.classList.add('hidden');
            this.recordingIndicator.classList.remove('active');
            this.showToast('✅ Recording stopped', 'success');
        }
    }

    startRecordingTimer() {
        let s = 0;
        this.recordingTimer = setInterval(() => {
            s++;
            const m = Math.floor(s / 60), sec = s % 60;
            this.recordingTime.textContent = `Recording: ${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        }, 1000);
    }

    stopRecordingTimer() { if (this.recordingTimer) clearInterval(this.recordingTimer); }

    // ============= Transcription =============
    async transcribe() {
        if (!this.audioFile) { this.showToast('Please upload or record audio first', 'error'); return; }

        this.isProcessing = true;
        this.transcribeBtn.disabled = true;
        this.showProgress();

        // Determine correct file extension from MIME type
        const mime = this.audioFile.type || 'audio/webm';
        const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : mime.includes('wav') ? 'wav' : 'webm';

        const formData = new FormData();
        formData.append('audio', this.audioFile, `audio.${ext}`);
        formData.append('model', this.modelSelect.value);           // ← always send selected model
        if (this.languageSelect.value) {
            formData.append('language', this.languageSelect.value); // ← always send selected language
        }

        try {
            const startTime = Date.now();
            const response = await fetch('/api/transcribe', { method: 'POST', body: formData });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Transcription failed');
            }

            const result = await response.json();
            this.currentTranscription = result;
            this.displayTranscription(result);
            this.updateStats(result, Date.now() - startTime);
            this.showProgress(100);
            this.exportTxt.disabled = false;
            this.exportSrt.disabled = false;
            this.exportJson.disabled = false;
            this.generateReplyBtn.disabled = false;
            this.showToast('✨ Transcription complete!', 'success');
        } catch (err) {
            this.showToast(`Error: ${err.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.transcribeBtn.disabled = false;
        }
    }

    displayTranscription(result) {
        this.transcriptOutput.classList.remove('empty');
        this.transcriptOutput.textContent = result.text;
        this.detectedLanguage.textContent = result.language ? result.language.toUpperCase() : 'Unknown';

        if (result.segments && result.segments.length > 0) {
            this.segmentsSection.classList.remove('hidden');
            this.segmentsList.innerHTML = result.segments.map(seg => `
                <div class="segment" onclick="app.seekToSegment(${seg.start})">
                    <div class="segment-time">${this.formatTime(seg.start)} → ${this.formatTime(seg.end)}</div>
                    <div class="segment-text">${seg.text}</div>
                </div>
            `).join('');
        }
    }

    updateStats(result, processingMs) {
        this.wordCount.textContent = result.text.split(/\s+/).filter(w => w).length;
        this.duration.textContent = (result.duration ? Math.round(result.duration * 10) / 10 : 0) + 's';
        this.processingTime.textContent = (processingMs / 1000).toFixed(1) + 's';
    }

    formatTime(s) {
        return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    }

    // ============= Voice Reply =============
    async generateVoiceReply() {
        if (!this.currentTranscription) { this.showToast('Please transcribe audio first', 'error'); return; }

        this.generateReplyBtn.disabled = true;
        this.showToast('🤖 Generating AI reply...', 'info');

        try {
            const response = await fetch('/api/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: this.currentTranscription.text,
                    language: this.replyLanguage.value,   // ← sends selected reply language
                    tone: this.replyTone.value
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Reply generation failed');
            }

            const result = await response.json();
            this.displayVoiceReply(result);
            this.showToast('🎧 Reply ready! Click Play to hear it.', 'success');
        } catch (err) {
            this.showToast(`Error: ${err.message}`, 'error');
        } finally {
            this.generateReplyBtn.disabled = false;
        }
    }

    displayVoiceReply(result) {
        this.replyOutput.classList.remove('empty');
        this.replyOutput.innerHTML = `<p>${result.reply}</p>`;
        this.voiceReplyText = result.reply;       // stored for Web Speech API
        this.voiceReplyLang = result.language;    // stored for correct voice selection
        this.playReplyBtn.style.display = 'inline-flex';
    }

    playVoiceReply() {
        if (!this.voiceReplyText) return;

        window.speechSynthesis.cancel(); // stop any previous speech

        const utterance = new SpeechSynthesisUtterance(this.voiceReplyText);

        // Full BCP-47 map so the browser picks a matching voice
        const langMap = {
            en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
            it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', ja: 'ja-JP',
            zh: 'zh-CN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN'
        };
        utterance.lang = langMap[this.voiceReplyLang] || langMap[this.replyLanguage?.value] || 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to find a voice that matches the language exactly
        const voices = window.speechSynthesis.getVoices();
        const matched = voices.find(v => v.lang === utterance.lang)
            || voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
        if (matched) utterance.voice = matched;

        this.playReplyBtn.textContent = '🔊 Speaking...';
        this.playReplyBtn.disabled = true;

        utterance.onend = () => { this.playReplyBtn.textContent = '🔊 Play Reply'; this.playReplyBtn.disabled = false; };
        utterance.onerror = () => {
            this.playReplyBtn.textContent = '🔊 Play Reply';
            this.playReplyBtn.disabled = false;
            this.showToast('Voice not supported in this browser for this language', 'error');
        };

        window.speechSynthesis.speak(utterance);
    }

    // ============= Export =============
    _download(content, filename, type) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type }));
        a.download = filename;
        a.click();
    }

    exportAsText() {
        if (!this.currentTranscription) return;
        this._download(this.currentTranscription.text, 'transcript.txt', 'text/plain');
        this.showToast('📄 Downloaded as TXT', 'success');
    }

    exportAsSRT() {
        if (!this.currentTranscription?.segments) { this.showToast('No segments available', 'error'); return; }
        const srt = this.currentTranscription.segments.map((seg, i) =>
            `${i+1}\n${this.formatSRTTime(seg.start)} --> ${this.formatSRTTime(seg.end)}\n${seg.text}\n`
        ).join('\n');
        this._download(srt, 'subtitles.srt', 'text/plain');
        this.showToast('🎬 Downloaded as SRT', 'success');
    }

    formatSRTTime(s) {
        const d = new Date(s * 1000);
        return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map(n => String(n).padStart(2,'0')).join(':')
            + ',' + String(d.getUTCMilliseconds()).padStart(3,'0');
    }

    exportAsJSON() {
        if (!this.currentTranscription) return;
        this._download(JSON.stringify(this.currentTranscription, null, 2), 'transcript.json', 'application/json');
        this.showToast('📊 Downloaded as JSON', 'success');
    }

    // ============= UI Helpers =============
    clear() {
        window.speechSynthesis.cancel();
        this.audioFile = null;
        this.currentTranscription = null;
        this.voiceReplyText = null;
        this.voiceReplyLang = null;
        this.audioChunks = [];
        this.audioInput.value = '';
        this.uploadArea.classList.remove('active');
        this.transcriptOutput.classList.add('empty');
        this.transcriptOutput.textContent = 'Your transcription will appear here...';
        this.segmentsSection.classList.add('hidden');
        this.segmentsList.innerHTML = '';
        this.wordCount.textContent = '0';
        this.duration.textContent = '0s';
        this.processingTime.textContent = '0s';
        this.detectedLanguage.textContent = '-';
        this.replyOutput.classList.add('empty');
        this.replyOutput.textContent = 'Generated reply and audio will appear here...';
        this.playReplyBtn.style.display = 'none';
        this.playReplyBtn.textContent = '🔊 Play Reply';
        this.playReplyBtn.disabled = false;
        this.transcribeBtn.disabled = true;
        this.exportTxt.disabled = true;
        this.exportSrt.disabled = true;
        this.exportJson.disabled = true;
        this.generateReplyBtn.disabled = true;
        this.showToast('🗑️ Cleared all data', 'info');
    }

    showProgress(percent = 0) {
        this.progressFill.style.width = percent + '%';
        if (percent === 0) setTimeout(() => this.progressFill.style.width = '40%', 100);
    }

    showToast(message, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(t);
        setTimeout(() => { t.style.animation = 'slideIn 0.3s ease-out reverse'; setTimeout(() => t.remove(), 300); }, 3000);
    }

    seekToSegment(time) { this.showToast(`⏱️ Seeking to ${this.formatTime(time)}`, 'info'); }
}

let app;
document.addEventListener('DOMContentLoaded', () => { app = new SpeechFlow(); });
window.addEventListener('beforeunload', (e) => { if (app?.currentTranscription) { e.preventDefault(); e.returnValue = ''; } });
