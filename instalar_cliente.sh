#!/bin/bash

# AudioAI - Instalador do Cliente
# Instalador simples e otimizado para o cliente AudioAI

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de output
echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# Verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detectar arquitetura e OS
ARCH=$(uname -m)
OS=$(uname -s)

echo_info "Detectada arquitetura: $ARCH"
echo_info "Sistema operacional: $OS"

if [[ "$ARCH" == "arm64" ]]; then
    echo_info "Detectado Apple Silicon (M1/M2/M3)"
elif [[ "$ARCH" == "x86_64" ]]; then
    echo_info "Detectado Intel Mac"
fi

# Diretório de instalação
INSTALL_DIR="$HOME/AudioAI-Cliente"

echo "=================================="
echo "   AudioAI - Instalador Cliente"
echo "=================================="
echo ""

echo_info "Iniciando instalação do cliente AudioAI..."

# Verificar se já existe instalação
if [[ -d "$INSTALL_DIR" ]]; then
    echo_warning "Instalação existente encontrada em $INSTALL_DIR"
    read -p "Deseja remover a instalação existente? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo_info "Removendo instalação existente..."
        rm -rf "$INSTALL_DIR"
    else
        echo_info "Mantendo instalação existente. Saindo..."
        exit 0
    fi
fi

# Verificar Homebrew
if ! command_exists brew; then
    echo_info "Instalando Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Adicionar ao PATH
    if [[ "$ARCH" == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo_info "Homebrew já está instalado"
fi

# Instalar Python 3.11
echo_info "Verificando Python 3.11..."
if ! command_exists python3.11; then
    echo_info "Instalando Python 3.11..."
    brew install python@3.11
else
    echo_info "Python 3.11 já está instalado"
fi

# Verificar pip
echo_info "Verificando pip..."
if command_exists python3.11; then
    PYTHON_CMD="python3.11"
    PIP_CMD="pip3.11"
elif command_exists python3; then
    PYTHON_CMD="python3"
    PIP_CMD="pip3"
else
    echo_error "Python não encontrado"
    exit 1
fi

# Atualizar pip
echo_info "Atualizando pip..."
$PYTHON_CMD -m pip install --upgrade pip --user

# Verificar BlackHole
echo_info "Verificando BlackHole (driver de áudio virtual)..."
if ! brew list blackhole-2ch >/dev/null 2>&1; then
    echo_info "Instalando BlackHole..."
    brew install blackhole-2ch
else
    echo_info "BlackHole já está instalado"
fi

# Criar diretório de instalação
echo_info "Criando diretório de instalação..."
mkdir -p "$INSTALL_DIR"

# Copiar arquivos do cliente
echo_info "Copiando arquivos do cliente..."
if [[ -d "client" ]]; then
    cp -r client/* "$INSTALL_DIR/"
else
    echo_error "Diretório 'client' não encontrado"
    exit 1
fi

# Criar ambiente virtual no diretório de instalação
echo_info "Criando ambiente virtual..."
cd "$INSTALL_DIR"
$PYTHON_CMD -m venv venv

# Ativar ambiente virtual e instalar dependências
echo_info "Instalando dependências..."
source venv/bin/activate
python -m pip install --upgrade pip

if [[ -f "requirements.txt" ]]; then
    python -m pip install -r requirements.txt
else
    echo_error "Arquivo requirements.txt não encontrado"
    exit 1
fi

# Criar script de execução
echo_info "Criando script de execução..."
cat > "$INSTALL_DIR/executar.sh" << 'EOF'
#!/bin/bash

# Script de execução do AudioAI Cliente
cd "$(dirname "$0")"

# Ativar ambiente virtual
source venv/bin/activate

# Executar aplicação
python main.py

# Desativar ambiente virtual
deactivate
EOF

chmod +x "$INSTALL_DIR/executar.sh"

# Criar link simbólico global
echo_info "Criando comando global 'audioai-cliente'..."
sudo ln -sf "$INSTALL_DIR/executar.sh" /usr/local/bin/audioai-cliente 2>/dev/null || {
    echo_warning "Não foi possível criar link global. Execute diretamente: $INSTALL_DIR/executar.sh"
}

# Criar arquivo de configuração
echo_info "Criando arquivo de configuração..."
cat > "$INSTALL_DIR/config.txt" << EOF
# Configuração do AudioAI Cliente
# Edite este arquivo conforme necessário

# URL do servidor (altere se necessário)
SERVER_URL=http://localhost:3000

# Configurações de áudio
SAMPLE_RATE=44100
CHANNELS=2
CHUNK_SIZE=1024

# Configurações de gravação
MAX_RECORDING_TIME=300
AUTO_SAVE=true
EOF

echo ""
echo_success "Instalação concluída com sucesso!"
echo ""
echo "📁 Localização: $INSTALL_DIR"
echo "🚀 Para executar: audioai-cliente (ou $INSTALL_DIR/executar.sh)"
echo "⚙️  Configuração: $INSTALL_DIR/config.txt"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o servidor AudioAI (se necessário)"
echo "2. Ajuste as configurações em config.txt"
echo "3. Execute: audioai-cliente"
echo ""
echo_info "Instalação do cliente AudioAI finalizada!"