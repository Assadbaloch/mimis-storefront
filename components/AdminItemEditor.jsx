'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice, displayName } from '@/lib/format';

export default function AdminItemEditor({ item }) {
  const supabase = getSupabasePublicClient();
  const fileInputRef = useRef(null);
  const [fields, setFields] = useState({
    description_override: item.description_override || '',
    featured: item.featured,
    badge_text: item.badge_text || '',
    sort_order: item.sort_order ?? 0,
    image_url: item.image_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  function set(field, value) {
    setFields((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('menu_items')
      .update({
        description_override: fields.description_override || null,
        featured: fields.featured,
        badge_text: fields.badge_text || null,
        sort_order: Number(fields.sort_order) || 0,
        image_url: fields.image_url || null,
      })
      .eq('id', item.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop();
    const path = `${item.clover_item_id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('mimis-menu-images')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('mimis-menu-images').getPublicUrl(path);
    set('image_url', publicUrlData.publicUrl);
    setUploading(false);
  }

  return (
    <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-4 flex gap-4">
      <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-black/30">
        {fields.image_url ? (
          <Image src={fields.image_url} alt={item.name} fill className="object-cover" sizes="96px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-cream/25 text-[10px] text-center px-1">No photo</div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 inset-x-0 bg-ink/80 text-gold text-[10px] font-bold uppercase tracking-wide py-1"
        >
          {uploading ? '…' : 'Edit Photo'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-serif font-semibold text-cream text-sm">{displayName(item.name)}</p>
            <p className="text-cream/40 text-xs">{formatPrice(item.price_cents)} &middot; price/name set by Clover</p>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-cream/70 shrink-0">
            <input type="checkbox" checked={fields.featured} onChange={(e) => set('featured', e.target.checked)} />
            Featured
          </label>
        </div>

        <textarea
          placeholder="Custom description for the storefront (optional)"
          value={fields.description_override}
          onChange={(e) => set('description_override', e.target.value)}
          className="input w-full mt-2 !text-xs"
          rows={2}
        />

        <div className="flex gap-2 mt-2">
          <input
            placeholder="Badge, e.g. HOT"
            value={fields.badge_text}
            onChange={(e) => set('badge_text', e.target.value)}
            className="input flex-1 !text-xs"
          />
          <input
            type="number"
            placeholder="Sort"
            value={fields.sort_order}
            onChange={(e) => set('sort_order', e.target.value)}
            className="input w-20 !text-xs"
          />
          <button onClick={handleSave} disabled={saving} className="btn-primary !px-4 !py-2 !text-[11px] disabled:opacity-50">
            {saving ? 'Saving…' : savedAt ? 'Saved ✓' : 'Save'}
          </button>
        </div>
        {error && <p className="text-brick text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
}
