import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useGame, getDisplayName } from '@/store/game-store';
import { RoleDef } from '@/lib/game-data';
import { Button } from '@/components/ui/button';
import { RulebookDrawer } from '@/components/RulebookDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Moon, Redo, Users, User, Target, Shuffle,
  RefreshCw, UserX, Layers, Glasses, Wine, Shield, Skull,
  LayoutGrid, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DealStep = 'waiting' | 'revealed' | 'done' | 'reveal-board';

// ─── Role icon map ────────────────────────────────────────────────────────────
function getRoleIcon(baseRole: string, size = 'md') {
  const cls = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const map: Record<string, React.ReactNode> = {
    Werewolf:     <Skull className={cls} />,
    Villager:     <User className={cls} />,
    Seer:         <Eye className={cls} />,
    Robber:       <Shuffle className={cls} />,
    Troublemaker: <RefreshCw className={cls} />,
    Drunk:        <Wine className={cls} />,
    Insomniac:    <EyeOff className={cls} />,
    Hunter:       <Target className={cls} />,
    Mason:        <Users className={cls} />,
    Tanner:       <UserX className={cls} />,
    Minion:       <Glasses className={cls} />,
    Shapeshifter: <Layers className={cls} />,
  };
  return map[baseRole] ?? <Shield className={cls} />;
}

// ─── Faction colour tokens ────────────────────────────────────────────────────
function factionColor(faction: RoleDef['faction']) {
  switch (faction) {
    case 'Werewolf':
      return {
        card:   'from-card to-red-950/60 border-red-700/50',
        badge:  'text-red-300 border-red-500/30 bg-red-500/10',
        icon:   'text-red-400',
        glow:   'rgba(239,68,68,0.15)',
        mini:   'border-red-800/60 bg-red-950/40',
        miniBadge: 'text-red-300 bg-red-500/15',
      };
    case 'Village':
      return {
        card:   'from-card to-blue-950/50 border-blue-700/40',
        badge:  'text-blue-300 border-blue-400/30 bg-blue-400/10',
        icon:   'text-blue-400',
        glow:   'rgba(96,165,250,0.12)',
        mini:   'border-blue-800/50 bg-blue-950/30',
        miniBadge: 'text-blue-300 bg-blue-500/15',
      };
    case 'Tanner':
      return {
        card:   'from-card to-orange-950/50 border-orange-700/40',
        badge:  'text-orange-300 border-orange-400/30 bg-orange-400/10',
        icon:   'text-orange-400',
        glow:   'rgba(251,146,60,0.12)',
        mini:   'border-orange-800/50 bg-orange-950/30',
        miniBadge: 'text-orange-300 bg-orange-500/15',
      };
    default:
      return {
        card:   'from-card to-purple-950/50 border-purple-700/40',
        badge:  'text-purple-300 border-purple-400/30 bg-purple-400/10',
        icon:   'text-purple-400',
        glow:   'rgba(168,85,247,0.12)',
        mini:   'border-purple-800/50 bg-purple-950/30',
        miniBadge: 'text-purple-300 bg-purple-500/15',
      };
  }
}

// ─── Hold-to-confirm button ───────────────────────────────────────────────────
const HOLD_MS = 1500;
const RING_R  = 26;
const RING_C  = 2 * Math.PI * RING_R; // ≈ 163.4

