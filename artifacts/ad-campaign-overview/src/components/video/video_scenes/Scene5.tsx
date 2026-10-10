import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useSceneTimer } from '@/lib/video';

const EASE = [0.22, 1, 0.36, 1] as const;
const WORDS = ['Spend.', 'Outcomes.', 'Clarity.'];

export function Scene5() {
  const [phase, setPhase] = useState(0);
  useSceneTimer([
    { time: 180, callback: () => setPhase(1) },
    { time: 620, callback: () => setPhase(2) },
    { time: 1060, callback: () => setPhase(3) },
    { time: 1520, callback: () => setPhase(4) },
    { time: 1600, callback: () => setPhase(5) },
    { time: 2420, callback: () => setPhase(6) },
    { time: 2980, callback: () => setPhase(7) },
    { time: 4020, callback: () => setPhase(8) },
  ]);
  const burstIndex = phase <= 1 ? 0 : phase <= 2 ? 1 : 2;
  const showingBurst = phase < 4;
  return (
    <motion.section
      className="absolute inset-0 overflow-hidden"
      style={{ background: '#c84b37', color: '#f3eee3' }}
      initial={{ opacity: 0, clipPath: 'circle(0% at 93% 12%)' }}
      animate={{ opacity: 1, clipPath: phase >= 8 ? 'circle(0% at 93% 12%)' : 'circle(150% at 93% 12%)' }}
      exit={{ opacity: 0, transition: { duration: .18 } }}
      transition={{ duration: phase >= 8 ? .44 : .62, ease: EASE }}
    >
      <div className="absolute inset-0 opacity-[.12]" aria-hidden="true">
        <div className="absolute left-[-12%] top-[17%] h-[.2vmin] w-[128%] rotate-[-13deg] bg-[#f3eee3]" />
        <div className="absolute left-[-8%] top-[80%] h-[.2vmin] w-[125%] rotate-[-13deg] bg-[#f3eee3]" />
      </div>
      <AnimatePresence mode="sync">
        {showingBurst && (
          <motion.div key={burstIndex} className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 1.22, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: .72, opacity: 0, y: -12, transition: { duration: .16 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 23 }}>
            <span className="display whitespace-nowrap text-[29vmin] font-semibold leading-[.82] tracking-[-.085em]">{WORDS[burstIndex]}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div className="absolute left-1/2 top-1/2 flex h-[9vmin] w-[9vmin] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        initial={{ scale: 0, rotate: -25 }} animate={{
          scale: phase >= 8 ? .14 : phase >= 5 ? .32 : phase >= 4 ? 1 : 0,
          rotate: phase >= 7 ? 90 : phase >= 4 ? 0 : -25,
          x: phase >= 8 ? '43vw' : phase >= 5 ? '37vw' : 0,
          y: phase >= 8 ? '-38vh' : phase >= 5 ? '-32vh' : 0,
        }}
        transition={{ type: phase >= 8 ? 'tween' : 'spring', stiffness: 250, damping: 20, duration: phase >= 8 ? .4 : undefined, ease: EASE }}>
        <motion.svg viewBox="0 0 100 100" className="h-full w-full" animate={{ rotate: phase >= 7 ? 90 : 0 }} transition={{ duration: .72, ease: EASE }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3eee3" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="15" fill="#f3eee3" />
          <path d="M50 10V34M90 50H66M50 90V66M10 50H34" stroke="#f3eee3" strokeWidth="3" />
        </motion.svg>
      </motion.div>
      <motion.h1 className="absolute left-[10%] right-[10%] top-[33%] m-0 display text-center text-[9.5vmin] font-semibold leading-[.95] tracking-[-.07em]"
        initial={{ opacity: 0, scale: .92, y: 18 }}
        animate={{ opacity: phase >= 5 ? 1 : 0, scale: phase >= 5 ? 1 : .92, y: phase >= 5 ? 0 : 18 }}
        transition={{ duration: .48, ease: EASE }}>Know what your<br />spend is doing.</motion.h1>
      <motion.div className="absolute left-1/2 top-[68%] -translate-x-1/2 mono text-[2.1vmin] tracking-[.19em] text-[#f3eee3]/85"
        initial={{ opacity: 0, letterSpacing: '.32em' }} animate={{ opacity: phase >= 6 ? 1 : 0, letterSpacing: phase >= 6 ? '.19em' : '.32em' }}
        transition={{ duration: .5, ease: EASE }}>AD CAMPAIGN ANALYZER</motion.div>
      <motion.p className="absolute bottom-[10%] left-0 right-0 m-0 text-center display text-[2.6vmin] tracking-[-.02em] text-[#f3eee3]/80"
        initial={{ opacity: 0 }} animate={{ opacity: phase >= 7 ? 1 : 0 }} transition={{ duration: .36 }}>One file. One clear view.</motion.p>
    </motion.section>
  );
}
