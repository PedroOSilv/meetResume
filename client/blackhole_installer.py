#!/usr/bin/env python3
"""
BlackHole Audio Driver Installer
Verifica se o BlackHole está instalado e instala automaticamente se necessário.
"""

import os
import subprocess
import sys
import urllib.request
import tempfile
import shutil
from pathlib import Path

class BlackHoleInstaller:
    def __init__(self):
        self.blackhole_path = "/Library/Audio/Plug-Ins/HAL/"
        self.blackhole_2ch_driver = "BlackHole2ch.driver"
        self.blackhole_16ch_driver = "BlackHole16ch.driver"
        self.download_url_2ch = "https://existential.audio/downloads/BlackHole2ch.pkg"
        self.homebrew_package = "blackhole-2ch"
    
    def is_blackhole_installed(self):
        """Verifica se o BlackHole está instalado no sistema."""
        try:
            # Verifica se o driver existe no diretório HAL
            driver_2ch_path = os.path.join(self.blackhole_path, self.blackhole_2ch_driver)
            driver_16ch_path = os.path.join(self.blackhole_path, self.blackhole_16ch_driver)
            
            if os.path.exists(driver_2ch_path) or os.path.exists(driver_16ch_path):
                print("✅ BlackHole já está instalado no sistema")
                return True
            
            # Verifica também via system_profiler para ter certeza
            result = subprocess.run([
                "system_profiler", "SPAudioDataType"
            ], capture_output=True, text=True, timeout=10)
            
            if "BlackHole" in result.stdout:
                print("✅ BlackHole detectado via system_profiler")
                return True
                
            return False
            
        except Exception as e:
            print(f"⚠️ Erro ao verificar instalação do BlackHole: {e}")
            return False
    
    def has_homebrew(self):
        """Verifica se o Homebrew está instalado."""
        try:
            subprocess.run(["brew", "--version"], 
                         capture_output=True, check=True, timeout=5)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def install_via_homebrew(self):
        """Instala o BlackHole via Homebrew."""
        try:
            print("🍺 Instalando BlackHole via Homebrew...")
            result = subprocess.run([
                "brew", "install", self.homebrew_package
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print("✅ BlackHole instalado com sucesso via Homebrew!")
                return True
            else:
                print(f"❌ Erro na instalação via Homebrew: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("⏰ Timeout na instalação via Homebrew")
            return False
        except Exception as e:
            print(f"❌ Erro na instalação via Homebrew: {e}")
            return False
    
    def download_and_install_pkg(self):
        """Baixa e instala o BlackHole via arquivo .pkg oficial."""
        try:
            print("📥 Baixando BlackHole do site oficial...")
            
            # Cria diretório temporário
            with tempfile.TemporaryDirectory() as temp_dir:
                pkg_path = os.path.join(temp_dir, "BlackHole2ch.pkg")
                
                # Baixa o arquivo
                urllib.request.urlretrieve(self.download_url_2ch, pkg_path)
                print("✅ Download concluído")
                
                # Instala o pacote
                print("📦 Instalando BlackHole...")
                result = subprocess.run([
                    "sudo", "installer", "-pkg", pkg_path, "-target", "/"
                ], capture_output=True, text=True, timeout=120)
                
                if result.returncode == 0:
                    print("✅ BlackHole instalado com sucesso!")
                    
                    # Reinicia o CoreAudio
                    print("🔄 Reiniciando CoreAudio...")
                    subprocess.run(["sudo", "killall", "-9", "coreaudiod"], 
                                 capture_output=True, timeout=10)
                    
                    return True
                else:
                    print(f"❌ Erro na instalação: {result.stderr}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro no download/instalação: {e}")
            return False
    
    def install_blackhole(self):
        """Instala o BlackHole usando o método mais apropriado."""
        print("🎵 Iniciando instalação do BlackHole...")
        
        # Tenta via Homebrew primeiro (mais rápido e confiável)
        if self.has_homebrew():
            print("🍺 Homebrew detectado, tentando instalação via brew...")
            if self.install_via_homebrew():
                return True
            else:
                print("⚠️ Instalação via Homebrew falhou, tentando método alternativo...")
        
        # Se Homebrew não funcionou, tenta download direto
        print("📦 Tentando instalação via download direto...")
        return self.download_and_install_pkg()
    
    def ensure_blackhole_installed(self):
        """Garante que o BlackHole esteja instalado no sistema."""
        print("🔍 Verificando instalação do BlackHole...")
        
        if self.is_blackhole_installed():
            return True
        
        print("❌ BlackHole não encontrado no sistema")
        print("🚀 Iniciando instalação automática...")
        
        # Solicita permissão do usuário
        try:
            response = input("Deseja instalar o BlackHole automaticamente? (s/N): ").strip().lower()
            if response not in ['s', 'sim', 'y', 'yes']:
                print("⚠️ Instalação cancelada pelo usuário")
                return False
        except (EOFError, KeyboardInterrupt):
            print("\n⚠️ Instalação cancelada pelo usuário")
            return False
        
        # Tenta instalar
        if self.install_blackhole():
            # Verifica se a instalação foi bem-sucedida
            if self.is_blackhole_installed():
                print("🎉 BlackHole instalado e verificado com sucesso!")
                return True
            else:
                print("❌ Instalação aparentemente falhou - BlackHole não detectado")
                return False
        else:
            print("❌ Falha na instalação do BlackHole")
            return False

def main():
    """Função principal para teste do módulo."""
    installer = BlackHoleInstaller()
    success = installer.ensure_blackhole_installed()
    
    if success:
        print("✅ BlackHole está pronto para uso!")
        sys.exit(0)
    else:
        print("❌ Não foi possível garantir a instalação do BlackHole")
        sys.exit(1)

if __name__ == "__main__":
    main()