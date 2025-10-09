# 📦 Instruções de Build - Audio AI Client

Este documento fornece instruções detalhadas para gerar um executável standalone do Audio AI Client.

## 🎯 Visão Geral

O processo de build cria um executável que:
- ✅ **Não requer Python instalado** no computador de destino
- ✅ **Inclui todas as dependências** necessárias
- ✅ **Funciona em qualquer sistema** compatível
- ✅ **Mantém a funcionalidade completa** da aplicação

## 🛠️ Pré-requisitos

### Sistema de Build
- **Python 3.8+** instalado
- **pip** atualizado
- **Dependências do projeto** instaladas

### Dependências Necessárias
```bash
pip install -r requirements.txt
```

As principais dependências para build são:
- `pyinstaller>=5.13.0` - Gerador de executáveis
- `PySide6>=6.6.0` - Interface gráfica
- `sounddevice>=0.4.6` - Gravação de áudio
- `requests>=2.28.0` - Comunicação HTTP

## 🚀 Métodos de Build

### Método 1: Script Automático (Recomendado)

#### Para macOS/Linux:
```bash
cd audio-ai-app/client
./build.sh
```

#### Para Windows ou Python direto:
```bash
cd audio-ai-app/client
python build.py
```

### Método 2: PyInstaller Manual

```bash
cd audio-ai-app/client

# Usando arquivo de configuração
pyinstaller build.spec

# Ou comando direto
pyinstaller --onefile --windowed \
    --name AudioAI \
    --hidden-import PySide6.QtCore \
    --hidden-import PySide6.QtWidgets \
    --hidden-import PySide6.QtGui \
    --hidden-import sounddevice \
    --hidden-import scipy \
    --hidden-import numpy \
    --hidden-import requests \
    main.py
```

## 📋 Arquivos de Configuração

### build.spec
Arquivo de configuração do PyInstaller com:
- **Dependências ocultas** especificadas
- **Exclusões** para reduzir tamanho
- **Configurações específicas** por plataforma
- **Bundle macOS** (.app) configurado

### build.py
Script Python que:
- **Verifica ambiente** virtual
- **Instala dependências** automaticamente
- **Limpa builds** anteriores
- **Executa PyInstaller** com configurações otimizadas
- **Valida resultado** final

### build.sh
Script shell para sistemas Unix que:
- **Cria ambiente virtual** se necessário
- **Ativa ambiente** automaticamente
- **Instala dependências** via pip
- **Executa build** completo
- **Verifica sucesso** do processo

## 📊 Resultado do Build

### Estrutura de Saída
```
dist/
├── AudioAI              # Executável principal (macOS/Linux)
├── AudioAI.exe          # Executável principal (Windows)
└── AudioAI.app/         # Bundle macOS (somente macOS)
    ├── Contents/
    │   ├── Info.plist
    │   ├── MacOS/
    │   │   └── AudioAI
    │   └── Resources/
```

### Especificações Técnicas
- **Tamanho**: ~65MB (inclui Python runtime + dependências)
- **Arquitetura**: Nativa do sistema (x64, ARM64)
- **Compressão**: UPX habilitada (se disponível)
- **Console**: Desabilitado (aplicação GUI)

## 🔧 Solução de Problemas

### Erro: "pip: command not found"
```bash
# Instalar pip
python -m ensurepip --upgrade

# Ou usar python3
python3 -m pip install -r requirements.txt
```

### Erro: "PyInstaller não encontrado"
```bash
pip install pyinstaller>=5.13.0
```

### Erro: "Módulo não encontrado" no executável
Adicione o módulo em `build.spec`:
```python
hiddenimports=[
    'seu_modulo_aqui',
    # ... outros módulos
]
```

### Executável muito grande
1. **Remova dependências** desnecessárias
2. **Use excludes** no build.spec:
```python
excludes=[
    'tkinter',
    'matplotlib',
    'PIL',
    'cv2'
]
```

### Erro de permissão (macOS)
```bash
chmod +x build.sh
chmod +x dist/AudioAI
```

## 🚀 Distribuição

### Preparar para Distribuição
1. **Teste o executável** no sistema de build
2. **Copie a pasta `dist/`** completa
3. **Inclua instruções** de uso
4. **Documente requisitos** do servidor

### Instruções para Usuário Final
```
1. Extraia os arquivos em qualquer pasta
2. Execute AudioAI (ou AudioAI.exe)
3. Configure o servidor na interface
4. Comece a usar!
```

### Configuração de Servidor Remoto
O usuário pode configurar um servidor remoto editando:
```python
# Em api_client.py ou via interface
BASE_URL = "http://IP_DO_SERVIDOR:3030"
```

## 📝 Notas Importantes

- ⚠️ **Antivírus**: Alguns antivírus podem detectar falsos positivos
- 🔒 **Assinatura**: Para distribuição comercial, considere assinar o executável
- 🖥️ **Compatibilidade**: Teste em diferentes versões do sistema operacional
- 📡 **Rede**: O executável ainda precisa de conectividade com o servidor Node.js

## 🆘 Suporte

Se encontrar problemas:
1. **Verifique logs** do PyInstaller
2. **Teste dependências** individualmente
3. **Use modo debug** temporariamente:
```bash
pyinstaller --debug=all build.spec
```
4. **Consulte documentação** do PyInstaller: https://pyinstaller.org/