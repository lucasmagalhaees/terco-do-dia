'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')
  // tira <link> externos (fontes/manifest) pra jsdom não tentar buscar
  .replace(/<link\b[^>]*>/g, '');

// Cria uma janela nova com o app carregado e os efeitos de rede neutralizados.
function freshWindow() {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://terco.test/',
    beforeParse(w) {
      const spoken = [];
      w.__spoken = spoken;
      w.SpeechSynthesisUtterance = function (t) { this.text = t; };
      w.speechSynthesis = {
        speaking: false,
        cancel() {},
        getVoices() { return [{ name: 'Luca', lang: 'it-IT' }, { name: 'Alice', lang: 'it-IT' }]; },
        speak(u) { spoken.push(u.text); if (u.onstart) u.onstart(); if (u.onend) u.onend(); }
      };
    }
  });
  return dom.window;
}

test('latinForSpeech: æ vira e, ti+vogal vira zi, mas não depois de s/t/x', () => {
  const w = freshWindow();
  const f = w.latinForSpeech;
  assert.strictEqual(f('cælum'), 'celum');
  assert.strictEqual(f('Hevæ'), 'Heve');
  assert.strictEqual(f('grátia'), 'grázia');       // ti -> zi
  assert.strictEqual(f('Pónzio'), 'Pónzio');        // já tratado, não muda
  assert.match(f('tentatiónem'), /tentaziónem/);
  assert.strictEqual(f('hóstia'), 'hóstia');        // sti não muda
});

test('chunks: frase curta fica inteira, texto longo quebra em pedaços <= ~180', () => {
  const w = freshWindow();
  const curto = w.chunks('Pai nosso, que estais nos céus. Amém.');
  assert.strictEqual(curto.length, 1);

  const credo = w.PRAYERS.credo.pt;
  const partes = w.chunks(credo);
  assert.ok(partes.length > 1, 'credo deve quebrar em várias partes');
  for (const p of partes) assert.ok(p.length <= 185, 'pedaço grande demais: ' + p.length);
  // nada se perde: todas as palavras seguem presentes
  const normal = s => s.replace(/\s+/g, ' ').trim();
  assert.strictEqual(normal(partes.join(' ')), normal(credo));
});

test('build terço: 5 início + 20 de dezenas + 2 final; 5 dezenas e 5 mistérios', () => {
  const w = freshWindow();
  w.S.mode = 'terco'; w.S.set = 'dolorosos';
  const st = w.build();
  assert.strictEqual(st.length, 7 + 20 + 5);
  const dezenas = st.filter(x => x.k === 'ave' && x.count === 10);
  assert.strictEqual(dezenas.length, 5);
  const misterios = st.filter(x => x.announce);
  assert.strictEqual(misterios.length, 5);
  // total de Ave-Marias: 3 (início) + 5*10
  const aves = st.filter(x => x.k === 'ave').reduce((n, x) => n + x.count, 0);
  assert.strictEqual(aves, 53);
});

test('build rosário: 4 conjuntos => 20 dezenas, 20 mistérios, 203 Ave-Marias', () => {
  const w = freshWindow();
  w.S.mode = 'rosario';
  const st = w.build();
  assert.strictEqual(st.length, 7 + 4 * 20 + 5);
  assert.ok(st.some(x => x.k === 'pelosinal'), 'tem a intro Pelo sinal da Santa Cruz');
  assert.ok(st.some(x => x.k === 'gracas'), 'tem Infinitas graças');
  const dezenas = st.filter(x => x.k === 'ave' && x.count === 10);
  assert.strictEqual(dezenas.length, 20);
  const misterios = st.filter(x => x.announce);
  assert.strictEqual(misterios.length, 20);
  const aves = st.filter(x => x.k === 'ave').reduce((n, x) => n + x.count, 0);
  assert.strictEqual(aves, 3 + 20 * 10);
  // cada conjunto marca o seu primeiro mistério
  assert.strictEqual(st.filter(x => x.firstOfSet).length, 4);
});

test('BY_DAY: sexta-feira (índice 5) reza os Dolorosos', () => {
  const w = freshWindow();
  assert.strictEqual(w.BY_DAY.length, 7);
  assert.strictEqual(w.BY_DAY[5], 'dolorosos');
  assert.strictEqual(w.BY_DAY[0], 'gloriosos'); // domingo
});

test('icsText: evento diário às 20:10 com vírgula escapada', () => {
  const w = freshWindow();
  const ics = w.icsText();
  assert.match(ics, /DTSTART:\d{8}T201000/);
  assert.match(ics, /RRULE:FREQ=DAILY/);
  assert.match(ics, /Boa noite\\, noia/);
  assert.match(ics, /BEGIN:VALARM/);
});

test('icsText respeita o horário escolhido', () => {
  const w = freshWindow();
  w.S.remTime = '06:30';
  const ics = w.icsText();
  assert.match(ics, /DTSTART:\d{8}T063000/);
  assert.match(ics, /DTEND:\d{8}T065000/);
});

test('delayFor escala com o ritmo (pace)', () => {
  const w = freshWindow();
  w.S.mode = 'terco'; w.S.set = 'gozosos'; w.STEPS = w.build(); w.S.i = 0;
  w.S.pace = 1; const base = w.delayFor();
  w.S.pace = 2; assert.strictEqual(w.delayFor(), base * 2);
});

test('streak conta dias seguidos, recorde e total', () => {
  const w = freshWindow();
  const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  const hoje = new Date(), ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
  w.S.log = [iso(ontem), iso(hoje)];
  const st = w.streakInfo();
  assert.strictEqual(st.total, 2);
  assert.strictEqual(st.cur, 2);
  assert.strictEqual(st.best, 2);
});

test('achievements: primeiro terço destrava com pelo menos uma reza', () => {
  const w = freshWindow();
  const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  w.S.log = [];
  assert.strictEqual(w.achievements().find(a => a.nome === 'Primeiro terço').on, false);
  w.S.log = [iso(new Date())];
  assert.strictEqual(w.achievements().find(a => a.nome === 'Primeiro terço').on, true);
});
