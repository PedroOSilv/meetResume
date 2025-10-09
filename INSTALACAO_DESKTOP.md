# Instalação rápida — Aplicação Desktop (sem servidor)

1) Entrar na pasta do projeto (após clonar)
```bash
cd /Users/ian/Documents/meetResume
# ou: cd <pasta-onde-você-clonou>/meetResume
```

2) Dar permissão ao script de build
```bash
chmod +x build_app.sh
```

3) (Opcional) Instalar FFmpeg para exportar áudio em MP3
```bash
brew install ffmpeg
```

4) Executar o build
```bash
./build_app.sh
```

5) Abrir a aplicação gerada
```bash
open dist/AudioAI.app
```

6) (Opcional) Instalar no /Applications
```bash
cp -R dist/AudioAI.app /Applications/
```

7) (Opcional) Capturar áudio do sistema (instalar BlackHole)
```bash
brew install blackhole-2ch
```