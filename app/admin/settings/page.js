'use client';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import LogoUploader from '@/components/LogoUploader';
import NewsMediaManager from '@/components/NewsMediaManager';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabasePublicClient();
    supabase
      .from('storefront_settings')
      .select('logo_url')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error) setSettings(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center text-cream/50 py-24">Loading settings…</p>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-serif font-bold text-3xl text-cream mb-2">Storefront Settings</h1>
      <p className="text-cream/55 text-sm mb-6">
        Site-wide branding and the homepage &ldquo;Featured in the news&rdquo; gallery.
      </p>

      <LogoUploader initialLogoUrl={settings?.logo_url} />
      <NewsMediaManager />
    </div>
  );
}