interface HoldButtonProps {
  onComplete: () => void;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

function HoldButton({ onComplete, label, icon, className }: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding,  setHolding]  = useState(false);
  const rafRef   = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const cancel = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(0);
    setHolding(false);
  }, []);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct     = Math.min(100, (elapsed / HOLD_MS) * 100);
    setProgress(pct);
    if (pct < 100) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setHolding(false);
      onComplete();
    }
  }, [onComplete]);

  const startHold = useCallback(() => {
    startRef.current = Date.now();
    setHolding(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const offset = RING_C * (1 - progress / 100);

  return (
    <button
      onPointerDown={startHold}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      className={cn(
        'relative flex items-center justify-center gap-3 rounded-xl border border-border/60',
        'bg-card/50 backdrop-blur-md text-foreground/80 font-serif tracking-widest',
        'select-none touch-none active:scale-[0.98] transition-transform',
        'w-full h-16 text-sm sm:text-base px-4',
        holding && 'border-primary/60 text-primary',
        className,
      )}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* SVG progress ring */}
      <svg
        className="absolute inset-0 w-full h-full rounded-xl pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        {/* subtle track */}
        <rect
          x="1" y="1"
          width="calc(100% - 2px)" height="calc(100% - 2px)"
          rx="11" ry="11"
          fill="none"
          stroke="rgba(212,175,55,0.08)"
          strokeWidth="2"
        />
        {/* animated fill overlay */}
        {holding && (
          <rect
            x="1" y="1"
            width="calc(100% - 2px)" height="calc(100% - 2px)"
            rx="11" ry="11"
            fill="rgba(212,175,55,0.07)"
          />
        )}
      </svg>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-xl overflow-hidden">
        <div
          className="h-full bg-primary transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {icon && <span className="relative z-10 shrink-0">{icon}</span>}
      <span className="relative z-10">
        {holding ? `Hold… ${Math.round(progress)}%` : label}
      </span>
    </button>
  );
}

// ─── Mini reveal card (used on the board) ────────────────────────────────────
interface MiniCardProps {
  card: RoleDef;
  label: string;
  isCenter?: boolean;
  index?: number;
}

function MiniCard({ card, label, isCenter }: MiniCardProps) {
  const c = factionColor(card.faction);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-xl border p-3 flex flex-col gap-2 relative overflow-hidden',
        c.mini,
      )}
    >
      {/* label */}
      <p className={cn(
        'text-[10px] uppercase tracking-widest font-semibold',
        isCenter ? 'text-muted-foreground' : 'text-foreground/60',
      )}>
        {label}
      </p>

      {/* icon + name row */}
      <div className="flex items-center gap-2">
        <span className={cn('shrink-0', c.icon)}>{getRoleIcon(card.baseRole, 'sm')}</span>
        <span className="font-serif text-base text-foreground leading-tight">
          {card.baseRole}
        </span>
      </div>

      {/* faction badge */}
      <span className={cn(
        'self-start text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider',
        c.miniBadge,
      )}>
        {card.faction}
      </span>
    </motion.div>
  );
}

