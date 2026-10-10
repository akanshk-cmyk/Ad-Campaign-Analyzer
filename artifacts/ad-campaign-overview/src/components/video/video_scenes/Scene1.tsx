import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSceneTimer } from '@/lib/video';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Scene1() {
  const [stage, setStage] = useState(0);
  useSceneTimer([
    { time: 900, callback: () => setStage(1) },
    { time: 1450, callback: () => setStage(2) },
    { time: 2000, callback: () => setStage(3) },
    { time: 3200, callback: () => setStage(4) },
    { time: 4020, callback: () => setStage(5) },
  ]);
  const figures = stage < 1 ? ['—', '—', '—'] : stage < 2 ? ['$1,250', '—', '—'] : stage < 3 ? ['$1,250', '46', '—'] : ['$1,250', '46', '$4,380'];

  return (
    <motion.section
      className="scene-grain absolute inset-0 overflow-hidden"
      style={{ background: '#f3eee3', color: '#182522' }}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.07, transition: { duration: 0.24 } }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div className="absolute left-[6.2%] top-[9%] mono text-[1.65vmin] tracking-[.18em] text-[#748077]">
        CAMPAIGN RECORD <span className="ml-[1.2vmin] text-[#c84b37]">/ 01</span>
      </div>
      <motion.div
        className="absolute left-[7%] right-[6%] top-[24%] h-[48%] border-y border-[#cfc8b9]"
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 1.05, ease: EASE, delay: 0.12 }}
      >
        <div className="absolute inset-0 grid grid-cols-[1.55fr_.7fr_.7fr_.8fr] items-center">
          <div className="pl-[2.7vmin]">
            <motion.p
              className="display m-0 text-[4.5vmin] font-semibold leading-[.98] tracking-[-.055em]"
              initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: .65, delay: .33, ease: EASE }}
            >SPRING<br />PROSPECTING</motion.p>
            <motion.p className="mono mt-[1.7vmin] text-[1.75vmin] tracking-[.035em] text-[#7d837b]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .7, duration: .35 }}>
              FACEBOOK <span className="mx-[.5vmin] text-[#c84b37]">·</span> CONVERSIONS
            </motion.p>
          </div>
          {figures.map((value, i) => (
            <div key={i} className="relative flex h-full flex-col justify-center border-l border-[#d9d3c7] pl-[1.9vmin]">
              <span className="mono mb-[1.4vmin] text-[1.45vmin] tracking-[.13em] text-[#8b9086]">
                {['SPEND', 'ACTIONS', 'ATTRIBUTED'][i]}
              </span>
              <motion.span
                key={value}
                className="display whitespace-nowrap text-[4.2vmin] font-semibold tracking-[-.07em]"
                initial={{ opacity: 0, y: 18, scale: .9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: .36, ease: EASE }}
              >{value}</motion.span>
              {i === stage - 1 && stage < 4 && <motion.i className="absolute bottom-[18%] left-[1.9vmin] h-[.5vmin] w-[.5vmin] rounded-full bg-[#c84b37]" layoutId="signal-dot" />}
            </div>
          ))}
        </div>
        <motion.div
          className="absolute inset-y-0 w-[13%] border-x border-[#c84b37]/50 bg-[#c84b37]/[.055]"
          initial={{ x: '-120%' }}
          animate={{ x: stage < 4 ? ['-120%', '810%'] : '810%' }}
          transition={{ duration: 1.45, delay: .6, ease: 'linear' }}
        />
      </motion.div>
      <motion.div
        className="absolute bottom-[14%] left-[7.1%] display text-[3.1vmin] font-medium tracking-[-.035em]"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: stage >= 4 ? 1 : 0, y: stage >= 4 ? 0 : 12 }}
        transition={{ duration: .42, ease: EASE }}
      >One row. A real result.</motion.div>
      <motion.div className="absolute right-[7%] top-[12%] h-[1.25vmin] w-[1.25vmin] rounded-full bg-[#c84b37]"
        initial={{ scale: 0 }} animate={{ scale: stage >= 5 ? 100 : 1 }}
        transition={{ duration: .46, ease: [0.18, 0.95, 0.32, 1] }} />
      <motion.div className="absolute bottom-0 left-0 h-[.5vmin] bg-[#c84b37]"
        initial={{ width: '0%' }} animate={{ width: stage >= 5 ? '100%' : `${Math.min(100, stage * 22)}%` }}
        transition={{ duration: .45, ease: EASE }} />
      <div className="absolute bottom-[6.6%] right-[6.3%] mono text-[1.5vmin] text-[#90958c]">AD CAMPAIGN ANALYZER</div>
    </motion.section>
  );
}
