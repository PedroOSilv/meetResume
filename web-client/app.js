/**
 * Omni Resume - Web Application
 * Cliente web para gravação e processamento de áudio com IA
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

        // Configurações
        this.recordMode = 'microphone';
        this.mixRatio = 0.7; // 70% sistema, 30% microfone

        // Estado da chamada
        this.segments = 0;
        this.objections = 0;
        this.suggestions = 0;

        // URL do servidor (assumindo que está no mesmo host)
        this.serverUrl = window.location.origin;

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
        
        // Atualizar status da chamada
        this.updateCallStatus(`Modo: ${this.recordMode}`);
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
            
            // Solicitar permissões e iniciar streams baseado no modo
            if (this.recordMode === 'microphone') {
                await this.startMicrophoneRecording();
            } else if (this.recordMode === 'system') {
                await this.startSystemRecording();
            } else if (this.recordMode === 'both') {
                await this.startMixedRecording();
            }

            // Atualizar UI
            this.isRecording = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.recordModeSelect.disabled = true;

            // Iniciar timer
            this.startTimer();

            // Atualizar status
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
            // Usar configurações otimizadas
            this.micStream = await navigator.mediaDevices.getUserMedia(
                this.getOptimizedAudioConstraints()
            );
            
            // Configurar MediaRecorder com otimizações
            const mimeType = this.getBestMimeType();
            this.mediaRecorder = new MediaRecorder(this.micStream, {
                mimeType: mimeType,
                audioBitsPerSecond: 32000  // 32kbps - otimizado para fala
            });
            
            this.setupMediaRecorder();
            this.mediaRecorder.start(1000); // Chunks de 1 segundo para melhor performance
            
        } catch (error) {
            console.error('Erro ao acessar microfone:', error);
            
            // Verificar tipo de erro
            if (error.name === 'NotAllowedError') {
                throw new Error('Permissão de microfone negada. Por favor, permita o acesso ao microfone.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('Nenhum microfone encontrado. Conecte um microfone e tente novamente.');
            } else if (error.name === 'NotReadableError') {
                throw new Error('Microfone está sendo usado por outro aplicativo. Tente: 1) Usar modo "Apenas Sistema" para capturar a videochamada, ou 2) Fechar outros aplicativos que usam o microfone.');
            } else if (error.name === 'OverconstrainedError') {
                // Tentar novamente com configurações mais simples
                console.log('Tentando com configurações simplificadas...');
                return this.startMicrophoneRecordingSimple();
            }
            
            throw new Error('Não foi possível acessar o microfone: ' + error.message);
        }
    }

    async startMicrophoneRecordingSimple() {
        // Versão simplificada sem processamento de áudio
        try {
            this.micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true  // Configuração mínima
            });
            
            this.mediaRecorder = new MediaRecorder(this.micStream, {
                mimeType: this.getBestMimeType()
            });
            
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            console.log('✅ Microfone iniciado com configurações simplificadas');
            
        } catch (error) {
            throw new Error('Não foi possível acessar o microfone mesmo com configurações simples: ' + error.message);
        }
    }

    async startSystemRecording() {
        try {
            // No navegador, capturamos áudio de uma tab usando getDisplayMedia
            // IMPORTANTE: O usuário DEVE marcar "Compartilhar áudio da aba" na janela de seleção
            this.systemStream = await navigator.mediaDevices.getDisplayMedia({ 
                audio: true,  // Simplificado - o navegador decide as melhores configurações
                video: true   // Precisamos de vídeo para o Chrome aceitar, mas não usaremos
            });
            
            // Criar um stream apenas com o áudio
            const audioTracks = this.systemStream.getAudioTracks();
            
            // Parar as tracks de vídeo imediatamente (não precisamos delas)
            const videoTracks = this.systemStream.getVideoTracks();
            videoTracks.forEach(track => track.stop());
            
            if (audioTracks.length === 0) {
                throw new Error('Nenhuma faixa de áudio disponível. Certifique-se de marcar "Compartilhar áudio da aba" na janela de seleção.');
            }

            const audioOnlyStream = new MediaStream(audioTracks);
            
            this.mediaRecorder = new MediaRecorder(audioOnlyStream, {
                mimeType: this.getBestMimeType()
            });
            
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Permissão negada. Por favor, permita o compartilhamento e marque "Compartilhar áudio da aba".');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('Seu navegador não suporta captura de áudio de abas. Use Chrome ou Edge mais recente.');
            }
            throw new Error(`Não foi possível capturar áudio do sistema: ${error.message}`);
        }
    }

    async startMixedRecording() {
        try {
            // Obter stream do microfone primeiro
            this.micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            }).catch(err => {
                throw new Error('Não foi possível acessar o microfone: ' + err.message);
            });
            
            // Obter stream do sistema
            // IMPORTANTE: O usuário DEVE marcar "Compartilhar áudio da aba"
            this.systemStream = await navigator.mediaDevices.getDisplayMedia({ 
                audio: true,
                video: true  // Necessário para alguns navegadores
            }).catch(err => {
                // Se falhar, parar o stream do microfone
                this.micStream.getTracks().forEach(track => track.stop());
                this.micStream = null;
                if (err.name === 'NotAllowedError') {
                    throw new Error('Permissão negada para captura de tela/aba.');
                }
                throw new Error('Não foi possível capturar áudio do sistema: ' + err.message);
            });

            // Parar vídeo (não precisamos)
            const videoTracks = this.systemStream.getVideoTracks();
            videoTracks.forEach(track => track.stop());

            // Verificar se tem áudio do sistema
            const systemAudioTracks = this.systemStream.getAudioTracks();
            if (systemAudioTracks.length === 0) {
                // Limpar recursos
                this.micStream.getTracks().forEach(track => track.stop());
                this.systemStream.getTracks().forEach(track => track.stop());
                throw new Error('Nenhuma faixa de áudio do sistema disponível. Certifique-se de marcar "Compartilhar áudio da aba".');
            }

            // Criar contexto de áudio para mixagem
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Criar nós de fonte para cada stream
            const micSource = this.audioContext.createMediaStreamSource(this.micStream);
            const systemSource = this.audioContext.createMediaStreamSource(
                new MediaStream(systemAudioTracks)
            );
            
            // Criar nós de ganho para controlar o volume de cada fonte
            const micGain = this.audioContext.createGain();
            const systemGain = this.audioContext.createGain();
            
            // Aplicar mixagem
            micGain.gain.value = 1 - this.mixRatio; // 30% por padrão
            systemGain.gain.value = this.mixRatio;   // 70% por padrão
            
            // Criar destino para mixagem
            const destination = this.audioContext.createMediaStreamDestination();
            
            // Conectar tudo
            micSource.connect(micGain);
            systemSource.connect(systemGain);
            micGain.connect(destination);
            systemGain.connect(destination);
            
            this.mixedStream = destination.stream;
            
            // Criar MediaRecorder com o stream mixado
            this.mediaRecorder = new MediaRecorder(this.mixedStream, {
                mimeType: this.getBestMimeType()
            });
            
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            
        } catch (error) {
            // Limpar recursos
            if (this.micStream) {
                this.micStream.getTracks().forEach(track => track.stop());
                this.micStream = null;
            }
            if (this.systemStream) {
                this.systemStream.getTracks().forEach(track => track.stop());
                this.systemStream = null;
            }
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            // Re-throw com mensagem mais clara
            throw error;
        }
    }

    getBestMimeType() {
        // Tentar encontrar o melhor formato suportado (otimizado para performance)
        const types = [
            'audio/webm;codecs=opus',  // Melhor compressão
            'audio/ogg;codecs=opus',   // Boa compressão
            'audio/webm',              // Fallback WebM
            'audio/mp4'                // Último recurso
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('🎵 Usando formato otimizado:', type);
                return type;
            }
        }
        
        // Fallback para o padrão do navegador
        console.log('⚠️ Usando formato padrão do navegador');
        return '';
    }

    getOptimizedAudioConstraints() {
        // Configurações otimizadas para áudio
        return {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000,        // Reduzido de 44.1kHz para 16kHz
                channelCount: 1,          // Mono em vez de estéreo
                sampleSize: 16            // 16-bit em vez de 32-bit
            }
        };
    }

    setupMediaRecorder() {
        this.mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        });

        this.mediaRecorder.addEventListener('stop', () => {
            this.processRecording();
        });

        this.mediaRecorder.addEventListener('error', (error) => {
            console.error('Erro no MediaRecorder:', error);
            this.showError('Erro durante a gravação');
            this.resetUI();
        });
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return;
        }

        this.updateCallStatus('Parando gravação...');
        this.stopBtn.disabled = true;

        // Parar timer
        this.stopTimer();

        // Parar o MediaRecorder
        if (this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        // Parar todos os streams
        this.stopAllStreams();
    }

    stopAllStreams() {
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
    }

    async processRecording() {
        try {
            this.updateCallStatus('Enviando áudio ao servidor...');
            this.addTranscriptMessage('Gravação Sistema', 'Enviando áudio ao servidor para processamento...');

            // Criar blob de áudio
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            
            // Verificar se o blob não está vazio
            if (audioBlob.size === 0) {
                throw new Error('Gravação vazia. Nenhum áudio foi capturado.');
            }

            console.log('📊 Tamanho do áudio:', audioBlob.size, 'bytes');
            console.log('📊 Tamanho em MB:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB');
            
            // Validação de tamanho (limite de 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (audioBlob.size > maxSize) {
                throw new Error(`Arquivo muito grande: ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB. Limite: 10MB. Tente gravar por menos tempo.`);
            }
            
            // Mostrar informações de otimização
            const duration = this.getRecordingDuration();
            if (duration > 0) {
                const bitrate = (audioBlob.size * 8) / duration; // bits por segundo
                console.log(`📊 Duração: ${duration}s, Bitrate: ${(bitrate / 1000).toFixed(1)}kbps`);
            }

            // Criar FormData para upload
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            // Enviar para o servidor
            const response = await fetch(`${this.serverUrl}/upload`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: formData
            });

            if (!response.ok) {
                let errorMessage = 'Erro ao processar áudio no servidor';
                try {
                    // Ler o texto da resposta primeiro
                    const responseText = await response.text();
                    try {
                        // Tentar fazer parse do JSON
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error || errorMessage;
                    } catch (jsonError) {
                        // Se não for JSON, usar o texto diretamente
                        errorMessage = responseText || errorMessage;
                    }
                } catch (textError) {
                    // Se nem o text() funcionar, usar mensagem padrão
                    errorMessage = `Erro ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            
            // Exibir resultado
            this.displayResult(result);

        } catch (error) {
            console.error('Erro ao processar gravação:', error);
            this.showError(`Erro ao processar áudio: ${error.message}`);
        } finally {
            this.resetUI();
        }
    }

    displayResult(result) {
        // Limpar estados vazios
        this.clearEmptyStates();
        
        // Adicionar transcrição como mensagem do lead
        if (result.transcript) {
            this.addTranscriptMessage('Transcrição', result.transcript);
            this.segments++;
            this.updateMetrics();
        }
        
        // Adicionar análise como sugestão
        if (result.analysis) {
            this.addSuggestion(result.analysis);
            this.suggestions++;
            this.updateMetrics();
        }
        
        // Atualizar status
        this.updateCallStatus('Processamento concluído');
    }

    clearEmptyStates() {
        const transcriptEmpty = this.transcriptArea.querySelector('.empty-state');
        const suggestionsEmpty = this.suggestionsArea.querySelector('.empty-state');
        
        if (transcriptEmpty) transcriptEmpty.remove();
        if (suggestionsEmpty) suggestionsEmpty.remove();
    }

    addTranscriptMessage(speaker, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${speaker === 'Transcrição' ? 'lead' : 'commercial'}`;
        
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
        
        // Organizar o texto em tópicos
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
        
        // Adicionar event listener para o botão de copy
        const copyBtn = suggestionDiv.querySelector('.copy-icon-btn');
        copyBtn.addEventListener('click', () => {
            this.copyToClipboard(text);
        });
        
        this.suggestionsArea.appendChild(suggestionDiv);
        this.suggestionsArea.scrollTop = this.suggestionsArea.scrollHeight;
    }

    formatResumeText(text) {
        // Formato simples como chat do Cursor
        let formatted = text;
        
        // Converter quebras de linha para HTML
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
        
        // Verificar se o token é válido
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
            // Chamar API de logout (opcional)
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.log('Erro ao fazer logout no servidor:', error);
        } finally {
            // Limpar dados locais
            localStorage.removeItem('audio_ai_token');
            localStorage.removeItem('audio_ai_user');
            
            // Redirecionar para login
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
        // Método mantido para compatibilidade, mas não usado na nova interface
        console.log(`Status: ${message}`);
    }

    resetUI() {
        this.isRecording = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.recordModeSelect.disabled = false;
        
        // Parar timer
        this.stopTimer();
        this.timer.textContent = '00:00';
        
        // Limpar chunks de áudio
        this.audioChunks = [];
        
        // Resetar métricas
        this.segments = 0;
        this.objections = 0;
        this.suggestions = 0;
        this.updateMetrics();
        
        this.updateCallStatus('Pronto para nova gravação');
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('Texto copiado para área de transferência');
        } catch (error) {
            console.error('Erro ao copiar:', error);
            alert('Não foi possível copiar o texto. Tente manualmente.');
        }
    }

    getRecordingDuration() {
        if (!this.recordingStartTime) return 0;
        return Math.floor((Date.now() - this.recordingStartTime) / 1000);
    }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('Omni Resume - Web carregado');
    new AudioAIClient();
});

