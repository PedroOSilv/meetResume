-- Tabela principal de sessões
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    title VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0,
    record_mode VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de transcrições (histórico completo)
CREATE TABLE IF NOT EXISTS session_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    speaker VARCHAR(100),
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    chunk_index INTEGER,
    is_final BOOLEAN DEFAULT false
);

-- Tabela de resumos/objeções da IA
CREATE TABLE IF NOT EXISTS session_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'summary', 'objection', 'suggestion'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON session_transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON session_transcripts(timestamp);
CREATE INDEX IF NOT EXISTS idx_summaries_session_id ON session_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_summaries_type ON session_summaries(type);

-- RLS (Row Level Security) - opcional, para produção
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_transcripts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

-- Política de acesso baseada em user_email (opcional)
-- CREATE POLICY "Users can view their own sessions" ON sessions
--     FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');
