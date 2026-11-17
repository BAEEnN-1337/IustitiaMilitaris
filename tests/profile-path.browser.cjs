const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const { root, scenarios, englishScenarios } = require('./scenarios.cjs');
const labels = require('../src/i18n/accounts.json');
const load = require('./ts-loader.cjs'), { stageLabel, variantLabel } = load(root + '/src/i18n/display.ts');
const pathways = Object.fromEntries(scenarios.map(s => {
  const steps = []; let node = s.vuzly.find(n => n.id === s.pochatkovyi_vuzol);
  while (node) {
    const variant = node.varianty[(steps.length + 3) % node.varianty.length];
    steps.push({ nodeId: node.id, variantId: variant.id });
    node = s.vuzly.find(n => n.id === variant.nastupnyi_vuzol);
  }
  return [s.id, steps];
}));
(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'profile-path-'));
  const server = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: '18591', DATA_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('startup')), 10000); server.stdout.on('data', d => { if (String(d).includes('Local:')) { clearTimeout(timer); resolve(); } }); });
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
    await fs.mkdir(root + '/test-results/profile-path', { recursive: true });
    for (const theme of ['dark', 'light']) for (const lang of ['uk', 'en']) for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ theme, lang, pathways }) => {
        localStorage.setItem('eds-theme', theme); localStorage.setItem('eds-language', lang);
        for (const [id, pathway] of Object.entries(pathways)) localStorage.setItem('simulator_progress_' + id, JSON.stringify({ pathway }));
      }, { theme, lang, pathways });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const base = 'http://127.0.0.1:18591';
      assert.equal((await context.request.post(base + '/api/auth/register', { data: { login: `path-${theme}-${lang}-${width}`, password: 'profile-browser-test' } })).status(), 200);
      for (const source of scenarios) assert.equal((await context.request.post(base + '/api/progress', { data: { scenarioId: source.id, pathway: pathways[source.id], notes: '' } })).status(), 200);
      await page.goto(base + '/auth');
      await page.getByRole('heading', { name: labels[lang].progress, exact: true }).waitFor();
      assert.equal(await page.getByTestId('profile-case').count(), 3);
      for (const source of scenarios) {
        const scenario = lang === 'uk' ? source : englishScenarios[source.id], steps = pathways[source.id];
        const card = page.locator(`[data-testid=profile-case][data-scenario-id=${source.id}]`);
        const chips = card.getByTestId('profile-step-chips').locator('span');
        assert.equal(await chips.count(), steps.length);
        const dimensions = await chips.evaluateAll(es => es.map(e => [e.getBoundingClientRect().width, e.getBoundingClientRect().height]));
        assert.ok(dimensions.every(d => d[0] === dimensions[0][0] && d[1] === dimensions[0][1]));
        for (const [i, step] of steps.entries()) {
          assert.equal(await chips.nth(i).innerText(), `${lang === 'uk' ? 'Е' : 'S'}${i + 1} · ${variantLabel(scenario, step.nodeId, step.variantId, lang)}`);
          assert.equal(await chips.nth(i).getAttribute('title'), stageLabel(scenario, step.nodeId, lang));
        }
        const details = card.getByTestId('profile-route');
        if (source.id === 'S03') assert.equal(await details.getAttribute('open'), '');
        if (await details.getAttribute('open') === null) await details.locator('summary').click();
        assert.equal(await details.getByTestId('path-stage').count(), steps.length);
        assert.equal(await details.getByTestId('selected-curve').count(), steps.length - 1);
        assert.equal(await card.getByTestId('profile-timeline').locator('li').count(), steps.length);
        for (const [i, step] of steps.entries()) {
          const node = scenario.vuzly.find(n => n.id === step.nodeId), variant = node.varianty.find(v => v.id === step.variantId);
          const stage = details.getByTestId('path-stage').nth(i);
          assert.equal(await stage.getByTestId('path-option').count(), node.varianty.length);
          assert.equal(await stage.locator('[data-selected=true]').count(), 1);
          assert.equal(await card.getByTestId('profile-timeline').locator('li').nth(i).locator('p').innerText(), variant.tekst);
          const badges = await card.locator('.profile-decision-badges').nth(i).locator('span').evaluateAll(es => es.map(e => e.getBoundingClientRect().top));
          assert.equal(badges[0], badges[1]);
        }
        assert.ok(await details.locator('.decision-path-scroll').evaluate(e => e.scrollWidth > e.clientWidth));
      }
      const card = page.locator('[data-testid=profile-case][data-scenario-id=S03]');
      const profileCurves = await card.getByTestId('selected-curve').evaluateAll(es => es.map(e => e.getAttribute('d')));
      await card.getByRole('textbox', { name: labels[lang].notes }).fill('Test reflection');
      await card.getByRole('button', { name: labels[lang].save, exact: true }).click();
      await card.getByRole('status').filter({ hasText: labels[lang].saved }).waitFor();
      const stored = await (await context.request.get(base + '/api/progress')).json();
      assert.deepEqual(stored.S03.pathway, pathways.S03); assert.equal(stored.S03.notes, 'Test reflection');
      const text = await page.locator('main').innerText();
      assert.doesNotMatch(text, /\bV\d+\b|\b[A-RT-Z][1-9]\b/);
      if (lang === 'en') assert.doesNotMatch(text, /\p{Script=Cyrillic}/u);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${root}/test-results/profile-path/${theme}-${lang}-${width}.png`, fullPage: true });
      await page.goto(base + '/scenarios/S03/summary'); await page.getByTestId('path-stage').first().waitFor();
      assert.deepEqual(await page.getByTestId('selected-curve').evaluateAll(es => es.map(e => e.getAttribute('d'))), profileCurves);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('PASS profile compact chips, full shared graph, timeline, notes and Summary parity', theme, lang, width);
    }
  } finally { await browser?.close(); server.kill(); await fs.rm(dir, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
