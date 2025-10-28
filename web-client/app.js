/**
 * Omni Resume - Web Application
 * Cliente web para gravação e processamento de áudio com IA
 * VERSÃO CORRIGIDA - Mixagem funcionando corretamente
 */

import AssistantService from './services/AssistantService.js';

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
        this.clearChatBtn = document.getElementById('clearChatBtn');
        this.clearTranscriptBtn = document.getElementById('clearTranscriptBtn');

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
        
        // Garantir que o timer esteja resetado no início
        if (this.timer) {
            this.timer.textContent = '00:00';
        }

        // Gravadores do modo "both"
        this.micRecorder = null;
        this.sysRecorder = null;
        this.micChunks = [];
        this.sysChunks = [];
        
        // Para gravação separada em WAV
        this.micWavData = [];
        this.sysWavData = [];
        this.audioContext = null;
        this.micProcessor = null;
        this.sysProcessor = null;
        this.sampleRate = 16000; // Reduzido para melhor compressão

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
        // Detectar se está em produção (Vercel) ou desenvolvimento
        this.serverUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3005' 
            : window.location.origin;

        // Inicializar serviço de assistente
        this.assistantService = new AssistantService(this.serverUrl, this.getAuthHeaders());

        this.init();
    }

    init() {
        // Event listeners
        this.recordModeSelect.addEventListener('change', () => this.onModeChanged());
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        this.clearTranscriptBtn.addEventListener('click', () => this.clearTranscript());

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
        // Garantir que não há timer anterior rodando
        this.stopTimer();
        
        this.recordingStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        console.log('▶️ Timer iniciado');
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            console.log('⏹️ Timer parado');
        }
        // Garantir que o timer seja resetado visualmente
        if (this.timer) {
            this.timer.textContent = '00:00';
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
            
            // Iniciar polling de objeções
            this.assistantService.startPolling(
                (objection) => this.addObjectionMessage(objection),
                (error) => console.error('Erro no assistente:', error),
                () => this.getRecentTranscript() // Callback para obter transcrição recente
            );
            
            // No modo "both", o sistema de chunks é gerenciado pela função startMixedRecording
            if (this.recordMode !== 'both') {
                this.startChunkSystem();
            }

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
                audioBitsPerSecond: 16000 // Reduzido de 32k para 16k para melhor compressão
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
          console.log('🎯 Iniciando gravação separada em WAV (microfone + sistema)...');
          
          // Gerar sessionId
          this.sessionId = this.generateSessionId();
          console.log('🆔 Session ID gerado:', this.sessionId);
      
          // Capturar microfone com configurações otimizadas para compressão
          console.log('🎤 Solicitando acesso ao microfone...');
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: { 
              echoCancellation: true, 
              noiseSuppression: true, 
              sampleRate: 16000, // Reduzido para melhor compressão
              channelCount: 1,    // Mono
              sampleSize: 16      // 16-bit
            }
          });
          console.log('🎤 Microfone iniciado:', this.micStream.getAudioTracks().length, 'faixas de áudio');
      
          // Capturar sistema (áudio da aba) com configurações otimizadas
          console.log('🖥️ Solicitando acesso ao sistema...');
          this.systemStream = await navigator.mediaDevices.getDisplayMedia({
            audio: { 
              echoCancellation: false, 
              noiseSuppression: false, 
              sampleRate: 16000, // Reduzido para melhor compressão
              channelCount: 1    // Mono
            },
            video: true
          });
          this.systemStream.getVideoTracks().forEach(t => t.stop());
          console.log('🖥️ Sistema iniciado:', this.systemStream.getAudioTracks().length, 'faixas de áudio');
      
          // Verificar se ambos os streams têm áudio
          if (this.micStream.getAudioTracks().length === 0) {
            throw new Error('Microfone não capturou áudio');
          }
          if (this.systemStream.getAudioTracks().length === 0) {
            throw new Error('Sistema não capturou áudio');
          }
      
          // Criar contexto de áudio para gravação WAV
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: this.sampleRate
          });
          
          // Limpar dados anteriores
          this.micWavData = [];
          this.sysWavData = [];
          
          // Criar nós de processamento para microfone
          const micSource = this.audioContext.createMediaStreamSource(this.micStream);
          this.micProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
          
          this.micProcessor.onaudioprocess = (e) => {
            if (this.isRecording && !this.isStopping) {
              const inputData = e.inputBuffer.getChannelData(0);
              this.micWavData.push(new Float32Array(inputData));
            }
          };
          
          // Criar nós de processamento para sistema
          const sysSource = this.audioContext.createMediaStreamSource(this.systemStream);
          this.sysProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
          
          this.sysProcessor.onaudioprocess = (e) => {
            if (this.isRecording && !this.isStopping) {
              const inputData = e.inputBuffer.getChannelData(0);
              this.sysWavData.push(new Float32Array(inputData));
            }
          };
          
          // Conectar os processadores
          micSource.connect(this.micProcessor);
          this.micProcessor.connect(this.audioContext.destination);
          
          sysSource.connect(this.sysProcessor);
          this.sysProcessor.connect(this.audioContext.destination);
          
          console.log('✅ Processadores de áudio WAV iniciados');
      
          // Timer + status
          this.isRecording = true;
          this.startBtn.disabled = true;
          this.stopBtn.disabled = false;
          this.recordModeSelect.disabled = true;
          this.startTimer();
          this.updateCallStatus('Gravando (WAV separado - 5s)...');
      
          // Loop de processamento
          this.chunkIndex = 0;
          this.chunkInterval = setInterval(() => this.processSeparateChunk(), 5000); // 5 segundos
          console.log('🔄 Sistema de chunks WAV iniciado (5 segundos)');
      
        } catch (err) {
          console.error('❌ Erro ao iniciar gravação WAV:', err);
          this.showError('Falha na captura de áudio: ' + err.message);
          // Limpar recursos em caso de erro
          this.cleanupStreams();
          this.resetUI();
        }
      }
    
      async processSeparateChunk() {
        try {
          console.log(`🔄 processSeparateChunk chamado - chunk ${this.chunkIndex}`);
          
          // Verificar se a gravação ainda está ativa
          if (!this.isRecording || this.isStopping) {
            console.log('⚠️ Gravação parada, cancelando processamento de chunk');
            return;
          }

          // Verificar se temos dados WAV
          if (this.micWavData.length === 0 || this.sysWavData.length === 0) {
            console.log('⚠️ Dados WAV não disponíveis, aguardando...');
            return;
          }

          console.log(`📦 Processando chunk WAV ${this.chunkIndex}`);
          console.log(`🎤 Mic WAV buffers: ${this.micWavData.length}, Sys WAV buffers: ${this.sysWavData.length}`);
      
          // Pegar os últimos 5 segundos de dados (aproximadamente)
          const chunkDuration = 5; // segundos
          const samplesPerChunk = this.sampleRate * chunkDuration;
          console.log(`⏱️ Chunk duration: ${chunkDuration}s, samples per chunk: ${samplesPerChunk}`);
          
          // Extrair dados do chunk atual
          console.log('🔍 Extraindo dados do microfone...');
          const micChunkData = this.extractWavChunk(this.micWavData, samplesPerChunk);
          console.log('🔍 Extraindo dados do sistema...');
          const sysChunkData = this.extractWavChunk(this.sysWavData, samplesPerChunk);
          
          if (micChunkData.length === 0 || sysChunkData.length === 0) {
            console.log('⚠️ Chunk WAV vazio, aguardando mais dados...');
            return;
          }
          
          console.log(`📊 Mic chunk: ${micChunkData.length} samples, Sys chunk: ${sysChunkData.length} samples`);
          
          // Mixar os dados WAV
          console.log('🎵 Mixando dados WAV...');
          const mixedWavData = this.mixWavData(micChunkData, sysChunkData);
          console.log(`🎵 Mixed WAV: ${mixedWavData.length} samples`);
          
          // Converter para WAV e depois para blob
          console.log('📁 Criando blob WAV...');
          const wavBlob = this.createWavBlob(mixedWavData);
          console.log(`📁 WAV blob: ${wavBlob.size} bytes`);
      
          // Enviar chunk mixado
          await this.uploadChunk(wavBlob, this.chunkIndex);
          this.chunkIndex++;
      
        } catch (err) {
          console.error('❌ Erro ao processar chunk WAV:', err);
        }
      }
      
      // Função para extrair chunk de dados WAV
      extractWavChunk(wavDataArray, samplesPerChunk) {
        console.log(`🔍 Extraindo chunk: ${samplesPerChunk} samples de ${wavDataArray.length} buffers`);
        
        if (wavDataArray.length === 0) {
          console.log('⚠️ Nenhum buffer disponível');
          return [];
        }
        
        const result = [];
        let samplesCollected = 0;
        
        // Pegar os buffers mais recentes primeiro
        for (let i = wavDataArray.length - 1; i >= 0 && samplesCollected < samplesPerChunk; i--) {
          const buffer = wavDataArray[i];
          const needed = samplesPerChunk - samplesCollected;
          const toTake = Math.min(needed, buffer.length);
          
          // Pegar do final do buffer (dados mais recentes)
          const start = buffer.length - toTake;
          
          // Usar slice para melhor performance
          const chunk = buffer.slice(start, buffer.length);
          result.unshift(...chunk);
          samplesCollected += chunk.length;
          
          console.log(`📊 Buffer ${i}: pegou ${chunk.length} samples, total: ${samplesCollected}`);
        }
        
        console.log(`✅ Extraído ${result.length} samples`);
        return result;
      }
      
      // Função para mixar dados WAV com compressão otimizada
      mixWavData(micData, sysData) {
        const maxLength = Math.max(micData.length, sysData.length);
        const mixed = new Float32Array(maxLength);
        
        // Processar em chunks para melhor performance
        const chunkSize = 1024;
        for (let i = 0; i < maxLength; i += chunkSize) {
          const end = Math.min(i + chunkSize, maxLength);
          
          for (let j = i; j < end; j++) {
            const micSample = j < micData.length ? micData[j] : 0;
            const sysSample = j < sysData.length ? sysData[j] : 0;
            
            // Mixagem com compressão dinâmica
            const mixedSample = (micSample + sysSample) * 0.5;
            
            // Aplicar compressão suave para reduzir picos
            mixed[j] = this.applySoftCompression(mixedSample);
          }
        }
        
        return mixed;
      }
      
      // Função auxiliar para compressão suave de áudio
      applySoftCompression(sample) {
        const threshold = 0.8;
        const ratio = 0.5;
        
        if (Math.abs(sample) > threshold) {
          const sign = sample >= 0 ? 1 : -1;
          const excess = Math.abs(sample) - threshold;
          const compressed = threshold + (excess * ratio);
          return sign * Math.min(compressed, 1.0);
        }
        
        return sample;
      }
      
      // Função para criar blob WAV com compressão otimizada
      createWavBlob(audioData) {
        const length = audioData.length;
        const buffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(buffer);
        
        // WAV header otimizado para compressão
        const writeString = (offset, string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, this.sampleRate, true); // 16kHz
        view.setUint32(28, this.sampleRate * 2, true); // Byte rate
        view.setUint16(32, 2, true); // Block align
        view.setUint16(34, 16, true); // 16-bit
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Converter float32 para int16 com compressão otimizada
        let offset = 44;
        const compressionThreshold = 0.95; // Limite para compressão
        
        for (let i = 0; i < length; i++) {
          let sample = audioData[i];
          
          // Aplicar compressão adicional se necessário
          if (Math.abs(sample) > compressionThreshold) {
            const sign = sample >= 0 ? 1 : -1;
            sample = sign * (compressionThreshold + (Math.abs(sample) - compressionThreshold) * 0.3);
          }
          
          // Clamp e converter para int16
          sample = Math.max(-1, Math.min(1, sample));
          view.setInt16(offset, Math.round(sample * 0x7FFF), true);
          offset += 2;
        }
        
        return new Blob([buffer], { type: 'audio/wav' });
      }
    
      // Mixagem segura de WebM (sem decodificação manual)
