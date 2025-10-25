#!/usr/bin/env node
/**
 * Servidor Node.js - Omni Resume Backend
 * Servidor Express que recebe áudio, processa com OpenAI e retorna resposta
 */

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
// Importar Supabase apenas se as variáveis estiverem configuradas
let supabase, checkAuthTable, createAdminUser;
try {
    const supabaseModule = await import("./supabase.js");
    supabase = supabaseModule.supabase;
    checkAuthTable = supabaseModule.checkAuthTable;
    createAdminUser = supabaseModule.createAdminUser;
} catch (error) {
    console.log("⚠️  Supabase não configurado, usando modo desenvolvimento");
    // Mock functions para desenvolvimento
    checkAuthTable = async () => false;
    createAdminUser = async () => true;
}

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
// Configuração de host para aceitar conexões externas
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;

// Verificar se a chave da OpenAI está configurada
console.log("🔍 Investigando variável de ambiente OPENAI_API_KEY...");
console.log(`🔍 process.env.OPENAI_API_KEY existe: ${!!process.env.OPENAI_API_KEY}`);
console.log(`🔍 process.env.OPENAI_API_KEY (primeiros 20 chars): "${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 20) + '...' : 'não definida'}"`);

let OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Verificar se a chave existe
if (!OPENAI_API_KEY) {
    console.error("❌ ERRO: OPENAI_API_KEY não está configurada nas variáveis de ambiente");
    console.error("❌ Configure a variável OPENAI_API_KEY no Vercel ou localmente");
    process.exit(1);
}

// Corrigir chave se contém "Bearer " duplicado
console.log(`🔍 Chave original: "${OPENAI_API_KEY.substring(0, 20)}..."`);
console.log(`🔍 Chave contém 'Bearer ': ${OPENAI_API_KEY.includes('Bearer ')}`);
console.log(`🔍 Chave começa com 'Bearer ': ${OPENAI_API_KEY.startsWith('Bearer ')}`);

if (OPENAI_API_KEY.includes('Bearer ')) {
    // Remove qualquer ocorrência de "Bearer " da chave
    OPENAI_API_KEY = OPENAI_API_KEY.replace(/Bearer\s+/gi, '').trim();
    console.log("🔧 Chave OpenAI corrigida - removido 'Bearer ' duplicado");
    console.log(`🔧 Chave corrigida: "${OPENAI_API_KEY.substring(0, 20)}..."`);
}

// Validação adicional de caracteres especiais
console.log(`🔍 Chave contém caracteres especiais: ${/[^\w\-\.]/.test(OPENAI_API_KEY)}`);
console.log(`🔍 Chave contém quebras de linha: ${OPENAI_API_KEY.includes('\n') || OPENAI_API_KEY.includes('\r')}`);
console.log(`🔍 Chave contém espaços extras: ${OPENAI_API_KEY !== OPENAI_API_KEY.trim()}`);

// Limpar caracteres especiais se necessário
if (/[^\w\-\.]/.test(OPENAI_API_KEY)) {
    console.log("🔧 Limpando caracteres especiais da chave...");
    OPENAI_API_KEY = OPENAI_API_KEY.replace(/[^\w\-\.]/g, '').trim();
    console.log(`🔧 Chave limpa: "${OPENAI_API_KEY.substring(0, 20)}..."`);
}

console.log("🔍 Verificando configurações...");
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
console.log(`🔑 OPENAI_API_KEY configurada: ${OPENAI_API_KEY ? 'Sim' : 'Não'}`);
console.log(`🔑 OPENAI_API_KEY (primeiros 10 chars): ${OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'Não configurada'}`);
console.log(`🔑 OPENAI_API_KEY (últimos 10 chars): ${OPENAI_API_KEY ? '...' + OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 10) : 'Não configurada'}`);
console.log(`🔑 OPENAI_API_KEY (tamanho): ${OPENAI_API_KEY ? OPENAI_API_KEY.length : 0} caracteres`);
console.log(`🔑 OPENAI_API_KEY (formato correto): ${OPENAI_API_KEY ? (OPENAI_API_KEY.startsWith('sk-') ? 'Sim' : 'Não') : 'Não configurada'}`);
console.log(`🔑 OPENAI_API_KEY (contém Bearer): ${OPENAI_API_KEY ? (OPENAI_API_KEY.includes('Bearer ') ? 'Sim' : 'Não') : 'Não configurada'}`);

