# 🎙️🖥️ Guia de Captura de Áudio - Sistema + Microfone

## 📋 Visão Geral

O Audio AI Client agora suporta três modos de captura de áudio:

1. **🎤 Apenas Microfone** - Captura tradicional do microfone
2. **🖥️ Apenas Sistema** - Captura do áudio do sistema (requer BlackHole)
3. **🎤🖥️ Microfone + Sistema** - Captura simultânea com mixagem configurável

## 🛠️ Configuração Inicial

### Instalação do BlackHole (Necessário para áudio do sistema)

O BlackHole é um driver de áudio virtual que permite capturar o áudio do sistema no macOS.

#### Opção 1: Via Homebrew (Recomendado)
```bash
brew install blackhole-2ch
```

#### Opção 2: Download Direto
1. Acesse: https://github.com/ExistentialAudio/BlackHole
2. Baixe o instalador para macOS
3. Execute o instalador e siga as instruções

### Configuração do Audio MIDI Setup

1. Abra **Audio MIDI Setup** (Aplicações > Utilitários)
2. Clique no botão **+** e selecione **Create Multi-Output Device**
3. Marque as opções:
   - ✅ **BlackHole 2ch**
   - ✅ **Built-in Output** (ou seus alto-falantes/fones)
4. Renomeie para "Multi-Output Device"
5. Vá em **System Preferences > Sound > Output**
6. Selecione **Multi-Output Device** como saída padrão

## 🎛️ Modos de Gravação

### 🎤 Modo Microfone
- **Uso**: Gravação tradicional de voz
- **Configuração**: Nenhuma configuração adicional necessária
- **Ideal para**: Comandos de voz, ditado, conversas

### 🖥️ Modo Sistema
- **Uso**: Captura apenas o áudio do sistema
- **Configuração**: Requer BlackHole instalado
- **Ideal para**: Gravar música, vídeos, chamadas do sistema

### 🎤🖥️ Modo Combinado
- **Uso**: Captura simultânea de microfone e sistema
- **Configuração**: Requer BlackHole + controle de mixagem
- **Ideal para**: Tutoriais, apresentações, streaming

## ⚖️ Controle de Mixagem

No modo combinado, você pode ajustar a proporção entre as fontes:

- **0% Sistema / 100% Microfone**: Apenas microfone
- **50% Sistema / 50% Microfone**: Mixagem equilibrada
- **70% Sistema / 30% Microfone**: Mais áudio do sistema (padrão)
- **100% Sistema / 0% Microfone**: Apenas sistema

### Recomendações de Mixagem

| Cenário | Sistema | Microfone | Descrição |
|---------|---------|-----------|-----------|
| **Tutorial** | 30% | 70% | Voz clara com áudio de fundo |
| **Apresentação** | 50% | 50% | Equilibrio entre slides e narração |
| **Gaming** | 60% | 40% | Áudio do jogo com comentários |
| **Música + Voz** | 80% | 20% | Música principal com narração |

## 🔧 Solução de Problemas

### ❌ "BlackHole device not found"
**Solução**: 
1. Instale o BlackHole conforme instruções acima
2. Reinicie a aplicação
3. Verifique se o BlackHole aparece em Audio MIDI Setup

### ❌ "No audio captured from system"
**Solução**:
1. Verifique se Multi-Output Device está selecionado como saída
2. Certifique-se que há áudio tocando no sistema
3. Teste com música ou vídeo no navegador

### ❌ "Microphone not working in combined mode"
**Solução**:
1. Verifique permissões de microfone nas Preferências do Sistema
2. Teste primeiro no modo "Apenas Microfone"
3. Ajuste o slider de mixagem para dar mais peso ao microfone

### ⚠️ Áudio muito baixo ou alto
**Solução**:
1. Ajuste o volume do sistema antes de gravar
2. Use o controle de mixagem para balancear as fontes
3. Verifique os níveis de entrada no Audio MIDI Setup

## 🎯 Dicas de Uso

### Para Melhor Qualidade
- Use fones de ouvido para evitar feedback
- Teste os níveis antes de gravações importantes
- Mantenha o microfone próximo (15-30cm)
- Evite ruídos de fundo durante a gravação

### Para Diferentes Cenários
- **Chamadas**: Modo Sistema para capturar ambos os lados
- **Tutoriais**: Modo Combinado com 30% sistema / 70% microfone
- **Música**: Modo Sistema para captura limpa
- **Podcasts**: Modo Microfone para melhor qualidade de voz

## 🔄 Fluxo de Trabalho Recomendado

1. **Configurar BlackHole** (uma vez)
2. **Selecionar modo** apropriado na interface
3. **Ajustar mixagem** se necessário
4. **Testar** com gravação curta
5. **Gravar** conteúdo final
6. **Processar** com IA

## 📱 Interface da Aplicação

A interface foi atualizada com:
- **Dropdown de Modo**: Seleciona fonte de áudio
- **Slider de Mixagem**: Controla proporção (só no modo combinado)
- **Status Dinâmico**: Mostra modo atual e status
- **Controles Inteligentes**: Desabilitados durante gravação

## 🚀 Próximos Passos

Após configurar, você pode:
1. Testar cada modo individualmente
2. Experimentar diferentes proporções de mixagem
3. Integrar com o servidor de IA para transcrição
4. Usar o executável standalone para distribuição

---

**💡 Dica**: Mantenha o BlackHole sempre instalado mesmo se não usar o modo sistema - não interfere com o funcionamento normal do macOS.