// Usa elementos de áudio e MediaElementAudioSourceNode
// 🔊 Solução B — Mixagem por reprodução simultânea (sem decodeAudioData)
async mixWebmBlobs(micBlob, sysBlob) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🎵 Iniciando mixagem de blobs...');
        
        // Verifica se os blobs são válidos
        if (!micBlob || !sysBlob || micBlob.size === 0 || sysBlob.size === 0) {
          console.warn('⚠️ Blobs inválidos para mixagem:', {
            micBlob: micBlob ? micBlob.size : 'null',
            sysBlob: sysBlob ? sysBlob.size : 'null'
          });
          resolve(new Blob([], { type: 'audio/webm' }));
          return;
        }
  
        console.log('🎵 Criando contexto de áudio...');
        // Cria o contexto de áudio e destino
        const ctx = new AudioContext({ sampleRate: 48000 });
        const destination = ctx.createMediaStreamDestination();
  
        console.log('🎵 Criando elementos de áudio...');
        // Cria elementos de áudio temporários para cada blob
        const micAudio = new Audio(URL.createObjectURL(micBlob));
        const sysAudio = new Audio(URL.createObjectURL(sysBlob));
        micAudio.crossOrigin = 'anonymous';
        sysAudio.crossOrigin = 'anonymous';
        micAudio.muted = true;
        sysAudio.muted = true;
  
        console.log('🎵 Criando fontes e ganhos...');
        // Cria fontes e ganhos relativos
        const micSource = ctx.createMediaElementSource(micAudio);
        const sysSource = ctx.createMediaElementSource(sysAudio);
        const micGain = ctx.createGain();
        const sysGain = ctx.createGain();
        micGain.gain.value = 0.8; // 80 % microfone
        sysGain.gain.value = 0.5; // 50 % sistema
  
        console.log('🎵 Conectando fontes...');
        // Conecta ambas as fontes ao destino
        micSource.connect(micGain).connect(destination);
        sysSource.connect(sysGain).connect(destination);
  
        console.log('🎵 Criando MediaRecorder...');
        // Grava o resultado mixado em tempo real
        const mixedRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        const chunks = [];
  
        mixedRecorder.ondataavailable = e => {
          if (e.data.size > 0) {
            console.log('🎵 Chunk mixado:', e.data.size, 'bytes');
            chunks.push(e.data);
          }
        };
        mixedRecorder.onstop = () => {
          const mixedBlob = new Blob(chunks, { type: 'audio/webm' });
          console.log('🎵 Mixagem concluída:', mixedBlob.size, 'bytes');
          ctx.close();
          URL.revokeObjectURL(micAudio.src);
          URL.revokeObjectURL(sysAudio.src);
          resolve(mixedBlob);
        };
  
        console.log('🎵 Iniciando gravação e reprodução...');
        mixedRecorder.start();
        await Promise.all([
          micAudio.play().catch((err) => {
            console.warn('⚠️ Erro ao reproduzir áudio do microfone:', err);
          }),
          sysAudio.play().catch((err) => {
            console.warn('⚠️ Erro ao reproduzir áudio do sistema:', err);
          })
        ]);
  
        // Espera o mais longo terminar e finaliza
        const longest = Math.max(micAudio.duration || 5, sysAudio.duration || 5) * 1000;
        console.log('🎵 Duração estimada:', longest, 'ms');
        setTimeout(() => {
          console.log('🎵 Finalizando gravação...');
          mixedRecorder.stop();
        }, longest + 100);
  
      } catch (err) {
        console.error('❌ Erro ao mixar WebM (Solução B):', err);
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
        
        // Limpar gravadores do modo "both"
        if (this.micRecorder) {
            this.micRecorder = null;
        }
        if (this.sysRecorder) {
            this.sysRecorder = null;
        }
        
        // Limpar processadores WAV
        if (this.micProcessor) {
            this.micProcessor.disconnect();
            this.micProcessor = null;
        }
        if (this.sysProcessor) {
            this.sysProcessor.disconnect();
            this.sysProcessor = null;
        }
        
        // Limpar dados WAV
        this.micWavData = [];
        this.sysWavData = [];
        
        // Limpar gravador principal
        if (this.mediaRecorder) {
            this.mediaRecorder = null;
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
                sampleRate: 16000, // Reduzido para melhor compressão
                channelCount: 1,   // Mono para menor tamanho
                sampleSize: 16,    // 16-bit para compressão
                // Configurações adicionais para compressão
                volume: 1.0,
                latency: 0.1
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
        if (!this.isRecording) {
            return;
        }

        this.isStopping = true;
        this.updateCallStatus('Parando gravação...');
        this.stopBtn.disabled = true;

        // PARAR TIMER IMEDIATAMENTE
        this.stopTimer();
        
        // Parar polling de objeções
        this.assistantService.stopPolling();

        try {
            // Parar sistema de chunks
            if (this.chunkInterval) {
                clearInterval(this.chunkInterval);
                this.chunkInterval = null;
            }

            // No modo "both", parar os processadores WAV
            if (this.recordMode === 'both') {
                if (this.micProcessor) {
                    this.micProcessor.disconnect();
                    this.micProcessor = null;
                }
                if (this.sysProcessor) {
                    this.sysProcessor.disconnect();
                    this.sysProcessor = null;
                }
                console.log('✅ Processadores WAV desconectados');
            } else {
                // Modos "microphone" e "system"
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
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
        // No modo "both", o sistema de chunks é gerenciado pela função startMixedRecording
        if (this.recordMode === 'both') {
            return;
        }
        
        this.chunkInterval = setInterval(() => {
            if (this.isRecording && !this.isStopping) {
                this.processChunkInterval();
            }
        }, 5000);
    }

    processChunkInterval() {
        // No modo "both", não usar esta função - usar processDualChunk
        if (this.recordMode === 'both') {
            return;
        }

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

        // No modo "both", não usar esta função - usar processDualChunk
        if (this.recordMode === 'both') {
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
            
            console.log('🔚 Finalizando sessão:', this.sessionId);
            
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

    addObjectionMessage(text) {
        // Remover objeção anterior se existir
        const existingObjection = this.suggestionsArea.querySelector('.objection-card');
        if (existingObjection) {
            existingObjection.remove();
        }
        
        const objectionDiv = document.createElement('div');
        objectionDiv.className = 'suggestion-card objection-card active';
        
        const formattedText = this.formatResumeText(text);
        
        objectionDiv.innerHTML = `
            <div class="suggestion-header">
                <span>Objeção IA</span>
                <button class="copy-icon-btn" title="Copiar objeção">
                    Copy
                </button>
            </div>
            <div class="suggestion-text">${formattedText}</div>
        `;
        
        const copyBtn = objectionDiv.querySelector('.copy-icon-btn');
        copyBtn.addEventListener('click', () => {
            this.copyToClipboard(text);
        });
        
        this.suggestionsArea.appendChild(objectionDiv);
        this.suggestionsArea.scrollTop = this.suggestionsArea.scrollHeight;
        
        // Incrementar contador de objeções apenas na primeira vez
        if (!existingObjection) {
            this.objections++;
            this.updateMetrics();
        }
        
        console.log('✅ Objeção atualizada:', text.substring(0, 50) + '...');
    }

    clearChat() {
        // Limpar todas as sugestões e objeções
        const suggestionCards = this.suggestionsArea.querySelectorAll('.suggestion-card');
        suggestionCards.forEach(card => card.remove());
        
        // Resetar contadores
        this.objections = 0;
        this.suggestions = 0;
        this.updateMetrics();
        
        // Adicionar estado vazio se não houver nenhum
        if (this.suggestionsArea.children.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="lightbulb-icon">AI</div>
                <p>Resumo aparecerá aqui após o processamento do áudio</p>
            `;
            this.suggestionsArea.appendChild(emptyState);
        }
        
        console.log('🗑️ Chat limpo');
    }

    clearTranscript() {
        // Limpar todas as mensagens de transcrição
        const transcriptMessages = this.transcriptArea.querySelectorAll('.message');
        transcriptMessages.forEach(message => message.remove());
        
        // Adicionar estado vazio se não houver nenhum
        if (this.transcriptArea.children.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <p>A transcrição aparecerá aqui quando a chamada começar...</p>
            `;
            this.transcriptArea.appendChild(emptyState);
        }
        
        console.log('🗑️ Transcrição limpa');
    }

    getRecentTranscript() {
        if (!this.accumulatedTranscript || this.accumulatedTranscript.trim().length === 0) {
            return '';
        }
        
        // Extrair últimos 60 segundos de transcrição
        // Assumindo ~150 palavras por minuto = ~2.5 palavras por segundo
        // 60 segundos = ~150 palavras
        const words = this.accumulatedTranscript.trim().split(/\s+/);
        const recentWords = words.slice(-150); // Últimas 150 palavras
        
        return recentWords.join(' ');
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
        
        // Limpar gravadores do modo "both"
        this.micRecorder = null;
        this.sysRecorder = null;
        
        // Limpar processadores WAV
        this.micProcessor = null;
        this.sysProcessor = null;
        this.micWavData = [];
        this.sysWavData = [];
        
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