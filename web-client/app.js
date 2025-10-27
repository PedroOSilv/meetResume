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
        console.log('Modo de gravação alterado para:', this.recordMode);
        
        // Atualizar status da chamada
        this.updateCallStatus(`Modo: ${this.recordMode}`);
        
        // Mostrar/ocultar instruções para gravação do sistema
        const systemInstructions = document.getElementById('systemInstructions');
        if (systemInstructions) {
            if (this.recordMode === 'system' || this.recordMode === 'both') {
                systemInstructions.style.display = 'block';
            } else {
                systemInstructions.style.display = 'none';
            }
        }
        
        // Mostrar/ocultar controles de mixagem
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

            // Iniciar sistema de chunks
            this.startChunkSystem();

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
            console.log('🎯 Iniciando captura de áudio do sistema...');
            
            // No navegador, capturamos áudio de uma tab usando getDisplayMedia
            // IMPORTANTE: O usuário DEVE marcar "Compartilhar áudio da aba" na janela de seleção
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
            
            console.log('✅ Stream do sistema obtido:', this.systemStream);
            
            // Verificar se temos tracks de áudio
            const audioTracks = this.systemStream.getAudioTracks();
            const videoTracks = this.systemStream.getVideoTracks();
            
            console.log(`📊 Tracks encontradas - Áudio: ${audioTracks.length}, Vídeo: ${videoTracks.length}`);
            
            if (audioTracks.length === 0) {
                // Limpar recursos antes de lançar erro
                this.systemStream.getTracks().forEach(track => track.stop());
                this.systemStream = null;
                throw new Error('❌ Nenhuma faixa de áudio disponível. Certifique-se de marcar "Compartilhar áudio da aba" na janela de seleção.');
            }

            // Criar stream apenas com áudio
            const audioOnlyStream = new MediaStream(audioTracks);
            
            // Parar tracks de vídeo após um pequeno delay para evitar problemas
            setTimeout(() => {
                videoTracks.forEach(track => {
                    console.log('🛑 Parando track de vídeo:', track.label);
                    track.stop();
                });
            }, 100);
            
            console.log('🎵 Criando MediaRecorder com stream de áudio...');
            
            this.mediaRecorder = new MediaRecorder(audioOnlyStream, {
                mimeType: this.getBestMimeType()
            });
            
            console.log('✅ MediaRecorder criado:', this.mediaRecorder.mimeType);
            
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            
            console.log('🚀 Gravação do sistema iniciada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na gravação do sistema:', error);
            
            // Limpar recursos em caso de erro
            if (this.systemStream) {
                this.systemStream.getTracks().forEach(track => track.stop());
                this.systemStream = null;
            }
            
            if (error.name === 'NotAllowedError') {
                throw new Error('❌ Permissão negada. Por favor, permita o compartilhamento e marque "Compartilhar áudio da aba".');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('❌ Seu navegador não suporta captura de áudio de abas. Use Chrome ou Edge mais recente.');
            } else if (error.name === 'AbortError') {
                throw new Error('❌ Captura cancelada pelo usuário.');
            }
            throw new Error(`❌ Não foi possível capturar áudio do sistema: ${error.message}`);
        }
    }

    async startMixedRecording() {
        try {
            console.log('🎯 Iniciando gravação mista (microfone + sistema)...');
            
            // Obter stream do microfone primeiro
            console.log('🎤 Obtendo stream do microfone...');
            this.micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            }).catch(err => {
                console.error('❌ Erro ao acessar microfone:', err);
                throw new Error('Não foi possível acessar o microfone: ' + err.message);
            });
            
            console.log('✅ Microfone obtido com sucesso');
            
            // Obter stream do sistema
            // IMPORTANTE: O usuário DEVE marcar "Compartilhar áudio da aba"
            console.log('🖥️ Obtendo stream do sistema...');
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
            }).catch(err => {
                console.error('❌ Erro ao capturar sistema:', err);
                // Se falhar, parar o stream do microfone
                if (this.micStream) {
                    this.micStream.getTracks().forEach(track => track.stop());
                    this.micStream = null;
                }
                if (err.name === 'NotAllowedError') {
                    throw new Error('❌ Permissão negada para captura de tela/aba.');
                }
                throw new Error('❌ Não foi possível capturar áudio do sistema: ' + err.message);
            });

            console.log('✅ Stream do sistema obtido');

            // Parar vídeo após um delay para evitar problemas
            const videoTracks = this.systemStream.getVideoTracks();
            setTimeout(() => {
                videoTracks.forEach(track => {
                    console.log('🛑 Parando track de vídeo:', track.label);
                    track.stop();
                });
            }, 100);

            // Verificar se tem áudio do sistema
            const systemAudioTracks = this.systemStream.getAudioTracks();
            console.log(`📊 Tracks de áudio do sistema: ${systemAudioTracks.length}`);
            
            if (systemAudioTracks.length === 0) {
                // Limpar recursos
                if (this.micStream) {
                    this.micStream.getTracks().forEach(track => track.stop());
                    this.micStream = null;
                }
                if (this.systemStream) {
                    this.systemStream.getTracks().forEach(track => track.stop());
                    this.systemStream = null;
                }
                throw new Error('❌ Nenhuma faixa de áudio do sistema disponível. Certifique-se de marcar "Compartilhar áudio da aba".');
            }

            // Criar contexto de áudio para mixagem
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            console.log('🎵 Criando contexto de áudio para mixagem...');
            
            // Criar nós de fonte para cada stream
            const micSource = this.audioContext.createMediaStreamSource(this.micStream);
            const systemSource = this.audioContext.createMediaStreamSource(
                new MediaStream(systemAudioTracks)
            );
            
            console.log('🎤 Fontes de áudio criadas - Microfone e Sistema');
            
            // Criar nós de ganho para controlar o volume de cada fonte
            this.micGain = this.audioContext.createGain();
            this.systemGain = this.audioContext.createGain();
            
            // Aplicar mixagem - ambos os canais ativos simultaneamente
            this.micGain.gain.value = 1 - this.mixRatio; // 30% por padrão
            this.systemGain.gain.value = this.mixRatio;   // 70% por padrão
            
            console.log(`🎚️ Mixagem configurada - Microfone: ${(1-this.mixRatio)*100}%, Sistema: ${this.mixRatio*100}%`);
            
            // Criar destino para mixagem
            const destination = this.audioContext.createMediaStreamDestination();
            
            // Conectar tudo - AMBOS os canais conectados simultaneamente
            micSource.connect(this.micGain);
            systemSource.connect(this.systemGain);
            this.micGain.connect(destination);
            this.systemGain.connect(destination);
            
            console.log('🔗 Conexões de áudio estabelecidas - Mixagem ativa');
            
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

        // Remover o listener antigo que parava a gravação
        // O novo sistema de chunks gerencia o evento 'stop' diretamente

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

        // Parar timer de chunks
        if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
        }

        // Parar timer principal
        this.stopTimer();

        // Enviar último chunk
        if (this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            
            // Aguardar processamento do último chunk
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

        // Aguardar todos os uploads pendentes
        await this.waitForPendingUploads();

        // Finalizar sessão no servidor
        await this.finalizeSession();

        // Parar todos os streams
        this.stopAllStreams();
        
        // Resetar UI para permitir novo ciclo
        this.resetUI();
        
        } catch (error) {
            console.error('Erro ao parar gravação:', error);
            this.showError(`Erro ao parar gravação: ${error.message}`);
            // Garantir que a UI seja resetada mesmo em caso de erro
            this.resetUI();
        }
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
        
        // Limpar referências de ganho
        this.micGain = null;
        this.systemGain = null;
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
        // Processar markdown básico
        let formatted = text;
        
        // Converter **texto** para <strong>texto</strong>
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Converter *texto* para <em>texto</em>
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Converter ## Título para <h3>Título</h3>
        formatted = formatted.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        
        // Converter ### Título para <h4>Título</h4>
        formatted = formatted.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        
        // Converter listas numeradas (1. item)
        formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<div class="list-item"><span class="list-number">$1.</span> $2</div>');
        
        // Converter listas com bullet (- item)
        formatted = formatted.replace(/^- (.+)$/gm, '<div class="list-item"><span class="list-bullet">•</span> $1</div>');
        
        // Converter quebras de linha para <br>
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
        this.isStopping = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.recordModeSelect.disabled = false;
        
        // Parar timers
        this.stopTimer();
        if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
        }
        this.timer.textContent = '00:00';
        
        // Limpar chunks de áudio e sessão
        this.audioChunks = [];
        this.sessionId = null;
        this.chunkIndex = 0;
        this.pendingUploads.clear();
        this.accumulatedTranscript = '';
        
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

    // Sistema de chunks em tempo real
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    startChunkSystem() {
        // Enviar primeiro chunk após 5 segundos
        this.chunkInterval = setInterval(() => {
            if (this.isRecording && !this.isStopping) {
                this.processChunkInterval();
            }
        }, 5000); // 5 segundos
    }

    processChunkInterval() {
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
            console.log('⚠️ MediaRecorder não está gravando, pulando chunk');
            return;
        }

        if (this.isStopping) {
            console.log('⚠️ Gravação está parando, pulando chunk');
            return;
        }

        try {
            console.log(`🔄 Processando chunk ${this.chunkIndex} aos ${this.getRecordingDuration()}s`);
            
            // Parar gravação atual para criar chunk
            this.mediaRecorder.stop();
            
            // Aguardar o evento 'stop' para processar o chunk
            this.mediaRecorder.onstop = () => {
                console.log(`📦 Evento 'stop' recebido para chunk ${this.chunkIndex}`);
                this.processChunk();
            };
        } catch (error) {
            console.error('Erro ao processar chunk:', error);
            this.addTranscriptMessage('Gravação Sistema', `Erro no chunk ${this.chunkIndex}: ${error.message}`);
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

        console.log(`📦 Chunk ${chunkIndex} criado: ${audioBlob.size} bytes`);

        // Limpar chunks para próxima gravação
        this.audioChunks = [];

        // Incrementar índice para próximo chunk
        this.chunkIndex++;

        // Enviar chunk para servidor (assíncrono)
        this.uploadChunk(audioBlob, chunkIndex);

        // Reiniciar gravação imediatamente
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
            
            // Apenas acumular transcrição, sem processar com GPT
            if (result.transcript) {
                this.accumulatedTranscript += result.transcript + ' ';
                this.displayRealtimeTranscript();
                console.log(`✅ Chunk ${chunkIndex} transcrito e acumulado`);
            }

        } catch (error) {
            console.error(`Erro no chunk ${chunkIndex}:`, error);
            this.addTranscriptMessage('Gravação Sistema', `Erro no chunk ${chunkIndex}: ${error.message}`);
        } finally {
            this.pendingUploads.delete(uploadId);
        }
    }

    restartRecording() {
        if (!this.isRecording || this.isStopping) {
            console.log('⚠️ Não reiniciando gravação - não está gravando ou está parando');
            return;
        }

        try {
            console.log('🔄 Reiniciando gravação...');
            
            // Reiniciar MediaRecorder com o mesmo stream
            const mimeType = this.getBestMimeType();
            const stream = this.micStream || this.systemStream || this.mixedStream;
            
            if (!stream) {
                console.error('❌ Nenhum stream disponível para reiniciar gravação');
                this.showError('Erro: Stream de áudio não disponível');
                return;
            }
            
            // Verificar se o stream ainda está ativo
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0 || audioTracks[0].readyState === 'ended') {
                console.error('❌ Stream de áudio não está mais ativo');
                this.showError('Erro: Stream de áudio não está mais ativo');
                return;
            }
            
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
            this.setupMediaRecorder();
            this.mediaRecorder.start();
            
            console.log('✅ Gravação reiniciada com sucesso');
        } catch (error) {
            console.error('❌ Erro ao reiniciar gravação:', error);
            this.showError(`Erro ao reiniciar gravação: ${error.message}`);
        }
    }

    displayRealtimeTranscript() {
        // Limpar estado vazio se existir
        this.clearEmptyStates();
        
        // Atualizar ou criar mensagem de transcrição em tempo real
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
        const maxWaitTime = 30000; // 30 segundos máximo
        const startTime = Date.now();
        
        while (this.pendingUploads.size > 0 && (Date.now() - startTime) < maxWaitTime) {
            this.updateCallStatus(`Aguardando ${this.pendingUploads.size} transcrições pendentes...`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (this.pendingUploads.size > 0) {
            console.warn(`Timeout: ${this.pendingUploads.size} uploads ainda pendentes`);
            this.addTranscriptMessage('Gravação Sistema', `Aviso: ${this.pendingUploads.size} transcrições não foram processadas a tempo`);
        }
    }

    async finalizeSession() {
        try {
            this.updateCallStatus('Processando transcrição final...');
            
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
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Exibir resultado final
            this.displayFinalResult(result);

        } catch (error) {
            console.error('Erro ao finalizar sessão:', error);
            this.showError(`Erro ao processar transcrição final: ${error.message}`);
        }
    }

    displayFinalResult(result) {
        // Limpar estado vazio
        this.clearEmptyStates();
        
        // Remover transcrição em tempo real
        const realtimeElement = document.getElementById('realtime-transcript');
        if (realtimeElement) {
            realtimeElement.remove();
        }
        
        // Adicionar transcrição final como mensagem do lead
        if (result.fullTranscript) {
            this.addTranscriptMessage('Transcrição Final', result.fullTranscript);
            this.segments++;
            this.updateMetrics();
        }
        
        // Adicionar análise como sugestão (apenas quando encerrar)
        if (result.analysis) {
            this.addSuggestion(result.analysis);
            this.suggestions++;
            this.updateMetrics();
        }
        
        // Atualizar status
        this.updateCallStatus('Processamento concluído');
        
        // Resetar UI para permitir novo ciclo
        this.resetUI();
        
        console.log(`🎯 Gravação finalizada: ${this.chunkIndex} chunks processados`);
    }

    // Função para ajustar mixagem em tempo real
    adjustMixRatio(newRatio) {
        if (this.micGain && this.systemGain) {
            this.mixRatio = Math.max(0, Math.min(1, newRatio)); // Clamp entre 0 e 1
            this.micGain.gain.value = 1 - this.mixRatio;
            this.systemGain.gain.value = this.mixRatio;
            console.log(`🎚️ Mixagem ajustada - Microfone: ${(1-this.mixRatio)*100}%, Sistema: ${this.mixRatio*100}%`);
        }
    }

    // Configurar controles de mixagem
    setupMixingControls() {
        const mixSlider = document.getElementById('mixSlider');
        const systemVolume = document.getElementById('systemVolume');
        const micVolume = document.getElementById('micVolume');
        
        if (mixSlider && systemVolume && micVolume) {
            // Configurar valor inicial
            mixSlider.value = this.mixRatio * 100;
            systemVolume.textContent = Math.round(this.mixRatio * 100);
            micVolume.textContent = Math.round((1 - this.mixRatio) * 100);
            
            // Adicionar listener para mudanças
            mixSlider.addEventListener('input', (e) => {
                const newRatio = e.target.value / 100;
                this.adjustMixRatio(newRatio);
                
                // Atualizar labels
                systemVolume.textContent = Math.round(this.mixRatio * 100);
                micVolume.textContent = Math.round((1 - this.mixRatio) * 100);
            });
        }
    }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('Omni Resume - Web carregado');
    new AudioAIClient();
});

