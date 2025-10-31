import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Mock do Supabase para desenvolvimento
const mockSupabase = {
    from: (table) => ({
        select: (columns = '*') => ({
            eq: (column, value) => ({ 
                data: null, 
                error: { code: 'PGRST116', message: 'Table not found' } 
            }),
            limit: (count) => ({ 
                data: null, 
                error: { code: 'PGRST116', message: 'Table not found' } 
            })
        }),
        insert: (data) => ({
            select: (columns = '*') => ({ 
                data: null, 
                error: { code: '23505', message: 'Duplicate key' } 
            })
        })
    })
};

// Exportar Supabase real ou mock
export const supabase = (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://temp.supabase.co') 
    ? mockSupabase 
    : createClient(supabaseUrl, supabaseKey);

// Função para verificar se a tabela de usuários existe
export async function checkAuthTable() {
    try {
        const { data, error } = await supabase
            .from('audio_ai_users')
            .select('*')
            .limit(1);
        
        if (error && error.code === 'PGRST116') {
            console.log("📋 Tabela audio_ai_users não existe. Criando...");
            return false;
        }
        
        console.log("✅ Tabela audio_ai_users encontrada");
        return true;
    } catch (error) {
        console.error("❌ Erro ao verificar tabela:", error.message);
        return false;
    }
}

// Função para criar usuário admin inicial
export async function createAdminUser() {
    try {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const { data, error } = await supabase
            .from('audio_ai_users')
            .insert([
                {
                    email: 'admin@institutoareluna.pt',
                    password: hashedPassword,
                    name: 'Administrador',
                    role: 'admin',
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        
        if (error) {
            if (error.code === '23505') {
                console.log("ℹ️  Usuário admin já existe");
                return true;
            }
            throw error;
        }
        
        console.log("✅ Usuário admin criado com sucesso");
        return true;
    } catch (error) {
        console.error("❌ Erro ao criar usuário admin:", error.message);
        return false;
    }
}

// =====================================================
// FUNÇÕES PARA GERENCIAMENTO DE SESSÕES
// =====================================================

/**
 * Salvar uma sessão completa
 */
export async function saveSession(sessionData) {
    try {
        const { sessionId, userEmail, title, durationSeconds, recordMode, transcripts, summaries } = sessionData;
        
        // 0. Deletar todas as sessões antigas do mesmo usuário
        const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .eq('user_email', userEmail);
        
        if (deleteError) {
            console.warn('⚠️ Erro ao deletar sessões antigas:', deleteError.message);
            // Continuar mesmo com erro (pode ser primeira sessão)
        } else {
            console.log('🗑️ Sessões antigas deletadas para usuário:', userEmail);
        }
        
        // 1. Inserir sessão principal
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .insert({
                session_id: sessionId,
                user_email: userEmail,
                title: title || `Sessão ${new Date().toLocaleString('pt-BR')}`,
                duration_seconds: durationSeconds || 0,
                record_mode: recordMode,
                metadata: {}
            })
            .select()
            .single();
        
        if (sessionError) throw sessionError;
        
        // 2. Inserir transcrições
        if (transcripts && transcripts.length > 0) {
            const transcriptsData = transcripts.map((t, index) => ({
                session_id: session.id,
                speaker: t.speaker,
                text: t.text,
                timestamp: t.timestamp || new Date().toISOString(),
                chunk_index: t.chunkIndex || index,
                is_final: t.isFinal || false
            }));
            
            const { error: transcriptsError } = await supabase
                .from('session_transcripts')
                .insert(transcriptsData);
            
            if (transcriptsError) throw transcriptsError;
        }
        
        // 3. Inserir resumos/objeções
        if (summaries && summaries.length > 0) {
            const summariesData = summaries.map(s => ({
                session_id: session.id,
                type: s.type, // 'summary', 'objection', 'suggestion'
                content: s.content,
                metadata: s.metadata || {}
            }));
            
            const { error: summariesError } = await supabase
                .from('session_summaries')
                .insert(summariesData);
            
            if (summariesError) throw summariesError;
        }
        
        console.log('✅ Sessão salva com sucesso:', session.id);
        return { success: true, sessionId: session.id };
    } catch (error) {
        console.error('❌ Erro ao salvar sessão:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Carregar uma sessão por ID
 */
export async function loadSession(sessionId) {
    try {
        // 1. Buscar sessão principal
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
        
        if (sessionError) throw sessionError;
        
        // 2. Buscar transcrições
        const { data: transcripts, error: transcriptsError } = await supabase
            .from('session_transcripts')
            .select('*')
            .eq('session_id', session.id)
            .order('timestamp', { ascending: true });
        
        if (transcriptsError) throw transcriptsError;
        
        // 3. Buscar resumos/objeções
        const { data: summaries, error: summariesError } = await supabase
            .from('session_summaries')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at', { ascending: true });
        
        if (summariesError) throw summariesError;
        
        console.log('✅ Sessão carregada:', sessionId);
        return {
            success: true,
            session: {
                ...session,
                transcripts,
                summaries
            }
        };
    } catch (error) {
        console.error('❌ Erro ao carregar sessão:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Listar sessões de um usuário
 */
export async function listSessions(userEmail, limit = 50) {
    try {
        const { data, error } = await supabase
            .from('sessions')
            .select('id, session_id, title, created_at, duration_seconds, record_mode')
            .eq('user_email', userEmail)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return { success: true, sessions: data };
    } catch (error) {
        console.error('❌ Erro ao listar sessões:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletar uma sessão (cascade delete nas tabelas relacionadas)
 */
export async function deleteSession(sessionId) {
    try {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('session_id', sessionId);
        
        if (error) throw error;
        
        console.log('✅ Sessão deletada:', sessionId);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao deletar sessão:', error);
        return { success: false, error: error.message };
    }
}