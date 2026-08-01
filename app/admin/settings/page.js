'use client';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import LogoUploader from '@/components/LogoUploader';
import NewsMediaManager from '@/components/NewsMediaManager';
import BusinessInfoEditor from '@/components/admin/BusinessInfoEditor';
import { GuidePanel } from '@/components/admin/Guide';

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
      <p className="text-cream/55 text-sm mb-5">
        Your logo, business details and opening hours.
      </p>

      <GuidePanel title="What this page controls">
        <p>
          Everything here appears across the whole website, whichever theme is live. Change it once
          and it updates everywhere — the header, the footer, and any page that shows your address
          or hours.
        </p>
        <p>
          <strong>Your logo and details are protected.</strong> A theme can decide how they look, but
          never what they say, so a redesign can never accidentally change your phone number or swap
          your logo.
        </p>
        <p className="text-cream/55">
          One thing to know: the address here is what customers <em>see</em>. The address delivery
          drivers are sent to is stored separately and isn&rsquo;t affected by edits on this page —
          so a typo here can never misdirect a driver.
        </p>
      </GuidePanel>

      <LogoUploader initialLogoUrl={settings?.logo_url} />
      <BusinessInfoEditor />
      <NewsMediaManager />
    </div>
  );
}
