import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: SUPABASE_URL e SUPABASE_ANON_KEY devem estar configuradas no arquivo .env");
    console.log("Adicione ao .env:");
    console.log("SUPABASE_URL=sua_url_aqui");
    console.log("SUPABASE_ANON_KEY=sua_chave_aqui");
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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
