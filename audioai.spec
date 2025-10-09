# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from pathlib import Path

# Configurações do projeto
project_dir = Path.cwd()
client_dir = project_dir / 'client'

# Adicionar o diretório client ao path
sys.path.insert(0, str(client_dir))

# Dados adicionais para incluir
added_files = [
    (str(project_dir / 'server' / 'prompt.md'), '.'),
]

# Imports ocultos necessários
hidden_imports = [
    'PySide6.QtCore',
    'PySide6.QtWidgets', 
    'PySide6.QtGui',
    'PySide6.QtMultimedia',
    'sounddevice',
    'scipy',
    'scipy.signal',
    'numpy',
    'requests',
    'typing_extensions',
    'pydub',
    'pydub.utils',
    'pydub.effects',
    'json',
    'threading',
    'queue',
    'time',
    'os',
    'sys',
    'pathlib',
    'tempfile',
    'subprocess',
]

a = Analysis(
    [str(client_dir / 'main.py')],
    pathex=[str(project_dir), str(client_dir)],
    binaries=[],
    datas=added_files,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
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
    icon=None,
)

app = BUNDLE(
    exe,
    name='AudioAI.app',
    icon=None,
    bundle_identifier='com.audioai.desktop',
    version='1.0.0',
    info_plist={
        'CFBundleName': 'AudioAI',
        'CFBundleDisplayName': 'AudioAI Desktop',
        'CFBundleVersion': '1.0.0',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleIdentifier': 'com.audioai.desktop',
        'NSMicrophoneUsageDescription': 'AudioAI precisa acessar o microfone para gravar áudio.',
        'NSSystemAdministrationUsageDescription': 'AudioAI precisa de permissões administrativas para configurar dispositivos de áudio.',
        'LSMinimumSystemVersion': '10.14',
        'NSHighResolutionCapable': True,
        'NSRequiresAquaSystemAppearance': False,
    },
)