// SpeechFlow — AI Speech Recognition & Voice Reply
// ==================================================

class SpeechFlow {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingTimer = null;
        this.currentTranscription = null;
        this.isRecording = false;
        this.voiceReplyText = null;
        this.voiceReplyLang = null;

        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.uploadArea       = document.getElementById('uploadArea');
        this.audioInput       = document.getElementById('audioInput');
        this.recordBtn        = document.getElementById('recordBtn');
        this.stopBtn          = document.getElementById('stopBtn');
        this.transcribeBtn    = document.getElementById('transcribeBtn');
        this.clearBtn         = document.getElementById('clearBtn');
        this.modelSelect      = document.getElementById('modelSelect');
        this.languageSelect   = document.getElementById('languageSelect');
        this.transcriptOutput = document.getElementById('transcriptOutput');
        this.wordCount        = document.getElementById('wordCount');
        this.duration         = document.getElementById('duration');
        this.processingTime   = document.getElementById('processingTime');
        this.detectedLanguage = document.getElementById('detectedLanguage');
        this.progressFill     = document.getElementById('progressFill');
        this.exportTxt        = document.getElementById('exportTxt');
        this.exportSrt        = document.getElementById('exportSrt');
        this.exportJson       = document.getElementById('exportJson');
        this.segmentsList     = document.getElementById('segmentsList');
        this.segmentsSection  = document.getElementById('segmentsSection');
        this.replyLanguage    = document.getElementById('replyLanguage');
        this.replyTone        = document.getElementById('replyTone');
        this.generateReplyBtn = document.getElementById('generateReplyBtn');
        this.replyOutput      = document.getElementById('replyOutput');
        this.playReplyBtn     = document.getElementById('playReplyBtn');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.recordingTime    = document.getElementById('recordingTime');
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
            const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
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
            const m = Math.floor(s/60), sec = s % 60;
            this.recordingTime.textContent = `Recording: ${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        }, 1000);
    }

    stopRecordingTimer() { if (this.recordingTimer) clearInterval(this.recordingTimer); }

    // ============= Transcription =============
    async transcribe() {
        if (!this.audioFile) { this.showToast('Please upload or record audio first', 'error'); return; }

        this.transcribeBtn.disabled = true;
        this.showProgress();

        const mime = this.audioFile.type || 'audio/webm';
        const ext  = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : mime.includes('wav') ? 'wav' : 'webm';

        const formData = new FormData();
        formData.append('audio', this.audioFile, `audio.${ext}`);
        formData.append('model', this.modelSelect.value);
        if (this.languageSelect.value) formData.append('language', this.languageSelect.value);

        try {
            const t0 = Date.now();
            const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
            if (!response.ok) throw new Error((await response.json()).error || 'Transcription failed');

            const result = await response.json();
            this.currentTranscription = result;
            this.displayTranscription(result);
            this.updateStats(result, Date.now() - t0);
            this.showProgress(100);
            this.exportTxt.disabled = false;
            this.exportSrt.disabled = false;
            this.exportJson.disabled = false;
            this.generateReplyBtn.disabled = false;
            this.showToast('✨ Transcription complete!', 'success');
        } catch (err) {
            this.showToast(`Error: ${err.message}`, 'error');
        } finally {
            this.transcribeBtn.disabled = false;
        }
    }

    displayTranscription(result) {
        this.transcriptOutput.classList.remove('empty');
        this.transcriptOutput.textContent = result.text;
        this.detectedLanguage.textContent = result.language ? result.language.toUpperCase() : 'Unknown';

        if (result.segments?.length > 0) {
            this.segmentsSection.classList.remove('hidden');
            this.segmentsList.innerHTML = result.segments.map(seg => `
                <div class="segment">
                    <div class="segment-time">${this.formatTime(seg.start)} → ${this.formatTime(seg.end)}</div>
                    <div class="segment-text">${seg.text}</div>
                </div>`).join('');
        }
    }

    updateStats(result, ms) {
        this.wordCount.textContent = result.text.split(/\s+/).filter(w => w).length;
        this.duration.textContent = (result.duration ? Math.round(result.duration * 10) / 10 : 0) + 's';
        this.processingTime.textContent = (ms / 1000).toFixed(1) + 's';
    }

    formatTime(s) { return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; }

    // ============= Voice Reply =============
    async generateVoiceReply() {
        if (!this.currentTranscription) { this.showToast('Please transcribe audio first', 'error'); return; }

        this.generateReplyBtn.disabled = true;
        this.generateReplyBtn.innerHTML = '<span class="spinner" style="border-color:rgba(255,255,255,.3);border-top-color:#fff;display:inline-block;width:16px;height:16px;border-width:2px;border-style:solid;border-radius:50%;animation:spin .8s linear infinite;margin-right:6px"></span> Generating...';
        this.replyOutput.innerHTML = '<div class="loading"><div class="spinner"></div> Translating & generating reply...</div>';
        this.playReplyBtn.style.display = 'none';

        try {
            const response = await fetch('/api/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: this.currentTranscription.text,
                    language: this.replyLanguage.value,
                    tone: this.replyTone.value
                })
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Reply generation failed');

            const result = await response.json();
            this.displayVoiceReply(result);
            this.showToast('🎧 Ready! Click Play to hear the reply.', 'success');
        } catch (err) {
            this.replyOutput.textContent = 'Error generating reply. Please try again.';
            this.showToast(`Error: ${err.message}`, 'error');
        } finally {
            this.generateReplyBtn.disabled = false;
            this.generateReplyBtn.innerHTML = '✨ Generate Reply';
        }
    }

    displayVoiceReply(result) {
        const langLabels = {
            en: 'English', es: 'Spanish', fr: 'French', de: 'German',
            it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
            zh: 'Chinese', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada'
        };
        const lang = langLabels[result.language] || result.language;

        // Show translation block + reply block
        this.replyOutput.innerHTML = `
            <div style="margin-bottom:12px; padding:10px 12px; background:rgba(99,102,241,0.08); border-radius:8px; border-left:3px solid #6366f1;">
                <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:4px;">
                    📝 Translation (${lang})
                </div>
                <p style="margin:0;color:#111827;line-height:1.6">${result.translation}</p>
            </div>
            <div style="padding:10px 12px; background:rgba(16,185,129,0.08); border-radius:8px; border-left:3px solid #10b981;">
                <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:4px;">
                    🤖 AI Reply (${lang})
                </div>
                <p style="margin:0;color:#111827;line-height:1.6">${result.reply}</p>
            </div>`;

        this.voiceReplyText = result.translation;
        this.voiceReplyLang = result.language;
        this.playReplyBtn.style.display = 'inline-flex';
        this.playReplyBtn.textContent = '🔊 Play Reply';
        this.playReplyBtn.disabled = false;
    }

    playVoiceReply() {
        if (!this.voiceReplyText) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(this.voiceReplyText);

        const langMap = {
            en:'en-US', es:'es-ES', fr:'fr-FR', de:'de-DE',
            it:'it-IT', pt:'pt-PT', ru:'ru-RU', ja:'ja-JP',
            zh:'zh-CN', hi:'hi-IN', ta:'ta-IN', te:'te-IN', kn:'kn-IN'
        };
        utterance.lang = langMap[this.voiceReplyLang] || 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Find the best matching voice for the language
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
            this.showToast('Voice not available for this language in your browser', 'error');
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
