/**
 * NightActionScreen
 * Full-screen private overlay for a player's night action.
 *
 * Role-based login: players select their own role from a list — no player names
 * are shown anywhere, preventing the device from revealing who holds which role.
 *
 * Night-order enforcement: only roles whose nightOrder equals the lowest
 * incomplete nightOrder are selectable. This prevents Insomniac from acting
 * before Robber/Troublemaker swaps occur, etc.
 *
 * Swap targets and partner info use seat positions ("Seat 1", "Seat 2" …)
 * so the physical seating arrangement is preserved without leaking names.
 *
 * Flow: select role → action → (peeking) → complete → back to select
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/store/game-store';
import { RoleDef } from '@/lib/game-data';
import { Button } from '@/components/ui/button';
import {
  Eye, EyeOff, Moon, Shuffle, RefreshCw, Wine, Glasses, Layers,
  Skull, User, Users, Shield, Target, UserX, CheckCircle, Lock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Role icon + colours ──────────────────────────────────────────────────────

function getRoleIcon(baseRole: string, size: 'sm' | 'md' | 'lg' = 'md') {
  const cls = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
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

function factionBg(faction: RoleDef['faction']) {
  switch (faction) {
    case 'Werewolf': return 'from-red-950/80 to-background border-red-700/50 text-red-300';
    case 'Village':  return 'from-blue-950/80 to-background border-blue-700/40 text-blue-300';
    case 'Tanner':   return 'from-orange-950/80 to-background border-orange-700/40 text-orange-300';
    default:         return 'from-purple-950/80 to-background border-purple-700/40 text-purple-300';
  }
}

function roleFactionIcon(role: string): { border: string; icon: string; bg: string } {
  switch (role) {
    case 'Werewolf':
    case 'Minion':
      return { border: 'border-red-700/50',    icon: 'text-red-400',    bg: 'bg-red-950/30'    };
    case 'Tanner':
      return { border: 'border-orange-700/40', icon: 'text-orange-400', bg: 'bg-orange-950/30' };
    case 'Seer':
    case 'Robber':
    case 'Troublemaker':
    case 'Drunk':
    case 'Insomniac':
    case 'Villager':
    case 'Hunter':
    case 'Mason':
      return { border: 'border-blue-700/40',   icon: 'text-blue-400',   bg: 'bg-blue-950/30'   };
    default:
      return { border: 'border-purple-700/40', icon: 'text-purple-400', bg: 'bg-purple-950/30' };
  }
}

// ─── Small card peek tile ─────────────────────────────────────────────────────

function PeekCard({ card, label }: { card: RoleDef; label: string }) {
  const bg = factionBg(card.faction);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 14 }}
      className={cn(
        'rounded-2xl border-2 bg-gradient-to-b p-4 flex flex-col items-center gap-2 min-w-[120px]',
        bg,
      )}
    >
      <p className="text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
      <div className="opacity-80">{getRoleIcon(card.baseRole, 'lg')}</div>
      <p className="font-serif text-lg text-foreground leading-tight text-center">{card.baseRole}</p>
      <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{card.faction}</p>
    </motion.div>
  );
}

// ─── Selectable seat / center tile ───────────────────────────────────────────

function SelectableCard({
  label, onClick, selected, disabled,
}: {
  label: string;
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-xl border-2 p-4 flex flex-col items-center gap-2 min-w-[100px] transition-all active:scale-95',
        selected
          ? 'border-primary bg-primary/15 text-primary'
          : disabled
            ? 'border-border/20 bg-card/20 text-foreground/25 cursor-not-allowed'
            : 'border-border/50 bg-card/40 text-foreground/60 hover:border-primary/50 hover:bg-card/70',
      )}
    >
      <Shield className="w-6 h-6" />
      <span className="font-serif text-sm leading-tight text-center">{label}</span>
    </button>
  );
}

// ─── Night-order helpers ──────────────────────────────────────────────────────

/**
 * Returns the set of player indices eligible to act next —
 * those whose startingNightOrder equals the lowest incomplete nightOrder.
 */
function getEligiblePlayerIndices(
  playerCount: number,
  dealtCards: RoleDef[],
  nightActionsCompleted: Set<number>,
): Set<number> {
  const incomplete: { idx: number; order: number }[] = [];
  for (let i = 0; i < playerCount; i++) {
    if (nightActionsCompleted.has(i)) continue;
    const order = dealtCards[i]?.nightOrder;
    if (order !== null && order !== undefined) {
      incomplete.push({ idx: i, order });
    }
  }
  if (incomplete.length === 0) return new Set();
  const minOrder = Math.min(...incomplete.map(e => e.order));
  return new Set(incomplete.filter(e => e.order === minOrder).map(e => e.idx));
}

