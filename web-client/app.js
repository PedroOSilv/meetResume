/**
 * Omni Resume - Web Application
 * Cliente web para gravação e processamento de áudio com IA
 * VERSÃO CORRIGIDA - Mixagem funcionando corretamente
 */

class AudioAIClient {
    constructor() {
        // Verificar autenticação
        this.checkAuthentication();
        
        // Elementos DOM
        this.recordModeSelect = document.getElementById('recordMode');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.timer = document.getElementById('timer');
        this.leadName = document.getElementById('leadName');
        this.callStatus = document.getElementById('callStatus');
        this.transcriptArea = document.getElementById('transcriptArea');
        this.suggestionsArea = document.getElementById('suggestionsArea');
        this.segmentsCount = document.getElementById('segmentsCount');
        this.objectionsCount = document.getElementById('objectionsCount');
        this.suggestionsCount = document.getElementById('suggestionsCount');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Estado da gravação
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.micStream = null;
        this.systemStream = null;
        this.audioContext = null;
        this.mixedStream = null;
        this.recordingStartTime = null;
        this.timerInterval = null;

        // Sistema de chunks em tempo real
        this.sessionId = null;
        this.chunkInterval = null;
        this.chunkIndex = 0;
        this.pendingUploads = new Set();
        this.accumulatedTranscript = '';
        this.isStopping = false;

        // Configurações
        this.recordMode = 'microphone';
        this.mixRatio = 0.7; // 70% sistema, 30% microfone
        this.micGain = null;
        this.systemGain = null;
        this.gainMonitorInterval = null; // ADICIONADO

        // Estado da chamada
        this.segments = 0;
        this.objections = 0;
        this.suggestions = 0;

        // URL do servidor
        this.serverUrl = 'http://localhost:3005';

        this.init();
    }

