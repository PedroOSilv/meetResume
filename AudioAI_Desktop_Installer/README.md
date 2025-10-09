# AudioAI Desktop - Pacote de Instalação

## 📦 Sobre este Pacote

Este é o pacote de instalação completo do **AudioAI Desktop Client** para macOS. 

O AudioAI Desktop é um cliente que permite gravar áudio do microfone e do sistema, enviando para processamento via IA em um servidor remoto na rede local.

## 🚀 Instalação Rápida

### Passo 1: Extrair o Pacote
Extraia este arquivo ZIP em uma pasta de sua escolha.

### Passo 2: Executar o Instalador
Abra o Terminal, navegue até a pasta extraída e execute:

```bash
./instalador_desktop.sh
```

**Isso é tudo!** O instalador irá:
- ✅ Instalar todas as dependências necessárias
- ✅ Configurar o ambiente Python
- ✅ Instalar o BlackHole (captura de áudio)
- ✅ Gerar o executável desktop
- ✅ Instalar a aplicação em Applications

## 📋 Conteúdo do Pacote

```
AudioAI_Desktop_Installer/
├── README.md                    # Este arquivo
├── INSTALACAO_DESKTOP.md        # Documentação completa
├── instalador_desktop.sh        # Instalador principal
├── build_app.sh                 # Script de build
├── audioai.spec                 # Configuração PyInstaller
└── client/                      # Código fonte do cliente
    ├── main.py                  # Aplicação principal
    ├── recorder.py              # Gravador de áudio
    ├── api_client.py            # Cliente da API
    └── requirements.txt         # Dependências Python
```

## ⚠️ Pré-requisitos

- **macOS 10.14** ou superior
- **Conexão com a internet** (para instalação de dependências)
- **Permissões de administrador** (para instalação do Homebrew)
- **Servidor AudioAI rodando na rede local**

## 🔧 Instalação Manual (Opcional)

Se preferir instalar manualmente, consulte o arquivo `INSTALACAO_DESKTOP.md` para instruções detalhadas.

## 🎯 Após a Instalação

1. **Certifique-se** de que o servidor AudioAI está rodando na rede local
2. **Configure** o IP do servidor no cliente (se necessário)
3. **Abra** a aplicação: `open ~/Applications/AudioAI.app`

## 🆘 Suporte

Se encontrar problemas durante a instalação:

1. Consulte o arquivo `INSTALACAO_DESKTOP.md` para solução de problemas
2. Verifique se tem permissões de administrador
3. Certifique-se de que tem conexão com a internet
4. Verifique se o servidor AudioAI está acessível na rede

## 📝 Notas Importantes

- **Não requer Node.js**: Este cliente não precisa do Node.js instalado
- **Servidor Remoto**: O servidor deve estar rodando em outro computador na rede
- **BlackHole**: Pode ser necessário reiniciar após a instalação do BlackHole
- **Segurança**: A aplicação usa assinatura ad-hoc para execução local

---

**AudioAI Desktop Client** - Versão para distribuição