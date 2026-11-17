const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tooltip-test-'));
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: '18495', DATA_DIR: directory },
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
      for (const theme of ['dark', 'light'])
        for (const width of [360, 1280]) {
          const c = await browser.newContext({
            viewport: { width, height: 900 }
          });
          await c.addInitScript(
            ({ lang, theme }) => {
              localStorage.setItem('eds-language', lang);
              localStorage.setItem('eds-theme', theme);
            },
            { lang, theme }
          );
          const p = await c.newPage();
          for (const route of ['/', '/classroom']) {
            await p.goto('http://127.0.0.1:18495' + route);
            await p.evaluate(() => {
              window.tooltipClicks = 0;
              document.addEventListener('click', () => window.tooltipClicks++);
            });
            const badges = p
              .locator('.case-metadata-strip')
              .first()
              .locator('.case-badge');
            for (let i = 0; i < (await badges.count()); i++) {
              const badge = badges.nth(i),
                tip = badge.getByRole('tooltip', { includeHidden: true });
              assert.equal(await badge.getAttribute('tabindex'), '-1');
              await badge.evaluate((el) =>
                el.scrollIntoView({ block: 'center' })
              );
              await badge.hover();
              await p.waitForFunction(
                (id) =>
                  getComputedStyle(document.getElementById(id)).opacity === '1',
                await tip.getAttribute('id')
              );
              assert.equal(
                await tip.evaluate((el) => getComputedStyle(el).pointerEvents),
                'none'
              );
              assert.equal(
                await p
                  .locator('[role="tooltip"]')
                  .evaluateAll(
                    (els) =>
                      els.filter(
                        (e) => getComputedStyle(e).visibility === 'visible'
                      ).length
                  ),
                1
              );
              await badge.click();
              assert.equal(await p.evaluate(() => window.tooltipClicks), 0);
              await p.mouse.move(0, 0);
              await p.waitForFunction(
                (id) =>
                  getComputedStyle(document.getElementById(id)).visibility ===
                  'hidden',
                await tip.getAttribute('id')
              );
              await badge.focus();
              assert.equal(
                await tip.evaluate((el) => getComputedStyle(el).visibility),
                'hidden'
              );
              await badge.evaluate((el) => el.blur());
            }
            // A direct switch must cancel the previous fade-out on the same frame.
            await badges.first().hover();
            await badges.nth(1).hover();
            assert.equal(
              await badges
                .first()
                .getByRole('tooltip', { includeHidden: true })
                .evaluate((el) => getComputedStyle(el).visibility),
              'hidden'
            );
            assert.equal(
              await p.evaluate(
                () => document.documentElement.scrollWidth > innerWidth
              ),
              false
            );
          }
          await c.close();
          console.log(
            'PASS hover-only, click isolation, focus ignored, exclusive tooltip and enter/leave',
            lang,
            theme,
            width
          );
        }
    for (const options of [
      { reducedMotion: 'reduce' },
      { hasTouch: true, isMobile: true }
    ]) {
      const c = await browser.newContext({
          ...options,
          viewport: { width: 360, height: 900 }
        }),
        p = await c.newPage();
      await p.goto('http://127.0.0.1:18495/');
      const badge = p.locator('.case-badge').first(),
        tip = badge.getByRole('tooltip', { includeHidden: true });
      if (options.hasTouch) {
        await badge.tap();
        assert.equal(
          await tip.evaluate((el) => getComputedStyle(el).visibility),
          'hidden'
        );
      } else
        assert.equal(
          await tip.evaluate((el) => getComputedStyle(el).transitionDuration),
          '0s'
        );
      await c.close();
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