/** Human-readable seat label (1-indexed, no player name). */
const seatLabel = (idx: number) => `Seat ${idx + 1}`;

// ─── Types ────────────────────────────────────────────────────────────────────

type NightPhase =
  | { kind: 'select' }
  | { kind: 'action'; role: string; roleIndices: number[] }
  | { kind: 'peeking'; roleIndices: number[]; cards: { label: string; card: RoleDef }[] }
  | { kind: 'complete'; message: string };

interface Props {
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NightActionScreen({ onClose }: Props) {
  const {
    playerCount, dealtCards, nightCards,
    nightActionsCompleted, swapNightCards, markNightActionComplete, initNightPhase,
  } = useGame();

  // Safety: lazily init nightCards if not yet initialised
  React.useEffect(() => {
    if (nightCards.length === 0 && dealtCards.length > 0) {
      initNightPhase();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [phase, setPhase] = useState<NightPhase>({ kind: 'select' });

  // ── derived helpers ────────────────────────────────────────────────────────

  const currentCard = (idx: number) => nightCards[idx] ?? dealtCards[idx];
  const centerCard  = (i: number)   => nightCards[playerCount + i] ?? dealtCards[playerCount + i];

  /** All player indices with this starting role. */
  const indicesForRole = (role: string) =>
    Array.from({ length: playerCount }, (_, i) => i)
      .filter(i => dealtCards[i]?.baseRole === role);

  const werewolfIndices = () => indicesForRole('Werewolf');

  /** Player indices currently eligible to act (current night-order slot). */
  const eligibleNow = getEligiblePlayerIndices(playerCount, dealtCards, nightActionsCompleted);

  const allDone = Array.from({ length: playerCount }, (_, i) => i)
    .every(i => nightActionsCompleted.has(i));

  // ── action handlers ────────────────────────────────────────────────────────

  /** Mark every player in roleIndices as done, then show completion screen. */
  const handleDone = (roleIndices: number[], message: string) => {
    roleIndices.forEach(markNightActionComplete);
    setPhase({ kind: 'complete', message });
  };

  const afterPeeking = (roleIndices: number[]) => {
    roleIndices.forEach(markNightActionComplete);
    setPhase({ kind: 'complete', message: 'You have seen the card(s). Close your eyes and pass the device back.' });
  };

  const seerPeekPlayer = (roleIndices: number[], targetIdx: number) => {
    setPhase({
      kind: 'peeking',
      roleIndices,
      cards: [{ label: seatLabel(targetIdx), card: currentCard(targetIdx) }],
    });
  };

  const seerPeekCenter = (roleIndices: number[], c1: number, c2: number) => {
    setPhase({
      kind: 'peeking',
      roleIndices,
      cards: [
        { label: `Center ${['I', 'II', 'III'][c1]}`, card: centerCard(c1) },
        { label: `Center ${['I', 'II', 'III'][c2]}`, card: centerCard(c2) },
      ],
    });
  };

  const robberSwap = (roleIndices: number[], targetIdx: number) => {
    const playerIdx = roleIndices[0];
    const newCard   = nightCards[targetIdx] ?? dealtCards[targetIdx];
    swapNightCards(playerIdx, targetIdx);
    setPhase({
      kind: 'peeking',
      roleIndices,
      cards: [{ label: 'Your new role', card: newCard }],
    });
  };

  const troublemakerSwap = (roleIndices: number[], a: number, b: number) => {
    swapNightCards(a, b);
    handleDone(roleIndices, 'The swap is done — only you know what changed.');
  };

  const drunkSwap = (roleIndices: number[], centerIdx: number) => {
    swapNightCards(roleIndices[0], playerCount + centerIdx);
    handleDone(roleIndices, "Your card has been swapped with a center card. You don't know your new role.");
  };

  const insomniacPeek = (roleIndices: number[]) => {
    setPhase({
      kind: 'peeking',
      roleIndices,
      cards: [{ label: 'Your current card', card: currentCard(roleIndices[0]) }],
    });
  };

  const shapeshifterPeek = (roleIndices: number[], targetIdx: number) => {
    setPhase({
      kind: 'peeking',
      roleIndices,
      cards: [{ label: seatLabel(targetIdx), card: currentCard(targetIdx) }],
    });
  };

  const werewolfPeekCenter = (roleIndices: number[], centerIdx: number) => {
    setPhase({
      kind: 'peeking',
      roleIndices,
      cards: [{ label: `Center ${['I', 'II', 'III'][centerIdx]}`, card: centerCard(centerIdx) }],
    });
  };

  // ── select screen (role-based login) ──────────────────────────────────────

  const renderSelect = () => {
    // Build unique role groups from player slots, sorted by nightOrder ascending
    type RoleGroup = { role: string; card: RoleDef; indices: number[]; order: number | null };
    const roleMap = new Map<string, RoleGroup>();

    for (let i = 0; i < playerCount; i++) {
      const card = dealtCards[i];
      if (!card) continue;
      if (roleMap.has(card.baseRole)) {
        roleMap.get(card.baseRole)!.indices.push(i);
      } else {
        roleMap.set(card.baseRole, {
          role: card.baseRole,
          card,
          indices: [i],
          order: card.nightOrder ?? null,
        });
      }
    }

    // Only roles that wake during the night (nightOrder !== null)
    const nightGroups = [...roleMap.values()]
      .filter(g => g.order !== null)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

    return (
      <motion.div
        key="select"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center w-full max-w-sm mx-auto px-4 py-6 gap-5"
      >
        {/* Header */}
        <div className="text-center">
          <Moon className="w-10 h-10 text-primary mx-auto mb-3 drop-shadow-[0_0_12px_rgba(212,175,55,0.5)]" />
          <h1 className="font-serif text-3xl text-foreground mb-1">Night Actions</h1>
          {allDone ? (
            <p className="text-sm text-green-400">All night actions complete!</p>
          ) : (
            <p className="text-sm text-muted-foreground">Select your role to begin your action</p>
          )}
        </div>

        {/* Role buttons in night order */}
        <div className="w-full flex flex-col gap-2">
          {nightGroups.map(({ role, card, indices, order }) => {
            const done     = indices.every(i => nightActionsCompleted.has(i));
            const eligible = indices.some(i => eligibleNow.has(i));
            const locked   = !done && !eligible;
            const fc       = roleFactionIcon(role);

            return (
              <button
                key={role}
                onClick={() =>
                  eligible
                    ? setPhase({ kind: 'action', role, roleIndices: indices })
                    : undefined
                }
                disabled={done || locked}
                className={cn(
                  'w-full rounded-xl border-2 px-4 py-3.5 flex items-center justify-between transition-all',
                  done
                    ? 'border-border/20 bg-card/20 text-muted-foreground/40 cursor-default'
                    : eligible
                      ? cn(
                          'hover:opacity-90 active:scale-[0.98] cursor-pointer',
                          fc.border, fc.bg,
                        )
                      : 'border-border/20 bg-card/15 text-muted-foreground/35 cursor-not-allowed',
                )}
              >
                {/* Left: status indicator + icon + role name */}
                <div className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-green-500/60 shrink-0" />
                  ) : locked ? (
                    <Lock className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                  )}
                  <span className={cn('shrink-0', done || locked ? 'opacity-40' : fc.icon)}>
                    {getRoleIcon(card.baseRole, 'sm')}
                  </span>
                  <span className="font-serif text-xl">{role}</span>
                  {order !== null && (
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
                      #{order}
                    </span>
                  )}
                </div>

                {/* Right: call to action or state label */}
                {eligible && (
                  <div className={cn('flex items-center gap-1 text-xs', fc.icon)}>
                    <span className="uppercase tracking-widest">This is me</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
                {done && (
                  <span className="text-xs text-muted-foreground/40 uppercase tracking-widest">Done</span>
                )}
                {locked && (
                  <span className="text-xs text-muted-foreground/30 uppercase tracking-widest">Waiting…</span>
                )}
              </button>
            );
          })}
        </div>

        {allDone ? (
          <Button
            onClick={onClose}
            className="w-full h-12 font-serif tracking-wider bg-primary text-primary-foreground"
          >
            Return to Table
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        )}
      </motion.div>
    );
  };

  // ── action screen ──────────────────────────────────────────────────────────

  const renderAction = (role: string, roleIndices: number[]) => {
    const primaryIdx  = roleIndices[0];
    const wolfIndices = werewolfIndices();
    const isLoneWolf  = role === 'Werewolf' && wolfIndices.length === 1;
    // For Werewolf: pack = all wolf seats (including self — shown as "you")
    // For Mason:    partners = all mason seats
    const packSeats    = role === 'Werewolf' ? wolfIndices  : [];
    const masonSeats   = role === 'Mason'    ? roleIndices  : [];
    const fc           = roleFactionIcon(role);

    return (
      <motion.div
        key={`action-${role}`}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="flex flex-col items-center w-full max-w-sm mx-auto px-4 py-6 gap-5"
      >
        {/* Role header — no player name */}
        <div className="text-center w-full">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
            Your night action
          </p>
          <div className={cn('flex items-center justify-center gap-2 mb-1', fc.icon)}>
            {getRoleIcon(role, 'md')}
            <h1 className="font-serif text-3xl text-foreground">{role}</h1>
          </div>
        </div>

        {/* Role-specific UI */}
        <div className="w-full">

          {/* ── Seer ── */}
          {role === 'Seer' && (
            <SeerAction
              playerIdx={primaryIdx}
              playerCount={playerCount}
              onPeekPlayer={targetIdx => seerPeekPlayer(roleIndices, targetIdx)}
              onPeekCenter={(c1, c2) => seerPeekCenter(roleIndices, c1, c2)}
            />
          )}

          {/* ── Robber ── */}
          {role === 'Robber' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground/70 text-center">
                Pick a seat to rob. You'll swap cards and see your new role.
              </p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: playerCount }, (_, i) => {
                  if (i === primaryIdx) return null;
                  return (
                    <SelectableCard
                      key={i}
                      label={seatLabel(i)}
                      onClick={() => robberSwap(roleIndices, i)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Troublemaker ── */}
          {role === 'Troublemaker' && (
            <TroublemakerAction
              playerIdx={primaryIdx}
              playerCount={playerCount}
              onSwap={(a, b) => troublemakerSwap(roleIndices, a, b)}
            />
          )}

          {/* ── Drunk ── */}
          {role === 'Drunk' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground/70 text-center">
                Pick a center card to swap with. You won't see your new role.
              </p>
              <div className="flex gap-3 justify-center">
                {['I', 'II', 'III'].map((roman, ci) => (
                  <SelectableCard
                    key={ci}
                    label={`Center ${roman}`}
                    onClick={() => drunkSwap(roleIndices, ci)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Insomniac ── */}
          {role === 'Insomniac' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-foreground/70 text-center">
                Check if your card changed during the night.
              </p>
              <Button
                onClick={() => insomniacPeek(roleIndices)}
                className="w-full h-12 font-serif tracking-wider bg-primary text-primary-foreground"
              >
                <Eye className="w-4 h-4 mr-2" /> View My Current Card
              </Button>
            </div>
          )}

          {/* ── Shapeshifter ── */}
          {role === 'Shapeshifter' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground/70 text-center">
                Look at one other seat's card and imitate that role (no swap).
              </p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: playerCount }, (_, i) => {
                  if (i === primaryIdx) return null;
                  return (
                    <SelectableCard
                      key={i}
                      label={seatLabel(i)}
                      onClick={() => shapeshifterPeek(roleIndices, i)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Werewolf ── */}
          {role === 'Werewolf' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-red-700/40 bg-red-950/30 p-4">
                {packSeats.length > 1 ? (
                  <>
                    <p className="text-xs uppercase tracking-widest text-red-400/70 mb-3">
                      Your pack ({packSeats.length} werewolves)
                    </p>
                    <div className="flex flex-col gap-1">
                      {packSeats.map(si => (
                        <div key={si} className="flex items-center gap-3 py-1">
                          <Skull className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="font-serif text-lg text-foreground">
                            {seatLabel(si)}
                            {si === primaryIdx && (
                              <span className="ml-2 text-xs text-red-400/60 uppercase tracking-wider">you</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest text-red-400/70 mb-1">Lone Wolf</p>
                    <p className="text-sm text-foreground/70">
                      You are the only werewolf. You may peek at one center card (optional).
                    </p>
                  </>
                )}
              </div>

              {/* Lone wolf: optional center peek */}
              {isLoneWolf && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Optionally peek at one center card:
                  </p>
                  <div className="flex gap-3 justify-center">
                    {['I', 'II', 'III'].map((roman, ci) => (
                      <SelectableCard
                        key={ci}
                        label={`Center ${roman}`}
                        onClick={() => werewolfPeekCenter(roleIndices, ci)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() =>
                  handleDone(
                    roleIndices,
                    packSeats.length > 1
                      ? "You've identified your pack. Close your eyes."
                      : "You've finished your turn. Close your eyes.",
                  )
                }
                className="w-full h-12 font-serif tracking-wider bg-red-900/60 hover:bg-red-900/80 border border-red-700/50 text-red-200"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                {isLoneWolf ? 'Done — Skip Peek' : 'Done — Close Eyes'}
              </Button>
            </div>
          )}

          {/* ── Mason ── */}
          {role === 'Mason' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-blue-700/40 bg-blue-950/30 p-4">
                {masonSeats.length > 1 ? (
                  <>
                    <p className="text-xs uppercase tracking-widest text-blue-400/70 mb-3">
                      Fellow Masons ({masonSeats.length} total)
                    </p>
                    <div className="flex flex-col gap-1">
                      {masonSeats.map(si => (
                        <div key={si} className="flex items-center gap-3 py-1">
                          <Users className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="font-serif text-lg text-foreground">
                            {seatLabel(si)}
                            {si === primaryIdx && (
                              <span className="ml-2 text-xs text-blue-400/60 uppercase tracking-wider">you</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest text-blue-400/70 mb-1">Lone Mason</p>
                    <p className="text-sm text-foreground/70">
                      The other Mason card is in the center. You are the only Mason awake.
                    </p>
                  </>
                )}
              </div>
              <Button
                onClick={() => handleDone(roleIndices, "You've identified your fellow Masons. Close your eyes.")}
                className="w-full h-12 font-serif tracking-wider"
              >
                <EyeOff className="w-4 h-4 mr-2" /> Done — Close Eyes
              </Button>
            </div>
          )}

          {/* ── Minion ── */}
          {role === 'Minion' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-red-700/40 bg-red-950/30 p-4">
                {werewolfIndices().length > 0 ? (
                  <>
                    <p className="text-xs uppercase tracking-widest text-red-400/70 mb-3">
                      The werewolves are at
                    </p>
                    {werewolfIndices().map(si => (
                      <div key={si} className="flex items-center gap-3 py-1">
                        <Skull className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="font-serif text-lg text-foreground">{seatLabel(si)}</span>
                      </div>
                    ))}
                    <p className="text-xs text-red-400/50 mt-2">
                      They don't know you're the Minion.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest text-red-400/70 mb-1">No Werewolves</p>
                    <p className="text-sm text-foreground/70">
                      All werewolf cards are in the center. As Minion, you win only if no one is eliminated.
                    </p>
                  </>
                )}
              </div>
              <Button
                onClick={() => handleDone(roleIndices, "You've seen the werewolves. Close your eyes.")}
                className="w-full h-12 font-serif tracking-wider bg-red-900/60 hover:bg-red-900/80 border border-red-700/50 text-red-200"
              >
                <EyeOff className="w-4 h-4 mr-2" /> Done — Close Eyes
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ── peeking screen ─────────────────────────────────────────────────────────

  const renderPeeking = (p: Extract<NightPhase, { kind: 'peeking' }>) => (
    <motion.div
      key="peeking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center w-full max-w-sm mx-auto px-4 py-6 gap-6"
    >
      <div className="text-center">
        <Eye className="w-8 h-8 text-primary mx-auto mb-2" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">You see</p>
      </div>

      <div className={cn('flex gap-4 justify-center', p.cards.length === 1 ? 'scale-110' : '')}>
        {p.cards.map((c, i) => (
          <PeekCard key={i} card={c.card} label={c.label} />
        ))}
      </div>

      <Button
        onClick={() => afterPeeking(p.roleIndices)}
        variant="outline"
        className="w-full h-12 font-serif tracking-wider border-border/50 hover:bg-card text-foreground"
      >
        <EyeOff className="w-4 h-4 mr-2" /> Hide & Close Eyes
      </Button>
    </motion.div>
  );

  // ── complete screen ────────────────────────────────────────────────────────

  const renderComplete = (p: Extract<NightPhase, { kind: 'complete' }>) => (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center w-full max-w-sm mx-auto px-4 py-6 gap-6 text-center"
    >
      <CheckCircle className="w-14 h-14 text-green-400 drop-shadow-[0_0_14px_rgba(74,222,128,0.4)]" />
      <div>
        <p className="font-serif text-xl text-foreground mb-2">Action Complete</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{p.message}</p>
      </div>
      <Button
        onClick={() => setPhase({ kind: 'select' })}
        className="w-full h-12 font-serif tracking-wider bg-primary text-primary-foreground"
      >
        Return to Table
      </Button>
    </motion.div>
  );

  // ── root render ────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col overflow-y-auto"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%] blur-[120px] rounded-full bg-primary/5" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {phase.kind === 'select'   && renderSelect()}
          {phase.kind === 'action'   && renderAction(phase.role, phase.roleIndices)}
          {phase.kind === 'peeking'  && renderPeeking(phase)}
          {phase.kind === 'complete' && renderComplete(phase)}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Seer sub-component ───────────────────────────────────────────────────────

function SeerAction({
  playerIdx, playerCount, onPeekPlayer, onPeekCenter,
}: {
  playerIdx:     number;
  playerCount:   number;
  onPeekPlayer:  (targetIdx: number) => void;
  onPeekCenter:  (c1: number, c2: number) => void;
}) {
  const [mode, setMode] = useState<'choose' | 'player' | 'center'>('choose');
  const [firstCenter, setFirstCenter] = useState<number | null>(null);

  if (mode === 'choose') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/70 text-center">Choose what to look at:</p>
        <Button onClick={() => setMode('player')} variant="outline" className="w-full h-12 font-serif tracking-wider">
          <User className="w-4 h-4 mr-2" /> 1 Player's Card
        </Button>
        <Button onClick={() => setMode('center')} variant="outline" className="w-full h-12 font-serif tracking-wider">
          <Moon className="w-4 h-4 mr-2" /> 2 Center Cards
        </Button>
      </div>
    );
  }

  if (mode === 'player') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/70 text-center">Pick a seat to look at:</p>
        <div className="flex flex-col gap-2">
          {Array.from({ length: playerCount }, (_, i) => {
            if (i === playerIdx) return null;
            return (
              <SelectableCard
                key={i}
                label={seatLabel(i)}
                onClick={() => onPeekPlayer(i)}
              />
            );
          })}
        </div>
        <button
          onClick={() => setMode('choose')}
          className="text-xs text-muted-foreground hover:text-foreground text-center mt-1"
        >
          ← Back
        </button>
      </div>
    );
  }

  // Center mode — pick two different center cards
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/70 text-center">
        {firstCenter === null ? 'Pick your first center card:' : 'Pick your second center card:'}
      </p>
      <div className="flex gap-3 justify-center">
        {['I', 'II', 'III'].map((roman, ci) => (
          <SelectableCard
            key={ci}
            label={`Center ${roman}`}
            selected={firstCenter === ci}
            disabled={firstCenter !== null && firstCenter === ci}
            onClick={() => {
              if (firstCenter === null) {
                setFirstCenter(ci);
              } else if (firstCenter !== ci) {
                onPeekCenter(firstCenter, ci);
              }
            }}
          />
        ))}
      </div>
      {firstCenter !== null && (
        <p className="text-xs text-muted-foreground text-center">Now pick a different center card</p>
      )}
      <button
        onClick={() => { setMode('choose'); setFirstCenter(null); }}
        className="text-xs text-muted-foreground hover:text-foreground text-center mt-1"
      >
        ← Back
      </button>
    </div>
  );
}

// ─── Troublemaker sub-component ───────────────────────────────────────────────

function TroublemakerAction({
  playerIdx, playerCount, onSwap,
}: {
  playerIdx:   number;
  playerCount: number;
  onSwap:      (a: number, b: number) => void;
}) {
  const [first, setFirst] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/70 text-center">
        {first === null
          ? 'Pick the first seat to swap (not your own):'
          : 'Now pick the second seat to swap with:'}
      </p>
      <div className="flex flex-col gap-2">
        {Array.from({ length: playerCount }, (_, i) => {
          if (i === playerIdx) return null;
          return (
            <SelectableCard
              key={i}
              label={seatLabel(i)}
              selected={first === i}
              disabled={first !== null && first === i}
              onClick={() => {
                if (first === null) {
                  setFirst(i);
                } else if (first !== i) {
                  onSwap(first, i);
                }
              }}
            />
          );
        })}
      </div>
      {first !== null && (
        <button
          onClick={() => setFirst(null)}
          className="text-xs text-muted-foreground hover:text-foreground text-center mt-1"
        >
          ← Pick different first seat
        </button>
      )}
    </div>
  );
}
