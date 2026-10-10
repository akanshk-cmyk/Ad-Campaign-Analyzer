import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  row: { title: 'One row, one result', filePath: 'src/components/video/video_scenes/Scene1.tsx' },
  trend: { title: 'See the trend', filePath: 'src/components/video/video_scenes/Scene2.tsx' },
  channels: { title: 'Compare channels', filePath: 'src/components/video/video_scenes/Scene3.tsx' },
  audit: { title: 'Trace the numbers', filePath: 'src/components/video/video_scenes/Scene4.tsx' },
  resolve: { title: 'The takeaway', filePath: 'src/components/video/video_scenes/Scene5.tsx' },
};
const PROGRESS_TICK_MS = 60;

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const key = sceneKeys[index];
  const details = SCENE_DETAILS[key];
  if (!details?.filePath) return;
  window.parent.postMessage({
    type: 'REPLIT_VIDEO_SCENE_SELECTED',
    payload: {
      sceneIndex: index,
      sceneCount: sceneKeys.length,
      sceneTitle: details.title || key,
      filePath: details.filePath,
      lineNumber: 1,
    },
  }, '*');
}

function formatPlaybackTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function PlaybackStatus({
  sceneKeys, activeIndex, activeDuration, activeStartTime, totalDuration, tick, paused, onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);
  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);
  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const interval = window.setInterval(() => setElapsed(elapsedBaseRef.current + performance.now() - startedAt), PROGRESS_TICK_MS);
    return () => {
      window.clearInterval(interval);
      elapsedBaseRef.current += performance.now() - startedAt;
    };
  }, [tick, paused]);
  const progress = activeDuration ? Math.min(1, elapsed / activeDuration) : 0;
  const videoElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));
  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {sceneKeys.map((key, index) => (
          <button key={key} onClick={() => onJumpTo(index)}
            className="relative h-3 min-h-3 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-[height] hover:h-4"
            aria-label={`Jump to scene ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined}>
            <span className="absolute inset-y-0 left-0 rounded-full bg-[#f3eee3]"
              style={{ width: `${index === activeIndex ? progress * 100 : index < activeIndex ? 100 : 0}%` }} />
          </button>
        ))}
      </div>
      <span className="shrink-0 font-mono text-sm tabular-nums text-white/65">{activeIndex + 1}/{sceneKeys.length}</span>
      <span className="min-w-[10ch] shrink-0 text-right font-mono text-sm tabular-nums text-white/75" role="timer">
        {formatPlaybackTime(videoElapsed)} / {formatPlaybackTime(totalDuration)}
      </span>
    </>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const controls = useSceneControls(SCENE_DURATIONS);
  const {
    sceneKeys, activeIndex, locked, paused, mountKey, tick, durations,
    activeDuration, activeStartTime, totalDuration, onSceneChange, jumpTo, toggleLock, togglePause,
  } = controls;
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);

  const handleJumpTo = useCallback((index: number) => {
    jumpTo(index);
    announceSceneSelection(index, sceneKeys);
  }, [jumpTo, sceneKeys]);
  const handlePointerEnter = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
  }, [collapsed]);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      if (!value) { setHovering(false); setTapPinned(false); }
      return !value;
    });
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      const sensor = sensorRef.current;
      if (sensor && !sensor.contains(event.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [collapsed, tapPinned]);
  useEffect(() => {
    if (!paused) return;
    const running = document.getAnimations().filter((animation) => animation.playState === 'running');
    running.forEach((animation) => animation.pause());
    return () => running.forEach((animation) => animation.play());
  }, [paused]);

  if (!isIframed) return <VideoTemplate />;
  const barVisible = !collapsed || hovering || tapPinned;
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <VideoTemplate key={mountKey} durations={durations} loop paused={paused} muted={muted} onSceneChange={onSceneChange} />
      <div ref={sensorRef} className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end" style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave} onPointerDown={handlePointerDown}>
        <div className="w-full flex-1" aria-hidden="true" />
        <div className={`flex items-center gap-2 border-t border-white/10 bg-[#14201f]/90 px-3 py-2 backdrop-blur-sm transition-all duration-200 ease-out sm:gap-3 sm:px-5 sm:py-3 ${
          barVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
        }`} aria-hidden={!barVisible}>
          <button onClick={togglePause} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white sm:h-12 sm:w-12"
            title={paused ? 'Play' : 'Pause'} aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play size={21} /> : <Pause size={21} />}</button>
          <button onClick={toggleLock} className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg sm:h-12 sm:w-12 ${locked ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
            title={locked ? 'Loop current scene: on' : 'Loop current scene: off'} aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'} aria-pressed={locked}><Repeat size={20} /></button>
          <button onClick={() => setMuted((value) => !value)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white sm:h-12 sm:w-12"
            title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
          <div className="h-8 w-px shrink-0 bg-white/15" />
          <PlaybackStatus sceneKeys={sceneKeys} activeIndex={activeIndex} activeDuration={activeDuration} activeStartTime={activeStartTime}
            totalDuration={totalDuration} tick={tick} paused={paused} onJumpTo={handleJumpTo} />
          <button onClick={toggleCollapsed} className="grid h-10 w-8 shrink-0 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
            title={collapsed ? 'Show controls' : 'Hide controls'} aria-label={collapsed ? 'Show controls' : 'Hide controls'} aria-expanded={!collapsed}>
            {collapsed ? <ChevronUp size={21} /> : <ChevronDown size={21} />}
          </button>
        </div>
      </div>
    </div>
  );
}
