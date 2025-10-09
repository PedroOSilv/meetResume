#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplicação Desktop - Audio AI Client
Aplicação principal que integra gravação de áudio com IA via OpenAI
"""

import sys
from PySide6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QPushButton, 
                               QTextEdit, QLabel, QComboBox, QSlider, QHBoxLayout)
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QFont, QClipboard
from recorder import AudioRecorder
from api_client import send_audio_to_server, set_server_url
from blackhole_installer import BlackHoleInstaller


class AudioProcessingThread(QThread):
    """Thread para processar o áudio em background"""
    finished = Signal(str)
    error = Signal(str)
    
    def __init__(self, filename):
        super().__init__()
        self.filename = filename
    
    def run(self):
        try:
            print("🔄 Iniciando processamento do áudio...")
            response = send_audio_to_server(self.filename)
            print(f"📥 Resposta recebida: {response[:200]}...")  # Debug: primeiros 200 chars
            self.finished.emit(response)
        except Exception as e:
            print(f"❌ Erro no processamento: {str(e)}")
            self.error.emit(str(e))


class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.recorder = None
        self.is_recording = False
        self.processing_thread = None
        self.init_ui()
        self.init_recorder()

    def init_recorder(self):
        """Inicializa o gravador com configurações padrão"""
        try:
            self.recorder = AudioRecorder(record_mode="microphone", mix_ratio=0.7)
            self.status_label.setText("✅ Gravador inicializado - Modo: Microfone")
        except Exception as e:
            self.status_label.setText(f"❌ Erro ao inicializar gravador: {e}")
            self.status_label.setStyleSheet("color: #f44336; font-size: 12px; margin: 10px;")

    def init_ui(self):
        """Inicializa a interface do usuário"""
        self.setWindowTitle("🧠 Audio AI Client - PySide6 + OpenAI")
        self.setGeometry(300, 300, 650, 600)
        
        # Layout principal
        layout = QVBoxLayout()
        
        # Título
        title = QLabel("🎙️ Gravador de Áudio com IA")
        title.setAlignment(Qt.AlignCenter)
        title.setFont(QFont("Arial", 16, QFont.Bold))
        layout.addWidget(title)
        
        # Configurações de gravação
        config_label = QLabel("⚙️ Configurações de Gravação:")
        config_label.setFont(QFont("Arial", 12, QFont.Bold))
        layout.addWidget(config_label)
        
        # Modo de gravação
        mode_layout = QHBoxLayout()
        mode_label = QLabel("Modo:")
        mode_label.setMinimumWidth(80)
        self.mode_combo = QComboBox()
        self.mode_combo.addItems([
            "🎤 Apenas Microfone", 
            "🖥️ Apenas Sistema", 
            "🎤🖥️ Microfone + Sistema"
        ])
        self.mode_combo.currentTextChanged.connect(self.on_mode_changed)
        mode_layout.addWidget(mode_label)
        mode_layout.addWidget(self.mode_combo)
        layout.addLayout(mode_layout)
        
        # Slider de mixagem (só aparece no modo "both")
        self.mix_layout = QHBoxLayout()
        self.mix_label = QLabel("Mixagem:")
        self.mix_label.setMinimumWidth(80)
        self.mix_slider = QSlider(Qt.Horizontal)
        self.mix_slider.setMinimum(0)
        self.mix_slider.setMaximum(100)
        self.mix_slider.setValue(70)  # 70% sistema, 30% microfone
        self.mix_slider.valueChanged.connect(self.on_mix_changed)
        self.mix_value_label = QLabel("70% Sistema / 30% Microfone")
        self.mix_layout.addWidget(self.mix_label)
        self.mix_layout.addWidget(self.mix_slider)
        self.mix_layout.addWidget(self.mix_value_label)
        layout.addLayout(self.mix_layout)
        
        # Inicialmente esconder controles de mixagem
        self.mix_label.hide()
        self.mix_slider.hide()
        self.mix_value_label.hide()
        
        # Status
        self.status_label = QLabel("Inicializando gravador...")
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setStyleSheet("color: #666; font-size: 12px; margin: 10px;")
        layout.addWidget(self.status_label)
        
        # Botões
        self.start_btn = QPushButton("🎙️ Iniciar Gravação")
        self.start_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 15px;
                font-size: 14px;
                font-weight: bold;
                border-radius: 8px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
        """)
        
        self.stop_btn = QPushButton("⏹️ Parar e Enviar")
        self.stop_btn.setStyleSheet("""
            QPushButton {
                background-color: #f44336;
                color: white;
                border: none;
                padding: 15px;
                font-size: 14px;
                font-weight: bold;
                border-radius: 8px;
            }
            QPushButton:hover {
                background-color: #da190b;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
        """)
        self.stop_btn.setEnabled(False)
        
        layout.addWidget(self.start_btn)
        layout.addWidget(self.stop_btn)
        
        # Área de resposta
        response_label = QLabel("📝 Resposta da IA:")
        response_label.setFont(QFont("Arial", 12, QFont.Bold))
        layout.addWidget(response_label)
        
        self.output = QTextEdit()
        self.output.setReadOnly(True)
        self.output.setPlaceholderText("A resposta da IA aparecerá aqui após o processamento do áudio...")
        self.output.setStyleSheet("""
            QTextEdit {
                border: 2px solid #ddd;
                border-radius: 8px;
                padding: 10px;
                font-size: 12px;
                background-color: #f9f9f9;
                color: #2c3e50;
            }
        """)
        layout.addWidget(self.output)
        
        # Botão de copiar
        self.copy_btn = QPushButton("📋 Copiar Resposta")
        self.copy_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498db;
                color: white;
                border: none;
                padding: 10px;
                font-size: 12px;
                border-radius: 5px;
                margin: 5px 0;
            }
            QPushButton:hover {
                background-color: #2980b9;
            }
            QPushButton:disabled {
                background-color: #bdc3c7;
                color: #7f8c8d;
            }
        """)
        self.copy_btn.setEnabled(False)  # Desabilitado inicialmente
        self.copy_btn.clicked.connect(self.copy_to_clipboard)
        layout.addWidget(self.copy_btn)
        
        self.setLayout(layout)
        
        # Conectar sinais
        self.start_btn.clicked.connect(self.start_recording)
        self.stop_btn.clicked.connect(self.stop_and_send)

    def on_mode_changed(self, mode_text):
        """Callback quando o modo de gravação muda"""
        mode_map = {
            "🎤 Apenas Microfone": "microphone",
            "🖥️ Apenas Sistema": "system", 
            "🎤🖥️ Microfone + Sistema": "both"
        }
        
        selected_mode = mode_map.get(mode_text, "microphone")
        
        # Mostrar/esconder controles de mixagem
        if selected_mode == "both":
            self.mix_label.show()
            self.mix_slider.show()
            self.mix_value_label.show()
        else:
            self.mix_label.hide()
            self.mix_slider.hide()
            self.mix_value_label.hide()
        
        # Atualizar gravador se não estiver gravando
        if not self.is_recording and self.recorder:
            try:
                mix_ratio = self.mix_slider.value() / 100.0
                self.recorder = AudioRecorder(record_mode=selected_mode, mix_ratio=mix_ratio)
                self.status_label.setText(f"✅ Modo alterado para: {mode_text}")
                self.status_label.setStyleSheet("color: #4CAF50; font-size: 12px; margin: 10px;")
            except Exception as e:
                self.status_label.setText(f"❌ Erro ao alterar modo: {e}")
                self.status_label.setStyleSheet("color: #f44336; font-size: 12px; margin: 10px;")

    def on_mix_changed(self, value):
        """Callback quando a proporção de mixagem muda"""
        system_percent = value
        mic_percent = 100 - value
        self.mix_value_label.setText(f"{system_percent}% Sistema / {mic_percent}% Microfone")
        
        # Atualizar gravador se não estiver gravando
        if not self.is_recording and self.recorder:
            self.recorder.mix_ratio = value / 100.0

    def start_recording(self):
        """Inicia a gravação de áudio"""
        if not self.recorder:
            self.status_label.setText("❌ Gravador não inicializado!")
            return
            
        try:
            mode_text = self.mode_combo.currentText()
            self.status_label.setText(f"🔴 Gravando ({mode_text})... Fale agora!")
            self.status_label.setStyleSheet("color: #f44336; font-size: 12px; margin: 10px; font-weight: bold;")
            self.output.setText(f"Gravação iniciada em modo: {mode_text}")
            
            self.recorder.start_recording()
            self.is_recording = True
            
            # Desabilitar controles durante gravação
            self.start_btn.setEnabled(False)
            self.stop_btn.setEnabled(True)
            self.mode_combo.setEnabled(False)
            self.mix_slider.setEnabled(False)
            
        except Exception as e:
            self.output.setText(f"Erro ao iniciar gravação: {str(e)}")
            self.status_label.setText("❌ Erro na gravação")
            self.status_label.setStyleSheet("color: #f44336; font-size: 12px; margin: 10px;")

    def stop_and_send(self):
        """Para a gravação e envia o áudio para processamento"""
        try:
            self.status_label.setText("⏹️ Parando gravação...")
            self.status_label.setStyleSheet("color: #ff9800; font-size: 12px; margin: 10px;")
            
            filename = self.recorder.stop_recording()
            self.is_recording = False
            
            # Reabilitar controles
            self.mode_combo.setEnabled(True)
            self.mix_slider.setEnabled(True)
            
            if not filename:
                self.output.setText("❌ Erro: Nenhum arquivo de áudio foi gerado!")
                self.reset_ui()
                return
            
            # Atualizar botões
            self.start_btn.setEnabled(False)
            self.stop_btn.setEnabled(False)
            
            self.output.setText("📤 Enviando áudio ao servidor para processamento...")
            self.status_label.setText("📤 Processando com IA...")
            
            # Processar em thread separada
            self.processing_thread = AudioProcessingThread(filename)
            self.processing_thread.finished.connect(self.on_processing_finished)
            self.processing_thread.error.connect(self.on_processing_error)
            self.processing_thread.start()
            
        except Exception as e:
            self.output.setText(f"Erro ao parar gravação: {str(e)}")
            self.reset_ui()

    def on_processing_finished(self, response):
        """Callback quando o processamento termina com sucesso"""
        print(f"✅ Exibindo resposta na interface: {response[:100]}...")  # Debug
        self.output.setText(response or "Sem resposta da IA.")
        self.status_label.setText("✅ Processamento concluído!")
        self.status_label.setStyleSheet("color: #4CAF50; font-size: 12px; margin: 10px; font-weight: bold;")
        
        # Habilitar botão de copiar se há conteúdo
        if response and response.strip():
            self.copy_btn.setEnabled(True)
        
        self.reset_ui()

    def on_processing_error(self, error):
        """Callback quando ocorre erro no processamento"""
        self.output.setText(f"❌ Erro ao processar áudio: {error}")
        self.status_label.setText("❌ Erro no processamento")
        self.status_label.setStyleSheet("color: #f44336; font-size: 12px; margin: 10px;")
        self.copy_btn.setEnabled(False)  # Desabilitar botão em caso de erro
        self.reset_ui()

    def copy_to_clipboard(self):
        """Copia o conteúdo da resposta para o clipboard"""
        try:
            text = self.output.toPlainText()
            if text.strip():
                clipboard = QApplication.clipboard()
                clipboard.setText(text)
                
                # Feedback visual temporário
                original_text = self.copy_btn.text()
                self.copy_btn.setText("✅ Copiado!")
                self.copy_btn.setStyleSheet("""
                    QPushButton {
                        background-color: #27ae60;
                        color: white;
                        border: none;
                        padding: 10px;
                        font-size: 12px;
                        border-radius: 5px;
                        margin: 5px 0;
                    }
                """)
                
                # Restaurar após 2 segundos
                QApplication.processEvents()
                import time
                time.sleep(0.5)  # Feedback rápido
                
                self.copy_btn.setText(original_text)
                self.copy_btn.setStyleSheet("""
                    QPushButton {
                        background-color: #3498db;
                        color: white;
                        border: none;
                        padding: 10px;
                        font-size: 12px;
                        border-radius: 5px;
                        margin: 5px 0;
                    }
                    QPushButton:hover {
                        background-color: #2980b9;
                    }
                    QPushButton:disabled {
                        background-color: #bdc3c7;
                        color: #7f8c8d;
                    }
                """)
            else:
                print("⚠️ Nenhum conteúdo para copiar")
        except Exception as e:
            print(f"❌ Erro ao copiar: {str(e)}")

    def reset_ui(self):
        """Reseta a interface para o estado inicial"""
        self.start_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.mode_combo.setEnabled(True)
        self.mix_slider.setEnabled(True)
        
        if not self.output.toPlainText().startswith("❌") and not self.output.toPlainText().startswith("✅"):
            self.status_label.setText("Pronto para nova gravação")
            self.status_label.setStyleSheet("color: #666; font-size: 12px; margin: 10px;")

    def closeEvent(self, event):
        """Cleanup ao fechar a aplicação"""
        if self.is_recording:
            self.recorder.stop_recording()
        if self.processing_thread and self.processing_thread.isRunning():
            self.processing_thread.quit()
            self.processing_thread.wait()
        event.accept()


def main():
    """Função principal"""
    app = QApplication(sys.argv)
    
    # Definir servidor via variável de ambiente ou argumento de linha de comando
    import os
    server_url = os.environ.get("AUDIOAI_SERVER_URL")
    for arg in sys.argv[1:]:
        if arg.startswith("--server-url="):
            server_url = arg.split("=", 1)[1]
            break
    if server_url:
        print(f"🌐 Usando servidor: {server_url}")
        set_server_url(server_url)
    else:
        print("ℹ️ Usando servidor padrão: http://localhost:3030")
    
    # Verificar e instalar BlackHole se necessário
    print("🔍 Verificando instalação do BlackHole...")
    blackhole_installer = BlackHoleInstaller()
    
    if not blackhole_installer.is_blackhole_installed():
        print("⚠️ BlackHole não encontrado. Instalação necessária para captura de áudio do sistema.")
        print("🚀 Iniciando instalação automática...")
        
        if not blackhole_installer.install_blackhole():
            print("❌ Falha na instalação do BlackHole")
            print("ℹ️ A aplicação continuará funcionando, mas apenas com áudio do microfone.")
        else:
            print("✅ BlackHole instalado com sucesso!")
    else:
        print("✅ BlackHole já está instalado")
    
    # Configurar estilo da aplicação
    app.setStyleSheet("""
        QWidget {
            background-color: #ffffff;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #2c3e50;
        }
    """)
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()