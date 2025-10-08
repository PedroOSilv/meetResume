#!/usr/bin/env node
/**
 * Servidor Node.js - Audio AI Backend
 * Servidor Express que recebe áudio, processa com OpenAI e retorna resposta
 */

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Verificar se a chave da OpenAI está configurada
if (!process.env.OPENAI_API_KEY) {
    console.error("❌ ERRO: OPENAI_API_KEY não está configurada no arquivo .env");
    console.log("Crie um arquivo .env com: OPENAI_API_KEY=sua_chave_aqui");
    process.exit(1);
}

// Inicializar OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "uploads";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
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
app.post("/upload", upload.single("audio"), async (req, res) => {
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

        console.log("🎤 Iniciando transcrição com OpenAI...");
        
        // Transcrever áudio usando OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFile.path),
            model: "whisper-1",
            language: "pt", // Português
            response_format: "text"
        });

        console.log(`📝 Transcrição: "${transcription}"`);

        // Se não há transcrição, retornar erro
        if (!transcription || transcription.trim().length === 0) {
            fs.unlinkSync(audioFile.path);
            return res.status(400).json({
                error: "Não foi possível transcrever o áudio. Verifique se há fala no arquivo."
            });
        }

        // Limpar arquivo temporário
        fs.unlinkSync(audioFile.path);

        const processingTime = Date.now() - startTime;
        console.log(`✅ Transcrição concluída em ${processingTime}ms`);

        // Retornar apenas a transcrição
        res.json({
            transcript: transcription,
            processing_time_ms: processingTime,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Erro no processamento:", error);

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
app.listen(PORT, () => {
    console.log("🚀 ================================");
    console.log(`🎙️  Servidor Audio AI Backend`);
    console.log(`🌐 Rodando em: http://localhost:${PORT}`);
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