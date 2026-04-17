'use client';

import { useState } from 'react';

const SUBJECTS = [
  'I have a question about a bounty',
  'I have a question about backing a bounty',
  'I need help with payments or billing',
  'I want to report a problem or bug',
  'I want to report content',
  'I want to delete my account',
  'Something else',
];

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
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
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Something went wrong. Please try again.');
      }

      setStatus('success');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Get in touch</h1>
          <p className="text-muted">
            Questions, problems, or just want to say something. I actually read these.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-surface border border-fan/30 rounded-xl p-8 text-center">
            <div className="text-3xl mb-4">✓</div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Message sent</h2>
            <p className="text-muted text-sm">
              I&apos;ll get back to you at <span className="text-foreground">{email}</span>. Usually within a day or two.
            </p>
            <button
              onClick={() => {
                setStatus('idle');
                setName('');
                setEmail('');
                setSubject('');
                setMessage('');
              }}
              className="mt-6 text-sm text-fan hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Harry Baldwig"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="" disabled>Select a topic…</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                placeholder="Tell me what's going on…"
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-muted mt-1.5">{message.length} / 5000</p>
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-400">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-fan text-black font-semibold py-3 rounded-lg hover:bg-fan-dim transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Sending…' : 'Send message'}
            </button>

            <p className="text-xs text-muted text-center">
              Or email directly:{' '}
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
