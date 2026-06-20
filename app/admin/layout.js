'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const [state, setState] = useState({ checked: false, profile: null });

  useEffect(() => {
    if (isLoginPage) {
      setState({ checked: true, profile: null });
      return;
    }

    const supabase = getSupabasePublicClient();
    let cancelled = false;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) router.replace('/admin/login');
        return;
      }
      const { data: role, error } = await supabase
        .from('user_roles')
        .select('role, full_name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !role) {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }
      setState({ checked: true, profile: role });
    }

    check();
    return () => { cancelled = true; };
  }, [isLoginPage, pathname, router]);

  if (isLoginPage) return children;

  if (!state.checked) {
    return <p className="text-center text-cream/50 py-24">Checking access…</p>;
  }

  async function handleLogout() {
    const supabase = getSupabasePublicClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  return (
    <div>
      <div className="border-b border-cream/10 bg-black/30 px-5 md:px-8 py-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-cream/60">
          Signed in as <span className="text-gold font-bold">{state.profile?.full_name || 'Staff'}</span> ({state.profile?.role})
        </p>
        <button onClick={handleLogout} className="text-xs uppercase tracking-wide text-cream/50 hover:text-brick">
          Log Out
        </button>
      </div>
      {children}
    </div>
  );
}
