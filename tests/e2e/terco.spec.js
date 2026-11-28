'use strict';
const { test, expect } = require('@playwright/test');
const path = require('path');
const url = 'file://' + path.join(__dirname, '..', '..', 'index.html');

// Antes de qualquer script da página: fala instantânea e localStorage limpo.
// speechSynthesis do Chrome é somente-leitura: não dá pra substituir o objeto,
// então sobrescrevemos os métodos dele e deixamos a fala instantânea.
const stub = () => {
  try { localStorage.clear(); } catch (e) {}
  window.__spoken = [];
  // Em headless não há áudio real: força o play() a falhar para cair no
  // fallback de narração (TTS), que é o caminho exercido por este teste.
  try { window.HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('blocked')); }; } catch (e) {}
  const ss = window.speechSynthesis;
  ss.getVoices = () => [{ name: 'Luca', lang: 'it-IT' }, { name: 'Alice', lang: 'it-IT' }];
  ss.cancel = () => {};
  ss.speak = (u) => { window.__spoken.push(u.text); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 3); };
};

test.beforeEach(async ({ page }) => { await page.addInitScript(stub); });

test('começa o terço e mostra 5 dezenas na barra de progresso', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Começar o terço' }).click();
  await expect(page.locator('.prog i')).toHaveCount(5);
  await expect(page.locator('.prayer').first()).toContainText('Em nome do Pai');
});

test('avança pelas preces com o botão', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Começar o terço' }).click();
  const before = await page.evaluate(() => window.S.i);
  await page.getByRole('button', { name: 'Próxima oração' }).click();
  const after = await page.evaluate(() => window.S.i);
  expect(after).toBe(before + 1);
});

test('reiniciar do começo volta ao Sinal da Cruz', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Começar o terço' }).click();
  for (let n = 0; n < 4; n++) await page.getByRole('button', { name: /Próxima oração|rezad/ }).first().click();
  expect(await page.evaluate(() => window.S.i)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Reiniciar do começo' }).click();
  expect(await page.evaluate(() => window.S.i)).toBe(0);
  await expect(page.locator('.prayer').first()).toContainText('Em nome do Pai');
});

test('modo Rosário completo monta 20 dezenas e 20 mistérios', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Rosário completo' }).click();
  await expect(page.locator('h1')).toHaveText('Rosário completo');
  const info = await page.evaluate(() => {
    const st = window.build();
    return {
      total: st.length,
      dezenas: st.filter(x => x.k === 'ave' && x.count === 10).length,
      misterios: st.filter(x => x.announce).length
    };
  });
  expect(info).toEqual({ total: 92, dezenas: 20, misterios: 20 });
  await page.getByRole('button', { name: 'Começar o rosário' }).click();
  // pula as preces de abertura até o primeiro mistério e confere o rótulo do conjunto
  await page.evaluate(() => { window.S.i = window.STEPS.findIndex(s => s.announce); window.render(); });
  await expect(page.locator('.where .eyebrow')).toContainText('Gozosos');
});

test('modo Ouvir avança sozinho ao terminar a prece', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Começar o terço' }).click();
  const start = await page.evaluate(() => window.S.i);
  await page.getByRole('button', { name: 'Ouvir' }).click();
  await expect.poll(() => page.evaluate(() => window.S.i), { timeout: 8000 }).toBeGreaterThan(start + 1);
  const falou = await page.evaluate(() => window.__spoken.length);
  expect(falou).toBeGreaterThan(0);
});

test('home: escolhe velocidade da voz e ritmo do automático antes de rezar', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('group', { name: 'Velocidade da voz' }).getByRole('button', { name: '1,2×' }).click();
  await page.getByRole('group', { name: 'Ritmo do automático' }).getByRole('button', { name: 'Calmo' }).click();
  expect(await page.evaluate(() => [window.S.vrate, window.S.pace])).toEqual([1.2, 1.6]);
  const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('terco-do-dia-v1')));
  expect([salvo.vrate, salvo.pace]).toEqual([1.2, 1.6]);
  await expect(page.locator('[data-vrate="1.2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-pace="1.6"]')).toHaveAttribute('aria-pressed', 'true');
});

test('reza: player enxuto, ajustes recolhidos e separados (voz × ritmo)', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Começar o terço' }).click();
  await expect(page.locator('.player .pbtn')).toHaveCount(3);
  await expect(page.locator('#tunebox')).toBeHidden();
  await page.getByRole('button', { name: 'Ajustar velocidades' }).click();
  await expect(page.locator('#tunebox')).toBeVisible();
  const i0 = await page.evaluate(() => window.S.i);
  await page.locator('#tunebox [data-vrate="1.5"]').click();
  await page.locator('#tunebox [data-pace="0.9"]').click();
  expect(await page.evaluate(() => [window.S.vrate, window.S.pace, window.S.i])).toEqual([1.5, 0.9, i0]);
  await expect(page.locator('#tunebox [data-vrate="1.5"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#tunebox')).toBeVisible();
  // sem scroll horizontal no iPhone
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('valores antigos de velocidade continuam válidos e marcam o preset mais próximo', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem('terco-do-dia-v1', JSON.stringify({ vrate: 1.1, pace: 1.8 })));
  await page.evaluate(() => { window.load(); window.render(); });
  expect(await page.evaluate(() => [window.S.vrate, window.S.pace])).toEqual([1.1, 1.8]);
  await expect(page.locator('[data-vrate][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('[data-pace][aria-pressed="true"]')).toHaveCount(1);
});