    init() {
        // Event listeners
        this.recordModeSelect.addEventListener('change', () => this.onModeChanged());
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.logoutBtn.addEventListener('click', () => this.logout());

        // Verificar suporte do navegador
        this.checkBrowserSupport();
    }

    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('Seu navegador não suporta captura de áudio. Use Chrome, Firefox ou Edge atualizado.');
            this.startBtn.disabled = true;
            return false;
        }
        return true;
    }

    onModeChanged() {
        this.recordMode = this.recordModeSelect.value;
        console.log('Modo de gravação alterado para:', this.recordMode);
        
        this.updateCallStatus(`Modo: ${this.recordMode}`);
        
        const systemInstructions = document.getElementById('systemInstructions');
        if (systemInstructions) {
            if (this.recordMode === 'system' || this.recordMode === 'both') {
                systemInstructions.style.display = 'block';
            } else {
                systemInstructions.style.display = 'none';
            }
        }
        
        const mixingControls = document.getElementById('mixingControls');
        if (mixingControls) {
            if (this.recordMode === 'both') {
                mixingControls.style.display = 'block';
                this.setupMixingControls();
            } else {
                mixingControls.style.display = 'none';
            }
        }
    }

    startTimer() {
        this.recordingStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async startRecording() {
        try {
            this.audioChunks = [];
            this.sessionId = this.generateSessionId();
            this.chunkIndex = 0;
            this.pendingUploads.clear();
            this.accumulatedTranscript = '';
            this.isStopping = false;
            
            if (this.recordMode === 'microphone') {
                await this.startMicrophoneRecording();
            } else if (this.recordMode === 'system') {
                await this.startSystemRecording();
            } else if (this.recordMode === 'both') {
                await this.startMixedRecording();
            }

            this.isRecording = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.recordModeSelect.disabled = true;

            this.startTimer();
            this.startChunkSystem();

            this.updateCallStatus('Gravando...');
            this.addTranscriptMessage('Gravação Sistema', 'Gravação iniciada');

        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            this.showError(`Erro ao iniciar gravação: ${error.message}`);
            this.resetUI();
        }
    }

    async startMicrophoneRecording() {
        try {
            this.micStream = await navigator.mediaDevices.getUserMedia(
                this.getOptimizedAudioConstraints()
            );
            
            const mimeType = this.getBestMimeType();
            this.mediaRecorder = new MediaRecorder(this.micStream, {
                mimeType: mimeType,
                audioBitsPerSecond: 32000
            });
            
            this.setupMediaRecorder();
            this.mediaRecorder.start(1000);
            
        } catch (error) {
            console.error('Erro ao acessar microfone:', error);
            
            if (error.name === 'NotAllowedError') {
                throw new Error('Permissão de microfone negada. Por favor, permita o acesso ao microfone.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('Nenhum microfone encontrado. Conecte um microfone e tente novamente.');
            } else if (error.name === 'NotReadableError') {
                throw new Error('Microfone está sendo usado por outro aplicativo.');
            } else if (error.name === 'OverconstrainedError') {
                return this.startMicrophoneRecordingSimple();
            }
            
            throw new Error('Não foi possível acessar o microfone: ' + error.message);
        }
    }

    async startMicrophoneRecordingSimple() {
        try {
            this.micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true
            });
            
            this.mediaRecorder = new MediaRecorder(this.micStream, {
                mimeType: this.getBestMimeType()
            });
            
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            console.log('✅ Microfone iniciado com configurações simplificadas');
            
        } catch (error) {
            throw new Error('Não foi possível acessar o microfone: ' + error.message);
        }
    }

    async startSystemRecording() {
        try {
            console.log('🎯 Iniciando captura de áudio do sistema...');
            
            this.systemStream = await navigator.mediaDevices.getDisplayMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            console.log('✅ Stream do sistema obtido');
            
            const audioTracks = this.systemStream.getAudioTracks();
            const videoTracks = this.systemStream.getVideoTracks();
            
            console.log(`📊 Tracks - Áudio: ${audioTracks.length}, Vídeo: ${videoTracks.length}`);
            
            if (audioTracks.length === 0) {
                this.systemStream.getTracks().forEach(track => track.stop());
                this.systemStream = null;
                throw new Error('❌ Nenhuma faixa de áudio disponível. Marque "Compartilhar áudio da aba".');
            }

            const audioOnlyStream = new MediaStream(audioTracks);
            
            setTimeout(() => {
                videoTracks.forEach(track => {
                    console.log('🛑 Parando track de vídeo:', track.label);
                    track.stop();
                });
            }, 100);
            
            this.mediaRecorder = new MediaRecorder(audioOnlyStream, {
                mimeType: this.getBestMimeType()
            });
            
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            
            console.log('🚀 Gravação do sistema iniciada');
            
        } catch (error) {
            console.error('❌ Erro na gravação do sistema:', error);
            
            if (this.systemStream) {
                this.systemStream.getTracks().forEach(track => track.stop());
                this.systemStream = null;
            }
            
            if (error.name === 'NotAllowedError') {
                throw new Error('❌ Permissão negada. Marque "Compartilhar áudio da aba".');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('❌ Navegador não suporta captura de áudio de abas.');
            } else if (error.name === 'AbortError') {
                throw new Error('❌ Captura cancelada pelo usuário.');
            }
            throw new Error(`❌ Erro ao capturar áudio do sistema: ${error.message}`);
        }
    }

    // ============================================
    // FUNÇÃO CORRIGIDA - MIXAGEM FUNCIONANDO
    // ============================================
    async startMixedRecording() {
        try {
          console.log('🎯 Iniciando gravação separada (microfone + sistema)...');
      
          // Capturar microfone
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }
          });
          console.log('🎤 Microfone iniciado');
      
          // Capturar sistema (áudio da aba)
          this.systemStream = await navigator.mediaDevices.getDisplayMedia({
            audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 48000 },
            video: true
          });
          this.systemStream.getVideoTracks().forEach(t => t.stop());
          console.log('🖥️ Sistema iniciado');
      
          // Criação dos gravadores separados
          const mimeType = this.getBestMimeType();
          this.micRecorder = new MediaRecorder(this.micStream, { mimeType });
          this.sysRecorder = new MediaRecorder(this.systemStream, { mimeType });
      
          this.micChunks = [];
          this.sysChunks = [];
      
          this.micRecorder.ondataavailable = e => e.data.size > 0 && this.micChunks.push(e.data);
          this.sysRecorder.ondataavailable = e => e.data.size > 0 && this.sysChunks.push(e.data);
      
          this.micRecorder.start(5000);
          this.sysRecorder.start(5000);
      
          // Timer + status
          this.isRecording = true;
          this.startBtn.disabled = true;
          this.stopBtn.disabled = false;
          this.recordModeSelect.disabled = true;
          this.startTimer();
          this.updateCallStatus('Gravando (mixagem pós-chunk)...');
      
          // Loop de processamento
          this.chunkIndex = 0;
          this.chunkInterval = setInterval(() => this.processDualChunk(), 5000);
      
        } catch (err) {
          console.error('❌ Erro ao iniciar gravação mista:', err);
          this.showError('Falha na captura de áudio: ' + err.message);
        }
      }
    
      async processDualChunk() {
        try {
          console.log(`📦 Mixando chunk ${this.chunkIndex}`);
      
          this.micRecorder.stop();
          this.sysRecorder.stop();
      
          await new Promise(r => setTimeout(r, 500)); // aguardar flush
      
          const micBlob = new Blob(this.micChunks, { type: 'audio/webm' });
          const sysBlob = new Blob(this.sysChunks, { type: 'audio/webm' });
          this.micChunks = [];
          this.sysChunks = [];
      
          const mixedBlob = await this.mixWebmBlobs(micBlob, sysBlob);
      
          // Enviar chunk mixado
          await this.uploadChunk(mixedBlob, this.chunkIndex);
          this.chunkIndex++;
      
          // Reiniciar gravadores
          const mimeType = this.getBestMimeType();
          this.micRecorder = new MediaRecorder(this.micStream, { mimeType });
          this.sysRecorder = new MediaRecorder(this.systemStream, { mimeType });
          this.micRecorder.ondataavailable = e => e.data.size > 0 && this.micChunks.push(e.data);
          this.sysRecorder.ondataavailable = e => e.data.size > 0 && this.sysChunks.push(e.data);
          this.micRecorder.start(5000);
          this.sysRecorder.start(5000);
      
        } catch (err) {
          console.error('Erro ao mixar chunk:', err);
        }
      }
    
      // Mixagem segura de WebM (sem decodificação manual)
