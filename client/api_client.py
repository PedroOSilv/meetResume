#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cliente API para comunicação com servidor Node.js
Responsável por enviar áudio e receber respostas da IA
"""

import requests
import os
import json
from typing import Optional, Dict, Any


class APIClient:
    """Cliente para comunicação com o servidor Node.js"""
    
    def __init__(self, base_url: str = "http://localhost:3030"):
        """
        Inicializa o cliente API
        
        Args:
            base_url (str): URL base do servidor
        """
        self.base_url = base_url.rstrip('/')
        self.upload_endpoint = f"{self.base_url}/upload"
        self.timeout = 60  # Timeout em segundos
    
    def send_audio_file(self, filename: str) -> Optional[Dict[str, Any]]:
        """
        Envia arquivo de áudio para o servidor
        
        Args:
            filename (str): Caminho para o arquivo de áudio
            
        Returns:
            dict: Resposta do servidor ou None em caso de erro
        """
        if not os.path.exists(filename):
            raise FileNotFoundError(f"Arquivo não encontrado: {filename}")
        
        if not os.path.getsize(filename) > 0:
            raise ValueError("Arquivo de áudio está vazio")
        
        try:
            with open(filename, "rb") as audio_file:
                # Detectar tipo MIME baseado na extensão do arquivo
                mime_type = "audio/mpeg" if filename.lower().endswith('.mp3') else "audio/wav"
                files = {"audio": (os.path.basename(filename), audio_file, mime_type)}
                
                print(f"Enviando arquivo: {filename} ({os.path.getsize(filename)} bytes)")
                
                response = requests.post(
                    self.upload_endpoint,
                    files=files,
                    timeout=self.timeout
                )
                
                print(f"Status da resposta: {response.status_code}")
                
                if response.status_code == 200:
                    return response.json()
                else:
                    error_msg = f"Erro do servidor: {response.status_code}"
                    try:
                        error_data = response.json()
                        if "error" in error_data:
                            error_msg += f" - {error_data['error']}"
                    except:
                        error_msg += f" - {response.text}"
                    
                    raise requests.HTTPError(error_msg)
                    
        except requests.exceptions.Timeout:
            raise TimeoutError("Timeout ao enviar áudio para o servidor")
        except requests.exceptions.ConnectionError:
            raise ConnectionError("Não foi possível conectar ao servidor. Verifique se está rodando.")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Erro na requisição: {str(e)}")
    
    def check_server_status(self) -> bool:
        """
        Verifica se o servidor está online
        
        Returns:
            bool: True se servidor estiver online
        """
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def format_response(self, response_data: Dict[str, Any]) -> str:
        """
        Formata a resposta do servidor para exibição
        
        Args:
            response_data (dict): Dados da resposta
            
        Returns:
            str: Resposta formatada
        """
        if not response_data:
            return "❌ Resposta vazia do servidor"
        
        formatted_response = ""
        
        # Transcrição
        if "transcript" in response_data and response_data["transcript"]:
            formatted_response += "🎤 **Transcrição:**\n"
            formatted_response += f"{response_data['transcript']}"
        
        # Se não houver conteúdo útil
        if not formatted_response.strip():
            formatted_response = "⚠️ Servidor retornou resposta sem conteúdo útil"
        
        return formatted_response


# Instância global do cliente
_api_client = APIClient()


def send_audio_to_server(filename: str) -> str:
    """
    Função de conveniência para enviar áudio ao servidor
    
    Args:
        filename (str): Caminho para o arquivo de áudio
        
    Returns:
        str: Resposta formatada ou mensagem de erro
    """
    try:
        # Verificar se o filename é válido
        if not filename or filename.strip() == "":
            return "❌ Nenhum arquivo de áudio foi fornecido"
        
        # Verificar se o arquivo existe
        if not os.path.exists(filename):
            return f"❌ Arquivo não encontrado: {filename}"
        
        # Verificar se servidor está online
        if not _api_client.check_server_status():
            return "❌ Servidor não está respondendo. Verifique se o servidor Node.js está rodando em http://localhost:3030"
        
        # Enviar áudio
        response_data = _api_client.send_audio_file(filename)
        
        # Formatar resposta
        return _api_client.format_response(response_data)
        
    except FileNotFoundError as e:
        return f"❌ Arquivo não encontrado: {str(e)}"
    except ValueError as e:
        return f"❌ Erro no arquivo: {str(e)}"
    except TimeoutError as e:
        return f"❌ Timeout: {str(e)}"
    except ConnectionError as e:
        return f"❌ Erro de conexão: {str(e)}"
    except requests.HTTPError as e:
        return f"❌ Erro HTTP: {str(e)}"
    except Exception as e:
        return f"❌ Erro inesperado: {str(e)}"


def set_server_url(url: str):
    """
    Define a URL do servidor
    
    Args:
        url (str): Nova URL do servidor
    """
    global _api_client
    _api_client = APIClient(url)


def test_connection() -> bool:
    """
    Testa a conexão com o servidor
    
    Returns:
        bool: True se conexão estiver OK
    """
    return _api_client.check_server_status()


# Função de teste para uso direto do módulo
def main():
    """Função de teste do cliente API"""
    print("=== Teste do Cliente API ===")
    
    # Testar conexão
    print(f"Testando conexão com {_api_client.base_url}...")
    if test_connection():
        print("✅ Servidor está online!")
    else:
        print("❌ Servidor não está respondendo")
        print("Certifique-se de que o servidor Node.js está rodando")
        return
    
    # Testar envio de arquivo (se existir)
    test_file = "recording.wav"
    if os.path.exists(test_file):
        print(f"\nTestando envio do arquivo: {test_file}")
        result = send_audio_to_server(test_file)
        print("Resultado:")
        print(result)
    else:
        print(f"\nArquivo de teste {test_file} não encontrado")
        print("Execute o recorder.py primeiro para criar um arquivo de teste")


if __name__ == "__main__":
    main()