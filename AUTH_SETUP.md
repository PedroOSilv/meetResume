# 🔐 Configuração de Autenticação - Audio AI

## Configuração do Supabase

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL e a chave anônima

### 2. Criar Tabela de Usuários

Execute o seguinte SQL no editor SQL do Supabase:

```sql
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
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` em `audio-ai-app/server/`:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3030
HOST=0.0.0.0

# JWT Secret (change this in production)
JWT_SECRET=your_jwt_secret_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Instalação das Dependências

```bash
cd audio-ai-app/server
npm install
```

## Credenciais de Acesso

**Usuário Admin:**
- Email: `admin@institutoareluna.pt`
- Senha: `admin123`

## Funcionalidades de Autenticação

### ✅ Implementado

- **Login/Logout**: Sistema completo de autenticação
- **JWT Tokens**: Tokens seguros com expiração de 24h
- **Proteção de Rotas**: Upload de áudio protegido
- **Interface de Login**: Design seguindo identidade visual
- **Verificação Automática**: Redirecionamento para login se não autenticado

### 🎨 Interface

- **Página de Login**: `/login`
- **Design**: Seguindo identidade visual do projeto
- **Responsivo**: Funciona em desktop e mobile
- **Animações**: Background sutil e transições suaves

### 🔒 Segurança

- **Senhas Hash**: bcrypt para hash de senhas
- **JWT**: Tokens seguros com expiração
- **Validação**: Verificação de token em todas as requisições
- **CORS**: Configurado para segurança

## Estrutura de Arquivos

```
audio-ai-app/
├── server/
│   ├── supabase.js          # Configuração Supabase
│   ├── server.js            # Servidor com rotas de auth
│   └── .env                  # Variáveis de ambiente
└── web-client/
    ├── login.html           # Página de login
    ├── login-styles.css     # Estilos da página de login
    ├── login.js             # Lógica de autenticação
    └── app.js               # Cliente com verificação de auth
```

## Como Usar

1. **Configurar Supabase**: Criar projeto e tabela
2. **Configurar .env**: Adicionar variáveis de ambiente
3. **Instalar Dependências**: `npm install`
4. **Iniciar Servidor**: `npm start`
5. **Acessar**: `http://localhost:3030`
6. **Fazer Login**: Usar credenciais admin

## Troubleshooting

### Erro de Conexão com Supabase
- Verifique se as variáveis SUPABASE_URL e SUPABASE_ANON_KEY estão corretas
- Verifique se o projeto Supabase está ativo

### Erro de Token Inválido
- Limpe o localStorage do navegador
- Faça login novamente

### Erro 401 Unauthorized
- Verifique se está logado
- Verifique se o token não expirou
