#!/bin/bash

# AudioAI - Instalador Completo
# Instala Python, dependências e configura a aplicação cliente
# Compatível com macOS (Intel e Apple Silicon)

set -e  # Sair em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
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

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detectar arquitetura
ARCH=$(uname -m)
print_status "Detectada arquitetura: $ARCH"

# Detectar sistema operacional
OS=$(uname -s)
if [[ "$OS" != "Darwin" ]]; then
    print_error "Este instalador é específico para macOS"
    exit 1
fi

print_status "Sistema operacional: macOS"

# Verificar se é Apple Silicon ou Intel
if [[ "$ARCH" == "arm64" ]]; then
    print_status "Detectado Apple Silicon (M1/M2/M3)"
    PYTHON_INSTALLER_URL="https://www.python.org/ftp/python/3.11.7/python-3.11.7-macos11.pkg"
elif [[ "$ARCH" == "x86_64" ]]; then
    print_status "Detectado Intel Mac"
    PYTHON_INSTALLER_URL="https://www.python.org/ftp/python/3.11.7/python-3.11.7-macos11.pkg"
else
    print_error "Arquitetura não suportada: $ARCH"
    exit 1
fi

# Função para instalar Homebrew
install_homebrew() {
    if ! command_exists brew; then
        print_status "Instalando Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Adicionar Homebrew ao PATH
        if [[ "$ARCH" == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
            eval "$(/usr/local/bin/brew shellenv)"
        fi
        
        print_success "Homebrew instalado com sucesso"
    else
        print_status "Homebrew já está instalado"
    fi
}

# Função para instalar Python
install_python() {
    if ! command_exists python3 || ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)" 2>/dev/null; then
        print_status "Instalando Python 3.11..."
        
        # Tentar instalar via Homebrew primeiro
        if command_exists brew; then
            brew install python@3.11
            # Criar link simbólico se necessário
            if [[ "$ARCH" == "arm64" ]]; then
                ln -sf /opt/homebrew/bin/python3.11 /opt/homebrew/bin/python3
                ln -sf /opt/homebrew/bin/pip3.11 /opt/homebrew/bin/pip3
            else
                ln -sf /usr/local/bin/python3.11 /usr/local/bin/python3
                ln -sf /usr/local/bin/pip3.11 /usr/local/bin/pip3
            fi
        else
            # Fallback: baixar e instalar o instalador oficial
            print_status "Baixando Python do site oficial..."
            curl -o python_installer.pkg "$PYTHON_INSTALLER_URL"
            sudo installer -pkg python_installer.pkg -target /
            rm python_installer.pkg
        fi
        
        print_success "Python instalado com sucesso"
    else
        PYTHON_VERSION=$(python3 --version)
        print_status "Python já está instalado: $PYTHON_VERSION"
    fi
}

# Função para instalar pip
install_pip() {
    if ! command_exists pip3; then
        print_status "Instalando pip..."
        python3 -m ensurepip --upgrade
        python3 -m pip install --upgrade pip
        print_success "pip instalado com sucesso"
    else
        print_status "pip já está instalado"
        python3 -m pip install --upgrade pip
    fi
}

# Função para instalar dependências do sistema
install_system_dependencies() {
    print_status "Instalando dependências do sistema..."
    
    # Instalar Node.js se não estiver instalado
    if ! command_exists node; then
        print_status "Instalando Node.js..."
        if command_exists brew; then
            brew install node
        else
            print_error "Homebrew não encontrado. Instale Node.js manualmente."
            exit 1
        fi
        print_success "Node.js instalado com sucesso"
    else
        NODE_VERSION=$(node --version)
        print_status "Node.js já está instalado: $NODE_VERSION"
    fi
    
    # Instalar BlackHole (para captura de áudio)
    if ! brew list blackhole-2ch &>/dev/null; then
        print_status "Instalando BlackHole (driver de áudio virtual)..."
        brew install --cask blackhole-2ch
        print_success "BlackHole instalado com sucesso"
        print_warning "IMPORTANTE: Reinicie o sistema após a instalação para ativar o BlackHole"
    else
        print_status "BlackHole já está instalado"
    fi
}

# Função para instalar dependências Python
install_python_dependencies() {
    print_status "Instalando dependências Python..."
    
    # Verificar se requirements.txt existe
    if [[ ! -f "client/requirements.txt" ]]; then
        print_error "Arquivo client/requirements.txt não encontrado"
        exit 1
    fi
    
    # Criar ambiente virtual
    print_status "Criando ambiente virtual..."
    python3 -m venv venv
    source venv/bin/activate
    
    # Instalar dependências
    pip install -r client/requirements.txt
    
    print_success "Dependências Python instaladas com sucesso"
}

# Função para instalar dependências do servidor
install_server_dependencies() {
    print_status "Instalando dependências do servidor..."
    
    if [[ ! -f "server/package.json" ]]; then
        print_error "Arquivo server/package.json não encontrado"
        exit 1
    fi
    
    cd server
    npm install
    cd ..
    
    print_success "Dependências do servidor instaladas com sucesso"
}

# Função para configurar a aplicação
configure_application() {
    print_status "Configurando aplicação..."
    
    # Criar diretório de instalação
    INSTALL_DIR="$HOME/AudioAI"
    mkdir -p "$INSTALL_DIR"
    
    # Copiar arquivos da aplicação
    cp -r client "$INSTALL_DIR/"
    cp -r server "$INSTALL_DIR/"
    cp -r venv "$INSTALL_DIR/"
    cp README.md "$INSTALL_DIR/" 2>/dev/null || true
    
    # Criar script de execução
    cat > "$INSTALL_DIR/executar_audioai.sh" << 'EOF'
#!/bin/bash

# Script para executar AudioAI
cd "$(dirname "$0")"

# Ativar ambiente virtual
source venv/bin/activate

# Executar cliente
echo "Iniciando AudioAI Cliente..."
cd client
python3 main.py
EOF
    
    chmod +x "$INSTALL_DIR/executar_audioai.sh"
    
    # Criar link simbólico global
    sudo ln -sf "$INSTALL_DIR/executar_audioai.sh" /usr/local/bin/audioai
    
    # Criar arquivo .env se não existir
    if [[ ! -f "$INSTALL_DIR/server/.env" ]]; then
        cp "$INSTALL_DIR/server/.env.example" "$INSTALL_DIR/server/.env" 2>/dev/null || true
    fi
    
    print_success "Aplicação configurada em: $INSTALL_DIR"
}

# Função para criar script de inicialização do servidor
create_server_script() {
    cat > "$HOME/AudioAI/iniciar_servidor.sh" << 'EOF'
#!/bin/bash

# Script para iniciar o servidor AudioAI
cd "$(dirname "$0")/server"

echo "Iniciando servidor AudioAI..."
npm start
EOF
    
    chmod +x "$HOME/AudioAI/iniciar_servidor.sh"
    
    # Criar link simbólico para o servidor
    sudo ln -sf "$HOME/AudioAI/iniciar_servidor.sh" /usr/local/bin/audioai-server
}

# Função principal de instalação
main() {
    echo "=================================="
    echo "   AudioAI - Instalador Completo"
    echo "=================================="
    echo ""
    
    print_status "Iniciando instalação do AudioAI..."
    
    # Verificar se estamos no diretório correto
    if [[ ! -d "client" ]] || [[ ! -d "server" ]]; then
        print_error "Execute este script no diretório raiz do projeto AudioAI"
        exit 1
    fi
    
    # Instalar componentes
    install_homebrew
    install_python
    install_pip
    install_system_dependencies
    install_python_dependencies
    install_server_dependencies
    configure_application
    create_server_script
    
    echo ""
    echo "=================================="
    print_success "Instalação concluída com sucesso!"
    echo "=================================="
    echo ""
    
    print_status "Como usar o AudioAI:"
    echo "1. Para executar o cliente: audioai"
    echo "2. Para iniciar o servidor: audioai-server"
    echo "3. Ou execute diretamente: $HOME/AudioAI/executar_audioai.sh"
    echo ""
    
    print_warning "IMPORTANTE:"
    echo "- Configure suas chaves de API no arquivo: $HOME/AudioAI/server/.env"
    echo "- Se instalou BlackHole, reinicie o sistema"
    echo "- O servidor deve estar rodando antes de usar o cliente"
    echo ""
    
    print_status "Instalação finalizada!"
}

# Executar instalação
main "$@"