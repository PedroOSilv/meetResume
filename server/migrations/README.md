# Database Migrations - Supabase

## Como executar as migrations

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/hvqckoajxhdqaxfawisd/editor
2. Vá para **SQL Editor**
3. Copie e cole o conteúdo de `001_create_sessions.sql`
4. Clique em **Run** para executar

### Opção 2: Via API (Programático)

O backend executará automaticamente as migrations na inicialização.

## Estrutura do Banco

### Tabela: `sessions`
Armazena informações principais da sessão de gravação.

**Campos:**
- `id`: UUID (Primary Key)
- `session_id`: String única da sessão
- `user_email`: Email do usuário
- `title`: Título/nome da sessão
- `created_at`: Data de criação
- `updated_at`: Data de atualização
- `duration_seconds`: Duração em segundos
- `record_mode`: Modo de gravação (microphone, system, both)
- `metadata`: Dados extras em JSON

### Tabela: `session_transcripts`
Histórico completo das transcrições.

**Campos:**
- `id`: UUID (Primary Key)
- `session_id`: Referência para sessions
- `speaker`: Nome do speaker (Transcrição, Sistema, etc)
- `text`: Texto transcrito
- `timestamp`: Momento da transcrição
- `chunk_index`: Índice do chunk
- `is_final`: Se é transcrição final

### Tabela: `session_summaries`
Resumos, objeções e sugestões da IA.

**Campos:**
- `id`: UUID (Primary Key)
- `session_id`: Referência para sessions
- `type`: Tipo (summary, objection, suggestion)
- `content`: Conteúdo do resumo/objeção
- `created_at`: Data de criação
- `metadata`: Dados extras em JSON

## Próximos Passos

Após executar as migrations, o backend estará pronto para salvar/carregar sessões.
