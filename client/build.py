#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Build - Audio AI Client
Automatiza a geração do executável usando PyInstaller
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def print_step(message):
    """Imprime uma etapa do processo"""
    print(f"\n🔧 {message}")
    print("=" * 50)

def run_command(command, description):
    """Executa um comando e trata erros"""
    print(f"Executando: {command}")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} - Sucesso")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - Erro:")
        print(e.stderr)
        return False

def clean_build_dirs():
    """Limpa diretórios de build anteriores"""
    dirs_to_clean = ['build', 'dist', '__pycache__']
    for dir_name in dirs_to_clean:
        if os.path.exists(dir_name):
            try:
                print(f"Removendo {dir_name}/")
                shutil.rmtree(dir_name)
            except Exception as e:
                print(f"⚠️  Aviso: Não foi possível remover {dir_name}: {e}")
    return True

def install_dependencies():
    """Instala dependências necessárias"""
    print_step("Instalando Dependências")
    
    # Verificar se está em um ambiente virtual
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("⚠️  Recomenda-se usar um ambiente virtual Python")
        response = input("Continuar mesmo assim? (y/N): ")
        if response.lower() != 'y':
            print("Build cancelado.")
            return False
    
    return run_command("pip install -r requirements.txt", "Instalação de dependências")

def build_executable():
    """Gera o executável usando PyInstaller"""
    print_step("Gerando Executável")
    
    # Comando PyInstaller
    if os.path.exists('build.spec'):
        command = "pyinstaller build.spec"
        description = "Build usando arquivo .spec"
    else:
        # Fallback para comando direto
        command = (
            "pyinstaller --onefile --windowed "
            "--name AudioAI "
            "--hidden-import PySide6.QtCore "
            "--hidden-import PySide6.QtWidgets "
            "--hidden-import PySide6.QtGui "
            "--hidden-import sounddevice "
            "--hidden-import scipy "
            "--hidden-import numpy "
            "--hidden-import requests "
            "--hidden-import pydub "
            "main.py"
        )
        description = "Build usando comando direto"
    
    return run_command(command, description)

def show_results():
    """Mostra os resultados do build"""
    print_step("Resultados do Build")
    
    dist_dir = Path("dist")
    if dist_dir.exists():
        files = list(dist_dir.iterdir())
        if files:
            print("✅ Executável gerado com sucesso!")
            print(f"📁 Localização: {dist_dir.absolute()}")
            print("\n📋 Arquivos gerados:")
            for file in files:
                size = file.stat().st_size / (1024 * 1024)  # MB
                print(f"  • {file.name} ({size:.1f} MB)")
            
            # Instruções de uso
            print("\n🚀 Como usar:")
            print("1. Navegue até a pasta 'dist'")
            print("2. Execute o arquivo AudioAI (ou AudioAI.exe no Windows)")
            print("3. Certifique-se de que o servidor Node.js está rodando")
            
            return True
        else:
            print("❌ Nenhum arquivo encontrado na pasta dist")
            return False
    else:
        print("❌ Pasta dist não foi criada")
        return False

def main():
    """Função principal do script de build"""
    print("🎯 Audio AI Client - Script de Build")
    print("=" * 50)
    
    # Verificar se estamos no diretório correto
    if not os.path.exists('main.py'):
        print("❌ Erro: Execute este script no diretório client/")
        sys.exit(1)
    
    # Etapas do build
    steps = [
        ("Limpando diretórios anteriores", clean_build_dirs),
        ("Instalando dependências", install_dependencies),
        ("Gerando executável", build_executable),
        ("Verificando resultados", show_results)
    ]
    
    for step_name, step_func in steps:
        print_step(step_name)
        if callable(step_func):
            if not step_func():
                print(f"❌ Falha na etapa: {step_name}")
                sys.exit(1)
        else:
            step_func()
    
    print("\n🎉 Build concluído com sucesso!")
    print("O executável está pronto para distribuição.")

if __name__ == "__main__":
    main()