# Configuração do Supabase

## Credenciais

Adicione estas variáveis no arquivo `.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://hvqckoajxhdqaxfawisd.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

## Como Obter a ANON KEY

1. Acesse: https://supabase.com/dashboard/project/hvqckoajxhdqaxfawisd/settings/api
2. Copie a **anon** key (pública)
3. Cole no arquivo `.env`

## Executar Migrations

### Via Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/hvqckoajxhdqaxfawisd/editor
2. Vá em **SQL Editor**
3. Copie o conteúdo de `migrations/001_create_sessions.sql`
4. Execute o SQL

### Verificar Tabelas Criadas

Após executar as migrations, você deve ver 3 novas tabelas:
- `sessions` - Sessões principais
- `session_transcripts` - Histórico de transcrições
- `session_summaries` - Resumos e objeções

## Endpoints Disponíveis

### Salvar Sessão
```
POST /api/sessions/save
Body: {
  sessionId: string,
  userEmail: string,
  title: string,
  durationSeconds: number,
  recordMode: string,
  transcripts: Array,
  summaries: Array
}
```

### Carregar Sessão
```
GET /api/sessions/:sessionId
```

### Listar Sessões
```
GET /api/sessions/list/:userEmail?limit=50
```

### Deletar Sessão
```
DELETE /api/sessions/:sessionId
```

## Próximos Passos

1. Execute as migrations no Supabase
2. Adicione a ANON_KEY no `.env`
3. Reinicie o servidor
4. Implemente o frontend para salvar/carregar sessões
