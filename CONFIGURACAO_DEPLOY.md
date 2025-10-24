# Configuração para Deploy - Audio AI App

## ✅ Configurações Concluídas

### 1. Banco de Dados Supabase
- ✅ Tabela `audio_ai_users` criada
- ✅ Usuário admin configurado:
  - **Email:** `admin@institutoareluna.pt`
  - **Senha:** `admin123`
  - **Role:** `admin`

### 2. Configurações do Servidor
- ✅ Conexão com Supabase ativada
- ✅ Autenticação JWT configurada
- ✅ Arquivo `.env` criado com configurações

### 3. Configurações para Vercel
- ✅ `vercel.json` criado
- ✅ `package.json` principal criado
- ✅ Estrutura de deploy configurada

## 🔧 Configurações Necessárias

### 1. OpenAI API Key
**IMPORTANTE:** Você precisa configurar sua chave da OpenAI no arquivo `.env`:

```bash
# Edite o arquivo server/.env e substitua:
OPENAI_API_KEY=sua_chave_openai_aqui
```

**Como obter a chave:**
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova chave
3. Copie e cole no arquivo `.env`

### 2. Variáveis de Ambiente no Vercel
Quando fizer o deploy no Vercel, configure estas variáveis:

```bash
OPENAI_API_KEY=sua_chave_openai_aqui
JWT_SECRET=audio_ai_secret_key_production_2024
SUPABASE_URL=https://hvqckoajxhdqaxfawisd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTMyMDksImV4cCI6MjA3NDQ2OTIwOX0.r260qHrvkLMHG60Pbld2zyjwXBY3B94Edk51YDpLXM4
NODE_ENV=production
```

## 🚀 Como Fazer o Deploy

### Opção 1: Deploy Automático com Vercel CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

### Opção 2: Deploy via GitHub
1. Faça push do código para GitHub
2. Conecte o repositório no Vercel
3. Configure as variáveis de ambiente
4. Deploy automático

## 🔐 Credenciais de Acesso

**Usuário Administrador:**
- **Email:** `admin@institutoareluna.pt`
- **Senha:** `admin123`

## 📋 Checklist Final

- [ ] Configurar `OPENAI_API_KEY` no `.env`
- [ ] Testar login localmente
- [ ] Configurar variáveis no Vercel
- [ ] Fazer deploy
- [ ] Testar aplicação em produção

## 🛠️ Estrutura do Projeto

```
audio-ai-app/
├── server/                 # Backend Node.js
│   ├── server.js          # Servidor principal
│   ├── supabase.js        # Configuração Supabase
│   ├── .env               # Variáveis de ambiente
│   └── package.json       # Dependências do servidor
├── web-client/            # Frontend
│   ├── index.html         # Página principal
│   ├── login.html         # Página de login
│   ├── app.js             # Cliente JavaScript
│   └── styles.css         # Estilos
├── vercel.json            # Configuração Vercel
└── package.json           # Configuração principal
```

## 🔍 Testando a Aplicação

1. **Login:** Acesse `/login` e use as credenciais admin
2. **Gravação:** Teste a gravação de áudio
3. **Processamento:** Verifique se o áudio é processado corretamente
4. **Análise:** Confirme se a IA retorna análises

## 📞 Suporte

Se houver problemas:
1. Verifique as variáveis de ambiente
2. Confirme se a chave OpenAI está correta
3. Teste a conexão com Supabase
4. Verifique os logs do Vercel