// ─── Win conditions cheat sheet ───────────────────────────────────────────────
function WinConditions() {
  const rows = [
    { color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-800/50',   label: 'Village wins', cond: 'At least 1 Werewolf dies' },
    { color: 'text-red-300',  bg: 'bg-red-500/10 border-red-800/50',     label: 'Wolves win',   cond: 'No Werewolf dies' },
    { color: 'text-orange-300', bg: 'bg-orange-500/10 border-orange-800/50', label: 'Tanner wins', cond: 'The Tanner dies' },
    { color: 'text-slate-400', bg: 'bg-slate-800/40 border-slate-700/40', label: 'No wolves?',   cond: 'Village wins only if no one dies' },
  ];
  return (
    <div className="mt-6 w-full">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 text-center font-semibold">
        Win Conditions
      </h3>
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <div key={r.label} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg border text-sm', r.bg)}>
            <span className={cn('font-bold shrink-0 w-24 text-xs uppercase tracking-wide', r.color)}>
              {r.label}
            </span>
            <span className="text-foreground/70 text-xs">{r.cond}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Reveal Board screen ──────────────────────────────────────────────────────
interface RevealBoardProps {
  playerCount: number;
  dealtCards:  RoleDef[];
  onPlayAgain: () => void;
  onSetup:     () => void;
}

function RevealBoard({ playerCount, dealtCards, onPlayAgain, onSetup }: RevealBoardProps) {
  const playerCards = dealtCards.slice(0, playerCount);
  const centerCards = dealtCards.slice(playerCount);

  return (
    <motion.div
      key="reveal-board"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full flex-1 overflow-y-auto"
    >
      <div className="max-w-md mx-auto px-4 pb-8 pt-2">

        {/* Player cards */}
        <h2 className="font-serif text-xl text-foreground mb-3">
          Player Cards
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {playerCards.map((card, i) => (
            <MiniCard
              key={i}
              card={card}
              label={getDisplayName(playerNames, i)}
              index={i}
            />
          ))}
        </div>

        {/* Center cards */}
        <h2 className="font-serif text-xl text-foreground mb-3">
          Center Cards
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {centerCards.map((card, i) => (
            <MiniCard
              key={i}
              card={card}
              label={`Center ${i + 1}`}
              isCenter
            />
          ))}
        </div>

        {/* Win conditions */}
        <WinConditions />

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mt-8">
          <Button
            size="lg"
            onClick={onPlayAgain}
            className="w-full h-14 font-serif tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            <Redo className="w-4 h-4 mr-2" />
            Play Again with Same Roles
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onSetup}
            className="w-full h-14 font-serif tracking-widest border-border/60 text-foreground/70 hover:bg-card hover:text-foreground"
          >
            <Settings className="w-4 h-4 mr-2" />
            Change Roles / Setup
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DealPage() {
  const [, setLocation] = useLocation();
  const { playerCount, playerNames, dealtCards, deal, resetGame } = useGame();

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [step, setStep] = useState<DealStep>('waiting');

  // Redirect if no cards dealt (e.g. page refresh)
  useEffect(() => {
    if (dealtCards.length === 0) setLocation('/');
  }, [dealtCards, setLocation]);

  if (dealtCards.length === 0) return null;

  const isLastPlayer = currentPlayerIndex === playerCount - 1;
  const currentCard  = dealtCards[currentPlayerIndex];
  const colors       = factionColor(currentCard?.faction);

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleReveal      = () => setStep('revealed');
  const handleHideAndPass = () => {
    if (isLastPlayer) {
      setStep('done');
    } else {
      setCurrentPlayerIndex(p => p + 1);
      setStep('waiting');
    }
  };
  const handleRevealBoard = () => setStep('reveal-board');
  const handlePlayAgain   = () => {
    deal();                      // reshuffle same cards
    setCurrentPlayerIndex(0);
    setStep('waiting');
  };
  const handleSetup       = () => {
    resetGame();
    setLocation('/');
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'min-h-[100dvh] w-full bg-background flex flex-col relative',
      step === 'reveal-board' || step === 'revealed' ? 'overflow-y-auto' : 'overflow-hidden',
    )}>

      {/* Ambient glow */}
      {step !== 'reveal-board' && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] blur-[150px] rounded-full transition-all duration-1000"
            style={{ background: step === 'revealed' ? colors.glow : 'rgba(212,175,55,0.04)' }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] blur-[120px] rounded-full transition-all duration-1000"
            style={{ background: step === 'done' ? 'rgba(96,165,250,0.08)' : 'transparent' }}
          />
        </div>
      )}

      {/* Header */}
      <AnimatePresence>
        {step !== 'revealed' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center relative z-20 shrink-0"
          >
            <div className="font-serif text-lg text-primary/80 tracking-widest">
              ONE NIGHT
            </div>
            <div className="flex items-center gap-2">
              {step === 'done' && (
                <button
                  onClick={handleRevealBoard}
                  className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  skip to board
                </button>
              )}
              <RulebookDrawer />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REVEAL BOARD (full-width scrollable) ── */}
      {step === 'reveal-board' && (
        <RevealBoard
          playerCount={playerCount}
          dealtCards={dealtCards}
          onPlayAgain={handlePlayAgain}
          onSetup={handleSetup}
        />
      )}

      {/* ── CARD FLOW STEPS ── */}
      {step !== 'reveal-board' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 relative z-10 w-full max-w-sm mx-auto">
          <AnimatePresence mode="wait">

            {/* ── WAITING ── */}
            {step === 'waiting' && (
              <motion.div
                key={`waiting-${currentPlayerIndex}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center w-full"
              >
                <div className="mb-8">
                  <h2 className="text-xs font-sans uppercase tracking-[0.3em] text-muted-foreground mb-2">
                    Hand device to
                  </h2>
                  <h1 className="font-serif text-5xl sm:text-6xl text-foreground drop-shadow-lg break-words text-center max-w-xs">
                    {getDisplayName(playerNames, currentPlayerIndex)}
                  </h1>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Make sure no one else is watching
                  </p>
                </div>

                {/* Face-down card */}
                <div className="w-full max-w-[220px] aspect-[2.5/3.5] bg-card/20 border-2 border-border/30 rounded-2xl flex flex-col items-center justify-center mb-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                  <Shield className="w-14 h-14 text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground/40 font-serif text-sm tracking-widest uppercase">
                    Your Secret Role
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={handleReveal}
                  className="w-full h-14 text-base font-serif tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all"
                >
                  <Eye className="w-5 h-5 mr-3" />
                  Reveal My Secret Role
                </Button>
              </motion.div>
            )}

            {/* ── REVEALED ── */}
            {step === 'revealed' && currentCard && (
              <div style={{ perspective: 2000 }} className="flex flex-col items-center w-full justify-center py-2">
                <motion.div
                  key={`revealed-${currentPlayerIndex}`}
                  initial={{ opacity: 0, rotateY: -90, scale: 0.9 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.75, type: 'spring', damping: 15, mass: 1.2 }}
                  className="flex flex-col items-center w-full"
                >
                  {/* Role card */}
                  <div className={cn(
                    'w-full max-w-[300px] min-h-[320px] rounded-2xl p-5 flex flex-col relative overflow-hidden',
                    'shadow-[0_0_60px_rgba(0,0,0,0.9)] border-2 mb-5 bg-gradient-to-b',
                    colors.card,
                  )}>
                    {/* Faction + difficulty */}
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-widest font-bold border backdrop-blur-md',
                        colors.badge,
                      )}>
                        {currentCard.faction}
                      </span>
                      <span className="text-primary text-sm">
                        {'⭐'.repeat(currentCard.difficulty)}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className={cn('flex items-center justify-center py-7 relative z-10', colors.icon)}>
                      <div className="opacity-80">{getRoleIcon(currentCard.baseRole, 'lg')}</div>
                    </div>

                    {/* Name + night order */}
                    <div className="text-center relative z-10 mb-3">
                      <h1 className="font-serif text-3xl sm:text-4xl text-foreground drop-shadow-lg leading-tight mb-1 break-words">
                        {currentCard.baseRole}
                      </h1>
                      <span className={cn(
                        'uppercase tracking-[0.2em] text-[10px] font-semibold',
                        currentCard.nightOrder ? 'text-primary' : 'text-muted-foreground',
                      )}>
                        {currentCard.nightOrder ? `Wakes Night ${currentCard.nightOrder}` : 'Does not wake'}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="bg-black/40 backdrop-blur-xl rounded-xl p-3 border border-white/10 relative z-10 overflow-y-auto max-h-40">
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed text-center">
                        {currentCard.description}
                      </p>
                    </div>
                  </div>

                  {/* Hide & Pass */}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleHideAndPass}
                    className="w-full h-14 text-base font-serif tracking-widest border-primary/40 text-primary hover:bg-primary/10 transition-all backdrop-blur-sm"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    {isLastPlayer ? 'Hide & Finish' : 'Hide & Pass'}
                  </Button>
                </motion.div>
              </div>
            )}

            {/* ── DONE (all players seen) ── */}
            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="flex flex-col items-center text-center w-full"
              >
                <Moon className="w-12 h-12 text-blue-400 mb-6 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]" />

                <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-4 leading-tight">
                  All players have seen their starting roles!
                </h1>

                <div className="w-full bg-card/40 backdrop-blur-md border border-border/50 rounded-xl p-5 mb-8 shadow-lg">
                  <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
                    Place the device in the center of the table and start your{' '}
                    <span className="text-primary font-semibold">Gamemaster App</span>{' '}
                    audio now.
                  </p>
                </div>

                {/* Hold-to-confirm: End Night & Reveal Cards */}
                <div className="w-full mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 text-center">
                    Hold to confirm
                  </p>
                  <HoldButton
                    onComplete={handleRevealBoard}
                    label="End Night & Reveal Cards"
                    icon={<LayoutGrid className="w-4 h-4" />}
                    className="w-full"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Hold the button until it fills to reveal all roles
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
