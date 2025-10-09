#!/bin/bash

# AudioAI Desktop - Script de Build Completo
# Compatível com macOS (Intel e Apple Silicon)
# Gera executável autônomo usando PyInstaller

set -e  # Sair em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# Banner
echo "=================================================="
echo "   🚀 AudioAI Desktop - Build Executável"
echo "=================================================="
echo ""

# Detectar arquitetura do sistema
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    print_info "🔍 Detectado: Apple Silicon (M1/M2/M3) - ARM64"
    PYTHON_PATH="/opt/homebrew/bin/python3"
    HOMEBREW_PREFIX="/opt/homebrew"
    PIP_PATH="/opt/homebrew/bin/pip3"
else
    print_info "🔍 Detectado: Intel Mac - x86_64"
    PYTHON_PATH="/usr/local/bin/python3"
    HOMEBREW_PREFIX="/usr/local"
    PIP_PATH="/usr/local/bin/pip3"
fi

# Verificar se estamos no diretório correto
if [[ ! -f "audioai.spec" ]] || [[ ! -d "client" ]]; then
    print_error "Execute este script no diretório raiz do projeto AudioAI"
    print_info "Estrutura esperada: client/, audioai.spec"
    exit 1
fi

# Verificar e instalar Homebrew se necessário
if ! command -v brew &> /dev/null; then
    print_info "📦 Instalando Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Configurar PATH para Homebrew
    if [[ "$ARCH" == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
fi

# Verificar e instalar Python se necessário
if [[ ! -f "$PYTHON_PATH" ]]; then
    print_info "🐍 Instalando Python via Homebrew..."
    brew install python@3.11
fi

# Verificar versão do Python
PYTHON_VERSION=$($PYTHON_PATH --version 2>&1)
print_info "🐍 Usando Python: $PYTHON_VERSION"

# Criar ambiente virtual temporário para build
BUILD_ENV="audioai_build_env"
print_info "🔧 Criando ambiente virtual para build..."

if [[ -d "$BUILD_ENV" ]]; then
    rm -rf "$BUILD_ENV"
fi

$PYTHON_PATH -m venv "$BUILD_ENV"

# Ativar ambiente virtual
source "$BUILD_ENV/bin/activate"

# Atualizar pip
print_info "📦 Atualizando pip..."
python -m pip install --upgrade pip

# Instalar dependências
print_info "📦 Instalando dependências..."
pip install -r client/requirements.txt

# Verificar se PyInstaller está instalado
if ! python -c "import PyInstaller" &> /dev/null; then
    print_info "📦 Instalando PyInstaller..."
    pip install pyinstaller
fi

# Limpar builds anteriores
print_info "🧹 Limpando builds anteriores..."
rm -rf dist/ build/ *.egg-info/

# Verificar se existe ícone
ICON_PATH=""
if [[ -f "icone.icns" ]]; then
    ICON_PATH="--icon=icone.icns"
    print_info "🎨 Ícone encontrado: icone.icns"
elif [[ -f "client/icone.icns" ]]; then
    ICON_PATH="--icon=client/icone.icns"
    print_info "🎨 Ícone encontrado: client/icone.icns"
else
    print_warning "⚠️  Nenhum ícone encontrado (icone.icns)"
fi

# Build com PyInstaller usando o arquivo .spec
print_info "🔨 Iniciando build com PyInstaller..."
print_info "📋 Usando arquivo de especificação: audioai.spec"

# Executar PyInstaller com o arquivo .spec
pyinstaller audioai.spec --clean --noconfirm

# Verificar se o build foi bem-sucedido
if [[ ! -d "dist/AudioAI.app" ]]; then
    print_error "❌ Falha no build da aplicação"
    exit 1
fi

print_success "✅ Build concluído com sucesso!"

# Informações sobre o executável gerado
APP_SIZE=$(du -sh "dist/AudioAI.app" | cut -f1)
print_info "📊 Tamanho da aplicação: $APP_SIZE"

# Assinatura de código (ad-hoc)
print_info "🔐 Aplicando assinatura de código..."
codesign --deep --force --verify --verbose --sign - "dist/AudioAI.app"

if [[ $? -eq 0 ]]; then
    print_success "✅ Assinatura aplicada com sucesso"
else
    print_warning "⚠️  Falha na assinatura (continuando...)"
fi

# Remover quarentena
print_info "🔓 Removendo marca de quarentena..."
xattr -dr com.apple.quarantine "dist/AudioAI.app" 2>/dev/null || true

# Verificar se a aplicação pode ser executada
print_info "🧪 Testando executabilidade..."
if [[ -x "dist/AudioAI.app/Contents/MacOS/AudioAI" ]]; then
    print_success "✅ Executável criado corretamente"
else
    print_error "❌ Problema com permissões do executável"
    chmod +x "dist/AudioAI.app/Contents/MacOS/AudioAI"
fi

# Limpeza do ambiente virtual
print_info "🧹 Limpando ambiente virtual temporário..."
deactivate
rm -rf "$BUILD_ENV"

echo ""
echo "=================================================="
print_success "🎉 Build concluído com sucesso!"
echo "=================================================="
echo ""
print_info "📱 Aplicação gerada: dist/AudioAI.app"
print_info "📊 Tamanho: $APP_SIZE"
print_info "🏗️  Arquitetura: $ARCH"
print_info "🐍 Python: $PYTHON_VERSION"
echo ""
print_info "📋 Próximos passos:"
print_info "   1. Testar: open dist/AudioAI.app"
print_info "   2. Instalar: cp -R dist/AudioAI.app /Applications/"
print_info "   3. Criar DMG: ./create_dmg.sh (se disponível)"
echo ""