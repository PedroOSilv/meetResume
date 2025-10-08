#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplicação Desktop - Audio AI Client
Aplicação principal que integra gravação de áudio com IA via OpenAI
"""

import sys
from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QTextEdit, QLabel
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QFont
from recorder import AudioRecorder
from api_client import send_audio_to_server


class AudioProcessingThread(QThread):
    """Thread para processar o áudio em background"""
    finished = Signal(str)
    error = Signal(str)
    
    def __init__(self, filename):
        super().__init__()
        self.filename = filename
    
    def run(self):
        try:
            response = send_audio_to_server(self.filename)
            self.finished.emit(response)
        except Exception as e:
            self.error.emit(str(e))


class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.recorder = AudioRecorder()
        self.is_recording = False
        self.processing_thread = None
        self.init_ui()

    def init_ui(self):
        """Inicializa a interface do usuário"""
        self.setWindowTitle("🧠 Audio AI Client - PySide6 + OpenAI")
        self.setGeometry(300, 300, 600, 500)
        
        # Layout principal
        layout = QVBoxLayout()
        
        # Título
        title = QLabel("🎙️ Gravador de Áudio com IA")
        title.setAlignment(Qt.AlignCenter)
        title.setFont(QFont("Arial", 16, QFont.Bold))
        layout.addWidget(title)
        
        # Status
        self.status_label = QLabel("Pronto para gravar")
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
        
        self.setLayout(layout)
        
        # Conectar sinais
        self.start_btn.clicked.connect(self.start_recording)
        self.stop_btn.clicked.connect(self.stop_and_send)

    def start_recording(self):
        """Inicia a gravação de áudio"""
        try:
            self.status_label.setText("🔴 Gravando... Fale agora!")
            self.status_label.setStyleSheet("color: #f44336; font-size: 12px; margin: 10px; font-weight: bold;")
            self.output.setText("Gravação iniciada... Fale agora!")
            
            self.recorder.start_recording()
            self.is_recording = True
            
            # Atualizar botões
            self.start_btn.setEnabled(False)
            self.stop_btn.setEnabled(True)
            
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
        self.output.setText(response or "Sem resposta da IA.")
        self.status_label.setText("✅ Processamento concluído!")
        self.status_label.setStyleSheet("color: #4CAF50; font-size: 12px; margin: 10px; font-weight: bold;")
        self.reset_ui()

    def on_processing_error(self, error):
        """Callback quando ocorre erro no processamento"""
        self.output.setText(f"❌ Erro ao processar áudio: {error}")
        self.status_label.setText("❌ Erro no processamento")
        self.status_label.setStyleSheet("color: #f44336; font-size: 12px; margin: 10px;")
        self.reset_ui()

    def reset_ui(self):
        """Reseta a interface para o estado inicial"""
        self.start_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
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