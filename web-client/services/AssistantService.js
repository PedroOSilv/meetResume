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
     * Inicia o polling de objeções a cada 5 segundos
     * @param {Function} onObjection - Callback chamado quando objeção é recebida
     * @param {Function} onError - Callback chamado em caso de erro
     * @param {Function} getTranscript - Callback para obter transcrição recente
     * @param {Function} getPreviousObjections - Callback para obter objeções anteriores
     */
    startPolling(onObjection, onError, getTranscript, getPreviousObjections) {
        if (this.isPolling) {
            console.warn('⚠️ Polling já está ativo');
            return;
        }

        this.onObjectionCallback = onObjection;
        this.onErrorCallback = onError;
        this.getTranscriptCallback = getTranscript;
        this.getPreviousObjectionsCallback = getPreviousObjections;
        this.isPolling = true;
        this.lastTranscript = '';

        console.log('🤖 Iniciando polling de objeções a cada 5 segundos');
        
        // Primeira requisição imediata
        this.requestObjection();

        // Configurar polling a cada 5 segundos
        this.pollingInterval = setInterval(() => {
            this.requestObjection();
        }, 5000);
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

        // Pausar polling se transcrição não mudou (economia de API)
        if (transcript === this.lastTranscript) {
            console.log('⏸️ Transcrição não mudou, pulando requisição');
            return;
        }
        
        this.lastTranscript = transcript;

        // Obter objeções anteriores para evitar repetição
        const previousObjections = this.getPreviousObjectionsCallback ? this.getPreviousObjectionsCallback() : [];

        try {
            console.log('🤖 Enviando transcrição para assistente...');
            
            const response = await fetch(`${this.serverUrl}/api/assistant/objection`, {
                method: 'POST',
                headers: {
                    ...this.authHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    transcript,
                    previousObjections 
                }),
                // Timeout de 70 segundos para dar tempo ao Assistant API processar
                signal: AbortSignal.timeout(70000)
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Verificar se resposta é "0" (sem objeção) ou vazia
            if (result.objection && result.objection.trim() && result.objection !== '0') {
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
