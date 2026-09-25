'use client';
import { useEffect, useState } from 'react';
import './OrderTypePicker.css';

// Pickup / Delivery choice on /checkout. Owner decision 2026-09-25: the two
// plain buttons looked identical and pickup was pre-selected, so customers who
// wanted delivery ordered pickup by mistake. Now: two picture cards (pickup
// blue, delivery red), nothing chosen until the customer taps one.
//
// Cost: pictures are inline SVG (no image files, no library); the only image
// is the store logo, taken from the header that has already loaded it, so it
// is never downloaded twice. If there is no logo, a text sign is drawn instead.
// Motion is CSS only and runs once per tap; reduced-motion users get none.

const SUB = {
  pickup: ["I'll collect it", 'Ready in about 20 min'],
  delivery: ['Bring it to my door', 'Fee shown next'],
};

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function ShopArt({ logo, onLogoError }) {
  return (
    <svg viewBox="0 0 200 96" aria-hidden="true">
    <defs>
    <linearGradient id="pk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--sky2)' }}/><stop offset="1" style={{ stopColor: 'var(--sky)' }}/></linearGradient>
    <linearGradient id="pk-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD978" stopOpacity=".75"/><stop offset="1" stopColor="#FFD978" stopOpacity="0"/></linearGradient>
    <clipPath id="pk-clip"><rect x="47.5" y="55.5" width="43" height="19"/></clipPath>
    </defs>
    <rect width="200" height="96" fill="url(#pk-sky)"/>
    <path d="M0 82V62h12v-7h10v12h8V58h7v24zM150 82V60h9v-6h12v10h9v-8h11v26z" fill="#1D2021" opacity=".06"/>
    <rect y="82" width="200" height="14" className="mx-ground"/>
    <path d="M0 82h200" stroke="#1D2021" strokeOpacity=".22"/>
    <path d="M14 82v14M58 82v14M102 82v14M146 82v14M190 82v14" stroke="#1D2021" strokeOpacity=".08"/>
    <path className="pk-spill" d="M102 82h26l14 14H88z" fill="url(#pk-glow)"/>
    <ellipse cx="90" cy="82.6" rx="58" ry="2" fill="#1D2021" opacity=".14"/>
    <rect x="40" y="19" width="100" height="63" fill="#FFF9EC" stroke="#1D2021" strokeWidth="1.8"/>
    <rect x="37" y="14" width="106" height="6" rx="1" fill="#E4D3B2" stroke="#1D2021" strokeWidth="1.8"/>
    {logo ? <image className="mx-logo" href={logo} x="71" y="16" width="38" height="23" onError={onLogoError} /> : <g><rect x="62" y="23" width="56" height="11" rx="2" fill="#1D2021"/><text x="90" y="31.3" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="700" fontSize="8.2" letterSpacing=".6" fill="#E0AE00">MIMI&apos;S</text></g>}
    <path d="M34 48h112l-7-11H41z" fill="#C8102E" stroke="#1D2021" strokeWidth="1.8" strokeLinejoin="round"/>
    <g fill="#fff"><path d="M52 37h9l-2 11h-9z"/><path d="M74 37h9l-1 11h-9z"/><path d="M96 37h9l1 11h-9z"/><path d="M118 37h9l3 11h-9z"/></g>
    <path d="M34 48q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0q4 5 8 0" fill="#C8102E" stroke="#1D2021" strokeWidth="1.8" strokeLinejoin="round"/>
    <rect x="41" y="52" width="98" height="3.5" fill="#1D2021" opacity=".07"/>
    <rect x="45" y="53" width="48" height="24" rx="2" fill="#1D2021"/>
    <rect className="mx-win" x="47.5" y="55.5" width="43" height="19" fill="#CFE0F3"/>
    <g clipPath="url(#pk-clip)">
      <path d="M52 74l10-19M58 74l7-13" stroke="#fff" strokeWidth="2.2" opacity=".35"/>
      <path d="M47.5 69.5h43" stroke="#1D2021" strokeWidth="1.2" opacity=".45"/>
      <g className="pk-open"><rect x="74" y="58" width="13" height="6.5" rx="1.6" fill="none" strokeWidth="1"/><text x="80.5" y="63.1" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="4.6">OPEN</text></g>
      <g className="mx-box"><rect x="55" y="64.6" width="19" height="4.9" rx="1" fill="#FFF9EC" stroke="#1D2021" strokeWidth="1.2"/><path d="M55 66.4h19" stroke="#1D2021" strokeWidth=".8" opacity=".55"/><circle cx="64.5" cy="68" r="1" fill="#C8102E"/></g>
    </g>
    <rect x="40" y="77" width="62" height="5" fill="#B85C45" stroke="#1D2021" strokeWidth="1.5"/>
    <rect x="128" y="77" width="12" height="5" fill="#B85C45" stroke="#1D2021" strokeWidth="1.5"/>
    <path d="M50 77v5M62 77v5M74 77v5M86 77v5M98 77v5M134 77v5" stroke="#F0CDBE" strokeWidth=".8" opacity=".7"/>
    <rect className="pk-in" x="102" y="54" width="26" height="28" fill="#4A3524"/>
    <g className="mx-door"><rect x="102" y="54" width="26" height="28" fill="#174A91" stroke="#1D2021" strokeWidth="1.8"/><rect x="106.5" y="58" width="17" height="10" rx="1" fill="#CFE0F3" stroke="#1D2021" strokeWidth="1.2"/><rect x="106.5" y="71" width="17" height="2" rx="1" fill="#E0AE00"/></g>
    <rect x="102" y="54" width="26" height="28" fill="none" stroke="#1D2021" strokeWidth="1.8"/>
    <path d="M21 82l5-15h5l5 15" fill="#2B2F31" stroke="#1D2021" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M26 72.5l2.5 6 2.5-6q-2.5-1.2-5 0z" fill="none" stroke="#F6EFDF" strokeWidth=".9" strokeLinejoin="round"/>
    <path d="M144 82l1.6-7h9.8l1.6 7z" fill="#B85C45" stroke="#1D2021" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M150.5 75c-5.5-2-7.5-8-3.5-12.5 1.6 3.5 3 7.5 3.5 12.5z" fill="#5F8F4E" stroke="#1D2021" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M150.5 75c4.5-2.5 6.5-8 2.5-12.5-1.8 3.8-2.6 8-2.5 12.5z" fill="#86B46E" stroke="#1D2021" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function HomeArt({ logo, onLogoError }) {
  return (
    <svg viewBox="0 0 200 96" aria-hidden="true">
    <defs>
    <linearGradient id="dv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--sky2)' }}/><stop offset="1" style={{ stopColor: 'var(--sky)' }}/></linearGradient>
    <linearGradient id="dv-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFE39A" stopOpacity=".85"/><stop offset="1" stopColor="#FFE39A" stopOpacity="0"/></linearGradient>
    </defs>
    <rect width="200" height="96" fill="url(#dv-sky)"/>
    <path d="M0 82c0-9 6-13 11-10 2-7 12-7 13 1 5-2 9 3 7 9zM86 82c1-7 7-9 11-6 3-6 11-5 12 2 4-1 7 2 6 4z" fill="#1D2021" opacity=".06"/>
    <rect y="82" width="200" height="14" className="mx-road"/>
    <path d="M0 82h200" stroke="#1D2021" strokeOpacity=".22"/>
    <path d="M6 90h12M30 90h12M54 90h12M78 90h12M102 90h12" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round"/>
    <rect x="112" y="78.5" width="88" height="3.5" fill="#7FAE66"/>
    <ellipse cx="155" cy="82.6" rx="34" ry="1.8" fill="#1D2021" opacity=".14"/>
    <rect x="168" y="25" width="7" height="14" fill="#B85C45" stroke="#1D2021" strokeWidth="1.5"/>
    <rect x="166.5" y="22.5" width="10" height="3" rx=".8" fill="#8E4535" stroke="#1D2021" strokeWidth="1.3"/>
    <path d="M119 48L155 20l36 28z" fill="#174A91" stroke="#1D2021" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M125 44h60M132 38.5h46M139 33h32" stroke="#fff" strokeOpacity=".2" strokeWidth="1.2"/>
    <rect x="127" y="46" width="56" height="36" fill="#FFF9EC" stroke="#1D2021" strokeWidth="1.8"/>
    <rect x="127" y="46" width="56" height="3" fill="#1D2021" opacity=".08"/>
    <circle className="mx-win" cx="155" cy="37" r="3.6" fill="#CFE0F3" stroke="#1D2021" strokeWidth="1.4"/>
    <rect x="130.5" y="53" width="2.8" height="11" fill="#C8102E" stroke="#1D2021" strokeWidth="1"/><rect x="143.7" y="53" width="2.8" height="11" fill="#C8102E" stroke="#1D2021" strokeWidth="1"/>
    <rect className="mx-win" x="133.5" y="53" width="10" height="11" rx="1" fill="#CFE0F3" stroke="#1D2021" strokeWidth="1.5"/>
    <rect x="163.5" y="53" width="2.8" height="11" fill="#C8102E" stroke="#1D2021" strokeWidth="1"/><rect x="176.7" y="53" width="2.8" height="11" fill="#C8102E" stroke="#1D2021" strokeWidth="1"/>
    <rect className="mx-win" x="166.5" y="53" width="10" height="11" rx="1" fill="#CFE0F3" stroke="#1D2021" strokeWidth="1.5"/>
    <path d="M138.5 53v11M133.5 58.5h10M171.5 53v11M166.5 58.5h10" stroke="#1D2021" strokeWidth=".9" opacity=".55"/>
    <path d="M145.5 61.5L155 55.5l9.5 6z" fill="#174A91" stroke="#1D2021" strokeWidth="1.4" strokeLinejoin="round"/>
    <rect x="149" y="62" width="12" height="20" rx="1" fill="#C99700" stroke="#1D2021" strokeWidth="1.6"/>
    <path d="M151.5 66a3.5 3.5 0 0 1 7 0z" fill="#CFE0F3" stroke="#1D2021" strokeWidth="1" className="mx-win"/>
    <circle cx="158.3" cy="73" r="1" fill="#1D2021"/>
    <circle className="dv-lampglow" cx="163.2" cy="65" r="5.5" fill="#FFD978"/>
    <circle className="dv-lamp" cx="163.2" cy="65" r="1.6" fill="#9A9486" stroke="#1D2021" strokeWidth=".8"/>
    <path d="M185 82c-4 0-5-6 0-7 1-4 7-4 8 0 4 0 5 7 0 7z" fill="#5F8F4E" stroke="#1D2021" strokeWidth="1.3" strokeLinejoin="round"/>
    <g className="mx-van">
      <path className="dv-beam" d="M77 66.5l30-7v14z" fill="url(#dv-beam)"/>
      <g className="mx-speed" stroke="#9A9486" strokeWidth="2" strokeLinecap="round"><path d="M-6 60h7"/><path d="M-8 68h9"/></g>
      <ellipse cx="42" cy="83" rx="33" ry="1.8" fill="#1D2021" opacity=".2"/>
      <path d="M36 50.5v2M47 50.5v2" stroke="#1D2021" strokeWidth="1.4"/>
      {logo ? <image className="mx-logo" href={logo} x="29" y="35.5" width="25" height="15.1" onError={onLogoError} /> : <g><rect x="29.5" y="43.5" width="24" height="7.5" rx="2" fill="#fff" stroke="#1D2021" strokeWidth="1.3"/><text x="41.5" y="49.3" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="700" fontSize="5.6" fill="#C8102E">MIMI&apos;S</text></g>}
      <path d="M8 76V68q0-4 4-4.5L20 62.5Q23 53 30 52.5H50q4 0 7 3L64 62l8 1.5q5 1 5 5.5V76z" fill="#C8102E" stroke="#1D2021" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M23.5 61.5Q26 55.2 31 54.8H38.6V61.5z" fill="#CFE0F3" stroke="#1D2021" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M41 54.8H49.5q3.4 0 5.8 2.3L60 61.5H41z" fill="#CFE0F3" stroke="#1D2021" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M26.5 60l3.5-4M44.5 60l3.5-4" stroke="#fff" strokeWidth="1.1" opacity=".6"/>
      <path d="M10 69.5h64.5" stroke="#E0AE00" strokeWidth="2"/>
      <path d="M39.8 62v13.5" stroke="#1D2021" strokeWidth="1" opacity=".45"/>
      <rect x="42.5" y="64.3" width="4" height="1.3" rx=".6" fill="#1D2021" opacity=".55"/>
      <path d="M58.5 60h3v2.6h-3z" fill="#A80D27" stroke="#1D2021" strokeWidth=".9"/>
      <ellipse cx="75.3" cy="66.6" rx="1.6" ry="1.3" fill="#FFE39A" stroke="#1D2021" strokeWidth=".9"/>
      <rect x="8.3" y="64.8" width="2" height="3.4" rx=".5" fill="#FF6B6B"/>
      <rect x="6" y="72.5" width="5" height="3.8" rx="1" fill="#3B3F41"/>
      <rect x="73.5" y="72.2" width="5.5" height="4" rx="1" fill="#3B3F41"/>
      <path d="M12.3 76a8.7 8.7 0 0 1 17.4 0zM54.3 76a8.7 8.7 0 0 1 17.4 0z" fill="#1D2021"/>
      <g className="mx-wheel"><circle cx="21" cy="77.5" r="6.2" fill="#1D2021"/><circle cx="21" cy="77.5" r="3.1" fill="#D9D2C3"/><path d="M21 74.4v6.2M17.9 77.5h6.2" stroke="#1D2021" strokeWidth="1"/></g>
      <g className="mx-wheel"><circle cx="63" cy="77.5" r="6.2" fill="#1D2021"/><circle cx="63" cy="77.5" r="3.1" fill="#D9D2C3"/><path d="M63 74.4v6.2M59.9 77.5h6.2" stroke="#1D2021" strokeWidth="1"/></g>
    </g>
    </svg>
  );
}

export default function OrderTypePicker({ value, onChange }) {
  const [logo, setLogo] = useState(null);

  // Reuse the logo the site header already shows (already downloaded).
  useEffect(() => {
    const img = document.querySelector('header img[alt*="imi" i]');
    const src = img && (img.currentSrc || img.src);
    if (src) setLogo(src);
  }, []);
  const onLogoError = () => setLogo(null);

  const tile = (m, title, Art) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === m}
      data-m={m}
      className={`mx-tile${value === m ? ' on' : ''}`}
      onClick={() => onChange(m)}
    >
      <span className="mx-art"><Art logo={logo} onLogoError={onLogoError} /></span>
      <span className="mx-meta">
        <span className="mx-t">{title}</span>
        <span className="mx-s">{SUB[m][value === m ? 1 : 0]}</span>
      </span>
      <span className="mx-tick"><Tick /></span>
    </button>
  );

  return (
    <div className={`otp${value ? ' chosen' : ''}`}>
      <p className="mx-q" id="otp-q">How are you getting your order?</p>
      <div className="mx-tiles" role="radiogroup" aria-labelledby="otp-q">
        {tile('pickup', 'Pickup', ShopArt)}
        {tile('delivery', 'Delivery', HomeArt)}
      </div>
    </div>
  );
}
