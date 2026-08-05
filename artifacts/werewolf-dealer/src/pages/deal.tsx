import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useGame, getDisplayName } from '@/store/game-store';
import { RoleDef } from '@/lib/game-data';
import { Button } from '@/components/ui/button';
import { RulebookDrawer } from '@/components/RulebookDrawer';
import { NightActionScreen } from '@/components/NightActionScreen';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Moon, Sun, Redo, Users, User, Target, Shuffle,
  RefreshCw, UserX, Layers, Glasses, Wine, Shield, Skull,
  Settings, CheckCircle, Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Flow:
//   waiting → revealed → (pass) → waiting (repeat per player)
//   last player: waiting → revealed → done
//   done → night  (initNightPhase called here)
//   night → day   (all night actions done, End Night button)
//   day → reveal-board  (End Game hold button)
//   reveal-board  (final card positions shown)
type DealStep = 'waiting' | 'revealed' | 'done' | 'night' | 'day' | 'reveal-board';

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

interface HoldButtonProps {
  onComplete: () => void;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

function HoldButton({ onComplete, label, icon, className, disabled }: HoldButtonProps) {
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
    if (disabled) return;
    startRef.current = Date.now();
    setHolding(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, disabled]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <button
      onPointerDown={startHold}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      disabled={disabled}
      className={cn(
        'relative flex items-center justify-center gap-3 rounded-xl border border-border/60',
        'bg-card/50 backdrop-blur-md text-foreground/80 font-serif tracking-widest',
        'select-none touch-none active:scale-[0.98] transition-transform',
        'w-full h-16 text-sm sm:text-base px-4',
        holding && 'border-primary/60 text-primary',
        disabled && 'opacity-40 cursor-not-allowed active:scale-100',
        className,
      )}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
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

// ─── Shared circular-table layout helpers ─────────────────────────────────────
function useTableSize() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { containerRef, size };
}

/**
 * Computes all geometry for the circular table.
 * Cards are sized to avoid overlap for any player count (3–13).
 * Name labels are placed OUTSIDE the card radius (so they're never inside a rotated card).
 */
function computeTableGeometry(size: { w: number; h: number }, playerCount: number) {
  const cx = size.w / 2;
  const cy = size.h / 2;

  // Use the smaller dimension so the table fits both portrait and landscape
  const tableSize = Math.min(size.w, size.h);

  // --- Card sizing ---
  // Start from 15% of tableSize, shrink for large player counts
  const baseCardW = tableSize * 0.155;
  const shrink = Math.max(0.48, 1 - Math.max(0, playerCount - 5) * 0.057);
  const cardW = Math.max(34, Math.min(72, baseCardW * shrink));
  const cardH = cardW * 1.6;

  // Name label sits outside the card; reserve space for it
  const nameLabelH = Math.max(14, cardW * 0.2);
  const nameLabelGap = 4;

  // --- Radius ---
  // Minimum: adjacent card arcs must not overlap
  // Arc chord between adjacent slots = 2r * sin(π/N) ≥ cardW + gap
  const arcGap = 8;
  const minRadius = (cardW + arcGap) / (2 * Math.sin(Math.PI / Math.max(playerCount, 3)));
  // Maximum: cards + names stay inside the container
  const maxRadius = tableSize / 2 - cardH / 2 - nameLabelH - nameLabelGap - 6;
  const idealRadius = tableSize * 0.38;
  const radius = Math.max(minRadius, Math.min(idealRadius, maxRadius));

  // --- Center cards ---
  const cCardW = Math.max(26, Math.min(cardW * 0.82, (radius * 0.6)));
  const cCardH = cCardW * 1.6;
  const centerRowW = cCardW * 3 + 8 * 2;

  // --- Felt surface radius ---
  const tableR = Math.max(cCardH * 0.85, radius * 0.56);

  return { cx, cy, cardW, cardH, cCardW, cCardH, centerRowW, radius, tableR, nameLabelH };
}

/** Polar angle for player slot i out of n (starts at 12 o'clock, goes clockwise) */
function playerPolar(i: number, n: number): { angleDeg: number; angleRad: number } {
  const angleDeg = (360 / n) * i - 90; // -90 → top (12 o'clock)
  const angleRad = (angleDeg * Math.PI) / 180;
  return { angleDeg, angleRad };
}

// ─── Night Board (face-down, night phase) ─────────────────────────────────────
interface NightBoardProps {
  playerCount:        number;
  playerNames:        string[];
  allNightDone:       boolean;
  nightActionsDone:   number;
  totalNightActions:  number;
  onNightAction:      () => void;
  onEndNight:         () => void;
}

function NightBoard({
  playerCount, playerNames, allNightDone, nightActionsDone, totalNightActions, onNightAction, onEndNight,
}: NightBoardProps) {
  const { containerRef, size } = useTableSize();
  const ready = size.w > 0 && size.h > 0;

  const geo = ready ? computeTableGeometry(size, playerCount) : null;

  return (
    <motion.div
      key="night-board"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      {/* Table canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden min-h-0"
        style={{ minHeight: 280 }}
      >
        {ready && geo && (() => {
          const { cx, cy, cardW, cardH, cCardW, cCardH, centerRowW, radius, tableR, nameLabelH } = geo;

          return (
            <>
              {/* Felt surface */}
              <div
                className="absolute rounded-full bg-emerald-950/20 border border-primary/10"
                style={{ width: tableR * 2, height: tableR * 2, left: cx - tableR, top: cy - tableR }}
              />
              {/* Outer decorative ring */}
              <div
                className="absolute rounded-full border border-primary/8"
                style={{
                  width:  (radius + cardH * 0.5 + 14) * 2,
                  height: (radius + cardH * 0.5 + 14) * 2,
                  left:   cx - (radius + cardH * 0.5 + 14),
                  top:    cy - (radius + cardH * 0.5 + 14),
                }}
              />

              {/* Center cards (face-down) */}
              <div
                className="absolute flex gap-2"
                style={{ left: cx, top: cy, width: centerRowW, height: cCardH, transform: 'translate(-50%, -50%)' }}
              >
                {['I', 'II', 'III'].map((roman, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.08 + i * 0.07, duration: 0.35, type: 'spring', damping: 14 }}
                    style={{ width: cCardW, height: cCardH, flexShrink: 0 }}
                    className="rounded-lg border border-primary/25 bg-gradient-to-b from-card/80 to-background/70 flex flex-col items-center justify-between shadow-lg overflow-hidden"
                  >
                    <div className="flex-1 flex items-center justify-center w-full px-1 pt-1">
                      <div className="w-full h-full rounded-md border border-primary/10 bg-primary/4 flex items-center justify-center">
                        <Moon className="text-primary/25" style={{ width: cCardW * 0.32, height: cCardW * 0.32 }} />
                      </div>
                    </div>
                    <span
                      className="text-primary/40 font-bold uppercase tracking-widest leading-none py-1"
                      style={{ fontSize: Math.max(7, cCardW * 0.13) }}
                    >
                      {roman}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* "CENTER" label */}
              <div
                className="absolute text-muted-foreground/30 font-semibold uppercase tracking-widest select-none"
                style={{ fontSize: 9, left: cx, top: cy + cCardH * 0.5 + 5, transform: 'translateX(-50%)' }}
              >
                Center
              </div>

              {/* Player cards (face-down) + name labels outside cards */}
              {Array.from({ length: playerCount }, (_, i) => {
                const { angleDeg, angleRad } = playerPolar(i, playerCount);
                const cardX = cx + radius * Math.cos(angleRad);
                const cardY = cy + radius * Math.sin(angleRad);
                // Rotate card so its face points outward (player can read it from their seat)
                const rotateDeg = angleDeg + 90;

                // Name label: placed radially OUTSIDE the card edge, not rotated
                const labelR = radius + cardH / 2 + 5;
                const labelX = cx + labelR * Math.cos(angleRad);
                const labelY = cy + labelR * Math.sin(angleRad);

                const name = getDisplayName(playerNames, i);
                const fontSize = Math.max(8, Math.min(12, cardW * 0.19));

                return (
                  <React.Fragment key={i}>
                    {/* Face-down card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.65 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.35, type: 'spring', damping: 13 }}
                      style={{
                        position: 'absolute',
                        left: cardX,
                        top:  cardY,
                        width: cardW,
                        height: cardH,
                        transform: `translate(-50%, -50%) rotate(${rotateDeg}deg)`,
                      }}
                      className="rounded-lg border-2 border-border/55 bg-gradient-to-b from-card to-background/90 flex items-center justify-center shadow-[0_4px_18px_rgba(0,0,0,0.6)] overflow-hidden"
                    >
                      <Shield className="text-primary/18" style={{ width: cardW * 0.38, height: cardW * 0.38 }} />
                    </motion.div>

                    {/* Name label — always horizontal, outside the card */}
                    <div
                      style={{
                        position: 'absolute',
                        left: labelX,
                        top:  labelY,
                        width: Math.max(cardW + 8, 52),
                        maxWidth: Math.max(cardW + 8, 52),
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      <span
                        className="font-serif text-foreground/80 block truncate"
                        style={{ fontSize }}
                      >
                        {name}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          );
        })()}
      </div>

      {/* Action bar */}
      <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-t border-border/30 bg-background/90 backdrop-blur-md">
        {allNightDone ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 text-green-400 text-xs font-semibold uppercase tracking-widest py-1">
              <CheckCircle className="w-3.5 h-3.5" />
              All night actions complete
            </div>
            <HoldButton
              onComplete={onEndNight}
              label="End Night — Begin Discussion"
              icon={<Sun className="w-4 h-4" />}
              className="border-blue-500/40 text-blue-300"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              onClick={onNightAction}
              className="w-full h-12 font-serif tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_18px_rgba(212,175,55,0.35)] hover:shadow-[0_0_28px_rgba(212,175,55,0.5)] transition-all"
            >
              <Moon className="w-4 h-4 mr-2" />
              Perform Night Action
              {totalNightActions > 0 && (
                <span className="ml-2 text-xs bg-primary-foreground/20 rounded-full px-1.5 py-0.5">
                  {nightActionsDone}/{totalNightActions}
                </span>
              )}
            </Button>
            <Button
              disabled
              variant="outline"
              className="w-full h-10 font-serif tracking-wider border-border/30 text-muted-foreground/40 cursor-not-allowed"
            >
              <Sun className="w-3.5 h-3.5 mr-1.5 opacity-40" />
              End Night (complete all actions first)
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Day Phase screen ─────────────────────────────────────────────────────────
interface DayPhaseProps {
  onEndGame: () => void;
}

function DayPhase({ onEndGame }: DayPhaseProps) {
  return (
    <motion.div
      key="day-phase"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-sm mx-auto w-full text-center gap-6"
    >
      <Sun className="w-14 h-14 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />

      <div>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3 leading-tight">
          Discussion Time
        </h1>
        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-xl p-5 shadow-lg">
          <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">
            Debate, accuse, and defend. When discussion is over, vote simultaneously to eliminate a player.
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Hold to confirm when voting is done
        </p>
        <HoldButton
          onComplete={onEndGame}
          label="End Game — Reveal Cards"
          icon={<Swords className="w-4 h-4" />}
          className="border-orange-500/40 text-orange-300"
        />
      </div>
    </motion.div>
  );
}

// ─── Final Reveal Board ───────────────────────────────────────────────────────
interface FinalRevealBoardProps {
  playerCount:  number;
  playerNames:  string[];
  nightCards:   RoleDef[];
  onPlayAgain:  () => void;
  onSetup:      () => void;
}

function FinalRevealBoard({ playerCount, playerNames, nightCards, onPlayAgain, onSetup }: FinalRevealBoardProps) {
  const { containerRef, size } = useTableSize();
  const ready = size.w > 0 && size.h > 0;

  const geo = ready ? computeTableGeometry(size, playerCount) : null;

  const getColor = (card: RoleDef | undefined) => {
    if (!card) return { bg: 'bg-card/40', border: 'border-border/30', icon: 'text-muted-foreground/40', badge: 'text-muted-foreground' };
    switch (card.faction) {
      case 'Werewolf': return { bg: 'bg-red-950/50',    border: 'border-red-700/50',    icon: 'text-red-400',    badge: 'text-red-300' };
      case 'Village':  return { bg: 'bg-blue-950/40',   border: 'border-blue-700/40',   icon: 'text-blue-400',   badge: 'text-blue-300' };
      case 'Tanner':   return { bg: 'bg-orange-950/40', border: 'border-orange-700/40', icon: 'text-orange-400', badge: 'text-orange-300' };
      default:         return { bg: 'bg-purple-950/40', border: 'border-purple-700/40', icon: 'text-purple-400', badge: 'text-purple-300' };
    }
  };

  return (
    <motion.div
      key="final-reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-border/20">
        <span className="font-serif text-sm text-primary/80 tracking-widest uppercase">Final Reveal</span>
        <RulebookDrawer />
      </div>

      {/* Table canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden min-h-0"
        style={{ minHeight: 280 }}
      >
        {ready && geo && (() => {
          const { cx, cy, cardW, cardH, cCardW, cCardH, centerRowW, radius, tableR } = geo;

          return (
            <>
              {/* Felt surface */}
              <div
                className="absolute rounded-full bg-emerald-950/20 border border-primary/10"
                style={{ width: tableR * 2, height: tableR * 2, left: cx - tableR, top: cy - tableR }}
              />

              {/* Center cards (revealed) */}
              <div
                className="absolute flex gap-2"
                style={{ left: cx, top: cy, width: centerRowW, height: cCardH, transform: 'translate(-50%, -50%)' }}
              >
                {['I', 'II', 'III'].map((roman, i) => {
                  const card = nightCards[playerCount + i];
                  const c = getColor(card);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.75, rotateY: -90 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, duration: 0.5, type: 'spring', damping: 14 }}
                      style={{ width: cCardW, height: cCardH, flexShrink: 0 }}
                      className={cn('rounded-lg border flex flex-col items-center justify-between shadow-lg overflow-hidden', c.bg, c.border)}
                    >
                      <div className={cn('flex-1 flex items-center justify-center w-full', c.icon)}>
                        {card
                          ? getRoleIcon(card.baseRole, 'sm')
                          : <Moon className="opacity-20" style={{ width: cCardW * 0.32, height: cCardW * 0.32 }} />}
                      </div>
                      <div className="w-full text-center px-0.5 pb-1 leading-none">
                        <div className={cn('font-serif truncate', c.badge)} style={{ fontSize: Math.max(6, cCardW * 0.15) }}>
                          {card?.baseRole ?? '?'}
                        </div>
                        <div className="text-muted-foreground/40 uppercase tracking-widest" style={{ fontSize: Math.max(5, cCardW * 0.11) }}>
                          {roman}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* "CENTER" label */}
              <div
                className="absolute text-muted-foreground/30 font-semibold uppercase tracking-widest select-none"
                style={{ fontSize: 9, left: cx, top: cy + cCardH * 0.5 + 5, transform: 'translateX(-50%)' }}
              >
                Center
              </div>

              {/* Player cards (revealed) + name labels outside cards */}
              {Array.from({ length: playerCount }, (_, i) => {
                const card = nightCards[i];
                const c = getColor(card);
                const { angleDeg, angleRad } = playerPolar(i, playerCount);
                const cardX = cx + radius * Math.cos(angleRad);
                const cardY = cy + radius * Math.sin(angleRad);
                const rotateDeg = angleDeg + 90;

                // Role text inside the card (rotated with card, so player reads it from their seat)
                const roleFontSize = Math.max(6, Math.min(9, cardW * 0.145));

                // Name label: outside the card, NOT rotated
                const labelR = radius + cardH / 2 + 5;
                const labelX = cx + labelR * Math.cos(angleRad);
                const labelY = cy + labelR * Math.sin(angleRad);
                const name = getDisplayName(playerNames, i);
                const nameFontSize = Math.max(8, Math.min(12, cardW * 0.19));

                return (
                  <React.Fragment key={i}>
                    {/* Revealed card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.65, rotateY: -90 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      transition={{ delay: i * 0.07 + 0.2, duration: 0.5, type: 'spring', damping: 13 }}
                      style={{
                        position: 'absolute',
                        left: cardX,
                        top:  cardY,
                        width: cardW,
                        height: cardH,
                        transform: `translate(-50%, -50%) rotate(${rotateDeg}deg)`,
                      }}
                      className={cn(
                        'rounded-lg border-2 flex flex-col items-center justify-between shadow-[0_4px_18px_rgba(0,0,0,0.6)] overflow-hidden',
                        c.bg, c.border,
                      )}
                    >
                      <div className={cn('flex-1 flex items-center justify-center w-full px-1 pt-1', c.icon)}>
                        {card
                          ? getRoleIcon(card.baseRole, 'sm')
                          : <Shield className="opacity-20" style={{ width: cardW * 0.33, height: cardW * 0.33 }} />}
                      </div>
                      <div className="w-full text-center px-0.5 pb-1.5 leading-none">
                        <div className={cn('font-serif truncate', c.badge)} style={{ fontSize: roleFontSize }}>
                          {card?.baseRole ?? '?'}
                        </div>
                      </div>
                    </motion.div>

                    {/* Name label — always horizontal, outside the card */}
                    <div
                      style={{
                        position: 'absolute',
                        left: labelX,
                        top:  labelY,
                        width: Math.max(cardW + 8, 52),
                        maxWidth: Math.max(cardW + 8, 52),
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      <span
                        className="font-serif text-foreground/75 block truncate"
                        style={{ fontSize: nameFontSize }}
                      >
                        {name}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          );
        })()}
      </div>

      {/* Action bar */}
      <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-border/30 bg-background/90 backdrop-blur-md">
        <Button
          size="sm"
          variant="outline"
          onClick={onPlayAgain}
          className="flex-1 font-serif tracking-wider border-border/50 text-foreground/65 hover:bg-card hover:text-foreground"
        >
          <Redo className="w-3.5 h-3.5 mr-1.5" />
          Play Again
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onSetup}
          className="flex-1 font-serif tracking-wider border-border/50 text-foreground/65 hover:bg-card hover:text-foreground"
        >
          <Settings className="w-3.5 h-3.5 mr-1.5" />
          Change Setup
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DealPage() {
  const [, setLocation] = useLocation();
  const {
    playerCount, playerNames, dealtCards, nightCards, deal, resetGame,
    initNightPhase, nightActionsCompleted,
  } = useGame();

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [step, setStep] = useState<DealStep>('waiting');
  const [showNightAction, setShowNightAction] = useState(false);

  // Redirect if no cards dealt (e.g. page refresh)
  useEffect(() => {
    if (dealtCards.length === 0) setLocation('/');
  }, [dealtCards, setLocation]);

  if (dealtCards.length === 0) return null;

  const isLastPlayer = currentPlayerIndex === playerCount - 1;
  const currentCard  = dealtCards[currentPlayerIndex];
  const colors       = factionColor(currentCard?.faction);

  // Only count players whose starting role has a night action (excludes pre-completed Villagers etc.)
  const totalNightActions = Array.from({ length: playerCount }, (_, i) => i)
    .filter(i => dealtCards[i]?.nightOrder !== null).length;
  const nightActionsDone = Array.from({ length: playerCount }, (_, i) => i)
    .filter(i => dealtCards[i]?.nightOrder !== null && nightActionsCompleted.has(i)).length;
  const allNightDone = Array.from({ length: playerCount }, (_, i) => i)
    .every(i => nightActionsCompleted.has(i));

  // ── handlers ─────────────────────────────────────────────────────────────────
  const handleReveal      = () => setStep('revealed');
  const handleHideAndPass = () => {
    if (isLastPlayer) {
      setStep('done');
    } else {
      setCurrentPlayerIndex(p => p + 1);
      setStep('waiting');
    }
  };
  const handleEnterNight = () => {
    initNightPhase();
    setStep('night');
  };
  const handleEndNight  = () => setStep('day');
  const handleEndGame   = () => setStep('reveal-board');

  const handlePlayAgain = () => {
    deal();
    setCurrentPlayerIndex(0);
    setStep('waiting');
  };
  const handleSetup = () => {
    resetGame();
    setLocation('/');
  };
  const handleOpenNightAction  = () => setShowNightAction(true);
  const handleCloseNightAction = () => setShowNightAction(false);

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'min-h-[100dvh] w-full bg-background flex flex-col relative',
      step === 'revealed' ? 'overflow-y-auto' : 'overflow-hidden',
    )}>

      {/* Ambient glow */}
      {step !== 'night' && step !== 'day' && step !== 'reveal-board' && (
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

      {/* Header — shown on card-flow steps */}
      <AnimatePresence>
        {step !== 'revealed' && step !== 'night' && step !== 'day' && step !== 'reveal-board' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center relative z-20 shrink-0"
          >
            <div className="font-serif text-lg text-primary/80 tracking-widest">ONE NIGHT</div>
            <div className="flex items-center gap-2">
              {step === 'done' && (
                <button
                  onClick={handleEnterNight}
                  className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  skip to night
                </button>
              )}
              <RulebookDrawer />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Night header */}
      {step === 'night' && (
        <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-border/20">
          <div className="flex items-center gap-2 text-primary/80">
            <Moon className="w-4 h-4" />
            <span className="font-serif text-sm tracking-widest uppercase">Night Phase</span>
          </div>
          <RulebookDrawer />
        </div>
      )}

      {/* ── NIGHT PHASE ── */}
      {step === 'night' && (
        <>
          <NightBoard
            playerCount={playerCount}
            playerNames={playerNames}
            allNightDone={allNightDone}
            nightActionsDone={nightActionsDone}
            totalNightActions={totalNightActions}
            onNightAction={handleOpenNightAction}
            onEndNight={handleEndNight}
          />
          <AnimatePresence>
            {showNightAction && (
              <NightActionScreen onClose={handleCloseNightAction} />
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── DAY PHASE ── */}
      {step === 'day' && <DayPhase onEndGame={handleEndGame} />}

      {/* ── FINAL REVEAL ── */}
      {step === 'reveal-board' && (
        <FinalRevealBoard
          playerCount={playerCount}
          playerNames={playerNames}
          nightCards={nightCards}
          onPlayAgain={handlePlayAgain}
          onSetup={handleSetup}
        />
      )}

      {/* ── CARD FLOW STEPS ── */}
      {step !== 'night' && step !== 'day' && step !== 'reveal-board' && (
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
                    'w-full max-w-[300px] rounded-2xl p-5 flex flex-col relative overflow-hidden',
                    'shadow-[0_0_60px_rgba(0,0,0,0.9)] border-2 mb-5 bg-gradient-to-b',
                    colors.card,
                  )}>
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

                    <div className={cn('flex items-center justify-center py-6 relative z-10', colors.icon)}>
                      <div className="opacity-80">{getRoleIcon(currentCard.baseRole, 'lg')}</div>
                    </div>

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

                    {/* Description — scrollable if it overflows */}
                    <div className="bg-black/40 backdrop-blur-xl rounded-xl p-3 border border-white/10 relative z-10 overflow-y-auto max-h-44">
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed text-center">
                        {currentCard.description}
                      </p>
                    </div>
                  </div>

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

                <div className="w-full mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 text-center">
                    Hold to confirm
                  </p>
                  <HoldButton
                    onComplete={handleEnterNight}
                    label="Begin Night Phase"
                    icon={<Moon className="w-4 h-4" />}
                    className="w-full"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Hold the button to enter the night phase
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
