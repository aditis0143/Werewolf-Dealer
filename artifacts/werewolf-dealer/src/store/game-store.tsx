import React, { createContext, useContext, useState, ReactNode } from 'react';
import { RoleDef, ALL_CARDS, shuffle } from '@/lib/game-data';

interface GameState {
  playerCount: number;
  selectedCardIds: string[];
  dealtCards: RoleDef[];
  
  setPlayerCount: (count: number) => void;
  toggleCard: (id: string) => void;
  setCards: (ids: string[]) => void;
  
  deal: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [playerCount, setPlayerCount] = useState(5);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [dealtCards, setDealtCards] = useState<RoleDef[]>([]);

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
    selectedCardIds,
    dealtCards,
    setPlayerCount,
    toggleCard,
    setCards,
    deal,
    resetGame
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
