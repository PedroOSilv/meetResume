#!/bin/bash

# Script para build e assinatura da aplicação AudioAI Desktop
# Compatível com macOS (Intel e Apple Silicon)

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

# Função para criar instalador
create_installer() {
    print_info "📦 Criando instalador..."
    
    cat > AudioAI_Installer.sh << 'EOF'
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

EOF

    chmod +x AudioAI_Installer.sh
    print_success "Instalador criado: AudioAI_Installer.sh"
}

# Verificar se estamos no diretório correto
if [[ ! -f "audioai.spec" ]] || [[ ! -d "client" ]]; then
    print_error "Execute este script no diretório raiz do projeto AudioAI"
    exit 1
fi

print_info "🚀 Iniciando build da aplicação AudioAI Desktop..."

# Verificar se o ambiente virtual está ativo
if [[ -z "$VIRTUAL_ENV" ]]; then
    print_warning "Ambiente virtual não detectado. Ativando..."
    if [[ -f "audioai_client_env/bin/activate" ]]; then
        source audioai_client_env/bin/activate
        print_success "Ambiente virtual ativado"
    else
        print_error "Ambiente virtual não encontrado. Execute primeiro o instalador."
        exit 1
    fi
fi

# Verificar se PyInstaller está instalado
if ! command -v pyinstaller &> /dev/null; then
    print_info "Instalando PyInstaller..."
    pip install pyinstaller
fi

# Limpar builds anteriores
print_info "🧹 Limpando builds anteriores..."
rm -rf dist/ build/ *.app 2>/dev/null || true

# Executar PyInstaller
print_info "🔨 Executando PyInstaller..."
pyinstaller audioai.spec

# Verificar se o build foi bem-sucedido
if [[ -d "dist/AudioAI.app" ]]; then
    print_success "✅ Build concluído: dist/AudioAI.app"
    
    # Configurar permissões
    print_info "🔐 Configurando permissões..."
    chmod -R 755 dist/AudioAI.app
    
    # Aplicar assinatura ad-hoc (permite execução local)
    print_info "✍️ Aplicando assinatura ad-hoc..."
    codesign --force --deep --sign - dist/AudioAI.app
    print_success "Assinatura aplicada"
    
    # Remover quarentena (permite execução sem aviso)
    print_info "🔓 Removendo atributos de quarentena..."
    xattr -cr dist/AudioAI.app 2>/dev/null || {
        print_warning "Não foi possível remover atributos de quarentena"
    }
    
    # Criar script de instalação
    create_installer
    
    print_success "🎉 Build completo!"
    print_info "📦 Aplicação: dist/AudioAI.app"
    print_info "💾 Instalador: AudioAI_Installer.sh"
    print_info ""
    print_info "Para testar: open dist/AudioAI.app"
    
else
    print_error "❌ Build falhou - aplicação não encontrada"
    exit 1
fi