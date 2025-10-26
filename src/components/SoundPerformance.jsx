import React, { useCallback, useEffect, useRef, useState } from 'react';

// A handcrafted 10-second engine-inspired performance using the Web Audio API.
// Layers: low engine body (saw -> lowpass), intake hiss (bandpassed noise), exhaust thump (pulse),
// and a late whoosh. Scheduled envelopes create revs from idle to redline.

const DURATION = 10.0; // seconds

export default function SoundPerformance() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const ctxRef = useRef(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const nodesRef = useRef({});

  const createNoiseBuffer = (ctx) => {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const schedulePerformance = useCallback((ctx) => {
    const now = ctx.currentTime + 0.05; // slight latency headroom
    startTimeRef.current = now;

    // Master
    const master = ctx.createGain();
    master.gain.value = 0.7; // overall loudness
    master.connect(ctx.destination);

    // Gentle compressor to glue layers
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;
    comp.connect(master);

    // Simple stereo widener using a subtle delay on R
    const merger = ctx.createChannelMerger(2);
    const splitter = ctx.createChannelSplitter(2);
    const widenDelay = ctx.createDelay(0.02);
    widenDelay.delayTime.value = 0.006;

    // Reverb-ish tail with feedback delay
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.14;
    const fb = ctx.createGain();
    fb.gain.value = 0.25;
    delay.connect(fb);
    fb.connect(delay);

    const reverbMix = ctx.createGain();
    reverbMix.gain.value = 0.18;

    // ENGINE BODY (low saw -> lowpass)
    const engine = ctx.createOscillator();
    engine.type = 'sawtooth';

    const engineLP = ctx.createBiquadFilter();
    engineLP.type = 'lowpass';
    engineLP.frequency.value = 400;
    engineLP.Q.value = 0.7;

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.5;

    engine.connect(engineLP);
    engineLP.connect(engineGain);

    // EXHAUST THUMP (pulse via square + amplitude shaping)
    const exhaust = ctx.createOscillator();
    exhaust.type = 'square';
    const exhaustHP = ctx.createBiquadFilter();
    exhaustHP.type = 'highpass';
    exhaustHP.frequency.value = 60;
    const exhaustGain = ctx.createGain();
    exhaustGain.gain.value = 0.0; // envelope controlled

    exhaust.connect(exhaustHP);
    exhaustHP.connect(exhaustGain);

    // INTAKE HISS (bandpassed noise)
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = createNoiseBuffer(ctx);
    noiseSrc.loop = true;

    const intakeBP = ctx.createBiquadFilter();
    intakeBP.type = 'bandpass';
    intakeBP.frequency.value = 1400;
    intakeBP.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.0; // envelope controlled

    noiseSrc.connect(intakeBP);
    intakeBP.connect(noiseGain);

    // WHOOSH burst (highpass noise)
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = createNoiseBuffer(ctx);
    whoosh.loop = false;

    const whooshHP = ctx.createBiquadFilter();
    whooshHP.type = 'highpass';
    whooshHP.frequency.value = 1200;

    const whooshGain = ctx.createGain();
    whooshGain.gain.value = 0.0;

    whoosh.connect(whooshHP);
    whooshHP.connect(whooshGain);

    // Routing to mix bus
    const dryBus = ctx.createGain();
    dryBus.gain.value = 1.0;

    engineGain.connect(splitter);
    exhaustGain.connect(splitter);
    noiseGain.connect(splitter);
    whooshGain.connect(splitter);

    // Split L/R, delay right, merge back
    splitter.connect(merger, 0, 0);
    splitter.connect(widenDelay, 1, 0);
    widenDelay.connect(merger, 0, 1);

    // Dry + reverb mix
    merger.connect(dryBus);
    merger.connect(delay);
    delay.connect(reverbMix);

    const mix = ctx.createGain();
    mix.gain.value = 1.0;

    dryBus.connect(mix);
    reverbMix.connect(mix);
    mix.connect(comp);

    // Envelopes and modulations over 10s
    // Engine RPM curve: 800rpm -> 6200rpm equivalent in Hz mapping
    // Use a musical mapping: 50Hz idle rising to ~170Hz peak, then lift
    const t0 = now;
    const t1 = t0 + 3.5; // ramp up
    const t2 = t1 + 3.0; // hold & flutter
    const t3 = t0 + DURATION; // final glide & cut

    engine.frequency.setValueAtTime(55, t0);
    engine.frequency.exponentialRampToValueAtTime(170, t1);
    // micro vibrato using periodic automation
    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 6.5;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 1.8; // Hz depth
    vibrato.connect(vibratoGain);
    vibratoGain.connect(engine.frequency);

    // Filter opens with RPM
    engineLP.frequency.setValueAtTime(400, t0);
    engineLP.frequency.exponentialRampToValueAtTime(2200, t1);
    engineLP.frequency.linearRampToValueAtTime(2600, t2);
    engineLP.frequency.linearRampToValueAtTime(1200, t3 - 0.3);

    // Engine gain envelope
    engineGain.gain.setValueAtTime(0.0, t0);
    engineGain.gain.linearRampToValueAtTime(0.65, t0 + 0.6);
    engineGain.gain.linearRampToValueAtTime(0.8, t1);
    engineGain.gain.linearRampToValueAtTime(0.7, t2);
    engineGain.gain.linearRampToValueAtTime(0.0, t3);

    // Exhaust pulse amplitude follows RPM (side flavor)
    exhaust.frequency.setValueAtTime(110, t0);
    exhaust.frequency.linearRampToValueAtTime(220, t1);
    exhaust.frequency.linearRampToValueAtTime(260, t2);
    exhaust.frequency.linearRampToValueAtTime(80, t3 - 0.2);

    exhaustGain.gain.setValueAtTime(0.0, t0);
    exhaustGain.gain.linearRampToValueAtTime(0.35, t0 + 0.5);
    exhaustGain.gain.linearRampToValueAtTime(0.45, t1);
    exhaustGain.gain.linearRampToValueAtTime(0.4, t2);
    exhaustGain.gain.linearRampToValueAtTime(0.0, t3);

    // Intake hiss grows with throttle
    noiseGain.gain.setValueAtTime(0.0, t0);
    noiseGain.gain.linearRampToValueAtTime(0.18, t0 + 0.7);
    noiseGain.gain.linearRampToValueAtTime(0.3, t1);
    noiseGain.gain.linearRampToValueAtTime(0.24, t2);
    noiseGain.gain.linearRampToValueAtTime(0.0, t3);

    // Whoosh at ~7.6s
    const tw = t0 + 7.6;
    whooshGain.gain.setValueAtTime(0.0, t0);
    whooshGain.gain.linearRampToValueAtTime(0.6, tw + 0.05);
    whooshGain.gain.linearRampToValueAtTime(0.0, tw + 0.6);

    // Delay/reverb gentle fade out
    reverbMix.gain.setValueAtTime(0.18, t0);
    reverbMix.gain.linearRampToValueAtTime(0.0, t3);

    // Start sources
    engine.start(t0);
    exhaust.start(t0);
    noiseSrc.start(t0);
    vibrato.start(t0);
    whoosh.start(tw);

    // Stop everything exactly at DURATION
    engine.stop(t3);
    exhaust.stop(t3);
    noiseSrc.stop(t3);
    vibrato.stop(t3);
    whoosh.stop(t0 + 9.0);

    nodesRef.current = {
      master,
      comp,
      engine,
      engineLP,
      engineGain,
      exhaust,
      exhaustGain,
      noiseSrc,
      noiseGain,
      whoosh,
      whooshGain,
      delay,
      reverbMix,
      mix,
    };
  }, []);

  const cleanupAudio = useCallback(() => {
    try {
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== 'closed') {
        ctx.close();
      }
    } catch {}
    ctxRef.current = null;
    nodesRef.current = {};
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    cancelAnimationFrame(rafRef.current);
    cleanupAudio();
  }, [cleanupAudio]);

  const play = useCallback(async () => {
    if (isPlaying) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    ctxRef.current = ctx;

    await ctx.resume();
    schedulePerformance(ctx);
    setIsPlaying(true);

    const tick = () => {
      const ctxNow = ctxRef.current?.currentTime || 0;
      const start = startTimeRef.current || 0;
      const elapsed = Math.max(0, ctxNow - start);
      const pct = Math.min(1, elapsed / DURATION);
      setProgress(pct);
      if (pct >= 1) {
        stop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, schedulePerformance, stop]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    cleanupAudio();
  }, [cleanupAudio]);

  const pctText = Math.round(progress * 100);

  return (
    <section id="sound" className="relative w-full bg-black">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">10‑Second Sound Performance</h2>
          <p className="mt-2 text-white/70 max-w-2xl">
            A cinematic engine edit: idle growl to redline surge, intake hiss, exhaust pulse, and a late whoosh — precisely 10 seconds.
          </p>

          <div className="mt-6 flex items-center gap-4">
            {!isPlaying ? (
              <button onClick={play} className="rounded-full bg-white text-black px-6 py-3 text-sm font-medium hover:bg-white/90 transition">
                Play 10s Edit
              </button>
            ) : (
              <button onClick={stop} className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium hover:bg-white/10 transition">
                Stop
              </button>
            )}
            <span className="text-sm tabular-nums text-white/70 w-16 text-left">{Math.min(10, (progress * 10).toFixed(1))}s</span>
          </div>

          <div className="mt-5 w-full max-w-xl">
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-400 transition-[width]"
                style={{ width: `${pctText}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-white/50">
              <span>0s</span>
              <span>10s</span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            <SpecCard label="Engine Body" value="Saw + Lowpass" />
            <SpecCard label="Intake" value="Bandpassed Noise" />
            <SpecCard label="Exhaust" value="Pulse + HPF" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SpecCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-sm text-white">{value}</div>
    </div>
  );
}
