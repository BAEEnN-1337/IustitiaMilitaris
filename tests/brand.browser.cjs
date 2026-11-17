const { chromium } = require('playwright');
const { spawn } = require('node:child_process'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  labels = require('../src/i18n/brand.json');
(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'brand-test-'));
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: '18480', DATA_DIR: directory },
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
    for (const theme of ['dark', 'light'])
      for (const lang of ['uk', 'en'])
        for (const width of [360, 1280, 3840]) {
          const c = await browser.newContext({
            viewport: { width, height: 1000 },
            deviceScaleFactor: width === 3840 ? 2 : 1
          });
          await c.addInitScript(
            ({ theme, lang }) => {
              localStorage.setItem('eds-theme', theme);
              localStorage.setItem('eds-language', lang);
            },
            { theme, lang }
          );
          const p = await c.newPage(),
            errors = [];
          p.on('pageerror', (e) => errors.push(e.message));
          await p.goto('http://127.0.0.1:18480/classroom');
          const trigger = p.getByRole('button', {
            name: labels[lang].open,
            exact: true
          });
          assert.deepEqual(
            await p
              .locator('.brand-mark')
              .evaluate((el) => [el.clientWidth, el.clientHeight]),
            [36, 36]
          );
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth > innerWidth
            ),
            false
          );
          if (width >= 1280) {
            const centers = await p.locator('.header-row').evaluate((el) =>
              [...el.children].map((c) => {
                const r = c.getBoundingClientRect();
                return r.y + r.height / 2;
              })
            );
            assert.ok(centers.every((y) => Math.abs(y - centers[0]) < 2));
          }
          for (const method of ['button', 'escape', 'outside']) {
            await trigger.click();
            const dialog = p.getByRole('dialog');
            await dialog.waitFor();
            await p.waitForFunction(
              () =>
                document.querySelector('.brand-crest-frame img')
                  .naturalWidth === 512
            );
            const close = dialog.getByRole('button', {
              name: labels[lang].close
            });
            await close.focus();
            await p.keyboard.press('Tab');
            assert.equal(
              await close.evaluate((el) => el === document.activeElement),
              true
            );
            if (method === 'button') await close.click();
            else if (method === 'escape') await p.keyboard.press('Escape');
            else await p.mouse.click(2, 2);
            assert.equal(await dialog.count(), 0);
            assert.equal(
              await trigger.evaluate((el) => el === document.activeElement),
              true
            );
            assert.equal(new URL(p.url()).pathname, '/classroom');
          }
          for (const url of [
            '/brand-mark.svg',
            '/logo-full.png',
            '/icon-192.png',
            '/icon-512.png'
          ])
            assert.equal(
              (await p.request.get('http://127.0.0.1:18480' + url)).status(),
              200
            );
          assert.deepEqual(errors, []);
          await c.close();
          console.log(
            'PASS brand, image, focus trap/restore, close button/Esc/backdrop, route preserved',
            theme,
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
    await fs.rm(directory, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
