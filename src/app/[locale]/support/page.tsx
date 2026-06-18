'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function SupportPage() {
  const t = useTranslations('Support');
  const SUBJECTS = [
    t('subjects.bountyQuestion'),
    t('subjects.backingQuestion'),
    t('subjects.paymentsHelp'),
    t('subjects.reportBug'),
    t('subjects.reportContent'),
    t('subjects.deleteAccount'),
    t('subjects.other'),
  ];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
      const res = await fetch(`${API_BASE}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, subject, message, website }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? t('errors.generic'));
      }

      setStatus('success');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('errors.genericShort'));
      setStatus('error');
    }
  };

  const inputClass =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors';

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-24">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t('hero.title')}</h1>
          <p className="text-muted">
            {t('hero.subtitle')}
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-surface border border-fan/30 rounded-xl p-8 text-center">
            <div className="text-3xl mb-4">✓</div>
            <h2 className="text-lg font-semibold text-foreground mb-2">{t('success.title')}</h2>
            <p className="text-muted text-sm">
              {t.rich('success.body', {
                email,
                strong: (chunks) => <span className="text-foreground">{chunks}</span>,
              })}
            </p>
            <button
              onClick={() => {
                setStatus('idle');
                setName('');
                setEmail('');
                setSubject('');
                setMessage('');
                setWebsite('');
              }}
              className="mt-6 text-sm text-fan hover:underline"
            >
              {t('success.sendAnother')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot — positioned far off-screen; ignored by real users,
                filled by bots. No logic here — the backend handles it silently. */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
              <label htmlFor="support_website">{t('form.honeypotLabel')}</label>
              <input
                id="support_website"
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">{t('form.nameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t('form.namePlaceholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">{t('form.emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t('form.emailPlaceholder')}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">{t('form.subjectLabel')}</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="" disabled>{t('form.subjectPlaceholder')}</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">{t('form.messageLabel')}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                placeholder={t('form.messagePlaceholder')}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-muted mt-1.5">{t('form.charCount', { count: message.length })}</p>
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-400">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-fan text-black font-semibold py-3 rounded-lg hover:bg-fan-dim transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? t('form.submitting') : t('form.submit')}
            </button>

            <p className="text-xs text-muted text-center">
              {t('form.emailDirectly')}{' '}
              <a href="mailto:baldwig@artypot.com" className="text-fan hover:underline">
                baldwig@artypot.com
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
