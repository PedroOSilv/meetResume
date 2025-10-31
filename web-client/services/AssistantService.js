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
        this.previousText = ''; // Armazena última transcrição analisada
        
        // Otimizações de requisições
        this.lastRequestTime = 0; // Timestamp da última requisição
        this.minRequestInterval = 4000; // Cooldown de 4 segundos
        this.isRequesting = false; // Flag para prevenir requisições concorrentes
        this.processedContexts = new Set(); // Cache de contextos já processados
        this.cacheTimeout = 60000; // Cache expira após 1 minuto
        this.cacheTimers = new Map(); // Timers para limpeza automática do cache
    }

    /**
     * Inicia o polling de objeções a cada 5 segundos
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
        this.previousText = ''; // Resetar texto anterior ao iniciar
        
        // Resetar otimizações ao iniciar
        this.lastRequestTime = 0;
        this.isRequesting = false;
        this.processedContexts.clear();
        this.cacheTimers.forEach(timer => clearTimeout(timer));
        this.cacheTimers.clear();

        console.log('🤖 Iniciando polling de objeções a cada 5 segundos');
        
        // Primeira requisição imediata
        this.requestObjection();

        // Configurar polling a cada 5 segundos
        this.pollingInterval = setInterval(() => {
            this.requestObjection();
        }, 1000);
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
        this.previousText = ''; // Limpar texto anterior ao parar
        
        // Limpar cache e timers
        this.processedContexts.clear();
        this.cacheTimers.forEach(timer => clearTimeout(timer));
        this.cacheTimers.clear();
        
        console.log('🤖 Polling de objeções parado');
    }

    /**
     * Gera hash simples para o contexto
     * @param {string} context - Contexto (últimas 15 palavras)
     * @returns {string} Hash do contexto
     */
    hashContext(context) {
        if (!context || !context.trim()) {
            return '';
        }
        
        // Normalizar contexto: remover espaços extras e converter para minúsculas
        const normalized = context.trim().toLowerCase().replace(/\s+/g, ' ');
        
        // Criar hash simples (pode usar uma função de hash simples)
        // Para simplicidade, vamos usar a string normalizada como hash
        // Em produção, poderia usar uma função de hash como crypto.createHash
        return normalized;
    }

    /**
     * Adiciona hash ao cache com limpeza automática
     * @param {string} hash - Hash do contexto
     */
    addToCache(hash) {
        if (!hash) return;
        
        this.processedContexts.add(hash);
        
        // Limpar hash do cache após timeout
        const timer = setTimeout(() => {
            this.processedContexts.delete(hash);
            this.cacheTimers.delete(hash);
        }, this.cacheTimeout);
        
        // Armazenar timer para possível limpeza antecipada
        this.cacheTimers.set(hash, timer);
    }

    /**
     * Lista de interjeições e sons a ignorar
     */
    getFilteredInterjections() {
        return ['uh', 'ah', 'então', 'aham', 'é', 'né', 'hmm', 'hum', 'eh', 'ahã'];
    }

    /**
     * Filtra interjeições de uma lista de palavras
     * @param {Array<string>} words - Array de palavras
     * @returns {Array<string>} Array de palavras válidas (sem interjeições)
     */
    filterInterjections(words) {
        const interjections = this.getFilteredInterjections();
        return words
            .map(word => word.toLowerCase().trim())
            .filter(word => {
                // Remover palavras vazias e interjeições
                if (!word || word.length === 0) return false;
                return !interjections.includes(word);
            });
    }

    /**
     * Conta palavras novas válidas comparando texto atual com texto anterior
     * @param {string} currentText - Texto atual completo
     * @param {string} previousText - Texto anterior completo
     * @returns {number} Número de palavras novas válidas
     */
    countNewWords(currentText, previousText) {
        if (!currentText || !currentText.trim()) {
            return 0;
        }

        // Se não há texto anterior, retornar todas as palavras válidas
        if (!previousText || !previousText.trim()) {
            const words = currentText.trim().split(/\s+/);
            const validWords = this.filterInterjections(words);
            return validWords.length;
        }

        // Verificar se o texto atual contém o texto anterior
        if (!currentText.startsWith(previousText)) {
            // Texto foi modificado de forma inesperada, considerar tudo como novo
            const words = currentText.trim().split(/\s+/);
            const validWords = this.filterInterjections(words);
            return validWords.length;
        }

        // Extrair apenas o texto novo
        const newText = currentText.substring(previousText.length).trim();
        
        if (!newText) {
            return 0;
        }

        // Dividir em palavras e filtrar interjeições
        const newWords = newText.split(/\s+/);
        const validNewWords = this.filterInterjections(newWords);

        return validNewWords.length;
    }

    /**
     * Extrai as últimas N palavras da transcrição
     * @param {string} text - Texto completo
     * @param {number} count - Número de palavras a extrair
     * @returns {string} Últimas N palavras como string
     */
    getLastWords(text, count = 15) {
        if (!text || !text.trim()) {
            return '';
        }

        const words = text.trim().split(/\s+/);
        const lastWords = words.slice(-count);
        return lastWords.join(' ');
    }

    /**
     * Faz requisição para obter sugestão de objeção
     * Só envia quando houver 4 ou mais palavras novas na transcrição
     * Implementa otimizações: cooldown, prevenção de concorrência e cache
     */
    async requestObjection() {
        // 1. Verificar se polling está ativo
        if (!this.isPolling) {
            return;
        }

        // 2. Verificar se já há requisição em andamento (prevenir concorrência)
        if (this.isRequesting) {
            console.log('⏳ Requisição já em andamento, aguardando...');
            return;
        }

        // 3. Obter transcrição completa usando o callback
        const currentText = this.getTranscriptCallback ? this.getTranscriptCallback() : '';
        
        if (!currentText || !currentText.trim()) {
            console.log('ℹ️ Nenhuma transcrição disponível para análise');
            return;
        }

        // 4. Contar palavras novas válidas
        const newWordsCount = this.countNewWords(currentText, this.previousText);
        
        // 5. Se não há 4 palavras novas, não fazer requisição
        if (newWordsCount < 4) {
            console.log(`ℹ️ Apenas ${newWordsCount} palavra(s) nova(s). Aguardando mais conteúdo...`);
            return;
        }

        // 6. Extrair últimas 15 palavras como contexto
        const context = this.getLastWords(currentText, 15);
        
        if (!context || !context.trim()) {
            console.log('ℹ️ Contexto vazio, não é possível fazer requisição');
            return;
        }

        // 7. Gerar hash do contexto
        const contextHash = this.hashContext(context);
        
        // 8. Verificar se hash está no cache
        if (this.processedContexts.has(contextHash)) {
            console.log('♻️ Contexto já foi analisado recentemente, pulando requisição');
            return;
        }

        // 9. Verificar cooldown (4 segundos)
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            const remainingTime = Math.ceil((this.minRequestInterval - timeSinceLastRequest) / 1000);
            console.log(`⏱️ Aguardando cooldown... (${remainingTime}s restantes)`);
            return;
        }

        // 10. Definir flag de requisição em andamento
        this.isRequesting = true;

        try {
            console.log(`🤖 Enviando transcrição para assistente (${newWordsCount} palavras novas)...`);
            
            // Criar AbortController para timeout manual
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 70000);
            
            const response = await fetch(`${this.serverUrl}/api/assistant/objection`, {
                method: 'POST',
                headers: {
                    ...this.authHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    transcript: context
                }),
                signal: controller.signal
            });
            
            // Limpar timeout após receber resposta
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // 12. Adicionar hash ao cache após sucesso
            this.addToCache(contextHash);
            
            // Atualizar previousText apenas após envio bem-sucedido
            this.previousText = currentText;
            
            // Atualizar timestamp da última requisição
            this.lastRequestTime = Date.now();
            
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
            // Tratar erros específicos de forma diferente
            if (error.name === 'AbortError') {
                console.warn('⏱️ Timeout na requisição de objeção (assinante não afetado)');
            } else if (error.message.includes('504')) {
                console.warn('⏱️ Servidor ocupado, ignorando esta requisição (assinante não afetado)');
            } else {
                console.error('❌ Erro ao buscar objeção:', error.message);
            }
            
            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }
            // Não atualizar previousText em caso de erro
            // Mas ainda atualizar lastRequestTime para evitar spam de erros
            this.lastRequestTime = Date.now();
        } finally {
            // 13. Sempre garantir que a flag seja resetada
            this.isRequesting = false;
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
