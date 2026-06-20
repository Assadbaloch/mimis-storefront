'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const supabase = getSupabasePublicClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('Incorrect email or password.');
      setSubmitting(false);
      return;
    }
    router.push('/admin/menu');
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-24">
      <h1 className="font-serif font-bold text-2xl text-cream mb-1">Staff Login</h1>
      <p className="text-cream/55 text-sm mb-8">Mimi&rsquo;s owner &amp; staff access only.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" />
        <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input w-full" />
        {error && <p className="text-brick text-sm">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !flex disabled:opacity-50">
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
