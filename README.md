# 🧠 Audio AI Desktop Application

Aplicação desktop desenvolvida com **Python (PySide6)** e backend **Node.js** que permite gravar áudio do sistema, processar com **OpenAI** (Whisper + ChatGPT) e exibir a resposta da IA.

## 🎯 Funcionalidades

- 🎙️ **Gravação de áudio** do sistema em tempo real
- ⏹️ **Controle manual** de início e parada da gravação
- 🤖 **Transcrição automática** usando OpenAI Whisper
- 💬 **Resposta inteligente** usando ChatGPT
- 🖥️ **Interface moderna** com PySide6
- 🔄 **Processamento assíncrono** para melhor UX

## 📁 Estrutura do Projeto

```
audio-ai-app/
├── client/                 # Aplicação desktop PySide6
│   ├── main.py            # Interface principal
│   ├── recorder.py        # Módulo de gravação
│   ├── api_client.py      # Cliente para comunicação com servidor
│   └── requirements.txt   # Dependências Python
├── server/                # Backend Node.js
│   ├── server.js         # Servidor Express + OpenAI
│   ├── package.json      # Dependências Node.js
│   └── .env.example      # Exemplo de configuração
└── README.md             # Este arquivo
```

## 🚀 Instalação e Configuração

### 1. Pré-requisitos

