# 🎯 AudioAI Desktop - Instalador Completo

Instalador autônomo para aplicação desktop AudioAI, compatível com **macOS Intel e Apple Silicon**.

## 📋 Visão Geral

Este projeto cria um **executável autônomo** da aplicação AudioAI Desktop que pode ser executado em qualquer Mac **sem necessidade de instalar Python ou dependências**.

### ✨ Características

- 🚀 **Executável autônomo** - Inclui Python e todas as dependências
- 🏗️ **Compatibilidade universal** - Funciona em Intel e Apple Silicon (M1/M2/M3)
- 📦 **Instalador DMG** - Instalação simples arrastando para Applications
- 🔐 **Assinatura de código** - Evita bloqueios do Gatekeeper
- 🎨 **Interface nativa** - PySide6 com aparência nativa do macOS

## 🛠️ Pré-requisitos

- macOS 10.15 ou superior
- Homebrew (será instalado automaticamente se necessário)
- Xcode Command Line Tools

## 🚀 Como Usar

### 1. Build da Aplicação

Execute o script de build que detecta automaticamente sua arquitetura:

```bash
./build_app.sh
```

Este script irá:
- ✅ Detectar arquitetura (Intel/Apple Silicon)
- ✅ Instalar Python e dependências se necessário
- ✅ Criar ambiente virtual temporário
- ✅ Gerar executável com PyInstaller
- ✅ Aplicar assinatura de código
- ✅ Remover quarentena

### 2. Criar Instalador DMG (Opcional)

Para criar um instalador DMG profissional:

```bash
./create_dmg.sh
```

Este script irá:
- ✅ Verificar se a aplicação foi buildada
- ✅ Instalar create-dmg se necessário
- ✅ Criar DMG com layout de instalação
- ✅ Assinar o DMG
- ✅ Testar montagem

## 📁 Estrutura do Projeto

```
audio-ai-app/
├── audioai.spec          # Configuração PyInstaller otimizada
├── build_app.sh          # Script principal de build
├── create_dmg.sh         # Criador de instalador DMG
├── client/               # Código fonte da aplicação
│   ├── main.py          # Aplicação principal
│   ├── recorder.py      # Gravação de áudio
│   ├── api_client.py    # Cliente da API
│   └── requirements.txt # Dependências Python
└── server/              # Servidor Node.js (separado)
```

## 🔧 Configuração Técnica

### Dependências Incluídas

- **PySide6** - Interface gráfica nativa
- **sounddevice** - Gravação de áudio
- **scipy** - Processamento de sinais
- **requests** - Comunicação HTTP
- **numpy** - Computação numérica

### Compatibilidade de Arquitetura

| Arquitetura | Python Path | Homebrew Path | Status |
|-------------|-------------|---------------|---------|
| Intel (x86_64) | `/usr/local/bin/python3` | `/usr/local` | ✅ Suportado |
| Apple Silicon (arm64) | `/opt/homebrew/bin/python3` | `/opt/homebrew` | ✅ Suportado |

### Configurações do PyInstaller

O arquivo `audioai.spec` inclui:
- 📦 **Bundle mode** - Gera .app nativo do macOS
- 🔒 **Imports ocultos** - Todas as dependências necessárias
- 🚫 **Exclusões** - Remove bibliotecas desnecessárias (tkinter, matplotlib)
- 📱 **Info.plist** - Metadados e permissões do app

## 🧪 Testando a Instalação

### Teste Local
```bash
# Testar aplicação diretamente
open dist/AudioAI.app

# Instalar na pasta Applications
cp -R dist/AudioAI.app /Applications/

# Testar DMG
open AudioAI-Installer.dmg
```

### Verificações de Segurança
```bash
# Verificar assinatura
codesign -dv --verbose=4 dist/AudioAI.app

# Verificar quarentena
xattr -l dist/AudioAI.app

# Testar executabilidade
dist/AudioAI.app/Contents/MacOS/AudioAI --version
```

## 🔐 Segurança e Assinatura

### Assinatura Ad-hoc (Padrão)
```bash
codesign --deep --force --verify --verbose --sign - dist/AudioAI.app
```

### Assinatura com Certificado Developer (Opcional)
```bash
# Substitua TEAM_ID pelo seu Team ID
codesign --deep --force --verify --verbose --sign "Developer ID Application: Seu Nome (TEAM_ID)" dist/AudioAI.app
```

## 📊 Tamanhos Típicos

| Componente | Tamanho Aproximado |
|------------|-------------------|
| Aplicação .app | ~150-200 MB |
| Instalador .dmg | ~80-120 MB |
| Código fonte | ~1-2 MB |

## 🐛 Solução de Problemas

### Erro: "AudioAI não pode ser aberto"
```bash
# Remover quarentena manualmente
sudo xattr -rd com.apple.quarantine /Applications/AudioAI.app
```

### Erro: Python não encontrado
```bash
# Verificar instalação do Homebrew
brew --version

# Reinstalar Python
brew reinstall python@3.11
```

### Erro: PyInstaller falha
```bash
# Limpar cache do PyInstaller
rm -rf build/ dist/ *.egg-info/

# Reinstalar PyInstaller
pip install --upgrade pyinstaller
```

### Erro: create-dmg não encontrado
```bash
# Instalar create-dmg
brew install create-dmg
```

## 📝 Logs e Debug

### Logs do Build
Os scripts geram logs coloridos com informações detalhadas:
- 🔵 **[INFO]** - Informações gerais
- 🟢 **[SUCESSO]** - Operações bem-sucedidas  
- 🟡 **[AVISO]** - Avisos não críticos
- 🔴 **[ERRO]** - Erros que impedem continuação

### Debug da Aplicação
Para debug, execute a aplicação via terminal:
```bash
dist/AudioAI.app/Contents/MacOS/AudioAI
```

## 🔄 Atualizações

Para atualizar a aplicação:
1. Modifique o código fonte em `client/`
2. Execute `./build_app.sh` novamente
3. Opcionalmente, execute `./create_dmg.sh` para novo instalador

## 📞 Suporte

- **Arquiteturas**: Intel x86_64 e Apple Silicon arm64
- **macOS**: 10.15 (Catalina) ou superior
- **Python**: 3.8+ (instalado automaticamente)
- **Dependências**: Instaladas automaticamente

---

**Desenvolvido para macOS com compatibilidade universal Intel/Apple Silicon** 🍎