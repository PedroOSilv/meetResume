# Configuração do BlackHole para Captura de Áudio do Sistema

## O que é o BlackHole?

BlackHole é um driver de áudio virtual moderno para macOS que permite rotear áudio entre aplicações com latência zero. <mcreference link="https://github.com/ExistentialAudio/BlackHole" index="1">1</mcreference> É uma alternativa moderna ao Soundflower, compatível com macOS 10.10 e versões mais recentes, incluindo Apple Silicon. <mcreference link="https://cdm.link/blackhole-mac-soundflower-alternative-catalina/" index="2">2</mcreference>

## Instalação

O BlackHole já foi instalado automaticamente via Homebrew:
```bash
brew install blackhole-2ch
```

**⚠️ IMPORTANTE**: Você precisa reiniciar o macOS para que o BlackHole funcione corretamente.

## Configuração do Multi-Output Device

Para capturar o áudio do sistema mantendo a reprodução nos seus alto-falantes/fones, você precisa criar um Multi-Output Device:

### Passo 1: Abrir Audio MIDI Setup
1. Abra o **Spotlight** (Cmd + Espaço)
2. Digite "Audio MIDI Setup" e pressione Enter
3. Ou vá em **Aplicações > Utilitários > Audio MIDI Setup**

### Passo 2: Criar Multi-Output Device
1. No Audio MIDI Setup, clique no botão **"+"** no canto inferior esquerdo
2. Selecione **"Create Multi-Output Device"**
3. Um novo dispositivo aparecerá na lista

### Passo 3: Configurar o Multi-Output Device
1. Selecione o Multi-Output Device criado
2. No painel direito, marque as caixas:
   - ✅ **BlackHole 2ch** (para captura)
   - ✅ **Seus alto-falantes/fones** (para reprodução)
3. **IMPORTANTE**: Certifique-se de que seus alto-falantes estão marcados como **"Master Device"** (primeira opção na lista)
4. Renomeie o dispositivo para algo como "Sistema + BlackHole"

### Passo 4: Definir como Saída Padrão
1. Abra **Preferências do Sistema > Som**
2. Na aba **"Saída"**, selecione o Multi-Output Device criado
3. Agora todo áudio do sistema será enviado tanto para seus alto-falantes quanto para o BlackHole

## Como Funciona

1. **Áudio do Sistema** → **Multi-Output Device**
2. **Multi-Output Device** → **Alto-falantes** (você ouve) + **BlackHole** (aplicação captura)
3. **Aplicação Audio AI** → **BlackHole** (captura o áudio do sistema)

## Testando a Configuração

1. Reinicie a aplicação Audio AI
2. Você deve ver a mensagem: "✅ BlackHole encontrado"
3. Reproduza algum áudio (música, vídeo, etc.)
4. Teste a gravação na aplicação

## Solução de Problemas

### BlackHole não aparece
- Certifique-se de ter reiniciado o macOS após a instalação
- Verifique se foi instalado: `ls /Library/Audio/Plug-Ins/HAL/`
- Deve aparecer: `BlackHole2ch.driver`

### Não consigo ouvir áudio
- Verifique se o Multi-Output Device está selecionado como saída
- Certifique-se de que seus alto-falantes estão marcados como "Master Device"
- Verifique o volume do sistema

### Aplicação não detecta áudio
- Reproduza algum áudio no sistema
- Verifique se o Multi-Output Device está ativo
- Teste com diferentes aplicações (Spotify, YouTube, etc.)

## Referências

- BlackHole GitHub: https://github.com/ExistentialAudio/BlackHole
- Documentação oficial: https://existential.audio/blackhole/