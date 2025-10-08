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


class AudioRecorder:
    """Classe para gravação de áudio do sistema"""
    
    def __init__(self, sample_rate=44100, channels=2):
        """
        Inicializa o gravador de áudio
        
        Args:
            sample_rate (int): Taxa de amostragem (Hz)
            channels (int): Número de canais (1=mono, 2=stereo)
        """
        self.sample_rate = sample_rate
        self.channels = channels
        self.recording = []
        self.is_recording = False
        self.recording_thread = None
        self.output_filename = "recording.wav"
        self.input_device = None
        
        # Verificar dispositivos disponíveis e configurar BlackHole
        self._check_audio_devices()
        self._setup_blackhole_device()
    
    def _check_audio_devices(self):
        """Verifica e lista dispositivos de áudio disponíveis"""
        try:
            devices = sd.query_devices()
            print("Dispositivos de áudio disponíveis:")
            for i, device in enumerate(devices):
                print(f"  {i}: {device['name']} - {device['max_input_channels']} canais de entrada")
        except Exception as e:
            print(f"Erro ao verificar dispositivos de áudio: {e}")
    
    def _setup_blackhole_device(self):
        """Configura BlackHole como dispositivo de entrada para captura de áudio do sistema"""
        try:
            devices = sd.query_devices()
            blackhole_device = None
            
            # Procurar por dispositivos BlackHole
            for i, device in enumerate(devices):
                device_name = device['name'].lower()
                if 'blackhole' in device_name and device['max_input_channels'] > 0:
                    blackhole_device = i
                    print(f"✅ BlackHole encontrado: {device['name']} (ID: {i})")
                    break
            
            if blackhole_device is not None:
                self.input_device = blackhole_device
                print("🎵 Configurado para capturar áudio do sistema via BlackHole")
                print("📋 Certifique-se de configurar um Multi-Output Device no Audio MIDI Setup")
                print("   que inclua BlackHole e seus alto-falantes para ouvir o áudio")
            else:
                print("⚠️ BlackHole não encontrado!")
                print("📥 Para capturar áudio do sistema, instale BlackHole:")
                print("   brew install blackhole-2ch")
                print("   Depois configure um Multi-Output Device no Audio MIDI Setup")
                
        except Exception as e:
            print(f"Erro ao configurar BlackHole: {e}")
            self.input_device = None
    
    def start_recording(self):
        """Inicia a gravação de áudio"""
        if self.is_recording:
            print("Gravação já está em andamento!")
            return
        
        self.recording = []
        self.is_recording = True
        
        # Iniciar gravação em thread separada
        self.recording_thread = threading.Thread(target=self._record_audio)
        self.recording_thread.daemon = True
        self.recording_thread.start()
        
        print(f"Gravação iniciada - {self.sample_rate}Hz, {self.channels} canais")
    
    def _record_audio(self):
        """Função interna para gravação contínua de áudio"""
        try:
            # Configurar stream de áudio
            def audio_callback(indata, frames, time, status):
                if status:
                    print(f"Status do áudio: {status}")
                if self.is_recording:
                    self.recording.append(indata.copy())
            
            # Iniciar stream
            with sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                callback=audio_callback,
                blocksize=1024,
                device=self.input_device  # Usar BlackHole se disponível
            ):
                print("Stream de áudio iniciado...")
                while self.is_recording:
                    time.sleep(0.1)  # Pequena pausa para não sobrecarregar CPU
                    
        except Exception as e:
            print(f"Erro durante gravação: {e}")
            self.is_recording = False
    
    def stop_recording(self):
        """
        Para a gravação e salva o arquivo
        
        Returns:
            str: Nome do arquivo salvo ou string vazia se houver erro
        """
        if not self.is_recording:
            print("Nenhuma gravação em andamento!")
            return ""
        
        print("Parando gravação...")
        self.is_recording = False
        
        # Aguardar thread terminar
        if self.recording_thread and self.recording_thread.is_alive():
            self.recording_thread.join(timeout=2.0)
        
        # Processar e salvar áudio
        if self.recording and len(self.recording) > 0:
            try:
                # Concatenar todos os chunks de áudio
                audio_data = np.concatenate(self.recording, axis=0)
                
                # Verificar se há dados de áudio válidos
                if len(audio_data) == 0:
                    print("Nenhum dado de áudio capturado!")
                    return ""
                
                # Normalizar áudio para evitar clipping
                if audio_data.max() > 0:
                    audio_data = audio_data / np.max(np.abs(audio_data))
                
                # Converter para int16 (formato WAV padrão)
                audio_data = (audio_data * 32767).astype(np.int16)
                
                # Garantir que o nome do arquivo seja válido
                if not self.output_filename or self.output_filename.strip() == "":
                    self.output_filename = "recording.wav"
                
                # Salvar arquivo WAV
                write(self.output_filename, self.sample_rate, audio_data)
                
                # Verificar se o arquivo foi criado com sucesso
                if os.path.exists(self.output_filename) and os.path.getsize(self.output_filename) > 0:
                    duration = len(audio_data) / self.sample_rate
                    file_size = os.path.getsize(self.output_filename) / 1024  # KB
                    
                    print(f"Gravação salva: {self.output_filename}")
                    print(f"Duração: {duration:.2f}s, Tamanho: {file_size:.1f}KB")
                    
                    return self.output_filename
                else:
                    print("Erro: Arquivo não foi criado corretamente!")
                    return ""
                
            except Exception as e:
                print(f"Erro ao salvar gravação: {e}")
                return ""
        else:
            print("Nenhum áudio foi gravado!")
            return ""
    
    def get_recording_info(self):
        """
        Retorna informações sobre a gravação atual
        
        Returns:
            dict: Informações da gravação
        """
        if self.is_recording and self.recording:
            current_length = sum(len(chunk) for chunk in self.recording)
            duration = current_length / self.sample_rate
            return {
                "is_recording": self.is_recording,
                "duration": duration,
                "sample_rate": self.sample_rate,
                "channels": self.channels,
                "chunks": len(self.recording)
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
            filename (str): Nome do arquivo (deve terminar com .wav)
        """
        if not filename.endswith('.wav'):
            filename += '.wav'
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