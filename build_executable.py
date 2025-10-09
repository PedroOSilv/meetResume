#!/usr/bin/env python3
"""
Script para criar executável da aplicação AudioAI Desktop
Usa PyInstaller para gerar um app bundle para macOS
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def main():
    print("🚀 Iniciando build do executável AudioAI...")
    
    # Diretório base do projeto
    project_dir = Path(__file__).parent
    client_dir = project_dir / "client"
    dist_dir = project_dir / "dist"
    build_dir = project_dir / "build"
    
    # Limpar builds anteriores
    if dist_dir.exists():
        print("🧹 Removendo build anterior...")
        shutil.rmtree(dist_dir)
    
    if build_dir.exists():
        shutil.rmtree(build_dir)
    
    # Verificar se o ambiente virtual está ativo
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("❌ Erro: Execute este script dentro do ambiente virtual!")
        print("💡 Use: source audioai_client_env/bin/activate")
        sys.exit(1)
    
    # Verificar se PyInstaller está instalado
    try:
        import PyInstaller
        print(f"✅ PyInstaller encontrado: {PyInstaller.__version__}")
    except ImportError:
        print("❌ PyInstaller não encontrado. Instalando...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    # Configurações do PyInstaller
    main_script = client_dir / "main.py"
    app_name = "AudioAI"
    
    # Comando PyInstaller
    cmd = [
        "pyinstaller",
        "--name", app_name,
        "--windowed",  # Não mostrar console
        "--onedir",    # Criar diretório com dependências
        "--clean",     # Limpar cache
        "--noconfirm", # Não pedir confirmação
        "--add-data", f"{client_dir}:client",  # Incluir arquivos do cliente
        "--hidden-import", "PySide6.QtCore",
        "--hidden-import", "PySide6.QtWidgets", 
        "--hidden-import", "PySide6.QtGui",
        "--hidden-import", "sounddevice",
        "--hidden-import", "scipy",
        "--hidden-import", "numpy",
        "--hidden-import", "requests",
        "--hidden-import", "pydub",
        "--collect-all", "PySide6",
        str(main_script)
    ]
    
    print("🔨 Executando PyInstaller...")
    print(f"📁 Diretório de trabalho: {project_dir}")
    
    # Executar PyInstaller
    result = subprocess.run(cmd, cwd=project_dir, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("❌ Erro durante o build:")
        print(result.stderr)
        sys.exit(1)
    
    print("✅ Build concluído com sucesso!")
    
    # Verificar se o executável foi criado
    app_path = dist_dir / app_name / f"{app_name}"
    if app_path.exists():
        print(f"📦 Executável criado: {app_path}")
        
        # Tornar executável
        os.chmod(app_path, 0o755)
        print("🔐 Permissões de execução configuradas")
        
        # Criar script de lançamento
        create_launcher_script(project_dir, app_name)
        
    else:
        print("❌ Executável não encontrado!")
        sys.exit(1)

def create_launcher_script(project_dir, app_name):
    """Cria script de lançamento para o executável"""
    launcher_path = project_dir / f"launch_{app_name.lower()}.sh"
    
    launcher_content = f'''#!/bin/bash
# Launcher para AudioAI Desktop

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
APP_PATH="$SCRIPT_DIR/dist/{app_name}/{app_name}"

# Verificar se o executável existe
if [[ ! -f "$APP_PATH" ]]; then
    echo "❌ Executável não encontrado: $APP_PATH"
    echo "💡 Execute primeiro: python build_executable.py"
    exit 1
fi

# Dar permissões de execução
chmod +x "$APP_PATH"

# Executar aplicação
echo "🚀 Iniciando AudioAI Desktop..."
"$APP_PATH"
'''
    
    with open(launcher_path, 'w') as f:
        f.write(launcher_content)
    
    # Tornar o launcher executável
    os.chmod(launcher_path, 0o755)
    print(f"🚀 Script de lançamento criado: {launcher_path}")

if __name__ == "__main__":
    main()