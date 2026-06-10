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

        this.initializeElements();
        this.attachEventListeners();
        this.setupAudioContext();
    }

    initializeElements() {
        // Upload
        this.uploadArea = document.getElementById('uploadArea');
        this.audioInput = document.getElementById('audioInput');

        // Buttons
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.transcribeBtn = document.getElementById('transcribeBtn');
        this.clearBtn = document.getElementById('clearBtn');

        // Settings
        this.modelSelect = document.getElementById('modelSelect');
        this.languageSelect = document.getElementById('languageSelect');

        // Output
        this.transcriptOutput = document.getElementById('transcriptOutput');
        this.wordCount = document.getElementById('wordCount');
        this.duration = document.getElementById('duration');
        this.processingTime = document.getElementById('processingTime');
        this.detectedLanguage = document.getElementById('detectedLanguage');
        this.progressFill = document.getElementById('progressFill');

        // Export
        this.exportTxt = document.getElementById('exportTxt');
        this.exportSrt = document.getElementById('exportSrt');
        this.exportJson = document.getElementById('exportJson');

        // Segments
        this.segmentsList = document.getElementById('segmentsList');
        this.segmentsSection = document.getElementById('segmentsSection');

        // Voice Reply
        this.replyLanguage = document.getElementById('replyLanguage');
        this.replyTone = document.getElementById('replyTone');
        this.generateReplyBtn = document.getElementById('generateReplyBtn');
        this.replyOutput = document.getElementById('replyOutput');
        this.playReplyBtn = document.getElementById('playReplyBtn');

        // Recording
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.recordingTime = document.getElementById('recordingTime');
    }

    attachEventListeners() {
        // Upload
        this.uploadArea.addEventListener('click', () => this.audioInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', () => this.handleDragLeave());
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.audioInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Recording & Transcription
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.transcribeBtn.addEventListener('click', () => this.transcribe());
        this.clearBtn.addEventListener('click', () => this.clear());

        // Export
        this.exportTxt.addEventListener('click', () => this.exportAsText());
        this.exportSrt.addEventListener('click', () => this.exportAsSRT());
        this.exportJson.addEventListener('click', () => this.exportAsJSON());

        // Voice Reply
        this.generateReplyBtn.addEventListener('click', () => this.generateVoiceReply());
        this.playReplyBtn.addEventListener('click', () => this.playVoiceReply());
    }

    setupAudioContext() {
        // Initialize audio context for recording
        this.audioContext = null;
    }

    // ============= Drag & Drop =============
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.add('active');
    }

    handleDragLeave() {
        this.uploadArea.classList.remove('active');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('active');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        if (e.target.files.length > 0) {
            this.processFile(e.target.files[0]);
        }
    }

    processFile(file) {
        if (file.size > 25 * 1024 * 1024) {
            this.showToast('File too large! Max 25MB', 'error');
            return;
        }

        this.audioFile = file;
        this.uploadArea.classList.add('active');
        this.transcribeBtn.disabled = false;
        this.showToast(`📁 ${file.name} loaded (${this.formatFileSize(file.size)})`, 'info');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // ============= Recording =============
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.isRecording = true;
            this.recordingStartTime = Date.now();

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.audioFile = audioBlob;
                this.transcribeBtn.disabled = false;
            };

            this.mediaRecorder.start();
            this.recordBtn.classList.add('hidden');
            this.stopBtn.classList.remove('hidden');
            this.recordingIndicator.classList.add('active');
            this.startRecordingTimer();
            this.showToast('🎙️ Recording started...', 'info');
        } catch (error) {
            this.showToast('Microphone access denied!', 'error');
            console.error('Recording error:', error);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.stopRecordingTimer();
            this.recordBtn.classList.remove('hidden');
            this.stopBtn.classList.add('hidden');
            this.recordingIndicator.classList.remove('active');
            this.showToast('✅ Recording stopped', 'success');
        }
    }

    startRecordingTimer() {
        let seconds = 0;
        this.recordingTimer = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            this.recordingTime.textContent = `Recording: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
        }
    }

    // ============= Transcription =============
    async transcribe() {
        if (!this.audioFile) {
            this.showToast('Please upload or record audio first', 'error');
            return;
        }

        this.isProcessing = true;
        this.transcribeBtn.disabled = true;
        this.showProgress();

        const formData = new FormData();
        formData.append('audio', this.audioFile);
        formData.append('model', this.modelSelect.value);
        if (this.languageSelect.value) {
            formData.append('language', this.languageSelect.value);
        }

        try {
            const startTime = Date.now();
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Transcription failed');
            }

            const result = await response.json();
            const endTime = Date.now();

            this.currentTranscription = result;
            this.displayTranscription(result);
            this.updateStats(result, endTime - startTime);
            this.showProgress(100);

            this.exportTxt.disabled = false;
            this.exportSrt.disabled = false;
            this.exportJson.disabled = false;
            this.generateReplyBtn.disabled = false;

            this.showToast('✨ Transcription complete!', 'success');
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
            console.error('Transcription error:', error);
        } finally {
            this.isProcessing = false;
            this.transcribeBtn.disabled = false;
        }
    }

    displayTranscription(result) {
        // Display main transcript
        this.transcriptOutput.classList.remove('empty');
        this.transcriptOutput.textContent = result.text;

        // Display language
        this.detectedLanguage.textContent = result.language ? result.language.toUpperCase() : 'Unknown';

        // Display segments if available
        if (result.segments && result.segments.length > 0) {
            this.segmentsSection.classList.remove('hidden');
            this.segmentsList.innerHTML = result.segments.map((seg, idx) => `
                <div class="segment" onclick="app.seekToSegment(${seg.start})">
                    <div class="segment-time">
                        ${this.formatTime(seg.start)} → ${this.formatTime(seg.end)}
                    </div>
                    <div class="segment-text">${seg.text}</div>
                </div>
            `).join('');
        }
    }

    updateStats(result, processingTime) {
        const words = result.text.split(/\s+/).filter(w => w.length > 0).length;
        this.wordCount.textContent = words;

        const duration = result.duration ? Math.round(result.duration * 10) / 10 : 0;
        this.duration.textContent = duration + 's';

        this.processingTime.textContent = (processingTime / 1000).toFixed(1) + 's';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ============= Voice Reply =============
    async generateVoiceReply() {
        if (!this.currentTranscription) {
            this.showToast('Please transcribe audio first', 'error');
            return;
        }

        this.generateReplyBtn.disabled = true;
        this.showToast('🤖 Generating AI reply...', 'info');

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

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Reply generation failed');
            }

            const result = await response.json();
            this.displayVoiceReply(result);
            this.showToast('🎧 Reply generated!', 'success');
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
            console.error('Reply error:', error);
        } finally {
            this.generateReplyBtn.disabled = false;
        }
    }

    displayVoiceReply(result) {
        this.replyOutput.classList.remove('empty');
        this.replyOutput.innerHTML = `<p>${result.reply}</p>`;
        this.voiceReplyAudio = result.audio;
        this.playReplyBtn.style.display = 'inline-flex';
    }

    playVoiceReply() {
        if (this.voiceReplyAudio) {
            const audio = new Audio(`data:audio/mp3;base64,${this.voiceReplyAudio}`);
            audio.play();
        }
    }

    // ============= Export =============
    exportAsText() {
        if (!this.currentTranscription) return;

        const text = this.currentTranscription.text;
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', 'transcript.txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        this.showToast('📄 Downloaded as TXT', 'success');
    }

    exportAsSRT() {
        if (!this.currentTranscription || !this.currentTranscription.segments) {
            this.showToast('No segments available', 'error');
            return;
        }

        let srt = '';
        this.currentTranscription.segments.forEach((seg, idx) => {
            srt += `${idx + 1}\n`;
            srt += `${this.formatSRTTime(seg.start)} --> ${this.formatSRTTime(seg.end)}\n`;
            srt += `${seg.text}\n\n`;
        });

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(srt));
        element.setAttribute('download', 'subtitles.srt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        this.showToast('🎬 Downloaded as SRT', 'success');
    }

    formatSRTTime(seconds) {
        const date = new Date(seconds * 1000);
        const hh = String(date.getUTCHours()).padStart(2, '0');
        const mm = String(date.getUTCMinutes()).padStart(2, '0');
        const ss = String(date.getUTCSeconds()).padStart(2, '0');
        const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
        return `${hh}:${mm}:${ss},${ms}`;
    }

    exportAsJSON() {
        if (!this.currentTranscription) return;

        const json = JSON.stringify(this.currentTranscription, null, 2);
        const element = document.createElement('a');
        element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(json));
        element.setAttribute('download', 'transcript.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        this.showToast('📊 Downloaded as JSON', 'success');
    }

    // ============= UI Helpers =============
    clear() {
        this.audioFile = null;
        this.currentTranscription = null;
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
        this.transcribeBtn.disabled = true;
        this.exportTxt.disabled = true;
        this.exportSrt.disabled = true;
        this.exportJson.disabled = true;
        this.generateReplyBtn.disabled = true;
        this.showToast('🗑️ Cleared all data', 'info');
    }

    showProgress(percent = 0) {
        this.progressFill.style.width = percent + '%';
        if (percent === 0) {
            this.progressFill.style.width = '0%';
            setTimeout(() => {
                this.progressFill.style.width = '40%';
            }, 100);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    seekToSegment(time) {
        this.showToast(`⏱️ Seeking to ${this.formatTime(time)}`, 'info');
    }
}

// Initialize app on load
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SpeechFlow();
});

// Prevent accidental page leave with unsaved data
window.addEventListener('beforeunload', (e) => {
    if (app.currentTranscription) {
        e.preventDefault();
        e.returnValue = '';
    }
});
