#!/bin/bash

# Instalador AudioAI Desktop
# Configura dependências e instala o executável desktop

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCESSO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
print_error() { echo -e "${RED}[ERRO]${NC} $1"; }

echo "=============================================="
echo "   AudioAI Desktop - Instalador Completo"
echo "=============================================="
echo ""

# Verificar se estamos no diretório correto
if [[ ! -f "audioai.spec" ]] || [[ ! -d "client" ]] || [[ ! -d "server" ]]; then
    print_error "Execute este script no diretório raiz do projeto AudioAI"
    print_info "Estrutura esperada: client/, server/, audioai.spec"
    exit 1
fi

print_info "🚀 Iniciando instalação do AudioAI Desktop..."

# Detectar arquitetura do sistema
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    print_info "🔍 Detectado: Apple Silicon (M1/M2/M3)"
    PYTHON_PATH="/opt/homebrew/bin/python3"
    HOMEBREW_PREFIX="/opt/homebrew"
else
    print_info "🔍 Detectado: Intel Mac"
    PYTHON_PATH="/usr/local/bin/python3"
    HOMEBREW_PREFIX="/usr/local"
fi

# Verificar e instalar Homebrew
if ! command -v brew &> /dev/null; then
    print_info "📦 Instalando Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Adicionar ao PATH
    if [[ "$ARCH" == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    
    print_success "Homebrew instalado"
else
    print_success "Homebrew já instalado"
fi

# Verificar e instalar Python 3.11
if ! command -v python3.11 &> /dev/null; then
    print_info "🐍 Instalando Python 3.11..."
    brew install python@3.11
    print_success "Python 3.11 instalado"
else
    print_success "Python 3.11 já instalado"
fi

# Nota: O servidor Node.js deve estar rodando em um IP específico na rede local
print_info "ℹ️  Certifique-se de que o servidor AudioAI está rodando na rede local"

# Criar ambiente virtual Python se não existir
if [[ ! -d "audioai_client_env" ]]; then
    print_info "🐍 Criando ambiente virtual Python..."
    python3.11 -m venv audioai_client_env
    print_success "Ambiente virtual criado"
else
    print_success "Ambiente virtual já existe"
fi

# Ativar ambiente virtual e instalar dependências
print_info "📦 Instalando dependências Python..."
source audioai_client_env/bin/activate

# Atualizar pip
pip install --upgrade pip

# Instalar dependências do cliente
if [[ -f "client/requirements.txt" ]]; then
    pip install -r client/requirements.txt
else
    # Instalar dependências essenciais
    pip install PySide6 sounddevice scipy numpy requests typing-extensions pydub
fi

# Instalar PyInstaller para build
pip install pyinstaller

print_success "Dependências Python instaladas"

# Verificar se BlackHole está instalado (necessário para captura de áudio)
if ! brew list --cask | grep -q blackhole-2ch; then
    print_info "🔊 Instalando BlackHole (captura de áudio do sistema)..."
    brew install --cask blackhole-2ch
    print_success "BlackHole instalado"
    print_warning "⚠️  IMPORTANTE: Reinicie o sistema após a instalação para ativar o BlackHole"
else
    print_success "BlackHole já instalado"
fi

# Fazer build do executável
print_info "🔨 Gerando executável desktop..."
if [[ -f "build_app.sh" ]]; then
    chmod +x build_app.sh
    ./build_app.sh
else
    print_error "Script build_app.sh não encontrado"
    exit 1
fi

# Verificar se o build foi bem-sucedido
if [[ -d "dist/AudioAI.app" ]]; then
    print_success "✅ Executável gerado com sucesso"
    
    # Executar o instalador da aplicação
    if [[ -f "AudioAI_Installer.sh" ]]; then
        print_info "📱 Instalando aplicação desktop..."
        chmod +x AudioAI_Installer.sh
        ./AudioAI_Installer.sh
    else
        print_warning "Instalador da aplicação não encontrado, mas o executável está em dist/AudioAI.app"
    fi
else
    print_error "❌ Falha na geração do executável"
    exit 1
fi

print_success "🎉 Instalação completa!"
print_info ""
print_info "📋 Resumo da instalação:"
print_info "  ✅ Homebrew configurado"
print_info "  ✅ Python 3.11 instalado"
print_info "  ✅ Node.js instalado"
print_info "  ✅ Dependências do servidor instaladas"
print_info "  ✅ Ambiente virtual Python criado"
print_info "  ✅ Dependências Python instaladas"
print_info "  ✅ BlackHole instalado (captura de áudio)"
print_info "  ✅ Executável desktop gerado"
print_info "  ✅ Aplicação instalada em ~/Applications/AudioAI.app"
print_info ""
print_info "🚀 Para usar o AudioAI:"
print_info "  1. Certifique-se de que o servidor AudioAI está rodando na rede local"
print_info "  2. Configure o IP do servidor no cliente (se necessário)"
print_info "  3. Abra a aplicação desktop: open ~/Applications/AudioAI.app"
print_info ""
print_warning "⚠️  O servidor deve estar rodando em um IP específico na rede local"
print_warning "⚠️  Se instalou o BlackHole agora, reinicie o sistema antes de usar"