// Diagnóstico de variáveis de ambiente do Vercel
console.log("🌐 Diagnóstico de ambiente Vercel:");
console.log(`   - VERCEL: ${process.env.VERCEL ? 'Sim' : 'Não'}`);
console.log(`   - VERCEL_ENV: ${process.env.VERCEL_ENV || 'não definido'}`);
console.log(`   - VERCEL_REGION: ${process.env.VERCEL_REGION || 'não definido'}`);
console.log(`   - VERCEL_URL: ${process.env.VERCEL_URL || 'não definido'}`);
console.log(`   - PORT: ${process.env.PORT || 'não definido'}`);
console.log(`   - HOST: ${process.env.HOST || 'não definido'}`);

// Verificar JWT_SECRET
if (!process.env.JWT_SECRET) {
    console.error("❌ ERRO: JWT_SECRET não está configurada nas variáveis de ambiente");
    console.error("❌ Configure a variável JWT_SECRET no Vercel ou localmente");
    process.exit(1);
}

// Inicializar OpenAI
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    timeout: 60000, // 60 segundos (aumentado para Vercel)
    maxRetries: 0, // Desabilitar retry automático (usamos nosso próprio)
    dangerouslyAllowBrowser: false // Segurança adicional
});

// Função para carregar prompt do arquivo .md
function loadPromptFromFile() {
    try {
        const promptPath = path.join(process.cwd(), 'prompt.md');
        if (fs.existsSync(promptPath)) {
            const promptContent = fs.readFileSync(promptPath, 'utf8');
            console.log("📄 Prompt carregado do arquivo prompt.md");
            return promptContent;
        } else {
            console.log("⚠️  Arquivo prompt.md não encontrado, usando prompt padrão");
            return getDefaultPrompt();
        }
    } catch (error) {
        console.error("❌ Erro ao carregar prompt.md:", error.message);
        console.log("🔄 Usando prompt padrão");
        return getDefaultPrompt();
    }
}

// Prompt padrão como fallback
function getDefaultPrompt() {
    return `Você é um assistente inteligente que analisa transcrições de áudio. 

Sua função é:
1. Analisar o conteúdo da transcrição
2. Identificar pontos principais e temas abordados
3. Fornecer um resumo claro e objetivo
4. Sugerir ações ou próximos passos quando relevante

Responda de forma clara, organizada e útil em português.`;
}

// Configuração do prompt personalizado para ChatGPT
const CHATGPT_PROMPT = process.env.CHATGPT_PROMPT || loadPromptFromFile();

// Inicializar sistema de autenticação
async function initializeAuth() {
    try {
        console.log("🔐 Inicializando sistema de autenticação...");
        
        // Verificar se Supabase está configurado
        if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'https://temp.supabase.co') {
            console.log("⚠️  Supabase não configurado - usando modo desenvolvimento");
            console.log("✅ Sistema de autenticação em modo desenvolvimento");
            return;
        }
        
        // Verificar se a tabela existe
        const tableExists = await checkAuthTable();
        
        if (!tableExists) {
            console.log("📋 Criando tabela audio_ai_users no Supabase...");
            console.log("⚠️  Execute o seguinte SQL no Supabase:");
            console.log(`
CREATE TABLE audio_ai_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir usuário admin
INSERT INTO audio_ai_users (email, password, name, role) 
VALUES ('admin@institutoareluna.pt', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'admin');
            `);
            return;
        }
        
        // Criar usuário admin se não existir
        await createAdminUser();
        
        console.log("✅ Sistema de autenticação inicializado");
    } catch (error) {
        console.error("❌ Erro ao inicializar autenticação:", error.message);
        console.log("⚠️  Continuando em modo desenvolvimento");
    }
}

// Inicializar autenticação
initializeAuth();

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de timeout para evitar travamentos
app.use((req, res, next) => {
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(504).json({
                error: 'Timeout do servidor',
                message: 'A operação demorou muito para ser processada'
            });
        }
    }, 50000); // 50 segundos

    res.on('finish', () => {
        clearTimeout(timeout);
    });

    next();
});

// Servir arquivos estáticos do cliente web
const webClientPath = path.join(process.cwd(), 'web-client');
app.use(express.static(webClientPath));

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acesso necessário' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Rota raiz para servir o cliente web
app.get("/", (req, res) => {
    res.sendFile(path.join(webClientPath, 'index.html'));
});

// Rota de login
app.get("/login", (req, res) => {
    res.sendFile(path.join(webClientPath, 'login.html'));
});

