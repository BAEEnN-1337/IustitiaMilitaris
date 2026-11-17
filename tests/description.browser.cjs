const { chromium } = require('playwright');
const { spawn } = require('node:child_process'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  en = require('../src/i18n/scenarios.en.json');
(async () => {
  const uk = {};
  for (const file of await fs.readdir(root + '/stsenarii'))
    if (file.endsWith('.json')) {
      const s = JSON.parse(
        await fs.readFile(root + '/stsenarii/' + file, 'utf8')
      );
      uk[s.id] = s;
    }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'description-test-'));
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: '18496', DATA_DIR: dir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('startup')), 10000);
      server.stdout.on('data', (d) => {
        if (String(d).includes('Local:')) {
          clearTimeout(timer);
          resolve();
        }
      });
      server.once('exit', () => reject(Error('server exited')));
    });
    browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
      headless: true,
      args: ['--no-sandbox']
    });
    for (const lang of ['uk', 'en'])
      for (const width of [360, 1280]) {
        const c = await browser.newContext({
          viewport: { width, height: 900 }
        });
        await c.addInitScript(
          (l) => localStorage.setItem('eds-language', l),
          lang
        );
        const p = await c.newPage();
        await p.goto('http://127.0.0.1:18496/');
        const cards = p.locator('.scenario-card');
        for (let i = 0; i < (await cards.count()); i++) {
          const card = cards.nth(i),
            desc = card.locator('.scenario-description'),
            preview = await desc.locator('.description-preview').textContent(),
            popup = desc.locator('.description-continuation');
          const id = (
              await card
                .locator('.scenario-card-description span')
                .first()
                .textContent()
            ).trim(),
            original = (lang === 'uk' ? uk : en)[id].sytuatsiia;
          assert.ok(Array.from(preview).length <= 190);
          assert.equal(
            preview + ((await popup.count()) ? await popup.textContent() : ''),
            original
          );
          if (await popup.count()) {
            await desc.evaluate((e) => e.scrollIntoView({ block: 'center' }));
            await p.mouse.move(0, 0);
            await p.evaluate(() =>
              Promise.all(document.getAnimations().map((a) => a.finished))
            );
            const positions = () =>
              p
                .locator(
                  '.scenario-card, .scenario-card-metadata, .scenario-secondary-actions'
                )
                .evaluateAll((els) =>
                  els.map((el) => {
                    const r = el.getBoundingClientRect();
                    return [r.x, r.y, r.width, r.height];
                  })
                );
            const before = await positions();
            await desc.hover();
            await popup.waitFor({ state: 'visible' });
            await popup.evaluate((e) =>
              Promise.all(e.getAnimations().map((a) => a.finished))
            );
            assert.deepEqual(await positions(), before);
            const a = await desc.boundingBox(),
              b = await popup.boundingBox();
            assert.ok(Math.abs(a.width - b.width) < 1);
            assert.ok(Math.abs(a.x - b.x) < 1);
            assert.equal(
              await popup.evaluate((e) => getComputedStyle(e).position),
              'absolute'
            );
            await p.mouse.move(0, 0);
            await desc.getByRole('button').focus();
            await popup.waitFor({ state: 'visible' });
            await desc.getByRole('button').evaluate((e) => e.blur());
          } else assert.equal(await desc.getByRole('button').count(), 0);
        }
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth
          ),
          false
        );
        await c.close();
        console.log(
          'PASS word-boundary preview, exact continuation, overlay width, hover/focus and zero card/metadata/action displacement',
          lang,
          width
        );
      }
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await new Promise((r) =>
      server.exitCode !== null ? r() : server.once('exit', r)
    );
    await fs.rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
