import React from 'react';
import HeroSection from './components/HeroSection.jsx';
import SoundPerformance from './components/SoundPerformance.jsx';
import SpecsTicker from './components/SpecsTicker.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <HeroSection />
      <SpecsTicker />
      <SoundPerformance />
      <Footer />
    </div>
  );
}
