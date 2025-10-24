# 🎙️ Audio AI Client - Web

Cliente web para gravação e processamento de áudio com Inteligência Artificial.

## 🚀 Como Usar

### 1. Iniciar o Servidor

No diretório `audio-ai-app/server`, execute:

```bash
npm install  # Primeira vez
node server.js
```

O servidor iniciará em `http://localhost:3030` (ou verifique a porta no console do servidor)

### 2. Acessar o Cliente Web

Abra seu navegador e acesse: `http://localhost:3030`

### 3. Configurar e Gravar

#### Modos de Gravação:

- **🎤 Apenas Microfone**: Grava apenas sua voz
- **🖥️ Apenas Sistema**: Grava áudio de uma aba do navegador
- **🎤🖥️ Microfone + Sistema**: Grava ambos (mixado)

#### Como Gravar:

1. Selecione o modo de gravação
2. Clique em "Iniciar Gravação"
3. Conceda as permissões solicitadas pelo navegador:
   - Para microfone: permissão de áudio
   - Para sistema: selecione a aba e marque "Compartilhar áudio da aba"
4. Fale ou reproduza o áudio
5. Clique em "Parar e Enviar"
6. Aguarde o processamento
7. A transcrição e análise da IA aparecerão na tela

## 🔧 Requisitos

- Navegador moderno (Chrome, Firefox, Edge)
- Conexão com internet (para processar via OpenAI)
- Servidor Node.js em execução
- Chave da API OpenAI configurada no servidor

## 🎨 Recursos

- ✅ Interface moderna e responsiva
- ✅ Captura de áudio do microfone
- ✅ Captura de áudio do sistema (abas do navegador)
- ✅ Mixagem de áudio com controle de proporção
- ✅ Processamento em tempo real via OpenAI
- ✅ Transcrição automática (Whisper)
- ✅ Análise de conteúdo (GPT-4)
- ✅ Copiar resposta para área de transferência

## 📝 Notas Importantes

### Captura de Áudio do Sistema

No navegador, a captura de "áudio do sistema" funciona através da API `getDisplayMedia`, que permite compartilhar o áudio de uma aba específica do navegador. 

**Não é possível** capturar todo o áudio do sistema operacional (diferente da versão desktop). Para capturar áudio do sistema, você precisa:

1. Selecionar o modo "Apenas Sistema" ou "Microfone + Sistema"
2. Quando clicar em "Iniciar Gravação", o navegador abrirá um diálogo
3. Selecione a aba que deseja gravar
4. **IMPORTANTE**: Marque a opção "Compartilhar áudio da aba"
5. Clique em "Compartilhar"

### 💬 Usando Durante Videochamadas

O Audio AI pode ser usado DURANTE videochamadas! 

**✅ Funciona bem com:**
- Google Meet (web)
- Zoom (web)
- Microsoft Teams (web)
- Discord (web)

**💡 Caso de uso perfeito:** Transcrever reuniões em tempo real
- Use modo "🖥️ Sistema" para capturar TODA a conversa
- Funciona mesmo se você estiver falando

📖 **Guia completo:** [VIDEOCHAMADAS.md](VIDEOCHAMADAS.md)

### Privacidade e Segurança

- As gravações são enviadas para o servidor Node.js
- O servidor processa via OpenAI (Whisper + GPT)
- Os arquivos temporários são deletados após o processamento
- Nenhuma gravação é armazenada permanentemente

### Compatibilidade

| Navegador | Microfone | Sistema |
|-----------|-----------|---------|
| Chrome    | ✅        | ✅      |
| Firefox   | ✅        | ✅      |
| Edge      | ✅        | ✅      |
| Safari    | ✅        | ⚠️*     |

*Safari tem suporte limitado para captura de áudio de abas

## 🐛 Solução de Problemas

### Erro: "Não foi possível acessar o microfone"
- Verifique se concedeu permissão de microfone ao site
- Verifique configurações de privacidade do navegador

### Erro: "Microfone está sendo usado por outro aplicativo"
**Você está em uma videochamada?**
- ✅ **Solução:** Use modo "Sistema" para capturar a aba da videochamada
- Ou feche o app desktop e use versão web
- 📖 Veja: [VIDEOCHAMADAS.md](VIDEOCHAMADAS.md)

### Erro: "Nenhuma faixa de áudio disponível"
- Ao compartilhar aba, certifique-se de marcar "Compartilhar áudio da aba"
- A aba compartilhada precisa estar reproduzindo áudio

### Erro de conexão com servidor
- Verifique se o servidor está em execução
- Verifique se a porta 3000 está disponível
- Verifique o console do navegador (F12) para mais detalhes

## 🔐 Configuração do Servidor

O servidor precisa ter a variável de ambiente `OPENAI_API_KEY` configurada.

Crie um arquivo `.env` em `audio-ai-app/server/`:

```env
OPENAI_API_KEY=sua_chave_aqui
PORT=3030
HOST=0.0.0.0
```

## 📦 Estrutura

```
web-client/
├── index.html      # Interface principal
├── app.js          # Lógica da aplicação
├── styles.css      # Estilos
└── README.md       # Esta documentação
```

## 🎯 Diferenças da Versão Desktop

| Recurso | Desktop | Web |
|---------|---------|-----|
| Áudio do microfone | ✅ | ✅ |
| Áudio do sistema completo | ✅ | ❌ |
| Áudio de abas do navegador | ❌ | ✅ |
| Instalação necessária | ✅ | ❌ |
| Funciona offline | ✅ | ❌ |
| Multiplataforma | macOS | Todos |

## 📄 Licença

Mesmo da aplicação principal Audio AI.

