import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSceneTimer } from '@/lib/video';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Scene2() {
  const [readout, setReadout] = useState(0);
  useSceneTimer([
    { time: 1050, callback: () => setReadout(1) },
    { time: 2050, callback: () => setReadout(2) },
    { time: 2700, callback: () => setReadout(3) },
    { time: 3970, callback: () => setReadout(4) },
  ]);
  return (
    <motion.section
      className="ink-grain absolute inset-0 overflow-hidden"
      style={{ background: '#172522', color: '#f3eee3' }}
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04, transition: { duration: .22 } }}
      transition={{ duration: .56, ease: EASE }}
    >
      <div className="absolute inset-x-0 top-[17%] border-t border-[#f3eee3]/15" />
      <div className="absolute left-[7%] top-[9%] mono text-[1.6vmin] tracking-[.2em] text-[#c9c8b9]/60">
        PERFORMANCE / TREND <span className="ml-[2vmin] text-[#d2a953]">APR 01—15</span>
      </div>
      <div className="absolute left-[7%] top-[23%] flex gap-[5vmin]">
        <div>
          <p className="mono m-0 text-[1.55vmin] tracking-[.15em] text-[#c9c8b9]/55">SPEND</p>
          <motion.p key={readout >= 1 ? 'spend' : 'wait'} className="display mt-[.7vmin] text-[5.2vmin] font-medium tracking-[-.07em]"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: readout >= 1 ? 1 : 0, y: 0 }} transition={{ duration: .38, ease: EASE }}>$10.6k</motion.p>
        </div>
        <div className="mt-[.4vmin] h-[5.5vmin] w-px bg-[#f3eee3]/15" />
        <div>
          <p className="mono m-0 text-[1.55vmin] tracking-[.15em] text-[#c9c8b9]/55">CONVERSIONS</p>
          <motion.p key={readout >= 2 ? 'actions' : 'wait'} className="display mt-[.7vmin] text-[5.2vmin] font-medium tracking-[-.07em]"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: readout >= 2 ? 1 : 0, y: 0 }} transition={{ duration: .38, ease: EASE }}>301</motion.p>
        </div>
      </div>
      <svg className="absolute left-[7%] top-[38%] h-[38%] w-[87%] overflow-visible" viewBox="0 0 1120 350" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d2a953" stopOpacity=".25" />
            <stop offset="100%" stopColor="#d2a953" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[70, 150, 230, 310].map((y) => <line key={y} x1="0" x2="1120" y1={y} y2={y} stroke="#f3eee3" strokeOpacity=".12" />)}
        <motion.path d="M0 284 C80 260 92 222 180 238 S280 223 350 208 S455 226 518 168 S615 173 682 142 S765 159 832 90 S933 126 1001 73 S1068 67 1120 28 L1120 350 L0 350Z"
          fill="url(#trend-fill)" initial={{ opacity: 0 }} animate={{ opacity: readout >= 1 ? 1 : 0 }} transition={{ duration: .5, delay: .6 }} />
        <motion.path d="M0 284 C80 260 92 222 180 238 S280 223 350 208 S455 226 518 168 S615 173 682 142 S765 159 832 90 S933 126 1001 73 S1068 67 1120 28"
          fill="none" stroke="#d2a953" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: readout >= 1 ? 1 : 0 }}
          transition={{ duration: 1.6, delay: .15, ease: [0.42, 0, .25, 1] }} />
        {[[0,284],[180,238],[350,208],[518,168],[682,142],[832,90],[1001,73],[1120,28]].map(([x,y], i) =>
          <motion.circle key={i} cx={x} cy={y} r={i === 7 ? 8 : 5} fill={i === 7 ? '#c84b37' : '#f3eee3'}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: readout >= 2 ? 1 : 0, opacity: readout >= 2 ? 1 : 0 }}
            transition={{ delay: .45 + i * .09, type: 'spring', stiffness: 330, damping: 19 }} />)}
      </svg>
      <motion.p className="absolute bottom-[11%] left-[7%] display max-w-[63%] text-[3.3vmin] font-medium tracking-[-.045em]"
        initial={{ opacity: 0, x: -24 }} animate={{ opacity: readout >= 3 ? 1 : 0, x: readout >= 3 ? 0 : -24 }}
        transition={{ duration: .48, ease: EASE }}>The pattern, not just the total.</motion.p>
      <motion.div className="absolute right-[6.7%] top-[26%] h-[47%] w-[.55vmin] origin-top bg-[#c84b37]"
        initial={{ scaleY: 0 }} animate={{ scaleY: readout >= 4 ? 1 : 0 }} transition={{ duration: .52, ease: EASE }} />
      <motion.div className="absolute right-[5.9%] top-[70%] h-[2.1vmin] w-[2.1vmin] rounded-full bg-[#c84b37]"
        initial={{ scale: 0 }} animate={{ scale: readout >= 4 ? 1 : 0 }} transition={{ delay: .17, type: 'spring', stiffness: 300, damping: 17 }} />
      <div className="absolute bottom-[5.9%] right-[6.3%] mono text-[1.45vmin] tracking-[.12em] text-[#c9c8b9]/50">DAILY RESULTS / NORMALIZED</div>
    </motion.section>
  );
}
