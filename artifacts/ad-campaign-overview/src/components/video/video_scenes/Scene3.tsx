import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSceneTimer } from '@/lib/video';

const EASE = [0.22, 1, 0.36, 1] as const;
const CHANNELS = [
  { name: 'FACEBOOK', spend: '$3,730', actions: '107', height: 66, color: '#c84b37' },
  { name: 'INSTAGRAM', spend: '$2,830', actions: '90', height: 50, color: '#b66a70' },
  { name: 'PINTEREST', spend: '$2,950', actions: '59', height: 53, color: '#b24940' },
  { name: 'TWITTER / X', spend: '$1,130', actions: '45', height: 29, color: '#648980' },
];

export function Scene3() {
  const [stage, setStage] = useState(0);
  useSceneTimer([
    { time: 1030, callback: () => setStage(1) },
    { time: 1960, callback: () => setStage(2) },
    { time: 2450, callback: () => setStage(3) },
    { time: 3700, callback: () => setStage(4) },
    { time: 4260, callback: () => setStage(5) },
  ]);
  return (
    <motion.section
      className="absolute inset-0 overflow-hidden"
      style={{ background: '#e9e2d5', color: '#182522' }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: .94, transition: { duration: .22 } }}
      transition={{ duration: .52, ease: EASE }}
    >
      <div className="absolute left-[6.3%] top-[8%] mono text-[1.55vmin] tracking-[.22em] text-[#7c857b]">CHANNELS <span className="ml-[1vmin] text-[#c84b37]">/ COMPARISON</span></div>
      <motion.h2 className="absolute left-[6.2%] top-[14%] m-0 display text-[7.5vmin] font-semibold leading-[.92] tracking-[-.07em]"
        initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
        animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
        transition={{ duration: .66, delay: .17, ease: EASE }}>Spend with context.</motion.h2>
      <div className="absolute bottom-[20%] left-[9%] right-[9%] h-[.22vmin] bg-[#9fa399]" />
      <div className="absolute bottom-[20%] left-[9%] right-[9%] flex h-[49%] items-end justify-around gap-[3.5%]">
        {CHANNELS.map((channel, i) => {
          const selected = stage >= 2 && i === 0;
          const dimmed = stage >= 2 && i !== 0;
          return (
            <div key={channel.name} className="relative flex h-full flex-1 flex-col items-center justify-end">
              <motion.div
                className="relative mb-[1.5vmin] flex w-[75%] flex-col justify-between overflow-hidden px-[1.4vmin] py-[1.5vmin]"
                style={{ background: channel.color, height: `${stage >= 1 ? channel.height : 0}%`, transformOrigin: 'bottom' }}
                animate={{ scale: selected ? 1.08 : dimmed ? .87 : 1, opacity: dimmed ? .52 : 1, height: `${stage >= 1 ? channel.height : 0}%` }}
                transition={{ duration: .56, delay: i * .09, ease: EASE }}
              >
                <motion.span className="mono text-[1.55vmin] text-[#f8f1e4]/75" initial={{ opacity: 0 }} animate={{ opacity: stage >= 1 ? 1 : 0 }} transition={{ delay: .45 + i * .08 }}>SPEND</motion.span>
                <motion.span className="display text-[2.8vmin] font-semibold tracking-[-.07em] text-[#fff8ea]"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: stage >= 1 ? 1 : 0, y: 0 }} transition={{ delay: .55 + i * .08, duration: .35 }}>{channel.spend}</motion.span>
              </motion.div>
              <motion.div className="mono whitespace-nowrap text-[1.65vmin] font-medium tracking-[.06em]"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: stage >= 1 ? 1 : 0, y: 0 }} transition={{ delay: .62 + i * .1, duration: .35 }}>{channel.name}</motion.div>
              <motion.div className="absolute -bottom-[8.2vmin] mono text-[1.5vmin] text-[#67736b]"
                initial={{ opacity: 0 }} animate={{ opacity: selected ? 1 : 0 }} transition={{ duration: .3 }}>{channel.actions} actions</motion.div>
            </div>
          );
        })}
      </div>
      <motion.div className="absolute left-[6.4%] bottom-[7.7%] flex items-center gap-[1.2vmin]"
        initial={{ opacity: 0, x: -10 }} animate={{ opacity: stage >= 3 ? 1 : 0, x: stage >= 3 ? 0 : -10 }}
        transition={{ duration: .35, ease: EASE }}>
        <span className="h-[.75vmin] w-[.75vmin] rounded-full bg-[#c84b37]" />
        <span className="mono text-[1.55vmin] tracking-[.1em] text-[#505d55]">FACEBOOK</span>
        <span className="mono ml-[2vmin] text-[1.55vmin] text-[#7c857b]">$3,730 SPEND</span>
        <span className="mono ml-[1.4vmin] text-[1.55vmin] text-[#7c857b]">107 ACTIONS</span>
      </motion.div>
      <motion.div className="absolute right-[6.4%] bottom-[7.7%] display text-[2.35vmin] font-medium tracking-[-.025em]"
        initial={{ opacity: 0, x: 12 }} animate={{ opacity: stage >= 4 ? 1 : 0, x: stage >= 4 ? 0 : 12 }} transition={{ duration: .38, ease: EASE }}>
        One view. Four platforms.
      </motion.div>
      <motion.div className="absolute inset-0 z-20 bg-[#c84b37]"
        initial={{ clipPath: 'circle(0% at 18% 64%)' }}
        animate={{ clipPath: stage >= 5 ? 'circle(150% at 18% 64%)' : 'circle(0% at 18% 64%)' }}
        transition={{ duration: .4, ease: [0.12, .9, .25, 1] }} />
    </motion.section>
  );
}