// Rotas de autenticação (modo desenvolvimento)
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }
        
        // Modo desenvolvimento - aceitar qualquer credencial
        console.log(`🔐 Login tentativa: ${email}`);
        
        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: 1, 
                email: email, 
                role: 'admin' 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login realizado com sucesso (modo desenvolvimento)',
            token,
            user: {
                id: 1,
                email: email,
                name: 'Usuário Desenvolvimento',
                role: 'admin'
            }
        });
        
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Rota para verificar token
app.get("/api/auth/verify", authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Rota para logout
app.post("/api/auth/logout", (req, res) => {
    res.json({ message: 'Logout realizado com sucesso' });
});

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Usar diretório temporário do sistema
        const uploadDir = process.env.TMPDIR || process.env.TMP || '/tmp';
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `audio_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limite
    },
    fileFilter: (req, file, cb) => {
        // Aceitar apenas arquivos de áudio
        const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(wav|mp3|mp4|webm)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não suportado. Use WAV, MP3, MP4 ou WebM.'));
        }
    }
});

// Rota de health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Rota principal para upload e processamento de áudio
app.post("/upload", authenticateToken, upload.single("audio"), async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Verificar se arquivo foi enviado
        if (!req.file) {
            return res.status(400).json({
                error: "Nenhum arquivo de áudio foi enviado"
            });
        }

        const audioFile = req.file;
        console.log(`📁 Arquivo recebido: ${audioFile.filename} (${audioFile.size} bytes)`);
        console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
        console.log(`🔑 OpenAI API Key configurada: ${process.env.OPENAI_API_KEY ? 'Sim' : 'Não'}`);
        console.log(`🔑 OpenAI API Key (primeiros 10 chars): ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'Não configurada'}`);

        // Verificar se arquivo não está vazio
        if (audioFile.size === 0) {
            fs.unlinkSync(audioFile.path); // Limpar arquivo vazio
            return res.status(400).json({
                error: "Arquivo de áudio está vazio"
            });
        }

        console.log("🎤 Processando áudio com OpenAI Whisper...");
        
        try {
            // Tentar OpenAI com retry
            let transcription = "";
            let analysis = "";
            
            try {
                // Verificar conectividade primeiro
                console.log("🔍 Verificando conectividade com OpenAI...");
                
                // Diagnóstico de rede e ambiente
                console.log("🌍 Diagnóstico de ambiente:");
                console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
                console.log(`   - PLATFORM: ${process.platform}`);
                console.log(`   - NODE_VERSION: ${process.version}`);
                console.log(`   - MEMORY: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
                console.log(`   - UPTIME: ${Math.round(process.uptime())}s`);
                
                // Teste de conectividade básica
                try {
                    const https = await import('https');
                    console.log("🔗 Testando conectividade básica com OpenAI...");
                    
                    const testConnectivity = () => {
                        return new Promise((resolve, reject) => {
                            const req = https.request({
                                hostname: 'api.openai.com',
                                port: 443,
                                path: '/v1/models',
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                                    'User-Agent': 'AudioAI/1.0'
                                },
                                timeout: 10000
                            }, (res) => {
                                console.log(`✅ Conectividade básica OK - Status: ${res.statusCode}`);
                                resolve(res.statusCode);
                            });
                            
                            req.on('error', (err) => {
                                console.error(`❌ Erro de conectividade básica:`, err.message);
                                reject(err);
                            });
                            
                            req.on('timeout', () => {
                                console.error(`❌ Timeout na conectividade básica`);
                                req.destroy();
                                reject(new Error('Timeout'));
                            });
                            
                            req.end();
                        });
                    };
                    
                    await testConnectivity();
                } catch (connectivityError) {
                    console.error("❌ Falha no teste de conectividade:", connectivityError.message);
                }
                
                // Função de retry para OpenAI
                const retryOpenAI = async (operation, maxRetries = 3) => {
                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        try {
                            console.log(`🔄 Tentativa ${attempt}/${maxRetries} de conexão com OpenAI...`);
                            return await operation();
                        } catch (error) {
                            console.error(`❌ Tentativa ${attempt} falhou:`, error.message);
                            console.error(`❌ Tipo do erro:`, typeof error);
                            console.error(`❌ Nome do erro:`, error.name);
                            console.error(`❌ Código do erro:`, error.code);
                            console.error(`❌ Causa do erro:`, error.cause);
                            console.error(`❌ Stack trace:`, error.stack);
                            
                            // Diagnóstico específico do erro
                            if (error.message.includes('Connection error')) {
                                console.error(`🔍 DIAGNÓSTICO: Erro de conexão detectado`);
                                console.error(`   - Possível causa: DNS, firewall, ou proxy`);
                                console.error(`   - Ambiente: ${process.env.NODE_ENV}`);
                                console.error(`   - Plataforma: ${process.platform}`);
                            }
                            
                            if (attempt === maxRetries) {
                                throw error;
                            }
                            
                            // Aguardar antes da próxima tentativa
                            const delay = attempt * 2000; // 2s, 4s, 6s
                            console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                };
                
                // Validação final da chave antes de usar
                console.log("🔧 Validação final da chave OpenAI...");
                console.log(`🔑 Chave final: "${OPENAI_API_KEY.substring(0, 15)}..."`);
                console.log(`🔑 Tamanho: ${OPENAI_API_KEY.length} caracteres`);
                console.log(`🔑 Formato correto: ${OPENAI_API_KEY.startsWith('sk-') ? 'Sim' : 'Não'}`);
                console.log(`🔑 Contém Bearer: ${OPENAI_API_KEY.includes('Bearer ') ? 'Sim' : 'Não'}`);
                
                // Teste de configuração da OpenAI antes de usar
                console.log("🔧 Testando configuração da OpenAI...");
                try {
                    const testResponse = await openai.models.list();
                    console.log(`✅ OpenAI configurada corretamente - ${testResponse.data.length} modelos disponíveis`);
                } catch (configError) {
                    console.error("❌ Erro na configuração da OpenAI:", configError.message);
                    console.error("❌ Detalhes do erro de configuração:", JSON.stringify(configError, null, 2));
                }
                
                // Transcrever áudio usando OpenAI Whisper com retry
                const transcriptionResponse = await retryOpenAI(async () => {
                    console.log("🎤 Iniciando transcrição com Whisper...");
                    console.log(`📁 Arquivo: ${audioFile.path} (${audioFile.size} bytes)`);
                    
                    return await openai.audio.transcriptions.create({
                        file: fs.createReadStream(audioFile.path),
                        model: "whisper-1",
                        language: "pt"
                    });
                });
                
                transcription = transcriptionResponse.text;
                console.log(`📝 Transcrição: "${transcription}"`);

                console.log("🤖 Processando com ChatGPT...");
                
                // Processar transcrição com ChatGPT com retry
                const chatResponse = await retryOpenAI(async () => {
                    return await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "system",
                                content: CHATGPT_PROMPT
                            },
                            {
                                role: "user",
                                content: `Analise a seguinte transcrição de áudio:\n\n${transcription}`
                            }
                        ],
                        max_tokens: 1000,
                        temperature: 0.7
                    });
                });
                
                analysis = chatResponse.choices[0].message.content;
                
            } catch (openaiError) {
                console.error("❌ Erro na OpenAI, usando fallback:", openaiError.message);
                console.error("❌ Erro completo:", JSON.stringify(openaiError, null, 2));
                console.error("❌ Status:", openaiError.status);
                console.error("❌ Code:", openaiError.code);
                console.error("❌ Tipo do erro:", typeof openaiError);
                console.error("❌ Stack trace:", openaiError.stack);
                
                // Determinar tipo de erro para fallback mais específico
                const isConnectionError = openaiError.message.includes('Connection error') || 
                                       openaiError.message.includes('ECONNREFUSED') ||
                                       openaiError.message.includes('timeout');
                
                const isRateLimitError = openaiError.message.includes('rate limit') ||
                                       openaiError.message.includes('quota');
                
                // Fallback: transcrição simulada
                transcription = "Transcrição não disponível - erro de conexão com OpenAI";
                
                // Calcular duração estimada mais precisa (assumindo ~16kbps para WebM)
                const estimatedDuration = Math.round(audioFile.size / 2000); // Mais preciso para WebM
                
                let errorType = "Erro de conexão";
                let errorMessage = "Problemas de conectividade com a OpenAI";
                let suggestions = [
                    "Verifique sua conexão com a internet",
                    "Tente novamente em alguns minutos",
                    "Entre em contato com o suporte se o problema persistir"
                ];
                
                if (isConnectionError) {
                    errorType = "Erro de conexão";
                    errorMessage = "Não foi possível conectar com a OpenAI";
                    suggestions = [
                        "Verifique sua conexão com a internet",
                        "Aguarde alguns minutos e tente novamente",
                        "O servidor pode estar temporariamente indisponível"
                    ];
                } else if (isRateLimitError) {
                    errorType = "Limite de taxa";
                    errorMessage = "Limite de requisições da OpenAI atingido";
                    suggestions = [
                        "Aguarde alguns minutos antes de tentar novamente",
                        "Tente com um arquivo menor",
                        "Entre em contato com o suporte"
                    ];
                }
                
                analysis = `## Resumo da Gravação (Modo Fallback)

**Status:** ${errorType}
**Tamanho do arquivo:** ${audioFile.size} bytes
**Duração estimada:** ${estimatedDuration} segundos
**Ambiente:** ${process.env.NODE_ENV || 'desenvolvimento'}
**Erro:** ${errorMessage}

**Análise:**
- ⚠️ Não foi possível processar com IA devido a: ${errorMessage}
- 📊 Arquivo de áudio recebido com sucesso (${audioFile.size} bytes)
- 🔄 Sistema de retry ativado mas falhou após 3 tentativas

**Próximos passos:**
${suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}

**Nota:** Esta é uma resposta de fallback devido a problemas de conectividade com a OpenAI. O sistema tentou reconectar automaticamente mas não foi possível estabelecer conexão.`;
            }
            
            // Limpar arquivo temporário
            fs.unlinkSync(audioFile.path);

            const processingTime = Date.now() - startTime;
            console.log(`✅ Processamento completo em ${processingTime}ms`);

            // Retornar transcrição e análise
            res.json({
                transcript: transcription,
                analysis: analysis,
                processing_time_ms: processingTime,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error("❌ Erro geral no processamento:", error);
            
            // Limpar arquivo temporário
            if (fs.existsSync(audioFile.path)) {
                fs.unlinkSync(audioFile.path);
            }
            
            // Retornar erro genérico
            res.status(500).json({
                error: "Erro interno do servidor",
                details: "Tente novamente em alguns minutos"
            });
        }

    } catch (error) {
        console.error("❌ Erro no processamento:", error);
        console.error("❌ Stack trace:", error.stack);

        // Limpar arquivo se existir
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error("Erro ao limpar arquivo:", cleanupError);
            }
        }

        // Determinar tipo de erro
        let errorMessage = "Erro interno do servidor";
        let statusCode = 500;

        if (error.code === 'insufficient_quota') {
            errorMessage = "Cota da OpenAI esgotada. Verifique sua conta.";
            statusCode = 402;
        } else if (error.code === 'invalid_api_key') {
            errorMessage = "Chave da API OpenAI inválida.";
            statusCode = 401;
        } else if (error.message.includes('audio')) {
            errorMessage = "Erro ao processar arquivo de áudio: " + error.message;
            statusCode = 400;
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            errorMessage = "Erro de conexão com OpenAI. Tente novamente.";
            statusCode = 503;
        } else if (error.message.includes('FUNCTION_INVOCATION_FAILED')) {
            errorMessage = "Timeout do servidor. Tente com um arquivo menor.";
            statusCode = 504;
        }

        res.status(statusCode).json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Middleware de tratamento de erros do multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: "Arquivo muito grande. Máximo permitido: 25MB"
            });
        }
    }
    
    if (error.message.includes('Tipo de arquivo não suportado')) {
        return res.status(400).json({
            error: error.message
        });
    }

    console.error("Erro não tratado:", error);
    res.status(500).json({
        error: "Erro interno do servidor"
    });
});

// Rota 404
app.use("*", (req, res) => {
    res.status(404).json({
        error: "Endpoint não encontrado",
        available_endpoints: [
            "GET /health - Status do servidor",
            "POST /upload - Upload e processamento de áudio"
        ]
    });
});

// Iniciar servidor
app.listen(PORT, HOST, () => {
    console.log("🚀 ================================");
    console.log(`🎙️  Servidor Omni Resume Backend`);
    console.log(`🌐 Rodando em: http://localhost:${PORT}`);
    console.log(`🌍 Acesso externo: http://192.168.0.143:${PORT}`);
    console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
    console.log("🚀 ================================");
    console.log("");
    console.log("Endpoints disponíveis:");
    console.log(`  GET  /health - Status do servidor`);
    console.log(`  POST /upload - Upload de áudio`);
    console.log("");
});

// Tratamento de sinais para shutdown graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Recebido SIGINT. Encerrando servidor...');
    
    // Limpar diretório de uploads
    const uploadDir = 'uploads';
    if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        files.forEach(file => {
            try {
                fs.unlinkSync(path.join(uploadDir, file));
            } catch (err) {
                console.error(`Erro ao limpar arquivo ${file}:`, err);
            }
        });
    }
    
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
    process.exit(1);
});