#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de Gravação de Áudio
Responsável por capturar o áudio do sistema usando sounddevice
"""

import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write
import threading
import time
import os
from pydub import AudioSegment
from pydub.utils import which
import io
import subprocess
import shutil


class AudioRecorder:
    """Classe para gravação de áudio do sistema e microfone"""
    
    def __init__(self, sample_rate=44100, channels=2, record_mode="system", mix_ratio=0.7):
        """
        Inicializa o gravador de áudio
        
        Args:
            sample_rate (int): Taxa de amostragem (padrão: 44100 Hz)
            channels (int): Número de canais para áudio do sistema (padrão: 2)
            record_mode (str): Modo de gravação - "system", "microphone", ou "both"
            mix_ratio (float): Proporção de mixagem (0.0 = só microfone, 1.0 = só sistema)
        """
        self.sample_rate = sample_rate
        self.channels = channels  # Para áudio do sistema
        self.mic_channels = 1  # Para microfone, será ajustado dinamicamente
        self.record_mode = record_mode
        self.mix_ratio = mix_ratio
        
        # Controle de gravação
        self.is_recording = False
        self.system_recording = []
        self.mic_recording = []
        self.recording_thread = None
        self.mic_recording_thread = None
        
        # Configurações de dispositivos
        self.system_device = None
        self.microphone_device = None
        self.output_filename = "recording.mp3"
        
        # Verificar disponibilidade do ffmpeg
        self.ffmpeg_available = self._check_ffmpeg_availability()
        if not self.ffmpeg_available:
            print("⚠️  FFmpeg não encontrado - arquivos serão salvos como WAV")
        
        # Configurar dispositivos de áudio
        self._check_audio_devices()
        self._setup_audio_devices()
    
    def _check_ffmpeg_availability(self):
        """
        Verifica se o ffmpeg está disponível no sistema
        
        Returns:
            bool: True se ffmpeg estiver disponível, False caso contrário
        """
        # Método 1: Usar pydub.utils.which
        try:
            ffmpeg_path = which("ffmpeg")
            if ffmpeg_path:
                print(f"✅ FFmpeg encontrado: {ffmpeg_path}")
                return True
        except Exception:
            pass
        
        # Método 2: Verificar caminhos comuns do Homebrew
        common_paths = [
            "/opt/homebrew/bin/ffmpeg",  # Apple Silicon
            "/usr/local/bin/ffmpeg",     # Intel Mac
            "/usr/bin/ffmpeg",           # Sistema
        ]
        
        for path in common_paths:
            if os.path.exists(path):
                # Configurar PATH para pydub
                current_path = os.environ.get('PATH', '')
                bin_dir = os.path.dirname(path)
                if bin_dir not in current_path:
                    os.environ['PATH'] = f"{bin_dir}:{current_path}"
                print(f"✅ FFmpeg encontrado: {path}")
                return True
        
        # Método 3: Tentar executar ffmpeg diretamente
        try:
            result = subprocess.run(['ffmpeg', '-version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print("✅ FFmpeg disponível via PATH")
                return True
        except Exception:
            pass
        
        # Método 4: Verificar se Homebrew está instalado e tentar instalar
        try:
            homebrew_result = subprocess.run(['brew', '--version'], 
                                           capture_output=True, text=True, timeout=5)
            if homebrew_result.returncode == 0:
                print("⚠️  FFmpeg não encontrado, mas Homebrew está disponível")
                print("💡 Execute: brew install ffmpeg")
        except Exception:
            pass
        
        return False
        
        # Arquivo de saída
        self.output_filename = "recording.mp3"
    
    def _check_audio_devices(self):
        """Verifica e lista dispositivos de áudio disponíveis"""
        try:
            devices = sd.query_devices()
            print("Dispositivos de áudio disponíveis:")
            for i, device in enumerate(devices):
                print(f"  {i}: {device['name']} - {device['max_input_channels']} canais de entrada")
        except Exception as e:
            print(f"Erro ao verificar dispositivos de áudio: {e}")
    
    def _setup_audio_devices(self):
        """Configura dispositivos de áudio baseado no modo de gravação"""
        try:
            devices = sd.query_devices()
            blackhole_device = None
            microphone_device = None
            
            # Procurar por dispositivos BlackHole e microfone
            for i, device in enumerate(devices):
                device_name = device['name'].lower()
                
                # Procurar BlackHole para áudio do sistema
                if 'blackhole' in device_name and device['max_input_channels'] > 0:
                    blackhole_device = i
                    print(f"✅ BlackHole encontrado: {device['name']} (ID: {i})")
                
                # Procurar qualquer dispositivo de entrada de áudio (microfone)
                # Excluir dispositivos que são claramente de saída ou virtuais
                if (device['max_input_channels'] > 0 and 
                    'blackhole' not in device_name and 
                    'multi-output' not in device_name and
                    'speakers' not in device_name and
                    microphone_device is None):  # Pegar o primeiro microfone encontrado
                    microphone_device = i
                    print(f"🎤 Microfone encontrado: {device['name']} (ID: {i}) - {device['max_input_channels']} canais")
            
            # Configurar dispositivos baseado no modo
            if self.record_mode == "system":
                self.input_device = blackhole_device
                if blackhole_device is not None:
                    print("🎵 Configurado para capturar apenas áudio do sistema via BlackHole")
                    print("📋 Certifique-se de configurar um Multi-Output Device no Audio MIDI Setup")
                else:
                    print("⚠️ BlackHole não encontrado para captura de áudio do sistema!")
                    
            elif self.record_mode == "microphone":
                self.microphone_device = microphone_device
                # Ajustar canais baseado no dispositivo de microfone
                if microphone_device is not None:
                    mic_channels = devices[microphone_device]['max_input_channels']
                    self.mic_channels = min(mic_channels, 2)  # Máximo 2 canais para compatibilidade
                    print(f"🎤 Configurado para capturar apenas áudio do microfone ({self.mic_channels} canais)")
                else:
                    print("⚠️ Microfone não encontrado!")
                    
            elif self.record_mode == "both":
                self.input_device = blackhole_device
                self.microphone_device = microphone_device
                if blackhole_device is not None and microphone_device is not None:
                    # Ajustar canais do microfone
                    mic_channels = devices[microphone_device]['max_input_channels']
                    self.mic_channels = min(mic_channels, 2)  # Máximo 2 canais para compatibilidade
                    print("🎵🎤 Configurado para capturar áudio do sistema E microfone")
                    print("📋 Certifique-se de configurar um Multi-Output Device no Audio MIDI Setup")
                    print(f"⚖️ Proporção de mixagem: {self.mix_ratio*100:.0f}% sistema / {(1-self.mix_ratio)*100:.0f}% microfone")
                    print(f"🎤 Microfone: {self.mic_channels} canais")
                else:
                    missing = []
                    if blackhole_device is None:
                        missing.append("BlackHole")
                    if microphone_device is None:
                        missing.append("Microfone")
                    print(f"⚠️ Dispositivos não encontrados: {', '.join(missing)}")
            
            # Instruções de instalação se necessário
            if blackhole_device is None and self.record_mode in ["system", "both"]:
                print("📥 Para capturar áudio do sistema, instale BlackHole:")
                print("   brew install blackhole-2ch")
                print("   Depois configure um Multi-Output Device no Audio MIDI Setup")
                
        except Exception as e:
            print(f"Erro ao configurar dispositivos de áudio: {e}")
            self.input_device = None
            self.microphone_device = None
    
    def start_recording(self):
        """Inicia a gravação de áudio baseada no modo configurado"""
        if self.is_recording:
            print("Gravação já está em andamento!")
            return
        
        self.system_recording = []
        self.mic_recording = []
        self.is_recording = True
        
        # Iniciar gravação baseada no modo
        if self.record_mode == "system" and self.input_device is not None:
            self.recording_thread = threading.Thread(target=self._record_system_audio)
            self.recording_thread.daemon = True
            self.recording_thread.start()
            print(f"Gravação do sistema iniciada - {self.sample_rate}Hz, {self.channels} canais")
            
        elif self.record_mode == "microphone" and self.microphone_device is not None:
            self.mic_recording_thread = threading.Thread(target=self._record_microphone_audio)
            self.mic_recording_thread.daemon = True
            self.mic_recording_thread.start()
            print(f"Gravação do microfone iniciada - {self.sample_rate}Hz, {self.channels} canais")
            
        elif self.record_mode == "both" and self.input_device is not None and self.microphone_device is not None:
            # Iniciar ambas as threads de gravação
            self.recording_thread = threading.Thread(target=self._record_system_audio)
            self.mic_recording_thread = threading.Thread(target=self._record_microphone_audio)
            self.recording_thread.daemon = True
            self.mic_recording_thread.daemon = True
            self.recording_thread.start()
            self.mic_recording_thread.start()
            print(f"Gravação simultânea iniciada - {self.sample_rate}Hz, {self.channels} canais")
            print(f"Sistema: {self.mix_ratio*100:.0f}% | Microfone: {(1-self.mix_ratio)*100:.0f}%")
        else:
            print("❌ Não é possível iniciar gravação - dispositivos não configurados!")
            self.is_recording = False
    
    def _record_system_audio(self):
        """Função interna para gravação contínua de áudio do sistema"""
        try:
            # Configurar stream de áudio do sistema
            def system_audio_callback(indata, frames, time, status):
                if status:
                    print(f"Status do áudio do sistema: {status}")
                if self.is_recording:
                    self.system_recording.append(indata.copy())
            
            # Iniciar stream do sistema
            with sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                callback=system_audio_callback,
                blocksize=1024,
                device=self.input_device
            ):
                print("Stream de áudio do sistema iniciado...")
                while self.is_recording:
                    time.sleep(0.1)
                    
        except Exception as e:
            print(f"Erro durante gravação do sistema: {e}")
            self.is_recording = False
    
    def _record_microphone_audio(self):
        """Função interna para gravação contínua de áudio do microfone"""
        try:
            # Configurar stream de áudio do microfone
            def mic_audio_callback(indata, frames, time, status):
                if status:
                    print(f"Status do áudio do microfone: {status}")
                if self.is_recording:
                    self.mic_recording.append(indata.copy())
            
            # Iniciar stream do microfone com número correto de canais
            with sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.mic_channels,  # Usar mic_channels em vez de channels
                callback=mic_audio_callback,
                blocksize=1024,
                device=self.microphone_device
            ):
                print("Stream de áudio do microfone iniciado...")
                while self.is_recording:
                    time.sleep(0.1)
                    
        except Exception as e:
            print(f"Erro durante gravação do microfone: {e}")
            self.is_recording = False
    
    def stop_recording(self):
        """
        Para a gravação e salva o arquivo com mixagem se necessário
        
        Returns:
            str: Nome do arquivo salvo ou string vazia se houver erro
        """
        if not self.is_recording:
            print("Nenhuma gravação em andamento!")
            return ""
        
        print("Parando gravação...")
        self.is_recording = False
        
        # Aguardar threads terminarem
        if self.recording_thread and self.recording_thread.is_alive():
            self.recording_thread.join(timeout=2.0)
        if self.mic_recording_thread and self.mic_recording_thread.is_alive():
            self.mic_recording_thread.join(timeout=2.0)
        
        # Processar e salvar áudio baseado no modo
        try:
            final_audio_data = None
            
            if self.record_mode == "system" and self.system_recording:
                final_audio_data = self._process_single_source(self.system_recording, "sistema")
                
            elif self.record_mode == "microphone" and self.mic_recording:
                final_audio_data = self._process_single_source(self.mic_recording, "microfone")
                
            elif self.record_mode == "both":
                final_audio_data = self._mix_audio_sources()
            
            if final_audio_data is not None and len(final_audio_data) > 0:
                return self._save_audio_file(final_audio_data)
            else:
                print("Nenhum dado de áudio válido capturado!")
                return ""
                
        except Exception as e:
            print(f"Erro ao processar gravação: {e}")
            return ""
    
    def _process_single_source(self, recording_data, source_name):
        """Processa dados de áudio de uma única fonte"""
        if not recording_data or len(recording_data) == 0:
            print(f"Nenhum dado de áudio capturado do {source_name}!")
            return None
        
        # Concatenar chunks de áudio
        audio_data = np.concatenate(recording_data, axis=0)
        print(f"✅ Áudio do {source_name} processado: {len(audio_data)} amostras")
        return audio_data
    
    def _mix_audio_sources(self):
        """Mixa áudio do sistema e microfone baseado na proporção configurada"""
        system_audio = None
        mic_audio = None
        
        # Processar áudio do sistema
        if self.system_recording and len(self.system_recording) > 0:
            system_audio = np.concatenate(self.system_recording, axis=0)
            print(f"✅ Áudio do sistema: {len(system_audio)} amostras")
        
        # Processar áudio do microfone
        if self.mic_recording and len(self.mic_recording) > 0:
            mic_audio = np.concatenate(self.mic_recording, axis=0)
            print(f"✅ Áudio do microfone: {len(mic_audio)} amostras")
        
        # Verificar se temos pelo menos uma fonte
        if system_audio is None and mic_audio is None:
            print("❌ Nenhum áudio capturado de qualquer fonte!")
            return None
        
        # Se só temos uma fonte, retornar ela
        if system_audio is None:
            print("⚠️ Apenas áudio do microfone disponível")
            return mic_audio
        if mic_audio is None:
            print("⚠️ Apenas áudio do sistema disponível")
            return system_audio
        
        # Sincronizar tamanhos (usar o menor)
        min_length = min(len(system_audio), len(mic_audio))
        system_audio = system_audio[:min_length]
        mic_audio = mic_audio[:min_length]
        
        # Aplicar mixagem com proporções
        mixed_audio = (system_audio * self.mix_ratio + 
                      mic_audio * (1 - self.mix_ratio))
        
        print(f"🎵🎤 Áudio mixado: {len(mixed_audio)} amostras")
        print(f"⚖️ Proporção: {self.mix_ratio*100:.0f}% sistema / {(1-self.mix_ratio)*100:.0f}% microfone")
        
        return mixed_audio
    
    def _save_audio_file(self, audio_data):
        """Salva dados de áudio em arquivo MP3 ou WAV"""
        try:
            # Normalizar áudio para evitar clipping
            if audio_data.max() > 0:
                audio_data = audio_data / np.max(np.abs(audio_data))
            
            # Converter para int16 (formato WAV padrão)
            audio_data = (audio_data * 32767).astype(np.int16)
            
            # Garantir que o nome do arquivo seja válido
            if not self.output_filename or self.output_filename.strip() == "":
                self.output_filename = "recording.mp3"
            
            # Criar arquivo WAV temporário primeiro
            temp_wav_filename = "temp_recording.wav"
            write(temp_wav_filename, self.sample_rate, audio_data)
            
            # Tentar conversão para MP3 apenas se ffmpeg estiver disponível
            if self.ffmpeg_available and self.output_filename.endswith('.mp3'):
                try:
                    # Configurar AudioSegment para usar ffmpeg
                    AudioSegment.converter = which("ffmpeg") or "ffmpeg"
                    AudioSegment.ffmpeg = which("ffmpeg") or "ffmpeg"
                    AudioSegment.ffprobe = which("ffprobe") or "ffprobe"
                    
                    audio_segment = AudioSegment.from_wav(temp_wav_filename)
                    audio_segment.export(self.output_filename, format="mp3", bitrate="128k")
                    
                    # Remover arquivo WAV temporário se conversão foi bem-sucedida
                    if os.path.exists(temp_wav_filename):
                        os.remove(temp_wav_filename)
                        
                    print(f"✅ Arquivo MP3 criado com sucesso: {self.output_filename}")
                    
                except Exception as e:
                    print(f"⚠️  Erro na conversão para MP3: {e}")
                    # Fallback para WAV
                    wav_filename = self.output_filename.replace('.mp3', '.wav')
                    if os.path.exists(temp_wav_filename):
                        os.rename(temp_wav_filename, wav_filename)
                        self.output_filename = wav_filename
                        print(f"📁 Fallback: arquivo salvo como WAV - {wav_filename}")
            else:
                # Salvar diretamente como WAV se ffmpeg não estiver disponível
                if self.output_filename.endswith('.mp3'):
                    wav_filename = self.output_filename.replace('.mp3', '.wav')
                else:
                    wav_filename = self.output_filename
                
                if os.path.exists(temp_wav_filename):
                    os.rename(temp_wav_filename, wav_filename)
                    self.output_filename = wav_filename
                    print(f"📁 Arquivo salvo como WAV: {wav_filename}")
            
            # Verificar se o arquivo foi criado com sucesso
            if os.path.exists(self.output_filename) and os.path.getsize(self.output_filename) > 0:
                duration = len(audio_data) / self.sample_rate
                file_size = os.path.getsize(self.output_filename) / 1024  # KB
                
                print(f"✅ Gravação salva: {self.output_filename}")
                print(f"📊 Duração: {duration:.2f}s, Tamanho: {file_size:.1f}KB")
                
                return self.output_filename
            else:
                print("❌ Erro: Arquivo não foi criado corretamente!")
                return ""
                
        except Exception as e:
            print(f"❌ Erro ao salvar gravação: {e}")
            return ""
    
    def get_recording_info(self):
        """
        Retorna informações sobre a gravação atual
        
        Returns:
            dict: Informações da gravação
        """
        if self.is_recording and self.system_recording:
            current_length = sum(len(chunk) for chunk in self.system_recording)
            duration = current_length / self.sample_rate
            return {
                "is_recording": self.is_recording,
                "duration": duration,
                "sample_rate": self.sample_rate,
                "channels": self.channels,
                "chunks": len(self.system_recording)
            }
        return {
            "is_recording": self.is_recording,
            "duration": 0,
            "sample_rate": self.sample_rate,
            "channels": self.channels,
            "chunks": 0
        }
    
    def set_output_filename(self, filename):
        """
        Define o nome do arquivo de saída
        
        Args:
            filename (str): Nome do arquivo (deve terminar com .mp3)
        """
        if not filename.endswith('.mp3'):
            filename += '.mp3'
        self.output_filename = filename
    
    @staticmethod
    def list_audio_devices():
        """
        Lista todos os dispositivos de áudio disponíveis
        
        Returns:
            list: Lista de dispositivos
        """
        try:
            return sd.query_devices()
        except Exception as e:
            print(f"Erro ao listar dispositivos: {e}")
            return []
    
    @staticmethod
    def test_audio_input():
        """Testa se há entrada de áudio disponível"""
        try:
            # Verificar se BlackHole está disponível
            devices = sd.query_devices()
            blackhole_device = None
            
            for i, device in enumerate(devices):
                if 'blackhole' in device['name'].lower() and device['max_input_channels'] > 0:
                    blackhole_device = i
                    break
            
            # Teste rápido de 1 segundo
            test_recording = sd.rec(
                int(1 * 44100), 
                samplerate=44100, 
                channels=1,
                device=blackhole_device  # Usar BlackHole se disponível
            )
            sd.wait()  # Aguarda a gravação terminar
            
            # Verifica se há sinal
            if np.max(np.abs(test_recording)) > 0.001:
                device_name = devices[blackhole_device]['name'] if blackhole_device else "Padrão"
                print(f"✅ Entrada de áudio detectada! (Dispositivo: {device_name})")
                return True
            else:
                print("⚠️ Nenhum sinal de áudio detectado")
                if blackhole_device:
                    print("💡 Dica: Reproduza algum áudio no sistema e configure o Multi-Output Device")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao testar entrada de áudio: {e}")
            return False


# Função de teste para uso direto do módulo
def main():
    """Função de teste do gravador"""
    print("=== Teste do Gravador de Áudio ===")
    
    recorder = AudioRecorder()
    
    # Testar entrada de áudio
    print("\nTestando entrada de áudio...")
    AudioRecorder.test_audio_input()
    
    # Teste interativo
    try:
        input("\nPressione Enter para iniciar gravação de teste (5 segundos)...")
        recorder.start_recording()
        
        print("Gravando... Fale algo!")
        time.sleep(5)
        
        filename = recorder.stop_recording()
        if filename:
            print(f"Teste concluído! Arquivo salvo: {filename}")
        else:
            print("Erro no teste de gravação")
            
    except KeyboardInterrupt:
        print("\nTeste interrompido pelo usuário")
        if recorder.is_recording:
            recorder.stop_recording()


if __name__ == "__main__":
    main()