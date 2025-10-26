import React from 'react';
import Spline from '@splinetool/react-spline';

export default function HeroSection() {
  return (
    <section className="relative h-[90vh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <Spline
          scene="https://prod.spline.design/m8wpIQzXWhEh9Yek/scene.splinecode"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Overlays for mood without blocking Spline interactions */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 to-transparent" />

      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            BMW Night Run: 10s Edit
          </h1>
          <p className="mt-3 text-base text-white/80 sm:text-lg">
            A sleek, dark ride with glowing red pulse. Hit play below to feel the engine in a 10‑second sonic sprint.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <a href="#sound" className="rounded-full bg-white text-black px-6 py-3 text-sm font-medium hover:bg-white/90 transition">
              Play the 10s Performance
            </a>
            <a href="#specs" className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium hover:bg-white/10 transition">
              View Specs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
