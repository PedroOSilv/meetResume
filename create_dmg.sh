#!/bin/bash

# AudioAI Desktop - Criador de DMG
# Compatível com macOS (Intel e Apple Silicon)
# Cria instalador .dmg para distribuição

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
echo "   📦 AudioAI Desktop - Criador de DMG"
echo "=================================================="
echo ""

# Detectar arquitetura do sistema
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    print_info "🔍 Detectado: Apple Silicon (M1/M2/M3) - ARM64"
    HOMEBREW_PREFIX="/opt/homebrew"
else
    print_info "🔍 Detectado: Intel Mac - x86_64"
    HOMEBREW_PREFIX="/usr/local"
fi

# Verificar se a aplicação existe
if [[ ! -d "dist/AudioAI.app" ]]; then
    print_error "❌ Aplicação não encontrada: dist/AudioAI.app"
    print_info "💡 Execute primeiro: ./build_app.sh"
    exit 1
fi

# Verificar se create-dmg está instalado
if ! command -v create-dmg &> /dev/null; then
    print_info "📦 Instalando create-dmg via Homebrew..."
    
    # Verificar se Homebrew está instalado
    if ! command -v brew &> /dev/null; then
        print_error "❌ Homebrew não encontrado. Instale primeiro o Homebrew."
        exit 1
    fi
    
    brew install create-dmg
fi

# Configurações do DMG
APP_NAME="AudioAI"
DMG_NAME="AudioAI-Installer"
VERSION="1.0.0"
BACKGROUND_IMG=""

# Verificar se existe imagem de fundo personalizada
if [[ -f "dmg_background.png" ]]; then
    BACKGROUND_IMG="--background dmg_background.png"
    print_info "🎨 Usando imagem de fundo personalizada: dmg_background.png"
fi

# Limpar DMGs anteriores
print_info "🧹 Removendo DMGs anteriores..."
rm -f "${DMG_NAME}.dmg" "${DMG_NAME}-*.dmg"

# Criar diretório temporário para o DMG
DMG_TEMP_DIR="dmg_temp"
rm -rf "$DMG_TEMP_DIR"
mkdir -p "$DMG_TEMP_DIR"

# Copiar aplicação para o diretório temporário
print_info "📋 Preparando conteúdo do DMG..."
cp -R "dist/AudioAI.app" "$DMG_TEMP_DIR/"

# Criar link simbólico para Applications
ln -sf /Applications "$DMG_TEMP_DIR/Applications"

# Criar arquivo README se não existir
if [[ ! -f "$DMG_TEMP_DIR/README.txt" ]]; then
    cat > "$DMG_TEMP_DIR/README.txt" << EOF
AudioAI Desktop v${VERSION}

INSTALAÇÃO:
1. Arraste o AudioAI.app para a pasta Applications
2. Abra o AudioAI a partir do Launchpad ou Finder
3. Na primeira execução, o macOS pode pedir confirmação de segurança

REQUISITOS:
- macOS 10.15 ou superior
- Permissão para acessar o microfone

SUPORTE:
- Compatível com Intel e Apple Silicon (M1/M2/M3)
- Executável autônomo (não requer Python instalado)

Para mais informações, consulte a documentação do projeto.
EOF
    print_info "📄 Arquivo README.txt criado"
fi

# Criar DMG com create-dmg
print_info "🔨 Criando arquivo DMG..."

create-dmg \
    --volname "${APP_NAME} Installer" \
    --volicon "dist/AudioAI.app/Contents/Resources/icon.icns" \
    --window-pos 200 120 \
    --window-size 800 450 \
    --icon-size 100 \
    --icon "${APP_NAME}.app" 200 190 \
    --hide-extension "${APP_NAME}.app" \
    --app-drop-link 600 185 \
    --eula "LICENSE" \
    --format UDZO \
    --hdiutil-verbose \
    $BACKGROUND_IMG \
    "${DMG_NAME}.dmg" \
    "$DMG_TEMP_DIR/" 2>/dev/null || {
    
    # Fallback: criar DMG simples se create-dmg falhar
    print_warning "⚠️  create-dmg falhou, criando DMG simples..."
    
    hdiutil create -volname "${APP_NAME} Installer" \
        -srcfolder "$DMG_TEMP_DIR" \
        -ov -format UDZO \
        "${DMG_NAME}.dmg"
}

# Verificar se o DMG foi criado
if [[ -f "${DMG_NAME}.dmg" ]]; then
    print_success "✅ DMG criado com sucesso!"
    
    # Informações sobre o DMG
    DMG_SIZE=$(du -sh "${DMG_NAME}.dmg" | cut -f1)
    print_info "📊 Tamanho do DMG: $DMG_SIZE"
    print_info "📱 Arquivo: ${DMG_NAME}.dmg"
    
    # Assinatura do DMG (se possível)
    print_info "🔐 Aplicando assinatura no DMG..."
    codesign --sign - "${DMG_NAME}.dmg" 2>/dev/null && {
        print_success "✅ DMG assinado com sucesso"
    } || {
        print_warning "⚠️  Não foi possível assinar o DMG (continuando...)"
    }
    
    # Testar montagem do DMG
    print_info "🧪 Testando montagem do DMG..."
    hdiutil attach "${DMG_NAME}.dmg" -readonly -nobrowse -mountpoint "/tmp/audioai_test" 2>/dev/null && {
        sleep 1
        hdiutil detach "/tmp/audioai_test" 2>/dev/null
        print_success "✅ DMG monta corretamente"
    } || {
        print_warning "⚠️  Problema ao testar montagem do DMG"
    }
    
else
    print_error "❌ Falha ao criar DMG"
    exit 1
fi

# Limpeza
print_info "🧹 Limpando arquivos temporários..."
rm -rf "$DMG_TEMP_DIR"

echo ""
echo "=================================================="
print_success "🎉 Instalador DMG criado com sucesso!"
echo "=================================================="
echo ""
print_info "📦 Instalador: ${DMG_NAME}.dmg"
print_info "📊 Tamanho: $DMG_SIZE"
print_info "🏗️  Arquitetura: $ARCH"
echo ""
print_info "📋 Como usar:"
print_info "   1. Distribuir: Envie o arquivo ${DMG_NAME}.dmg"
print_info "   2. Instalar: Duplo clique no DMG e arraste para Applications"
print_info "   3. Executar: Abra o AudioAI do Launchpad"
echo ""
print_info "🧪 Testar instalação:"
print_info "   open ${DMG_NAME}.dmg"
echo ""