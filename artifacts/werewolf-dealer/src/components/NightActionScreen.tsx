/**
 * NightActionScreen
 * Full-screen private overlay for a player's night action.
 *
 * Enforces canonical night order: only players whose role's nightOrder equals
 * the lowest nightOrder among incomplete players are eligible to act. This
 * prevents Insomniac from checking before Robber/Troublemaker swaps occur, etc.
 *
 * Flow: select → action → (peeking) → complete → [closed, back to board]
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame, getDisplayName } from '@/store/game-store';
import { RoleDef } from '@/lib/game-data';
import { Button } from '@/components/ui/button';
import {
  Eye, EyeOff, Moon, Shuffle, RefreshCw, Wine, Glasses, Layers,
  Skull, User, Users, Shield, Target, UserX, CheckCircle, Lock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    case 'Werewolf':  return 'from-red-950/80 to-background border-red-700/50 text-red-300';
    case 'Village':   return 'from-blue-950/80 to-background border-blue-700/40 text-blue-300';
    case 'Tanner':    return 'from-orange-950/80 to-background border-orange-700/40 text-orange-300';
    default:          return 'from-purple-950/80 to-background border-purple-700/40 text-purple-300';
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

// ─── Selectable card tile ─────────────────────────────────────────────────────

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
 * Returns the set of player indices that are eligible to act next —
 * those whose starting nightOrder equals the lowest incomplete nightOrder.
 * Players pre-completed (null nightOrder) are already in nightActionsCompleted.
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

// ─── Types ────────────────────────────────────────────────────────────────────

type NightPhase =
  | { kind: 'select' }
  | { kind: 'action'; playerIdx: number }
  | { kind: 'peeking'; playerIdx: number; cards: { label: string; card: RoleDef }[] }
  | { kind: 'complete'; playerIdx: number; message: string };

interface Props {
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NightActionScreen({ onClose }: Props) {
  const {
    playerCount, playerNames, dealtCards, nightCards,
    nightActionsCompleted, swapNightCards, markNightActionComplete, initNightPhase,
  } = useGame();

  // Lazily init nightCards on first open
  React.useEffect(() => {
    if (nightCards.length === 0 && dealtCards.length > 0) {
      initNightPhase();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [phase, setPhase] = useState<NightPhase>({ kind: 'select' });

  // ── derived helpers ────────────────────────────────────────────────────────

  const startingRole = (idx: number) => dealtCards[idx]?.baseRole ?? '';
  const currentCard  = (idx: number) => nightCards[idx] ?? dealtCards[idx];
  const centerCard   = (i: number)   => nightCards[playerCount + i] ?? dealtCards[playerCount + i];

  const werewolfPartners = (self: number) =>
    Array.from({ length: playerCount }, (_, i) => i)
      .filter(i => i !== self && dealtCards[i]?.baseRole === 'Werewolf');

  const masonPartners = (self: number) =>
    Array.from({ length: playerCount }, (_, i) => i)
      .filter(i => i !== self && dealtCards[i]?.baseRole === 'Mason');

  const werewolfIndices = () =>
    Array.from({ length: playerCount }, (_, i) => i)
      .filter(i => dealtCards[i]?.baseRole === 'Werewolf');

  /** Players eligible to act right now (current night-order group) */
  const eligibleNow = getEligiblePlayerIndices(playerCount, dealtCards, nightActionsCompleted);

  const allDone = Array.from({ length: playerCount }, (_, i) => i)
    .every(i => nightActionsCompleted.has(i));

  // ── action handlers ────────────────────────────────────────────────────────

  const handleDone = (playerIdx: number, message: string) => {
    markNightActionComplete(playerIdx);
    setPhase({ kind: 'complete', playerIdx, message });
  };

  const afterPeeking = (playerIdx: number) => {
    markNightActionComplete(playerIdx);
    setPhase({ kind: 'complete', playerIdx, message: 'You have seen the card(s). Close your eyes and pass the device back.' });
  };

  const seerPeekPlayer = (playerIdx: number, targetIdx: number) => {
    setPhase({
      kind: 'peeking',
      playerIdx,
      cards: [{ label: getDisplayName(playerNames, targetIdx), card: currentCard(targetIdx) }],
    });
  };

  const seerPeekCenter = (playerIdx: number, c1: number, c2: number) => {
    setPhase({
      kind: 'peeking',
      playerIdx,
      cards: [
        { label: `Center ${['I', 'II', 'III'][c1]}`, card: centerCard(c1) },
        { label: `Center ${['I', 'II', 'III'][c2]}`, card: centerCard(c2) },
      ],
    });
  };

  const robberSwap = (playerIdx: number, targetIdx: number) => {
    // Read the target's current card BEFORE the swap — that's what the robber picks up
    const newCard = nightCards[targetIdx] ?? dealtCards[targetIdx];
    swapNightCards(playerIdx, targetIdx);
    setPhase({
      kind: 'peeking',
      playerIdx,
      cards: [{ label: 'Your new role', card: newCard }],
    });
  };

  const troublemakerSwap = (playerIdx: number, a: number, b: number) => {
    swapNightCards(a, b);
    handleDone(playerIdx, 'The swap is done — only you know what changed.');
  };

  const drunkSwap = (playerIdx: number, centerIdx: number) => {
    swapNightCards(playerIdx, playerCount + centerIdx);
    handleDone(playerIdx, "Your card has been swapped with a center card. You don't know your new role.");
  };

  const insomniacPeek = (playerIdx: number) => {
    setPhase({
      kind: 'peeking',
      playerIdx,
      cards: [{ label: 'Your current card', card: currentCard(playerIdx) }],
    });
  };

  const shapeshifterPeek = (playerIdx: number, targetIdx: number) => {
    setPhase({
      kind: 'peeking',
      playerIdx,
      cards: [{ label: getDisplayName(playerNames, targetIdx), card: currentCard(targetIdx) }],
    });
  };

  const werewolfPeekCenter = (playerIdx: number, centerIdx: number) => {
    setPhase({
      kind: 'peeking',
      playerIdx,
      cards: [{ label: `Center ${['I', 'II', 'III'][centerIdx]}`, card: centerCard(centerIdx) }],
    });
  };

  // ── render ─────────────────────────────────────────────────────────────────

  const renderSelect = () => {
    // Group players into ordered slots for display
    const orderedGroups: { order: number | null; indices: number[] }[] = [];
    const seen = new Set<number | null>();
    const sorted = Array.from({ length: playerCount }, (_, i) => ({
      idx: i,
      order: dealtCards[i]?.nightOrder ?? null,
    })).sort((a, b) => {
      if (a.order === null && b.order === null) return 0;
      if (a.order === null) return 1;
      if (b.order === null) return -1;
      return a.order - b.order;
    });

    for (const { idx, order } of sorted) {
      if (!seen.has(order)) {
        seen.add(order);
        orderedGroups.push({ order, indices: [idx] });
      } else {
        orderedGroups.find(g => g.order === order)!.indices.push(idx);
      }
    }

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
          ) : eligibleNow.size > 0 ? (
            <p className="text-sm text-muted-foreground">
              Acting now: <span className="text-primary font-semibold">
                {[...eligibleNow].map(i => getDisplayName(playerNames, i)).join(' & ')}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Select a player</p>
          )}
        </div>

        {/* Players in night order */}
        <div className="w-full flex flex-col gap-2">
          {orderedGroups.map(({ order, indices }) =>
            indices.map(i => {
              const name = getDisplayName(playerNames, i);
              const done = nightActionsCompleted.has(i);
              const eligible = eligibleNow.has(i);
              const locked = !done && !eligible;

              return (
                <button
                  key={i}
                  onClick={() => eligible ? setPhase({ kind: 'action', playerIdx: i }) : undefined}
                  disabled={done || locked}
                  className={cn(
                    'w-full rounded-xl border-2 px-5 py-4 flex items-center justify-between transition-all',
                    done
                      ? 'border-border/20 bg-card/20 text-muted-foreground/40 cursor-default'
                      : eligible
                        ? 'border-primary/60 bg-primary/8 text-foreground hover:bg-primary/15 active:scale-[0.98] cursor-pointer'
                        : 'border-border/20 bg-card/15 text-muted-foreground/35 cursor-not-allowed',
                  )}
                >
                  <div className="flex items-center gap-3">
                    {done
                      ? <CheckCircle className="w-4 h-4 text-green-500/60 shrink-0" />
                      : locked
                        ? <Lock className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                        : <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                    }
                    <span className="font-serif text-xl">{name}</span>
                  </div>
                  {eligible && (
                    <div className="flex items-center gap-1 text-primary text-xs">
                      <span className="uppercase tracking-widest">I am {name}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {done && <span className="text-xs text-muted-foreground/40 uppercase tracking-widest">Done</span>}
                  {locked && order !== null && (
                    <span className="text-xs text-muted-foreground/30 uppercase tracking-widest">Waiting…</span>
                  )}
                </button>
              );
            })
          )}
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

  const renderAction = (playerIdx: number) => {
    const role = startingRole(playerIdx);
    const name = getDisplayName(playerNames, playerIdx);
    const partners = role === 'Werewolf' ? werewolfPartners(playerIdx) : [];
    const wolves = werewolfIndices();
    const isLoneWolf = role === 'Werewolf' && wolves.length === 1;

    return (
      <motion.div
        key={`action-${playerIdx}`}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="flex flex-col items-center w-full max-w-sm mx-auto px-4 py-6 gap-5"
      >
        {/* Player + role header */}
        <div className="text-center w-full">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{name}'s night action</p>
          <div className="flex items-center justify-center gap-2 text-primary mb-1">
            {getRoleIcon(role, 'md')}
            <h1 className="font-serif text-3xl text-foreground">{role}</h1>
          </div>
        </div>

        {/* Role-specific UI */}
        <div className="w-full">

          {/* ── Seer ── */}
          {role === 'Seer' && (
            <SeerAction
              playerIdx={playerIdx}
              playerCount={playerCount}
              playerNames={playerNames}
              onPeekPlayer={targetIdx => seerPeekPlayer(playerIdx, targetIdx)}
              onPeekCenter={(c1, c2) => seerPeekCenter(playerIdx, c1, c2)}
            />
          )}

          {/* ── Robber ── */}
          {role === 'Robber' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground/70 text-center">
                Pick a player to rob. You'll swap cards and see your new role.
              </p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: playerCount }, (_, i) => {
                  if (i === playerIdx) return null;
                  return (
                    <SelectableCard
                      key={i}
                      label={getDisplayName(playerNames, i)}
                      onClick={() => robberSwap(playerIdx, i)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Troublemaker ── */}
          {role === 'Troublemaker' && (
            <TroublemakerAction
              playerIdx={playerIdx}
              playerCount={playerCount}
              playerNames={playerNames}
              onSwap={(a, b) => troublemakerSwap(playerIdx, a, b)}
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
                    onClick={() => drunkSwap(playerIdx, ci)}
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
                onClick={() => insomniacPeek(playerIdx)}
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
                Look at one player's card and imitate that role (no swap).
              </p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: playerCount }, (_, i) => {
                  if (i === playerIdx) return null;
                  return (
                    <SelectableCard
                      key={i}
                      label={getDisplayName(playerNames, i)}
                      onClick={() => shapeshifterPeek(playerIdx, i)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Werewolf ── */}
          {role === 'Werewolf' && (
            <div className="flex flex-col gap-4">
              {partners.length > 0 ? (
                <div className="rounded-xl border border-red-700/40 bg-red-950/30 p-4">
                  <p className="text-xs uppercase tracking-widest text-red-400/70 mb-2">
                    Your werewolf {partners.length === 1 ? 'partner' : 'pack'}
                  </p>
                  {partners.map(pi => (
                    <div key={pi} className="flex items-center gap-3 py-1">
                      <Skull className="w-4 h-4 text-red-400" />
                      <span className="font-serif text-lg text-foreground">
                        {getDisplayName(playerNames, pi)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-red-700/40 bg-red-950/30 p-4">
                  <p className="text-xs uppercase tracking-widest text-red-400/70 mb-1">Lone Wolf</p>
                  <p className="text-sm text-foreground/70">
                    You are the only werewolf. You may peek at one center card (optional).
                  </p>
                </div>
              )}

              {/* Lone wolf: OPTIONAL center peek */}
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
                        onClick={() => werewolfPeekCenter(playerIdx, ci)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Done button — always available for Werewolf, including lone wolf who may skip */}
              <Button
                onClick={() =>
                  handleDone(
                    playerIdx,
                    partners.length > 0
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
                {masonPartners(playerIdx).length > 0 ? (
                  <>
                    <p className="text-xs uppercase tracking-widest text-blue-400/70 mb-2">
                      Your fellow Mason
                    </p>
                    {masonPartners(playerIdx).map(pi => (
                      <div key={pi} className="flex items-center gap-3 py-1">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="font-serif text-lg text-foreground">
                          {getDisplayName(playerNames, pi)}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest text-blue-400/70 mb-1">
                      Lone Mason
                    </p>
                    <p className="text-sm text-foreground/70">
                      The other Mason card is in the center. You are the only Mason awake.
                    </p>
                  </>
                )}
              </div>
              <Button
                onClick={() => handleDone(playerIdx, "You've identified your fellow Mason. Close your eyes.")}
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
                    <p className="text-xs uppercase tracking-widest text-red-400/70 mb-2">
                      The werewolves are
                    </p>
                    {werewolfIndices().map(pi => (
                      <div key={pi} className="flex items-center gap-3 py-1">
                        <Skull className="w-4 h-4 text-red-400" />
                        <span className="font-serif text-lg text-foreground">
                          {getDisplayName(playerNames, pi)}
                        </span>
                      </div>
                    ))}
                    <p className="text-xs text-red-400/50 mt-2">
                      They don't know you're the Minion.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest text-red-400/70 mb-1">
                      No Werewolves
                    </p>
                    <p className="text-sm text-foreground/70">
                      All werewolf cards are in the center. As Minion, you win only if no one is eliminated.
                    </p>
                  </>
                )}
              </div>
              <Button
                onClick={() => handleDone(playerIdx, "You've seen the werewolves. Close your eyes.")}
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
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {getDisplayName(playerNames, p.playerIdx)} sees
        </p>
      </div>

      <div className={cn('flex gap-4 justify-center', p.cards.length === 1 ? 'scale-110' : '')}>
        {p.cards.map((c, i) => (
          <PeekCard key={i} card={c.card} label={c.label} />
        ))}
      </div>

      <Button
        onClick={() => afterPeeking(p.playerIdx)}
        variant="outline"
        className="w-full h-12 font-serif tracking-wider border-border/50 hover:bg-card text-foreground"
      >
        <EyeOff className="w-4 h-4 mr-2" /> Hide & Close Eyes
      </Button>
    </motion.div>
  );

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
          {phase.kind === 'action'   && renderAction(phase.playerIdx)}
          {phase.kind === 'peeking'  && renderPeeking(phase)}
          {phase.kind === 'complete' && renderComplete(phase)}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Seer sub-component ───────────────────────────────────────────────────────

function SeerAction({
  playerIdx, playerCount, playerNames, onPeekPlayer, onPeekCenter,
}: {
  playerIdx: number;
  playerCount: number;
  playerNames: string[];
  onPeekPlayer: (targetIdx: number) => void;
  onPeekCenter: (c1: number, c2: number) => void;
}) {
  const [mode, setMode] = useState<'choose' | 'player' | 'center'>('choose');
  const [firstCenter, setFirstCenter] = useState<number | null>(null);

  if (mode === 'choose') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/70 text-center">Choose what to look at:</p>
        <Button
          onClick={() => setMode('player')}
          variant="outline"
          className="w-full h-12 font-serif tracking-wider"
        >
          <User className="w-4 h-4 mr-2" /> 1 Player's Card
        </Button>
        <Button
          onClick={() => setMode('center')}
          variant="outline"
          className="w-full h-12 font-serif tracking-wider"
        >
          <Moon className="w-4 h-4 mr-2" /> 2 Center Cards
        </Button>
      </div>
    );
  }

  if (mode === 'player') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/70 text-center">Pick a player to look at:</p>
        <div className="flex flex-col gap-2">
          {Array.from({ length: playerCount }, (_, i) => {
            if (i === playerIdx) return null;
            return (
              <SelectableCard
                key={i}
                label={getDisplayName(playerNames, i)}
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
  playerIdx, playerCount, playerNames, onSwap,
}: {
  playerIdx: number;
  playerCount: number;
  playerNames: string[];
  onSwap: (a: number, b: number) => void;
}) {
  const [first, setFirst] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/70 text-center">
        {first === null
          ? 'Pick the first player to swap (not yourself):'
          : 'Now pick the second player to swap with:'}
      </p>
      <div className="flex flex-col gap-2">
        {Array.from({ length: playerCount }, (_, i) => {
          if (i === playerIdx) return null;
          return (
            <SelectableCard
              key={i}
              label={getDisplayName(playerNames, i)}
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
          ← Pick different first player
        </button>
      )}
    </div>
  );
}
