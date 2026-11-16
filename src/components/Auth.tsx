import React, { useEffect, useState } from 'react';
import labels from '../i18n/accounts.json';
import type { Language } from '../i18n';
export function Auth({ lang, onExit }: { lang: Language; onExit: () => void }) {
  const t = labels[lang];
  const [register, setRegister] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [user, setUser] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<
    Record<
      string,
      { pathway: { nodeId: string; variantId: string }[]; notes: string }
    >
  >({});
  async function load() {
    const r = await fetch('/api/auth/me');
    const data = await r.json();
    setUser(data.user?.login || null);
    if (data.user) setProgress(await (await fetch('/api/progress')).json());
  }
  useEffect(() => {
    load().catch(() => setError('serverError'));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (register && password !== confirm) {
      setError('mismatch');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });
      const data = await r.json();
      if (!r.ok) setError(data.error);
      else {
        setPassword('');
        setConfirm('');
        await load();
      }
    } catch {
      setError('serverError');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl">{t.title}</h1>
      {error && (
        <p role="alert">{t[error as keyof typeof t] || t.serverError}</p>
      )}
      {user ? (
        <>
          <p>{user}</p>
          <h2>{t.progress}</h2>
          <ul>
            {Object.keys(progress).map((id) => (
              <li key={id} className="space-y-2 py-4">
                <h3>{id}</h3>
                <p>
                  {progress[id].pathway
                    .map((step) => `${step.nodeId}: ${step.variantId}`)
                    .join(' → ')}
                </p>
                <label>
                  {t.notes}
                  <textarea
                    className="block w-full bg-navy-800 p-3"
                    maxLength={4000}
                    value={progress[id].notes}
                    onChange={(e) =>
                      setProgress({
                        ...progress,
                        [id]: { ...progress[id], notes: e.target.value }
                      })
                    }
                  />
                </label>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          scenarioId: id,
                          ...progress[id]
                        })
                      });
                      if (!response.ok) throw Error();
                      setError('saved');
                    } catch {
                      setError('serverError');
                    }
                  }}
                >
                  {t.save}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              setUser(null);
              setProgress({});
            }}
          >
            {t.logout}
          </button>
        </>
      ) : (
        <>
          <div className="flex gap-4">
            <button onClick={() => setRegister(false)}>{t.login}</button>
            <button onClick={() => setRegister(true)}>{t.register}</button>
          </div>
          <p>{t.notice}</p>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              {t.alias}
              <input
                className="block w-full bg-navy-800 p-3"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                pattern="[a-zA-Z0-9_-]{3,32}"
              />
            </label>
            <label className="block">
              {t.password}
              <input
                className="block w-full bg-navy-800 p-3"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                minLength={6}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {register && (
              <label className="block">
                {t.confirm}
                <input
                  className="block w-full bg-navy-800 p-3"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </label>
            )}
            <button disabled={busy}>{register ? t.register : t.login}</button>
          </form>
        </>
      )}
      <button onClick={onExit}>{t.guest}</button>
    </section>
  );
}
