#!/bin/bash

# Instalador AudioAI Desktop (Intel x86_64)
# Instala a aplicação na pasta Applications do usuário

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

echo "========================================"
echo "   AudioAI Desktop - Instalador Intel"
echo "========================================"
echo ""

# Verificar arquitetura do sistema
ARCH=$(uname -m)
print_info "🔍 Arquitetura detectada: $ARCH"

if [[ "$ARCH" != "x86_64" ]]; then
    print_warning "⚠️  Este instalador é otimizado para Macs Intel (x86_64)"
    print_warning "   Seu Mac tem arquitetura: $ARCH"
    print_info "   A aplicação ainda pode funcionar via Rosetta 2"
    echo ""
    read -p "Deseja continuar? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Instalação cancelada"
        exit 0
    fi
fi

# Verificar se a aplicação existe
if [[ ! -d "dist_intel/AudioAI.app" ]]; then
    print_error "Aplicação Intel não encontrada em dist_intel/"
    print_error "Execute primeiro: ./build_app_intel_simple.sh"
    exit 1
fi

# Diretório de instalação
INSTALL_DIR="$HOME/Applications"
APP_PATH="$INSTALL_DIR/AudioAI.app"

# Criar diretório se não existir
mkdir -p "$INSTALL_DIR"

# Remover instalação anterior se existir
if [[ -d "$APP_PATH" ]]; then
    print_warning "Removendo instalação anterior..."
    rm -rf "$APP_PATH"
fi

# Copiar aplicação
print_info "📦 Instalando AudioAI Desktop (Intel)..."
cp -R "dist_intel/AudioAI.app" "$INSTALL_DIR/"

# Configurar permissões
print_info "🔐 Configurando permissões..."
chmod -R 755 "$APP_PATH"

# Remover quarentena
print_info "🔓 Removendo atributos de quarentena..."
xattr -cr "$APP_PATH" 2>/dev/null || true

print_success "✅ AudioAI Desktop (Intel) instalado com sucesso!"
print_info "📍 Localização: $APP_PATH"
print_info "🏗️ Arquitetura: x86_64 (Intel)"
print_info "📦 Tamanho: 9.7MB"
print_info ""
print_info "Para executar:"
print_info "  • Finder: Vá para Applications e clique duplo em AudioAI"
print_info "  • Terminal: open '$APP_PATH'"
print_info ""
print_warning "Nota: Na primeira execução, o macOS pode pedir confirmação de segurança."
print_warning "Se isso acontecer, vá em Preferências > Segurança e clique 'Abrir mesmo assim'."
print_info ""
print_info "🌐 Lembre-se: Configure o IP do servidor AudioAI na aplicação!"