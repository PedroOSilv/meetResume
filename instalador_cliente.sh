#!/bin/bash

# AudioAI - Instalador Cliente
# Instala apenas o cliente Python com suas dependências

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de output
print_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detectar arquitetura e OS
ARCH=$(uname -m)
OS=$(uname -s)

print_info "Detectada arquitetura: $ARCH"
print_info "Sistema operacional: $OS"

if [[ "$ARCH" == "arm64" ]]; then
    print_info "Detectado Apple Silicon (M1/M2/M3)"
elif [[ "$ARCH" == "x86_64" ]]; then
    print_info "Detectado Intel Mac"
fi

echo "=================================="
echo "   AudioAI - Instalador Cliente"
echo "=================================="
echo ""

# Verificar se estamos no diretório correto
if [[ ! -d "client" ]] || [[ ! -f "client/requirements.txt" ]]; then
    print_error "Execute este script no diretório raiz do projeto AudioAI"
    print_error "Certifique-se de que existe o diretório 'client' com requirements.txt"
    exit 1
fi

print_info "Iniciando instalação do cliente AudioAI..."

# Instalar Homebrew se necessário
if ! command_exists brew; then
    print_info "Instalando Homebrew..."
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
    print_info "Homebrew já está instalado"
fi

# Instalar Python 3.11
print_info "Verificando Python 3.11..."

PYTHON_CMD=""

# Verificar se já temos Python 3.11
if command_exists python3.11; then
    PYTHON_CMD="python3.11"
    print_info "Python 3.11 já está instalado: $(python3.11 --version)"
elif command_exists python3 && python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)" 2>/dev/null; then
    PYTHON_CMD="python3"
    print_info "Python adequado já está instalado: $(python3 --version)"
else
    print_info "Instalando Python 3.11 via Homebrew..."
    brew install python@3.11
    
    # Verificar instalação
    if command_exists python3.11; then
        PYTHON_CMD="python3.11"
    elif [[ -f /opt/homebrew/bin/python3.11 ]]; then
        PYTHON_CMD="/opt/homebrew/bin/python3.11"
    elif [[ -f /usr/local/bin/python3.11 ]]; then
        PYTHON_CMD="/usr/local/bin/python3.11"
    else
        print_error "Falha ao instalar Python 3.11"
        exit 1
    fi
fi

print_success "Python configurado: $($PYTHON_CMD --version)"

# Verificar pip
print_info "Verificando pip..."
if ! $PYTHON_CMD -m pip --version >/dev/null 2>&1; then
    print_info "Instalando pip..."
    $PYTHON_CMD -m ensurepip --upgrade
fi

# Instalar BlackHole (driver de áudio virtual)
print_info "Verificando BlackHole (driver de áudio virtual)..."
if ! brew list blackhole-2ch >/dev/null 2>&1; then
    print_info "Instalando BlackHole..."
    brew install --cask blackhole-2ch
else
    print_info "BlackHole já está instalado"
fi

# Criar ambiente virtual no diretório client
print_info "Instalando dependências do cliente..."
cd client

# Remover ambiente virtual existente se houver
if [[ -d "venv" ]]; then
    print_info "Removendo ambiente virtual existente..."
    rm -rf venv
fi

print_info "Criando ambiente virtual para o cliente..."
if ! $PYTHON_CMD -m venv venv; then
    print_error "Falha ao criar ambiente virtual"
    exit 1
fi

# Ativar ambiente virtual
source venv/bin/activate

# Atualizar pip no ambiente virtual
print_info "Atualizando pip no ambiente virtual..."
python -m pip install --upgrade pip

# Instalar dependências
print_info "Instalando dependências do requirements.txt..."
if ! python -m pip install -r requirements.txt; then
    print_error "Falha ao instalar dependências"
    exit 1
fi

# Criar script de execução
print_info "Criando script de execução..."
cat > executar_cliente.sh << 'EOF'
#!/bin/bash

# Script para executar o cliente AudioAI

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} Iniciando cliente AudioAI..."

# Ir para o diretório do cliente
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ativar ambiente virtual
if [[ -d "venv" ]]; then
    source venv/bin/activate
    echo -e "${GREEN}[SUCESSO]${NC} Ambiente virtual ativado"
else
    echo -e "${RED}[ERRO]${NC} Ambiente virtual não encontrado"
    echo "Execute o instalador novamente"
    exit 1
fi

# Executar aplicação
echo -e "${BLUE}[INFO]${NC} Executando aplicação..."
python main.py

EOF

chmod +x executar_cliente.sh

# Criar link simbólico global (opcional)
if [[ -w /usr/local/bin ]]; then
    ln -sf "$(pwd)/executar_cliente.sh" /usr/local/bin/audioai-cliente 2>/dev/null || true
    print_info "Comando global 'audioai-cliente' criado"
fi

cd ..

print_success "Instalação do cliente concluída com sucesso!"
echo ""
echo "=================================="
echo "        COMO USAR"
echo "=================================="
echo ""
echo "1. Para executar o cliente:"
echo "   cd client && ./executar_cliente.sh"
echo ""
echo "   OU (se o link global foi criado):"
echo "   audioai-cliente"
echo ""
echo "2. O cliente será executado com todas as dependências"
echo "   instaladas no ambiente virtual isolado"
echo ""
echo "=================================="
echo "     INSTALAÇÃO CONCLUÍDA"
echo "=================================="