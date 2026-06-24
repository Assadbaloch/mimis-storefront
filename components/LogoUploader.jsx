'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Single-image logo control for /admin/settings. Mirrors AdminItemEditor's
// upload mechanics (same bucket, same upsert/cacheControl options) but writes
// the resulting public URL to the mimis.storefront_settings singleton row
// instead of menu_item_media, since there's exactly one logo for the whole site.
export default function LogoUploader({ initialLogoUrl }) {
  const supabase = getSupabasePublicClient();
  const dropInputRef = useRef(null);

  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || '');
  const [dropActive, setDropActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  async function saveLogoUrl(url) {
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('storefront_settings')
      .update({ logo_url: url || null, updated_at: new Date().toISOString() })
      .eq('id', 1);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setLogoUrl(url || '');
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  async function uploadLogo(fileList) {
    const file = Array.from(fileList || []).find((f) => f.type.startsWith('image/'));
    if (!file) return;

    setError('');
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `site/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('mimis-menu-images')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('mimis-menu-images').getPublicUrl(path);
    setUploading(false);
    await saveLogoUrl(publicUrlData.publicUrl);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDropActive(false);
    uploadLogo(e.dataTransfer.files);
  }

  return (
    <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-5">
      <h2 className="font-serif font-bold text-lg text-cream mb-1">Site Logo</h2>
      <p className="text-cream/55 text-xs mb-4">
        Shown in the header next to the navigation. Falls back to the &ldquo;Mimi&rsquo;s&rdquo; text wordmark when no logo is set.
      </p>

      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-black/30 border border-cream/10 flex items-center justify-center">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo preview" fill className="object-contain p-2" sizes="80px" />
          ) : (
            <span className="font-serif italic text-gold text-xl">Mimi&rsquo;s</span>
          )}
        </div>

        <div className="flex-1">
          <div
            onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDrop}
            onClick={() => dropInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed text-center py-4 px-4 cursor-pointer transition-colors ${
              dropActive ? 'border-gold bg-gold/10' : 'border-cream/20 hover:border-cream/35'
            }`}
          >
            <p className="text-cream/60 text-xs">
              {uploading ? 'Uploading…' : 'Drag & drop a logo image here, or click to browse'}
            </p>
            <p className="text-cream/30 text-[10px] mt-1">PNG with a transparent background recommended</p>
            <input
              ref={dropInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadLogo(e.target.files)}
            />
          </div>
          {logoUrl && (
            <button
              type="button"
              onClick={() => saveLogoUrl('')}
              disabled={saving}
              className="text-brick/80 hover:text-brick text-[11px] font-bold uppercase tracking-wide mt-2 disabled:opacity-50"
            >
              Remove logo
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 min-h-[16px]">
        {error && <p className="text-brick text-xs">{error}</p>}
        {savedAt && <p className="text-gold text-xs ml-auto">Saved ✓</p>}
      </div>
    </div>
  );
}
