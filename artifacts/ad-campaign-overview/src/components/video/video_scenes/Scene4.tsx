import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSceneTimer } from '@/lib/video';

const EASE = [0.22, 1, 0.36, 1] as const;
const ROWS = [
  ['SPRING PROSPECTING', 'FACEBOOK', '$1,250', '980', '46', '$4,380'],
  ['SPRING REELS', 'INSTAGRAM', '$940', '1,120', '38', '$3,420'],
  ['HOME STYLING PINS', 'PINTEREST', '$680', '840', '12', '$1,250'],
];

export function Scene4() {
  const [stage, setStage] = useState(0);
  useSceneTimer([
    { time: 620, callback: () => setStage(1) },
    { time: 1300, callback: () => setStage(2) },
    { time: 2050, callback: () => setStage(3) },
    { time: 3050, callback: () => setStage(4) },
    { time: 4050, callback: () => setStage(5) },
    { time: 4920, callback: () => setStage(6) },
  ]);
  return (
    <motion.section
      className="scene-grain absolute inset-0 overflow-hidden"
      style={{ background: '#f3eee3', color: '#182522' }}
      initial={{ opacity: 0, scale: .96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -20, transition: { duration: .23 } }}
      transition={{ duration: .52, ease: EASE }}
    >
      <motion.div className="absolute left-[6.4%] top-[8.5%] mono text-[1.55vmin] tracking-[.2em] text-[#7a857c]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .2, duration: .3 }}>SOURCE RECORDS <span className="ml-[1vmin] text-[#c84b37]">/ CAMPAIGN DETAILS</span></motion.div>
      <div className="absolute left-[6.3%] right-[6.3%] top-[22%]">
        <div className="grid grid-cols-[2.2fr_1.2fr_.8fr_.7fr_.7fr_1fr] items-center border-b border-[#c9c5b8] pb-[1.8vmin] mono text-[1.3vmin] tracking-[.12em] text-[#879087]">
          {['CAMPAIGN', 'CHANNEL', 'SPEND', 'CLICKS', 'ACTIONS', 'REVENUE'].map((h) => <span key={h} className="pl-[1vmin]">{h}</span>)}
        </div>
        {ROWS.map((row, i) => (
          <motion.div key={row[0]} className="relative grid grid-cols-[2.2fr_1.2fr_.8fr_.7fr_.7fr_1fr] items-center border-b border-[#d9d4c7] py-[3.15vmin] display text-[2.05vmin] font-medium tracking-[-.025em]"
            initial={{ opacity: 0, x: i % 2 ? 24 : -24, y: 8 }}
            animate={{ opacity: stage >= 1 ? 1 : 0, x: stage >= 1 ? 0 : (i % 2 ? 24 : -24), y: stage >= 1 ? 0 : 8 }}
            transition={{ delay: i * .12, duration: .5, ease: EASE }}>
            {row.map((cell, j) => <span key={`${i}-${j}`} className={`relative z-10 pl-[1vmin] ${j === 1 ? 'mono text-[1.5vmin] text-[#778278]' : ''} ${j === 5 ? 'text-[#4d7568]' : ''}`}>{cell}</span>)}
            <motion.div className="absolute bottom-0 left-0 top-0 bg-[#d2a953]/20"
              initial={{ scaleX: 0 }} animate={{ scaleX: stage >= 2 ? 1 : 0 }} style={{ transformOrigin: 'left', width: `${[68,52,42][i]}%` }}
              transition={{ delay: .12 + i * .14, duration: .7, ease: EASE }} />
          </motion.div>
        ))}
      </div>
      <motion.div className="absolute right-[7%] top-[17%] h-[38%] w-[.5vmin] bg-[#c84b37]"
        initial={{ scaleY: 0, transformOrigin: 'top' }} animate={{ scaleY: stage >= 3 ? 1 : 0 }} transition={{ duration: .45, ease: EASE }} />
      <motion.div className="absolute bottom-[16%] left-[6.5%] display text-[3.2vmin] font-medium tracking-[-.04em]"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: stage >= 3 ? 1 : 0, y: stage >= 3 ? 0 : 14 }} transition={{ duration: .42, ease: EASE }}>
        Filters apply everywhere.
      </motion.div>
      <motion.div className="absolute bottom-[10.5%] left-[6.5%] mono text-[1.65vmin] tracking-[.02em] text-[#6e7970]"
        initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
        animate={{ opacity: stage >= 4 ? 1 : 0, clipPath: stage >= 4 ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
        transition={{ duration: .62, ease: EASE }}>SPEND <b className="font-normal text-[#c84b37]">→</b> CLICKS <b className="font-normal text-[#c84b37]">→</b> CONVERSIONS <b className="font-normal text-[#c84b37]">→</b> REVENUE</motion.div>
      <motion.div className="absolute bottom-[5.1%] right-[6.5%] mono text-[1.45vmin] text-[#8a9188]"
        initial={{ opacity: 0 }} animate={{ opacity: stage >= 5 ? 1 : 0 }} transition={{ duration: .4 }}>BUILT FROM THE ROWS YOU BRING</motion.div>
      <motion.div className="absolute left-[6.4%] bottom-[8.1%] h-[.36vmin] bg-[#c84b37]"
        initial={{ width: '0%' }} animate={{ width: stage >= 6 ? '82%' : '0%' }} transition={{ duration: .58, ease: EASE }} />
      <motion.div className="absolute right-[7%] top-[44%] h-[5vmin] w-[5vmin] border border-[#c84b37]/35"
        initial={{ scale: 0, rotate: 0 }} animate={{ scale: stage >= 3 ? 1 : 0, rotate: stage >= 3 ? 45 : 0 }} transition={{ duration: .6, ease: EASE }} />
    </motion.section>
  );
}
