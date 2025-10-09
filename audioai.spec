# -*- mode: python ; coding: utf-8 -*-
"""
AudioAI Desktop - PyInstaller Spec File
Configuração otimizada para gerar executável autônomo no macOS
"""

import os
import sys
from pathlib import Path

# Diretórios do projeto
project_dir = Path(SPECPATH)
client_dir = project_dir / "client"

# Dados adicionais a serem incluídos
datas = []

# Imports ocultos necessários
hiddenimports = [
    'PySide6.QtCore',
    'PySide6.QtWidgets', 
    'PySide6.QtGui',
    'sounddevice',
    'scipy',
    'scipy.signal',
    'scipy.io',
    'scipy.io.wavfile',
    'numpy',
    'requests',
    'urllib3',
    'certifi',
    'charset_normalizer',
    'idna',
    'pydub',
    'typing_extensions',
    '_sounddevice_data',
    'cffi',
    'pycparser'
]

# Binários adicionais (bibliotecas nativas)
binaries = []

# Análise do script principal
a = Analysis(
    [str(client_dir / 'main.py')],
    pathex=[str(client_dir)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'PIL',
        'PyQt5',
        'PyQt6',
        'wx'
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# Remover duplicatas
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# Executável
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='AudioAI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# Bundle da aplicação (macOS .app)
app = BUNDLE(
    exe,
    name='AudioAI.app',
    icon=None,  # Será definido no script de build se disponível
    bundle_identifier='com.audioai.desktop',
    version='1.0.0',
    info_plist={
        'CFBundleName': 'AudioAI',
        'CFBundleDisplayName': 'AudioAI Desktop',
        'CFBundleVersion': '1.0.0',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleIdentifier': 'com.audioai.desktop',
        'CFBundleExecutable': 'AudioAI',
        'CFBundlePackageType': 'APPL',
        'NSHighResolutionCapable': True,
        'NSMicrophoneUsageDescription': 'AudioAI precisa acessar o microfone para gravar áudio.',
        'NSAppleEventsUsageDescription': 'AudioAI precisa de acesso para funcionar corretamente.',
        'LSMinimumSystemVersion': '10.15.0',
        'LSApplicationCategoryType': 'public.app-category.productivity',
    },
)