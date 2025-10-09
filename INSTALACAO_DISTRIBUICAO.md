# 📦 Guia de Instalação e Distribuição - Audio AI

Este guia explica como instalar e configurar a aplicação Audio AI em outro computador.

## 🎯 Arquivos Gerados

Após o build, você terá na pasta `client/dist/`:
- **AudioAI** - Executável standalone (65MB)
- **AudioAI.app** - Aplicação macOS com interface gráfica

## 🖥️ Requisitos do Sistema

### macOS (Recomendado)
- **Sistema**: macOS 10.14+ (Mojave ou superior)
- **Arquitetura**: Intel x64 ou Apple Silicon (M1/M2/M3)
- **RAM**: Mínimo 4GB, recomendado 8GB
- **Espaço**: ~100MB livres

### Outros Sistemas
- **Windows**: Necessário rebuild com PyInstaller no Windows
- **Linux**: Necessário rebuild com PyInstaller no Linux

## 🚀 Instalação Rápida

### 1. Copiar Arquivos
```bash
# Copie toda a pasta dist/ para o computador de destino
cp -r client/dist/ /caminho/destino/AudioAI/
```

### 2. Executar Aplicação
```bash
# Opção 1: Executável direto
./AudioAI

# Opção 2: Aplicação macOS (recomendado)
open AudioAI.app
```

## ⚙️ Configuração Completa

### 1. Servidor Backend (Obrigatório)

O cliente precisa de um servidor Node.js rodando. Você tem duas opções:

#### Opção A: Servidor Local
```bash
# 1. Copie a pasta server/ completa
cp -r server/ /caminho/destino/AudioAI-Server/

# 2. Instale Node.js (se não tiver)
# Baixe em: https://nodejs.org/

# 3. Configure as variáveis de ambiente
cd AudioAI-Server/
cp .env.example .env

# 4. Edite o arquivo .env com sua chave OpenAI
nano .env
# Adicione: OPENAI_API_KEY=sua_chave_aqui

# 5. Instale dependências e execute
npm install
npm start
```

#### Opção B: Servidor Remoto
Se você já tem um servidor rodando em outro local, apenas configure o cliente para apontar para ele.

### 2. Configuração de Áudio (macOS)

Para capturar áudio do sistema, instale o BlackHole:

```bash
# 1. Baixe BlackHole 2ch
# https://github.com/ExistentialAudio/BlackHole

# 2. Instale o arquivo .pkg baixado

# 3. Configure Multi-Output Device
# Abra "Audio MIDI Setup" (Aplicações > Utilitários)
# Crie um "Multi-Output Device" incluindo:
# - Seus alto-falantes/fones
# - BlackHole 2ch

# 4. Configure como saída padrão do sistema
```

### 3. Chave OpenAI (Obrigatório)

```bash
# No servidor, configure sua chave OpenAI:
echo "OPENAI_API_KEY=sk-sua_chave_aqui" > .env
```

## 📋 Checklist de Instalação

- [ ] **Executável copiado** - AudioAI ou AudioAI.app
- [ ] **Servidor configurado** - Node.js + dependências
- [ ] **Chave OpenAI** - Configurada no arquivo .env
- [ ] **BlackHole instalado** - Para captura de áudio do sistema
- [ ] **Multi-Output configurado** - Para ouvir e capturar simultaneamente

## 🔧 Configuração do Cliente

### Arquivo de Configuração (Opcional)
Você pode criar um arquivo `config.json` na mesma pasta do executável:

```json
{
  "server_url": "http://localhost:3030",
  "default_mode": "microphone",
  "mix_ratio": 0.7
}
```

### Variáveis de Ambiente
```bash
# URL do servidor (padrão: http://localhost:3030)
export AUDIO_AI_SERVER_URL="http://seu-servidor:3030"

# Timeout de conexão (padrão: 30s)
export AUDIO_AI_TIMEOUT=30
```

## 🚨 Solução de Problemas

### Erro: "Servidor não encontrado"
```bash
# Verifique se o servidor está rodando
curl http://localhost:3030/health

# Se não estiver, inicie o servidor
cd AudioAI-Server/
npm start
```

### Erro: "Dispositivo de áudio não encontrado"
```bash
# Verifique dispositivos disponíveis no terminal do cliente
# O app mostrará a lista de dispositivos detectados
```

### Erro: "OpenAI API Key inválida"
```bash
# Verifique o arquivo .env no servidor
cat AudioAI-Server/.env

# Teste a chave manualmente
curl -H "Authorization: Bearer sua_chave" \
     https://api.openai.com/v1/models
```

### Permissões no macOS
```bash
# Se o macOS bloquear o executável
sudo xattr -rd com.apple.quarantine AudioAI.app

# Ou vá em Preferências > Segurança e permita o app
```

## 📦 Distribuição Completa

Para distribuir para múltiplos usuários, crie um pacote com:

```
AudioAI-Package/
├── AudioAI.app                 # Cliente (executável)
├── AudioAI-Server/            # Servidor completo
│   ├── server.js
│   ├── package.json
│   ├── prompt.md
│   └── .env.example
├── BlackHole-2ch.pkg          # Instalador de áudio
├── INSTALACAO.md              # Este guia
└── install.sh                 # Script de instalação automática
```

### Script de Instalação Automática
```bash
#!/bin/bash
# install.sh - Instalação automática do Audio AI

echo "🎯 Instalando Audio AI..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale em: https://nodejs.org/"
    exit 1
fi

# Instalar servidor
cd AudioAI-Server/
npm install

# Configurar .env
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️  Configure sua chave OpenAI em AudioAI-Server/.env"
fi

# Instalar BlackHole (se necessário)
if [ ! -d "/Library/Audio/Plug-Ins/HAL/BlackHole2ch.driver" ]; then
    echo "⚠️  Instale BlackHole-2ch.pkg para captura de áudio do sistema"
fi

echo "✅ Instalação concluída!"
echo "🚀 Execute: open AudioAI.app"
```

## 🔐 Segurança

- **Chave OpenAI**: Mantenha sempre privada, nunca compartilhe
- **Rede**: O servidor roda localmente por padrão (mais seguro)
- **Áudio**: Arquivos são processados localmente e deletados após uso
- **Logs**: Não armazenam conteúdo sensível

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do servidor: `npm start` no terminal
2. Verifique os logs do cliente: execute via terminal para ver mensagens
3. Teste a conectividade: `curl http://localhost:3030/health`
4. Verifique permissões de áudio no macOS

---

**Versão**: 1.0.0  
**Compatibilidade**: macOS 10.14+, Node.js 16+  
**Última atualização**: Outubro 2024