- **Python 3.8+** com pip
- **Node.js 18+** com npm
- **Chave da API OpenAI** ([obter aqui](https://platform.openai.com/api-keys))

### 2. Configurar o Servidor (Backend)

```bash
# Navegar para o diretório do servidor
cd audio-ai-app/server

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env e adicione sua OPENAI_API_KEY
```

**Arquivo `.env`:**
```env
OPENAI_API_KEY=sk-sua_chave_openai_aqui
PORT=3000
NODE_ENV=development
```

### 3. Configurar o Cliente (Desktop)

```bash
# Navegar para o diretório do cliente
cd audio-ai-app/client

# Criar ambiente virtual (recomendado)
python -m venv venv
source venv/bin/activate  # No Windows: venv\\Scripts\\activate

# Instalar dependências
pip install -r requirements.txt
```

## 🎮 Como Usar

### 1. Iniciar o Servidor

```bash
cd audio-ai-app/server
npm start
```

O servidor estará disponível em `http://localhost:3000`

### 2. Executar a Aplicação Desktop

```bash
cd audio-ai-app/client
python main.py
```

### 3. Usar a Aplicação

1. **Clique em "🎙️ Iniciar Gravação"** para começar a gravar
2. **Fale claramente** para o microfone
3. **Clique em "⏹️ Parar e Enviar"** quando terminar
4. **Aguarde o processamento** - a resposta aparecerá na tela

## 📦 Gerar Executável (Distribuição)

Para criar um executável standalone que não requer Python instalado:

### Opção 1: Script Automático (Recomendado)

```bash
cd audio-ai-app/client

# Para macOS/Linux
./build.sh

# Para Windows ou usando Python diretamente
python build.py
```

### Opção 2: Manual com PyInstaller

```bash
cd audio-ai-app/client

# Instalar PyInstaller
pip install pyinstaller

# Gerar executável
pyinstaller build.spec
```

### Resultado do Build

Após o build bem-sucedido:
- **Executável**: `dist/AudioAI` (macOS/Linux) ou `dist/AudioAI.exe` (Windows)
- **Bundle macOS**: `dist/AudioAI.app` (aplicação nativa macOS)
- **Tamanho**: ~65MB (inclui todas as dependências)

### Como Distribuir

1. **Copie a pasta `dist/`** para o computador de destino
2. **Execute o arquivo** `AudioAI` (ou `AudioAI.exe`)
3. **Certifique-se** de que o servidor Node.js está rodando na rede

### Configurar Cliente para Servidor Remoto

Se o servidor estiver em outro computador:

```python
# Edite api_client.py ou configure via interface
BASE_URL = "http://IP_DO_SERVIDOR:3030"
```

## 🔧 Desenvolvimento

### Executar em Modo de Desenvolvimento

**Servidor com auto-reload:**
```bash
cd server
npm run dev
```

**Cliente com debug:**
```bash
cd client
python main.py
```

### Testar Componentes Individualmente

**Testar gravação de áudio:**
```bash
cd client
python recorder.py
```

**Testar cliente API:**
```bash
cd client
python api_client.py
```

## 🛠️ Dependências

### Cliente Python
- **PySide6** - Interface gráfica
- **sounddevice** - Gravação de áudio
- **scipy** - Processamento de áudio
- **numpy** - Operações numéricas
- **requests** - Comunicação HTTP

### Servidor Node.js
- **express** - Framework web
- **multer** - Upload de arquivos
- **openai** - API da OpenAI
- **dotenv** - Variáveis de ambiente
- **cors** - CORS para requisições

## 🔍 Solução de Problemas

### Problemas Comuns

**1. Erro "Servidor não está respondendo"**
- Verifique se o servidor Node.js está rodando
- Confirme que está na porta 3000
- Teste: `curl http://localhost:3000/health`

**2. Erro "OPENAI_API_KEY não configurada"**
- Verifique o arquivo `.env` no servidor
- Confirme que a chave está correta
- Teste a chave em: https://platform.openai.com/playground

**3. Problemas de áudio**
- Verifique permissões do microfone
- Teste com: `python recorder.py`
- Confirme que há dispositivos de entrada disponíveis

**4. Erro de dependências Python**
- Use ambiente virtual: `python -m venv venv`
- Atualize pip: `pip install --upgrade pip`
- Instale novamente: `pip install -r requirements.txt`

### Logs e Debug

**Servidor:**
- Logs aparecem no terminal onde rodou `npm start`
- Para mais detalhes: `NODE_ENV=development npm start`

**Cliente:**
- Erros aparecem na interface e no terminal
- Para debug: adicione `print()` statements

## 📊 Endpoints da API

### `GET /health`
Verifica status do servidor
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.45
}
```

### `POST /upload`
Processa arquivo de áudio
- **Input:** Arquivo de áudio (multipart/form-data)
- **Output:** Transcrição + resposta da IA
```json
{
  "transcript": "Olá, como você está?",
  "response": "Olá! Estou bem, obrigado por perguntar...",
  "processing_time_ms": 2500,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🌐 Acesso Remoto (Outros Dispositivos na Rede)

Para permitir que outros dispositivos na mesma rede acessem o servidor:

### 1. Configurar o Servidor para Acesso Externo

O servidor já está configurado para aceitar conexões de qualquer IP (`HOST=0.0.0.0`).

**Verificar configuração no `.env`:**
```env
HOST=0.0.0.0  # Aceita conexões de qualquer IP
PORT=3000     # Porta do servidor
```

### 2. Descobrir o IP da Máquina

**No macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**No Windows:**
```cmd
ipconfig | findstr "IPv4"
```

### 3. Acessar de Outros Dispositivos

Se o IP da máquina for `192.168.0.143`, outros dispositivos podem acessar:

- **URL do servidor:** `http://192.168.0.143:3000`
- **Endpoint de saúde:** `http://192.168.0.143:3000/health`
- **Upload de áudio:** `POST http://192.168.0.143:3000/upload`

### 4. Configurar Cliente para Servidor Remoto

No arquivo `client/api_client.py`, altere a URL base:

```python
# Para servidor local
BASE_URL = "http://localhost:3000"

# Para servidor remoto (substitua pelo IP correto)
BASE_URL = "http://192.168.0.143:3000"
```

### 5. Considerações de Segurança

⚠️ **Importante:** Ao permitir acesso externo:

- O servidor ficará acessível para toda a rede local
- Certifique-se de estar em uma rede confiável
- Para produção, considere implementar autenticação
- Use HTTPS em ambientes de produção

### 6. Firewall

Certifique-se de que a porta está liberada no firewall:

**macOS:**
```bash
# Verificar se a porta está aberta
sudo lsof -i :3000
```

**Windows:**
```cmd
# Adicionar regra no firewall
netsh advfirewall firewall add rule name="Audio AI Server" dir=in action=allow protocol=TCP localport=3000
```

## 🔐 Segurança

- ✅ Chave da OpenAI fica apenas no servidor
- ✅ Arquivos de áudio são temporários e removidos após processamento
- ✅ Validação de tipos de arquivo
- ✅ Limite de tamanho de arquivo (25MB)
- ✅ Tratamento de erros robusto

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Se encontrar problemas ou tiver dúvidas:

1. Verifique a seção de **Solução de Problemas**
2. Consulte os logs do servidor e cliente
3. Abra uma issue no repositório

---

**Desenvolvido com ❤️ usando Python, Node.js e OpenAI**