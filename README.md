# terco-do-dia

App web (HTML único, funciona offline no celular) que acompanha o terço em português, latim ou os dois lado a lado.

## Recursos

- **Terço mais completo:** oferecimento inicial (Vinde, Espírito Santo), interlúdio das 3 Ave-Marias (fé, esperança, caridade), meditação com referência bíblica e fruto em cada mistério, e no fim Infinitas graças, Oração do Anjo de Fátima e oração pelas almas do purgatório.
- **Arte por mistério:** cada mistério tem cor e emblema próprios.
- **Angelus:** disponível na tela inicial.
- **Sequência e conquistas:** streak de dias seguidos e conquistas que vão destravando.
- **Lembrete em horário livre** e **controle de ritmo** (atrasar/adiantar) no automático.
- **Terço do dia ou Rosário completo:** escolhe os mistérios pelo dia da semana (gozosos, luminosos, dolorosos, gloriosos), ou reza o rosário inteiro (os quatro conjuntos, 20 mistérios) de uma vez.
- **Terço virtual animado:** a câmera acompanha a conta atual; toque para ver inteiro ou de perto.
- **Ouvir (português):** lê cada prece com a voz do aparelho (feminina ou masculina) e avança sozinho ao terminar.
- **Auto:** reza sozinho no ritmo de oração.
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
- **Santo do dia** e **álbum de santos** (rezar o terço do dia desbloqueia o santo).
