#!/usr/bin/env node
// Gera os áudios das orações (masculino e feminino) via ElevenLabs.
// Os textos saem do próprio index.html, então não há divergência com o app.
//
// Uso:
//   ELEVENLABS_API_KEY=sk_...  \
//   ELEVEN_VOICE_F=<voiceId_feminina>  \
//   ELEVEN_VOICE_M=<voiceId_masculina>  \
//   node scripts/gen-audio.mjs
//
// Os arquivos vão para audio/f/<id>.mp3 e audio/m/<id>.mp3.
// Já existentes são pulados (rode de novo só gera o que falta).
// Troque o provedor em `synthesize()` se quiser usar outro TTS.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = { f: process.env.ELEVEN_VOICE_F, m: process.env.ELEVEN_VOICE_M };
const MODEL = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';

if (!API_KEY) { console.error('Faltou ELEVENLABS_API_KEY'); process.exit(1); }

// Carrega PRAYERS e SETS do app (mesma fonte de verdade que a tela usa).
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<link\b[^>]*>/g, '');
const { window: w } = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://terco.local/',
  beforeParse(win) {
    win.SpeechSynthesisUtterance = function (t) { this.text = t; };
    win.speechSynthesis = { speaking: false, cancel() {}, getVoices: () => [], speak() {} };
  }
});
const PRAYERS = w.PRAYERS, SETS = w.SETS;
const ORDPT = ['Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto'];

// Orações que aparecem como clipe (chave -> texto em PT).
const PRAYER_KEYS = ['sinal', 'pelosinal', 'oferecimento', 'credo', 'pai', 'ave', 'gloria', 'fatima', 'salve', 'gracas', 'anjo', 'defuntos'];
const clips = [];
for (const k of PRAYER_KEYS) {
  const t = PRAYERS[k] && PRAYERS[k].pt;
  if (t) clips.push({ id: k, text: t });
}
for (const sk of Object.keys(SETS)) {
  SETS[sk].items.forEach((m, d) => {
    let t = ORDPT[d] + ' mistério. ' + m.pt + '. ';
    if (m.med) t += m.med;
    clips.push({ id: `myst-${sk}-${d}`, text: t });
  });
}
console.log(`${clips.length} clipes por voz.`);

async function synthesize(text, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.8 } })
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

for (const g of ['f', 'm']) {
  const voiceId = VOICES[g];
  if (!voiceId) { console.log(`Pulando "${g}" (sem voiceId no env).`); continue; }
  const dir = path.join(ROOT, 'audio', g);
  fs.mkdirSync(dir, { recursive: true });
  for (const c of clips) {
    const out = path.join(dir, `${c.id}.mp3`);
    if (fs.existsSync(out)) { continue; }
    process.stdout.write(`  ${g}/${c.id} ... `);
    try {
      const buf = await synthesize(c.text, voiceId);
      fs.writeFileSync(out, buf);
      console.log(`${(buf.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.log('ERRO ' + e.message);
    }
  }
}
console.log('Pronto. Commite a pasta audio/.');
