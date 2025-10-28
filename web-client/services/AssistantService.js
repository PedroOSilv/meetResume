/**
 * AssistantService - Serviço para comunicação com assistente GPT
 * Responsável por gerenciar polling e requisições ao assistente de objeções
 */
class AssistantService {
    constructor(serverUrl, authHeaders) {
        this.serverUrl = serverUrl;
        this.authHeaders = authHeaders;
        this.pollingInterval = null;
        this.isPolling = false;
        this.onObjectionCallback = null;
        this.onErrorCallback = null;
    }

    /**
     * Inicia o polling de objeções a cada 10 segundos
     * @param {Function} onObjection - Callback chamado quando objeção é recebida
     * @param {Function} onError - Callback chamado em caso de erro
     * @param {Function} getTranscript - Callback para obter transcrição recente
     */
    startPolling(onObjection, onError, getTranscript) {
        if (this.isPolling) {
            console.warn('⚠️ Polling já está ativo');
            return;
        }

        this.onObjectionCallback = onObjection;
        this.onErrorCallback = onError;
        this.getTranscriptCallback = getTranscript;
        this.isPolling = true;

        console.log('🤖 Iniciando polling de objeções a cada 15 segundos');
        
        // Primeira requisição imediata
        this.requestObjection();

        // Configurar polling a cada 15 segundos
        this.pollingInterval = setInterval(() => {
            this.requestObjection();
        }, 15000);
    }

    /**
     * Para o polling de objeções
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('🤖 Polling de objeções parado');
    }

    /**
     * Faz requisição para obter sugestão de objeção
     */
    async requestObjection() {
        if (!this.isPolling) {
            return;
        }

        // Obter transcrição recente usando o callback
        const transcript = this.getTranscriptCallback ? this.getTranscriptCallback() : '';
        
        if (!transcript || !transcript.trim()) {
            console.log('ℹ️ Nenhuma transcrição disponível para análise');
            return;
        }

        try {
            console.log('🤖 Enviando transcrição para assistente...');
            
            const response = await fetch(`${this.serverUrl}/api/assistant/objection`, {
                method: 'POST',
                headers: {
                    ...this.authHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ transcript }),
                // Timeout de 12 segundos para caber no intervalo de 15s
                signal: AbortSignal.timeout(12000)
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.objection && result.objection.trim()) {
                console.log('✅ Objeção recebida do assistente');
                if (this.onObjectionCallback) {
                    this.onObjectionCallback(result.objection);
                }
            } else {
                console.log('ℹ️ Nenhuma objeção relevante encontrada');
            }

        } catch (error) {
            console.error('❌ Erro ao buscar objeção:', error.message);
            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }
        }
    }

    /**
     * Verifica se o polling está ativo
     */
    isActive() {
        return this.isPolling;
    }
}

export default AssistantService;