// Usa elementos de áudio e MediaElementAudioSourceNode
async mixWebmBlobs(micBlob, sysBlob) {
    return new Promise(async (resolve, reject) => {
      try {
        // Criar contexto de áudio e destino de gravação
        const ctx = new AudioContext({ sampleRate: 48000 });
        const destination = ctx.createMediaStreamDestination();
  
        // Criar elementos de áudio temporários
        const micAudio = new Audio(URL.createObjectURL(micBlob));
        const sysAudio = new Audio(URL.createObjectURL(sysBlob));
  
        // Garantir que possam ser processados no mesmo contexto
        micAudio.crossOrigin = 'anonymous';
        sysAudio.crossOrigin = 'anonymous';
        micAudio.muted = true;
        sysAudio.muted = true;
  
        // Criar fontes para mixagem
        const micSource = ctx.createMediaElementSource(micAudio);
        const sysSource = ctx.createMediaElementSource(sysAudio);
  
        // Criar nodes de ganho (ajuste de volume relativo)
        const micGain = ctx.createGain();
        const sysGain = ctx.createGain();
        micGain.gain.value = 0.7; // 70% microfone
        sysGain.gain.value = 0.4; // 40% sistema
  
        // Conectar ao destino
        micSource.connect(micGain).connect(destination);
        sysSource.connect(sysGain).connect(destination);
  
        // Criar MediaRecorder da saída combinada
        const mixedRecorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });
        const chunks = [];
  
        mixedRecorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
        mixedRecorder.onstop = () => {
          const mixedBlob = new Blob(chunks, { type: 'audio/webm' });
          resolve(mixedBlob);
        };
  
        // Iniciar gravação e reprodução simultânea
        mixedRecorder.start();
        await Promise.all([
          micAudio.play().catch(() => {}),
          sysAudio.play().catch(() => {})
        ]);
  
        // Esperar até o mais longo terminar
        const longest = Math.max(micAudio.duration || 5, sysAudio.duration || 5) * 1000;
        setTimeout(() => {
          mixedRecorder.stop();
          ctx.close();
          URL.revokeObjectURL(micAudio.src);
          URL.revokeObjectURL(sysAudio.src);
        }, longest + 100);
  
      } catch (err) {
        console.error('Erro ao mixar WebM:', err);
        reject(err);
      }
    });
  }
  
      

    

    // NOVA FUNÇÃO: Monitorar níveis de áudio em tempo real
    startAudioLevelMonitoring(micSource, systemSource) {
        const micAnalyser = this.audioContext.createAnalyser();
        const systemAnalyser = this.audioContext.createAnalyser();
        
        micAnalyser.fftSize = 256;
        systemAnalyser.fftSize = 256;
        
        // Conectar SEM afetar o grafo principal
        micSource.connect(micAnalyser);
        systemSource.connect(systemAnalyser);
        
        const micData = new Uint8Array(micAnalyser.frequencyBinCount);
        const systemData = new Uint8Array(systemAnalyser.frequencyBinCount);
        
        this.gainMonitorInterval = setInterval(() => {
            micAnalyser.getByteFrequencyData(micData);
            systemAnalyser.getByteFrequencyData(systemData);
            
            const micLevel = Math.max(...micData);
            const systemLevel = Math.max(...systemData);
            
            console.log(`📊 Níveis - Mic: ${micLevel}/255, Sistema: ${systemLevel}/255`);
            
            if (micLevel === 0 && systemLevel === 0) {
                console.warn('⚠️ AMBOS os níveis em zero! Problema na mixagem.');
            } else if (micLevel === 0) {
                console.warn('⚠️ Microfone em zero!');
            } else if (systemLevel === 0) {
                console.warn('⚠️ Sistema em zero!');
            }
        }, 3000);
    }

    // NOVA FUNÇÃO: Limpar streams de forma segura
    cleanupStreams() {
        console.log('🧹 Limpando recursos de áudio...');
        
        if (this.gainMonitorInterval) {
            clearInterval(this.gainMonitorInterval);
            this.gainMonitorInterval = null;
        }
        
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }
        
        if (this.systemStream) {
            this.systemStream.getTracks().forEach(track => track.stop());
            this.systemStream = null;
        }
        
        if (this.mixedStream) {
            this.mixedStream.getTracks().forEach(track => track.stop());
            this.mixedStream = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.micGain = null;
        this.systemGain = null;
        
        console.log('✅ Recursos limpos');
    }

    getBestMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/webm',
            'audio/mp4'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('🎵 Formato:', type);
                return type;
            }
        }
        
        console.log('⚠️ Formato padrão');
        return '';
    }

    getOptimizedAudioConstraints() {
        return {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000,
                channelCount: 1,
                sampleSize: 16
            }
        };
    }

    setupMediaRecorder() {
        this.mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        });

        this.mediaRecorder.addEventListener('error', (error) => {
            console.error('Erro no MediaRecorder:', error);
            this.showError('Erro durante a gravação');
            this.resetUI();
        });
    }

    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return;
        }

        this.isStopping = true;
        this.updateCallStatus('Parando gravação...');
        this.stopBtn.disabled = true;

        try {
            if (this.chunkInterval) {
                clearInterval(this.chunkInterval);
                this.chunkInterval = null;
            }

            this.stopTimer();

            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
                
                await new Promise((resolve) => {
                    const originalStopHandler = this.mediaRecorder.onstop;
                    this.mediaRecorder.onstop = () => {
                        this.processChunk().then(resolve);
                        if (originalStopHandler) {
                            this.mediaRecorder.onstop = originalStopHandler;
                        }
                    };
                });
            }

            await this.waitForPendingUploads();
            await this.finalizeSession();

            this.stopAllStreams();
            this.resetUI();
            
        } catch (error) {
            console.error('Erro ao parar gravação:', error);
            this.showError(`Erro ao parar gravação: ${error.message}`);
            this.resetUI();
        }
    }

    stopAllStreams() {
        this.cleanupStreams(); // Usar a função de limpeza centralizada
    }

    // Funções auxiliares (mantidas sem alteração)
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    startChunkSystem() {
        this.chunkInterval = setInterval(() => {
            if (this.isRecording && !this.isStopping) {
                this.processChunkInterval();
            }
        }, 5000);
    }

    processChunkInterval() {
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
            console.log('⚠️ MediaRecorder não está gravando');
            return;
        }

        if (this.isStopping) {
            console.log('⚠️ Gravação está parando');
            return;
        }

        try {
            console.log(`🔄 Processando chunk ${this.chunkIndex}`);
            
            this.mediaRecorder.stop();
            
            this.mediaRecorder.onstop = () => {
                console.log(`📦 Chunk ${this.chunkIndex} processado`);
                this.processChunk();
            };
        } catch (error) {
            console.error('Erro ao processar chunk:', error);
            this.addTranscriptMessage('Sistema', `Erro no chunk ${this.chunkIndex}: ${error.message}`);
        }
    }

    async processChunk() {
        if (this.audioChunks.length === 0) {
            this.restartRecording();
            return;
        }

        const chunkIndex = this.chunkIndex;
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        if (audioBlob.size === 0) {
            this.restartRecording();
            return;
        }

        console.log(`📦 Chunk ${chunkIndex}: ${audioBlob.size} bytes`);

        this.audioChunks = [];
        this.chunkIndex++;

        this.uploadChunk(audioBlob, chunkIndex);
        this.restartRecording();
    }

    async uploadChunk(audioBlob, chunkIndex) {
        const uploadId = `${this.sessionId}_chunk_${chunkIndex}`;
        this.pendingUploads.add(uploadId);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, `chunk_${chunkIndex}.webm`);
            formData.append('sessionId', this.sessionId);
            formData.append('chunkIndex', chunkIndex.toString());

            const response = await fetch(`${this.serverUrl}/upload-chunk`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.transcript) {
                this.accumulatedTranscript += result.transcript + ' ';
                this.displayRealtimeTranscript();
                console.log(`✅ Chunk ${chunkIndex} transcrito`);
            }

        } catch (error) {
            console.error(`Erro no chunk ${chunkIndex}:`, error);
            this.addTranscriptMessage('Sistema', `Erro no chunk ${chunkIndex}: ${error.message}`);
        } finally {
            this.pendingUploads.delete(uploadId);
        }
    }

    restartRecording() {
        if (!this.isRecording || this.isStopping) {
            return;
        }

        try {
            const mimeType = this.getBestMimeType();
            const stream = this.micStream || this.systemStream || this.mixedStream;
            
            if (!stream) {
                console.error('❌ Nenhum stream disponível');
                this.showError('Stream não disponível');
                return;
            }
            
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0 || audioTracks[0].readyState === 'ended') {
                console.error('❌ Stream não ativo');
                this.showError('Stream não ativo');
                return;
            }
            
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            
            console.log('✅ Gravação reiniciada');
        } catch (error) {
            console.error('❌ Erro ao reiniciar:', error);
            this.showError(`Erro ao reiniciar: ${error.message}`);
        }
    }

    displayRealtimeTranscript() {
        this.clearEmptyStates();
        
        let transcriptElement = document.getElementById('realtime-transcript');
        if (!transcriptElement) {
            transcriptElement = document.createElement('div');
            transcriptElement.id = 'realtime-transcript';
            transcriptElement.className = 'message lead';
            this.transcriptArea.appendChild(transcriptElement);
        }

        const displayText = this.accumulatedTranscript || 'Aguardando transcrição...';
        
        transcriptElement.innerHTML = `
            <div class="message-speaker">Transcrição (Tempo Real) - ${this.chunkIndex} chunks</div>
            <div class="message-bubble">
                <div class="message-text">${displayText}</div>
            </div>
        `;

        this.transcriptArea.scrollTop = this.transcriptArea.scrollHeight;
    }

    async waitForPendingUploads() {
        const maxWaitTime = 30000;
        const startTime = Date.now();
        
        while (this.pendingUploads.size > 0 && (Date.now() - startTime) < maxWaitTime) {
            this.updateCallStatus(`Aguardando ${this.pendingUploads.size} transcrições...`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (this.pendingUploads.size > 0) {
            console.warn(`Timeout: ${this.pendingUploads.size} uploads pendentes`);
        }
    }

    async finalizeSession() {
        try {
            this.updateCallStatus('Processando final...');
            
            const response = await fetch(`${this.serverUrl}/finalize`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}`);
            }

            const result = await response.json();
            this.displayFinalResult(result);

        } catch (error) {
            console.error('Erro ao finalizar:', error);
            this.showError(`Erro ao finalizar: ${error.message}`);
        }
    }

    displayFinalResult(result) {
        this.clearEmptyStates();
        
        const realtimeElement = document.getElementById('realtime-transcript');
        if (realtimeElement) {
            realtimeElement.remove();
        }
        
        if (result.fullTranscript) {
            this.addTranscriptMessage('Transcrição Final', result.fullTranscript);
            this.segments++;
            this.updateMetrics();
        }
        
        if (result.analysis) {
            this.addSuggestion(result.analysis);
            this.suggestions++;
            this.updateMetrics();
        }
        
        this.updateCallStatus('Processamento concluído');
        this.resetUI();
        
        console.log(`🎯 Finalizado: ${this.chunkIndex} chunks`);
    }

    adjustMixRatio(newRatio) {
        if (this.micGain && this.systemGain && this.isRecording) {
            this.mixRatio = Math.max(0, Math.min(1, newRatio));
            this.micGain.gain.value = 1 - this.mixRatio;
            this.systemGain.gain.value = this.mixRatio;
            console.log(`🎚️ Mixagem - Mic: ${(1-this.mixRatio)*100}%, Sistema: ${this.mixRatio*100}%`);
        }
    }

    setupMixingControls() {
        const mixSlider = document.getElementById('mixSlider');
        const systemVolume = document.getElementById('systemVolume');
        const micVolume = document.getElementById('micVolume');
        
        if (mixSlider && systemVolume && micVolume) {
            mixSlider.value = this.mixRatio * 100;
            systemVolume.textContent = Math.round(this.mixRatio * 100);
            micVolume.textContent = Math.round((1 - this.mixRatio) * 100);
            
            mixSlider.addEventListener('input', (e) => {
                const newRatio = e.target.value / 100;
                this.adjustMixRatio(newRatio);
                
                systemVolume.textContent = Math.round(this.mixRatio * 100);
                micVolume.textContent = Math.round((1 - this.mixRatio) * 100);
            });
        }
    }

    clearEmptyStates() {
        const transcriptEmpty = this.transcriptArea.querySelector('.empty-state');
        const suggestionsEmpty = this.suggestionsArea.querySelector('.empty-state');
        
        if (transcriptEmpty) transcriptEmpty.remove();
        if (suggestionsEmpty) suggestionsEmpty.remove();
    }

    addTranscriptMessage(speaker, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${speaker === 'Transcrição' || speaker === 'Transcrição Final' || speaker === 'Transcrição (Tempo Real)' ? 'lead' : 'commercial'}`;
        
        messageDiv.innerHTML = `
            <div class="message-speaker">${speaker}</div>
            <div class="message-bubble">
                <div class="message-text">${text}</div>
            </div>
        `;
        
        this.transcriptArea.appendChild(messageDiv);
        this.transcriptArea.scrollTop = this.transcriptArea.scrollHeight;
    }

    addSuggestion(text) {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion-card active';
        
        const formattedText = this.formatResumeText(text);
        
        suggestionDiv.innerHTML = `
            <div class="suggestion-header">
                <span>AI</span>
                <span>Resumo IA</span>
                <button class="copy-icon-btn" title="Copiar resumo">
                    Copy
                </button>
            </div>
            <div class="suggestion-text">${formattedText}</div>
        `;
        
        const copyBtn = suggestionDiv.querySelector('.copy-icon-btn');
        copyBtn.addEventListener('click', () => {
            this.copyToClipboard(text);
        });
        
        this.suggestionsArea.appendChild(suggestionDiv);
        this.suggestionsArea.scrollTop = this.suggestionsArea.scrollHeight;
    }

    formatResumeText(text) {
        let formatted = text;
        
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<div class="list-item"><span class="list-number">$1.</span> $2</div>');
        formatted = formatted.replace(/^- (.+)$/gm, '<div class="list-item"><span class="list-bullet">•</span> $1</div>');
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    updateCallStatus(status) {
        this.callStatus.textContent = status;
    }

    checkAuthentication() {
        const token = localStorage.getItem('audio_ai_token');
        if (!token) {
            window.location.href = '/login';
            return;
        }
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            if (payload.exp < now) {
                localStorage.removeItem('audio_ai_token');
                localStorage.removeItem('audio_ai_user');
                window.location.href = '/login';
                return;
            }
        } catch (error) {
            localStorage.removeItem('audio_ai_token');
            localStorage.removeItem('audio_ai_user');
            window.location.href = '/login';
            return;
        }
    }

    getAuthHeaders() {
        const token = localStorage.getItem('audio_ai_token');
        return {
            'Authorization': `Bearer ${token}`
        };
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.log('Erro ao fazer logout:', error);
        } finally {
            localStorage.removeItem('audio_ai_token');
            localStorage.removeItem('audio_ai_user');
            window.location.href = '/login';
        }
    }

    updateMetrics() {
        this.segmentsCount.textContent = `Segmentos: ${this.segments}`;
        this.objectionsCount.textContent = `Objeções: ${this.objections}`;
        this.suggestionsCount.textContent = `Sugestões: ${this.suggestions}`;
    }

    showError(message) {
        this.addTranscriptMessage('Gravação Sistema', `Erro: ${message}`);
        this.updateCallStatus('Erro no processamento');
    }

    updateStatus(message, type = '') {
        console.log(`Status: ${message}`);
    }

    resetUI() {
        this.isRecording = false;
        this.isStopping = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.recordModeSelect.disabled = false;
        
        this.stopTimer();
        if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
        }
        this.timer.textContent = '00:00';
        
        this.audioChunks = [];
        this.sessionId = null;
        this.chunkIndex = 0;
        this.pendingUploads.clear();
        this.accumulatedTranscript = '';
        
        this.segments = 0;
        this.objections = 0;
        this.suggestions = 0;
        this.updateMetrics();
        
        this.updateCallStatus('Pronto para nova gravação');
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('Texto copiado');
        } catch (error) {
            console.error('Erro ao copiar:', error);
            alert('Não foi possível copiar o texto.');
        }
    }

    getRecordingDuration() {
        if (!this.recordingStartTime) return 0;
        return Math.floor((Date.now() - this.recordingStartTime) / 1000);
    }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    console.log('Omni Resume - Web carregado');
    new AudioAIClient();
});