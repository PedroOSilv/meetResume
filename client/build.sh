#!/bin/bash
# Script de Build para Audio AI Client (macOS/Linux)

set -e  # Parar em caso de erro

echo "🎯 Audio AI Client - Build Script"
echo "=================================="

# Verificar se estamos no diretório correto
if [ ! -f "main.py" ]; then
    echo "❌ Erro: Execute este script no diretório client/"
    exit 1
fi

# Verificar se Python está disponível
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 não encontrado. Instale Python 3.8+ primeiro."
    exit 1
fi

# Criar ambiente virtual se não existir
if [ ! -d "venv" ]; then
    echo "🔧 Criando ambiente virtual..."
    python3 -m venv venv
fi

# Ativar ambiente virtual
echo "🔧 Ativando ambiente virtual..."
source venv/bin/activate

# Atualizar pip
echo "🔧 Atualizando pip..."
pip install --upgrade pip

# Instalar dependências
echo "🔧 Instalando dependências..."
pip install -r requirements.txt

# Limpar builds anteriores
echo "🔧 Limpando builds anteriores..."
rm -rf build dist *.spec __pycache__

# Gerar executável
echo "🔧 Gerando executável..."
if [ -f "build.spec" ]; then
    pyinstaller build.spec
else
    pyinstaller --onefile --windowed \
        --name AudioAI \
        --hidden-import PySide6.QtCore \
        --hidden-import PySide6.QtWidgets \
        --hidden-import PySide6.QtGui \
        --hidden-import sounddevice \
        --hidden-import scipy \
        --hidden-import numpy \
        --hidden-import requests \
        --hidden-import pydub \
        main.py
fi

# Verificar resultado
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo "✅ Build concluído com sucesso!"
    echo "📁 Executável disponível em: $(pwd)/dist/"
    ls -la dist/
    
    echo ""
    echo "🚀 Para executar:"
    echo "   ./dist/AudioAI"
    echo ""
    echo "📦 Para distribuir, copie o conteúdo da pasta 'dist'"
else
    echo "❌ Erro no build - executável não foi gerado"
    exit 1
fi