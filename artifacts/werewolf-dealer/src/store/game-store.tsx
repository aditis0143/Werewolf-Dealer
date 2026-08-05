import React, { createContext, useContext, useState, ReactNode } from 'react';
import { RoleDef, ALL_CARDS, shuffle } from '@/lib/game-data';

const defaultName = (i: number) => `Player ${i + 1}`;
const makeNames = (count: number) => Array.from({ length: count }, (_, i) => defaultName(i));

interface GameState {
  playerCount: number;
  playerNames: string[];
  selectedCardIds: string[];
  dealtCards: RoleDef[];

  setPlayerCount: (count: number) => void;
  setPlayerName: (index: number, name: string) => void;
  toggleCard: (id: string) => void;
  setCards: (ids: string[]) => void;

  deal: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [playerCount, setPlayerCountRaw] = useState(5);
  const [playerNames, setPlayerNames] = useState<string[]>(makeNames(5));
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [dealtCards, setDealtCards] = useState<RoleDef[]>([]);

  const setPlayerCount = (count: number) => {
    setPlayerCountRaw(count);
    setPlayerNames(prev => {
      const next = [...prev];
      while (next.length < count) next.push(defaultName(next.length));
      return next.slice(0, count);
    });
  };

  const setPlayerName = (index: number, name: string) => {
    setPlayerNames(prev => {
      const next = [...prev];
      next[index] = name;
      return next;
    });
  };

  const toggleCard = (id: string) => {
    setSelectedCardIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const setCards = (ids: string[]) => {
    setSelectedCardIds(ids);
  };

  const deal = () => {
    const cardsToDeal = selectedCardIds.map(id => ALL_CARDS.find(c => c.id === id)!).filter(Boolean);
    setDealtCards(shuffle(cardsToDeal));
  };

  const resetGame = () => {
    setDealtCards([]);
  };

  const value = {
    playerCount,
    playerNames,
    selectedCardIds,
    dealtCards,
    setPlayerCount,
    setPlayerName,
    toggleCard,
    setCards,
    deal,
    resetGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

/** Returns the stored name, falling back to "Player N" if blank. */
export function getDisplayName(names: string[], index: number): string {
  const n = names[index]?.trim();
  return n || defaultName(index);
}
