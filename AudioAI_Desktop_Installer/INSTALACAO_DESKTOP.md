# AudioAI Desktop - Guia de Instalação e Uso

## 📋 Visão Geral

O AudioAI Desktop é uma aplicação cliente que permite gravar áudio do microfone e do sistema, enviando para processamento via IA em um servidor remoto na rede local. Este guia explica como instalar e usar a aplicação no macOS.

## 🔧 Pré-requisitos

- **macOS 10.14** ou superior
- **Conexão com a internet** (para instalação de dependências)
- **Permissões de administrador** (para instalação do Homebrew e dependências)
- **Servidor AudioAI rodando na rede local** (em outro computador/IP)

## 🚀 Instalação Automática (Recomendada)

### 1. Clone o Repositório
```bash
git clone <url-do-repositorio>
cd audio-ai-app
```

### 2. Execute o Instalador Completo
```bash
./instalador_desktop.sh
```

O instalador automático irá:
- ✅ Instalar Homebrew (se necessário)
- ✅ Instalar Python 3.11
- ✅ Configurar ambiente virtual Python
- ✅ Instalar todas as dependências Python
- ✅ Instalar BlackHole (captura de áudio do sistema)
- ✅ Gerar o executável desktop
- ✅ Instalar a aplicação em `~/Applications/AudioAI.app`

**Nota:** O servidor Node.js deve estar rodando em outro computador na rede local.

### 3. Configurar Conexão com o Servidor
Configure o IP do servidor AudioAI no cliente (se necessário) para conectar ao servidor remoto na rede local.

## 🔨 Instalação Manual

### 1. Instalar Dependências do Sistema
```bash
# Instalar Homebrew (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Python 3.11
brew install python@3.11

# Instalar BlackHole para captura de áudio
brew install --cask blackhole-2ch
```

### 2. Configurar Ambiente Python
```bash
# Criar ambiente virtual
python3.11 -m venv audioai_client_env

# Ativar ambiente virtual
source audioai_client_env/bin/activate

# Instalar dependências Python
pip install -r client/requirements.txt
pip install pyinstaller
```

### 3. Gerar Executável
```bash
# Ativar ambiente virtual
source audioai_client_env/bin/activate

# Gerar executável
./build_app.sh
```

### 4. Instalar Aplicação
```bash
./AudioAI_Installer.sh
```

## 🎯 Como Usar

### 1. Conectar ao Servidor Remoto
Certifique-se de que o servidor AudioAI está rodando em outro computador na rede local. O cliente desktop se conectará automaticamente ao servidor configurado.

### 2. Abrir a Aplicação Desktop
- **Via Finder**: Vá para Applications e clique duplo em AudioAI
- **Via Terminal**: `open ~/Applications/AudioAI.app`

### 3. Configurar Dispositivos de Áudio
A aplicação detectará automaticamente:
- **Microfone**: Seu microfone padrão
- **Saída do Sistema**: BlackHole 2ch (para capturar áudio do sistema)

### 4. Gravar Áudio
1. Clique no botão "Gravar"
2. Fale no microfone ou reproduza áudio no sistema
3. Clique "Parar" para finalizar a gravação
4. O áudio será enviado automaticamente para o servidor remoto para processamento

## ⚠️ Solução de Problemas

### Problema: "AudioAI não pode ser aberto porque é de um desenvolvedor não identificado"
**Solução:**
1. Vá em **Preferências do Sistema** > **Segurança e Privacidade**
2. Na aba **Geral**, clique em **"Abrir mesmo assim"** ao lado da mensagem sobre AudioAI
3. Ou execute: `xattr -cr ~/Applications/AudioAI.app`

### Problema: Aplicação não consegue acessar o microfone
**Solução:**
1. Vá em **Preferências do Sistema** > **Segurança e Privacidade** > **Privacidade**
2. Selecione **Microfone** na lista à esquerda
3. Marque a caixa ao lado de **AudioAI**

### Problema: Não consegue capturar áudio do sistema
**Solução:**
1. Verifique se o BlackHole está instalado: `brew list --cask | grep blackhole`
2. Configure o BlackHole como dispositivo de saída:
   - **Preferências do Sistema** > **Som** > **Saída**
   - Selecione **BlackHole 2ch**
3. Reinicie o sistema se necessário

### Problema: Servidor não inicia
**Solução:**
Este é um problema do servidor remoto, não do cliente desktop. Verifique:
1. Se o servidor está rodando no computador remoto
2. Se a rede local permite conexões entre os dispositivos
3. Se o IP do servidor está configurado corretamente no cliente

### Problema: Erro de Python/dependências
**Solução:**
1. Reative o ambiente virtual: `source audioai_client_env/bin/activate`
2. Reinstale as dependências: `pip install -r client/requirements.txt`
3. Verifique a versão do Python: `python --version` (deve ser 3.11.x)

## 📁 Estrutura de Arquivos

```
audio-ai-app/
├── client/                     # Código do cliente desktop
│   ├── main.py                # Arquivo principal
│   ├── recorder.py            # Gravador de áudio
│   ├── api_client.py          # Cliente da API
│   └── requirements.txt       # Dependências Python
├── server/                    # Servidor Node.js
│   ├── server.js              # Servidor principal
│   ├── package.json           # Dependências Node.js
│   └── .env                   # Variáveis de ambiente
├── dist/                      # Executável gerado
│   └── AudioAI.app           # Aplicação macOS
├── audioai_client_env/        # Ambiente virtual Python
├── instalador_desktop.sh      # Instalador completo
├── build_app.sh              # Script de build
├── AudioAI_Installer.sh      # Instalador da aplicação
└── audioai.spec              # Configuração PyInstaller
```

## 🔄 Atualizações

Para atualizar a aplicação:

1. **Atualize o código:**
   ```bash
   git pull origin main
   ```

2. **Reinstale dependências (se necessário):**
   ```bash
   source audioai_client_env/bin/activate
   pip install -r client/requirements.txt
   cd server && npm install && cd ..
   ```

3. **Regenere o executável:**
   ```bash
   ./build_app.sh
   ./AudioAI_Installer.sh
   ```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor no terminal
2. Verifique os logs da aplicação desktop no Console do macOS
3. Certifique-se de que todas as dependências estão instaladas
4. Verifique as permissões de microfone e segurança

## 🔒 Segurança

- A aplicação usa assinatura ad-hoc para execução local
- Todas as comunicações com o servidor são via HTTP local
- Nenhum dado é enviado para serviços externos sem configuração explícita
- As chaves de API ficam armazenadas localmente no arquivo `.env`