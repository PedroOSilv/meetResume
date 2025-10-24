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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

if (!OPENAI_API_KEY) {
    console.error("❌ ERRO: OPENAI_API_KEY não está configurada");
    process.exit(1);
}

// Inicializar OpenAI
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
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

    jwt.verify(token, process.env.JWT_SECRET || 'audio_ai_secret_key', (err, user) => {
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
            process.env.JWT_SECRET || 'audio_ai_secret_key',
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
                // Transcrever áudio usando OpenAI Whisper
                const transcriptionResponse = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(audioFile.path),
                    model: "whisper-1",
                    language: "pt"
                });
                
                transcription = transcriptionResponse.text;
                console.log(`📝 Transcrição: "${transcription}"`);

                console.log("🤖 Processando com ChatGPT...");
                
                // Processar transcrição com ChatGPT
                const chatResponse = await openai.chat.completions.create({
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
                
                analysis = chatResponse.choices[0].message.content;
                
            } catch (openaiError) {
                console.error("❌ Erro na OpenAI, usando fallback:", openaiError.message);
                
                // Fallback: transcrição simulada
                transcription = "Transcrição não disponível - erro de conexão com OpenAI";
                analysis = `## Resumo da Gravação (Modo Fallback)

**Status:** Erro de conexão com OpenAI
**Tamanho do arquivo:** ${audioFile.size} bytes
**Duração estimada:** ${Math.round(audioFile.size / 1000)} segundos

**Análise:**
- ⚠️ Não foi possível processar com IA devido a problemas de conectividade
- 📊 Arquivo de áudio recebido com sucesso
- 🔄 Tente novamente em alguns minutos

**Próximos passos:**
1. Verifique sua conexão com a internet
2. Tente novamente com um arquivo menor
3. Entre em contato com o suporte se o problema persistir

**Nota:** Esta é uma resposta de fallback devido a problemas de conectividade com a OpenAI.`;
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