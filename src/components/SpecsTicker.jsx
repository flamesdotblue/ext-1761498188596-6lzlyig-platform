import React, { useEffect, useRef } from 'react';

export default function SpecsTicker() {
  const trackRef = useRef(null);

  useEffect(() => {
    let anim;
    const el = trackRef.current;
    if (!el) return;

    const step = () => {
      el.scrollLeft += 0.6;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
        el.scrollLeft = 0;
      }
      anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    return () => cancelAnimationFrame(anim);
  }, []);

  const items = [
    'BMW Night Run',
    'Twin‑scroll turbo',
    '0‑100 km/h: quick',
    'Red interior glow',
    'Carbon fiber mood',
    'Active aero',
    'Precision steering',
    'Adaptive suspension',
  ];

  return (
    <section id="specs" className="relative w-full border-y border-white/10 bg-black/60">
      <div
        ref={trackRef}
        className="no-scrollbar flex gap-10 overflow-x-auto whitespace-nowrap py-4 px-6 text-white/70"
      >
        {[...items, ...items, ...items].map((it, i) => (
          <span key={i} className="text-sm">
            {it}
          </span>
        ))}
      </div>
    </section>
  );
}
