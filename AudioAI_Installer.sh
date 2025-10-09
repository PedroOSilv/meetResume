#!/bin/bash

# Instalador AudioAI Desktop
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

echo "=================================="
echo "   AudioAI Desktop - Instalador"
echo "=================================="
echo ""

# Verificar se a aplicação existe
if [[ ! -d "dist/AudioAI.app" ]]; then
    print_error "Aplicação não encontrada. Execute primeiro: ./build_app.sh"
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
print_info "Instalando AudioAI Desktop..."
cp -R "dist/AudioAI.app" "$INSTALL_DIR/"

# Configurar permissões
chmod -R 755 "$APP_PATH"

# Remover quarentena
xattr -cr "$APP_PATH" 2>/dev/null || true

print_success "✅ AudioAI Desktop instalado com sucesso!"
print_info "📍 Localização: $APP_PATH"
print_info ""
print_info "Para executar:"
print_info "  • Finder: Vá para Applications e clique duplo em AudioAI"
print_info "  • Terminal: open '$APP_PATH'"
print_info ""
print_warning "Nota: Na primeira execução, o macOS pode pedir confirmação de segurança."
print_warning "Se isso acontecer, vá em Preferências > Segurança e clique 'Abrir mesmo assim'."

