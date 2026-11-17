const { route: caseRoute } = require('./scenarios.cjs');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  labels = require(root + '/src/i18n/design.json'),
  group = require(root + '/src/i18n/group.json');
const en = require(root + '/src/i18n/scenarios.en.json').S01,
  uk = require(root + '/stsenarii/S01-spravedlyvist-rozpodilu.json');
function contrast(a, b) {
  const rgb = (c) =>
    c
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((x) => {
        x /= 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
  const l = (c) => {
    const r = rgb(c);
    return r[0] * 0.2126 + r[1] * 0.7152 + r[2] * 0.0722;
  };
  const x = l(a),
    y = l(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ethical-theme-'));
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: '18440', DATA_DIR: directory },
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
    const errors = [];
    const base = 'http://127.0.0.1:18440';
    await fs.mkdir(root + '/test-results/themes', { recursive: true });
    for (const theme of ['dark', 'light'])
      for (const lang of ['uk', 'en'])
        for (const width of [375, 768, 1280]) {
          const context = await browser.newContext({
            viewport: { width, height: 900 }
          });
          await context.addInitScript(
            ({ theme, lang }) => {
              localStorage.setItem('eds-theme', theme);
              localStorage.setItem('eds-language', lang);
            },
            { theme, lang }
          );
          const p = await context.newPage();
          p.on('pageerror', (e) => errors.push(e.message));
          async function check() {
            assert.equal(
              await p.evaluate(
                () => document.documentElement.scrollWidth > innerWidth
              ),
              false,
              `${theme}/${lang}/${width} overflow`
            );
            const title = p.locator('main h1').first();
            if (await title.count()) {
              const colors = await title.evaluate((el) => {
                let parent = el;
                let bg;
                while (parent) {
                  bg = getComputedStyle(parent).backgroundColor;
                  if (!bg.endsWith(', 0)') && bg !== 'transparent') break;
                  parent = parent.parentElement;
                }
                return [getComputedStyle(el).color, bg];
              });
              assert.ok(contrast(...colors) >= 4.5, JSON.stringify(colors));
            }
          }
          for (const route of [
            '/auth',
            '/classroom',
            '/builder/S01',
            '/norms',
            '/scenarios/S01'
          ]) {
            await p.goto(base + route);
            await p.locator('main h1').first().waitFor();
            assert.equal(
              await p.evaluate(() => document.documentElement.dataset.theme),
              theme
            );
            await check();
            if (route === '/norms') {
              await p.locator('main .cursor-pointer').first().click();
              const dialog = p.getByRole('dialog');
              await dialog.waitFor();
              const colors = await dialog
                .locator('.bg-obsidian-800').first()
                .evaluate((el) => [
                  getComputedStyle(el).color,
                  getComputedStyle(el).backgroundColor
                ]);
              assert.ok(contrast(...colors) >= 4.5, JSON.stringify(colors));
              await check();
              await dialog.getByRole('button').first().click();
            }
          }
          if (theme === 'light' && lang === 'en' && width === 1280) {
            await p.screenshot({
              path: root + '/test-results/themes/briefing-light-desktop.png'
            });
          }
          const otherTheme = theme === 'dark' ? 'light' : 'dark';
          await p
            .getByRole('button', {
              name: labels[lang][otherTheme],
              exact: true
            })
            .click();
          await p.waitForFunction(
            (value) => document.documentElement.dataset.theme === value,
            otherTheme
          );
          assert.equal(
            await p.evaluate(() => localStorage.getItem('eds-theme')),
            otherTheme
          );
          await p
            .getByRole('button', { name: labels[lang][theme], exact: true })
            .click();
          if (width === 1280) {
            const layout = await p.locator('.header-row').evaluate((el) =>
              [...el.children].map((c) => {
                const r = c.getBoundingClientRect();
                return { center: r.y + r.height / 2, height: r.height };
              })
            );
            assert.ok(
              layout.every((r) => Math.abs(r.center - layout[0].center) < 2),
              JSON.stringify(layout)
            );
            assert.ok(
              await p
                .locator('.site-header')
                .evaluate((el) => el.getBoundingClientRect().height < 80)
            );
          }
          await p
            .getByRole('button', {
              name:
                lang === 'en'
                  ? 'Conflicting Values (Click to expand)'
                  : 'Конфлікт цінностей (натисніть, щоб розгорнути)',
              exact: true
            })
            .click();
          assert.equal(await p.getByTestId('value-conflict').count(), uk.tsinnosti_v_konflikti.length);
          assert.equal(await p.getByTestId('dossier').count(), 1);
          await check();
          await p
            .getByRole('button', {
              name:
                lang === 'en'
                  ? 'Begin Resolving Dilemma'
                  : 'Почати вирішення дилеми',
              exact: true
            })
            .click();
          let node = (lang === 'en' ? en : uk).vuzly[0];
          for (const { variantId: id } of caseRoute(uk)) {
            await p.getByTestId('stepper').waitFor();
            const v = node.varianty.find((v) => v.id === id);
            await p.getByText(v.tekst, { exact: true }).click();
            await p
              .getByRole('button', {
                name: lang === 'en' ? 'Confirm Decision' : 'Підтвердити вибір',
                exact: true
              })
              .click();
            await p.locator('.consequence-delayed').waitFor();
            if (v.nastupnyi_vuzol) {
              await p
                .getByRole('button', {
                  name:
                    lang === 'en'
                      ? 'Proceed to Next Stage'
                      : 'Перейти до наступного етапу',
                  exact: true
                })
                .click();
              node = (lang === 'en' ? en : uk).vuzly.find(
                (n) => n.id === v.nastupnyi_vuzol
              );
            } else
              await p
                .getByRole('button', {
                  name:
                    lang === 'en'
                      ? 'View Final Reflection Map'
                      : 'Переглянути підсумкову карту рішень',
                  exact: true
                })
                .click();
          }
          assert.equal(await p.getByTestId('radar').count(), 0);
          await check();
          const graph = p.locator('svg.select-none');
          assert.equal(await graph.count(), 1);
          assert.ok(await graph.evaluate(el => {
            const container = el.parentElement;
            const card = container.parentElement.parentElement;
            return Math.abs(container.getBoundingClientRect().width - card.getBoundingClientRect().width) < 2;
          }));
          await p.evaluate(() => scrollTo(0, 0));
          await p.screenshot({
            path: `${root}/test-results/themes/summary-${theme}-${lang}-${width}.png`,
            fullPage: true
          });
          await p.goto(base + '/classroom/host/new?scenario=S01');
          await p
            .getByRole('button', { name: group[lang].start, exact: true })
            .waitFor();
          await p
            .getByRole('button', { name: group[lang].projector, exact: true })
            .click();
          assert.equal(await p.locator('.site-header').isVisible(), false);
          assert.equal(await p.locator('#site-footer').isVisible(), false);
          await p.keyboard.press('Escape');
          assert.equal(await p.locator('.site-header').isVisible(), true);
          await p
            .getByRole('button', { name: group[lang].close, exact: true })
            .click();
          console.log(
            'PASS',
            theme,
            lang,
            width,
            'routes, contrast, one-row header, poles, stepper, full-width reflection without radar, projector/Esc'
          );
          await context.close();
        }
    const c = await browser.newContext({ reducedMotion: 'reduce' }),
      p = await c.newPage();
    await p.goto(base + '/scenarios/S01');
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload();
    await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    await c.setOffline(true);
    await p.goto(base + '/builder');
    await p.locator('main h1').waitFor();
    assert.ok(
      !(
        await p.evaluate(async () => {
          const keys = await caches.keys();
          const urls = (
            await Promise.all(
              keys.map(async (key) =>
                (await (await caches.open(key)).keys()).map((r) => r.url)
              )
            )
          ).flat();
          return urls;
        })
      ).some((u) => /\/api\//.test(u))
    );
    const motion = await p.evaluate(() => {
      const card = document.createElement('div');
      card.className = 'consequence-delayed';
      document.body.append(card);
      const css = getComputedStyle(card);
      const result = [
        parseFloat(css.animationDuration),
        parseFloat(css.animationDelay)
      ];
      card.remove();
      return result;
    });
    assert.ok(
      motion.every((value) => value <= 0.001),
      JSON.stringify(motion)
    );
    console.log(
      'PASS persisted theme toggle, reduced motion, offline nested navigation and API cache exclusion'
    );
    await c.close();
    assert.deepEqual(errors, []);
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
