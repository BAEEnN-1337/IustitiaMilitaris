const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..'),
  a = require(root + '/src/i18n/accounts.json'),
  g = require(root + '/src/i18n/group.json'),
  s = require(root + '/src/i18n/scenarios.en.json');
(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ethical-design-'));
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: '18420', DATA_DIR: dir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(Error('startup')), 10000);
      server.stdout.on('data', (x) => {
        if (String(x).includes('Local:')) {
          clearTimeout(t);
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
    const artifacts = path.join(root, 'test-results', 'design');
    await fs.mkdir(artifacts, { recursive: true });
    const errors = [];
    const base = 'http://127.0.0.1:18420';
    async function context(lang, width, theme = 'dark') {
      const c = await browser.newContext({ viewport: { width, height: 900 } });
      await c.addInitScript(
        ({ lang, theme }) => {
          localStorage.setItem('eds-language', lang);
          localStorage.setItem('eds-theme', theme);
        },
        { lang, theme }
      );
      return c;
    }
    async function styled(p) {
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      );
      const button = p.locator('main .action-primary').first();
      if (await button.count()) {
        const css = await button.evaluate((el) => ({
          bg: getComputedStyle(el).backgroundColor,
          padding: parseFloat(getComputedStyle(el).paddingLeft),
          radius: parseFloat(getComputedStyle(el).borderRadius)
        }));
        assert.notEqual(css.bg, 'rgba(0, 0, 0, 0)');
        assert.ok(css.padding >= 12 && css.radius >= 6, JSON.stringify(css));
      }
    }
    for (const theme of ['dark', 'light'])
      for (const lang of ['uk', 'en'])
        for (const width of [375, 1280]) {
          const c = await context(lang, width, theme),
            host = await c.newPage();
          host.on('pageerror', (e) => errors.push(e.message));
          await host.goto(base + '/auth');
          await host
            .getByRole('tab', { name: a[lang].register, exact: true })
            .click();
          await host
            .getByLabel(a[lang].alias, { exact: true })
            .fill('alias-' + theme + '-' + lang + '-' + width);
          await host
            .getByLabel(a[lang].password, { exact: true })
            .fill('strong-test-pass');
          await host
            .getByLabel(a[lang].confirm, { exact: true })
            .fill('strong-test-pass');
          await styled(host);
          await host.locator('form button').click();
          await host
            .getByRole('heading', { name: a[lang].progress, exact: true })
            .waitFor();
          await host.request.post(base + '/api/progress', {
            data: {
              scenarioId: 'S06',
              pathway: [
                { nodeId: 'V1', variantId: 'A' },
                { nodeId: 'V2', variantId: 'E1' },
                { nodeId: 'V6', variantId: 'J1' }
              ],
              notes: ''
            }
          });
          await host.reload();
          await host.getByText('1 / 8', { exact: true }).waitFor();
          await host.getByText('1 / 3', { exact: true }).waitFor();
          await host
            .getByLabel(a[lang].notes, { exact: true })
            .fill('A private reflection');
          await host
            .getByRole('button', { name: a[lang].save, exact: true })
            .click();
          await host.getByText(a[lang].saved, { exact: true }).waitFor();
          await styled(host);
          await host.evaluate(() => scrollTo(0, 0));
          await host.screenshot({
            path: path.join(artifacts, `profile-${theme}-${lang}-${width}.png`),
            fullPage: true
          });
          await host.goto(base + '/classroom');
          await styled(host);
          await host.goto(base + '/classroom/host/new?scenario=S06');
          await host
            .getByRole('button', { name: g[lang].start, exact: true })
            .waitFor();
          const join = new URL(
            await host
              .locator('a[href*="/classroom/join/"]')
              .getAttribute('href')
          ).pathname;
          const c1 = await context(lang, 375, theme),
            c2 = await context(lang, 375, theme),
            one = await c1.newPage(),
            two = await c2.newPage();
          await one.goto(base + join);
          await two.goto(base + join);
          await one.getByText(g[lang].waiting, { exact: true }).waitFor();
          await two.getByText(g[lang].waiting, { exact: true }).waitFor();
          await host
            .getByRole('button', { name: g[lang].start, exact: true })
            .click();
          for (const [index, choice] of ['A', 'E1', 'J1'].entries()) {
            const buttons = one.locator('main button.action.w-full');
            await buttons.first().waitFor();
            await buttons.first().click();
            await two.locator('main button.action.w-full').nth(1).click();
            await one.getByText(g[lang].voted, { exact: false }).waitFor();
            const chart = host.getByTestId('vote-chart');
            await chart.getByText(/50%/).first().waitFor();
            const bar = await chart
              .locator('.meter-fill')
              .first()
              .evaluate((el) => el.style.width);
            assert.equal(bar, '50%');
            await styled(host);
            await styled(one);
            if (index === 0) {
              await host
                .getByRole('button', { name: g[lang].hideLive, exact: true })
                .click();
              await host.getByText(g[lang].hidden, { exact: true }).waitFor();
              await host
                .getByRole('button', { name: g[lang].showLive, exact: true })
                .click();
              await host
                .getByRole('button', { name: g[lang].projector, exact: true })
                .click();
              await styled(host);
              await host.evaluate(() => scrollTo(0, 0));
              await host.screenshot({
                path: path.join(
                  artifacts,
                  `host-${theme}-${lang}-${width}.png`
                ),
                fullPage: true
              });
            }
            await host
              .getByRole('button', { name: g[lang].results, exact: true })
              .click();
            if (index === 0) {
              await host
                .getByRole('button', {
                  name: new RegExp('^' + g[lang].discuss + ' B')
                })
                .click();
            }
            await host
              .getByRole('button', {
                name: new RegExp(
                  '^' + g[lang].discuss + ' ' + choice + '(?: |$)'
                )
              })
              .click();
            await one
              .locator('main article')
              .filter({
                has: one.getByRole('heading', {
                  name: new RegExp('^' + choice + ' ·')
                })
              })
              .waitFor();
            await host
              .getByRole('button', {
                name:
                  index < 2
                    ? new RegExp('^' + g[lang].nextNode)
                    : g[lang].finish,
                exact: index === 2
              })
              .click();
          }
          await host
            .getByRole('heading', { name: g[lang].summary, exact: true })
            .waitFor();
          await one
            .getByRole('heading', { name: g[lang].summary, exact: true })
            .waitFor();
          await styled(host);
          await host.getByTestId('radar').waitFor();
          await one.getByTestId('radar').waitFor();
          await host
            .getByRole('button', { name: g[lang].close, exact: true })
            .click();
          await one.getByText(g[lang].ended, { exact: true }).waitFor();
          await c.close();
          await c1.close();
          await c2.close();
          console.log(
            'PASS',
            theme,
            lang,
            width,
            'profile styling/KPI/notes; instructor+2 guests: V1→V2→V6, 50% live chart, hide, projector, reselect terminal option, feedback, summary'
          );
        }
    assert.deepEqual(errors, []);
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
