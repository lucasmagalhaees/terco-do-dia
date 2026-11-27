# terco-do-dia

App web (HTML único, funciona offline no celular) que acompanha o terço em português, latim ou os dois lado a lado.

## Recursos

- **Terço do dia ou Rosário completo:** escolhe os mistérios pelo dia da semana (gozosos, luminosos, dolorosos, gloriosos), ou reza o rosário inteiro (os quatro conjuntos, 20 mistérios) de uma vez.
- **Terço virtual animado:** a câmera acompanha a conta atual; toque para ver inteiro ou de perto.
- **Ouvir:** avança sozinho ao terminar cada prece. Em **latim**, usa áudio gravado com pronúncia latina (clipes em `audio/`, gerados com espeak-ng). Em **português**, usa a voz do aparelho (feminina ou masculina).
- **Auto** com velocidade Normal ou BS (mais rápida).
- **Reiniciar do zero** a qualquer momento.
- **Lembrete das 20:10** ("Boa noite, noia, hora do terço"): evento de calendário diário (toca com o app fechado) e aviso do navegador (só com o app aberto).
- PWA: instala na tela de início e abre offline. Progresso do dia salvo no navegador.

Para usar, abra o `index.html`.

## Testes

```
npm install
npm run test:unit   # node:test + jsdom (funções puras: build, latim, chunks, ICS)
npm run test:e2e    # Playwright (usa o Google Chrome do sistema)
npm test            # roda os dois
```

## Áudio do latim

Os clipes em `audio/la-*.mp3` são sintetizados (espeak-ng, pronúncia latina — robótico, mas latim de verdade, não italiano). Para usar gravações humanas, basta substituir os arquivos mantendo os mesmos nomes (`la-<prece>.mp3` e `la-myst-<conjunto>-<n>.mp3`).
