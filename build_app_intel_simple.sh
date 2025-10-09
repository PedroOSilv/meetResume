#!/bin/bash

# Script simplificado para build Intel usando PyInstaller básico
# Evita dependências complexas que podem ter problemas de arquitetura

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCESSO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
print_error() { echo -e "${RED}[ERRO]${NC} $1"; }

print_info "🚀 Build Intel simplificado - AudioAI Desktop"

# Verificar se estamos no ambiente Intel
if [[ -z "$VIRTUAL_ENV" ]] || [[ "$VIRTUAL_ENV" != *"intel"* ]]; then
    print_info "Ativando ambiente Intel..."
    source audioai_intel_env/bin/activate
fi

# Limpar builds anteriores
print_info "🧹 Limpando builds anteriores..."
rm -rf dist_intel/ build/ *.app 2>/dev/null || true
mkdir -p dist_intel

# Build básico com PyInstaller
print_info "🔨 Executando PyInstaller (modo básico)..."

arch -x86_64 pyinstaller \
    --onedir \
    --windowed \
    --name="AudioAI" \
    --distpath="dist_intel" \
    --workpath="build_intel" \
    --specpath="." \
    --add-data="server/prompt.md:." \
    --hidden-import="json" \
    --hidden-import="threading" \
    --hidden-import="queue" \
    --hidden-import="time" \
    --hidden-import="os" \
    --hidden-import="sys" \
    --hidden-import="pathlib" \
    --hidden-import="tempfile" \
    --hidden-import="subprocess" \
    --osx-bundle-identifier="com.audioai.desktop.intel" \
    client/main.py

# Verificar se o build foi bem-sucedido
if [[ -d "dist_intel/AudioAI.app" ]]; then
    print_success "✅ Build Intel básico concluído!"
    
    # Configurar permissões
    print_info "🔐 Configurando permissões..."
    chmod -R 755 dist_intel/AudioAI.app
    
    # Aplicar assinatura ad-hoc
    print_info "✍️ Aplicando assinatura ad-hoc..."
    codesign --force --deep --sign - dist_intel/AudioAI.app
    
    # Remover quarentena
    print_info "🔓 Removendo atributos de quarentena..."
    xattr -cr dist_intel/AudioAI.app 2>/dev/null || true
    
    print_success "🎉 AudioAI Desktop (Intel) pronto!"
    print_info "📦 Localização: dist_intel/AudioAI.app"
    print_info "🏗️ Arquitetura: x86_64 (Intel)"
    print_info ""
    print_info "Para testar: open dist_intel/AudioAI.app"
    
else
    print_error "❌ Build falhou"
    exit 1
fi