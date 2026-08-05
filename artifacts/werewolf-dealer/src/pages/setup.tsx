import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGame } from '@/store/game-store';
import { ALL_CARDS, SCENARIOS } from '@/lib/game-data';
import { RoleCardToggle } from '@/components/RoleCardToggle';
import { RulebookDrawer } from '@/components/RulebookDrawer';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Dices, Check } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const { 
    playerCount, 
    setPlayerCount, 
    selectedCardIds, 
    toggleCard, 
    setCards,
    deal 
  } = useGame();

  const requiredCards = playerCount + 3;
  const isReady = selectedCardIds.length === requiredCards;

  const handleStart = () => {
    if (!isReady) return;
    deal();
    setLocation('/deal');
  };

  const applyScenario = (scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    let targetPlayers = playerCount;
    if (playerCount < scenario.minPlayers) targetPlayers = scenario.minPlayers;
    if (playerCount > scenario.maxPlayers) targetPlayers = scenario.maxPlayers;
    
    setPlayerCount(targetPlayers);
    const cards = scenario.getCards(targetPlayers);
    setCards(cards);
  };

  const randomizeAnarchy = () => {
    setPlayerCount(playerCount);
    // Base required for anarchy
    const base = ['werewolf-1', 'werewolf-2', 'villager-1'];
    const remainingToPick = (playerCount + 3) - base.length;
    
    const available = ALL_CARDS.map(c => c.id).filter(id => !base.includes(id));
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, remainingToPick);
    
    setCards([...base, ...picked]);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-destructive/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-8 flex-1 flex flex-col relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl text-primary tracking-widest drop-shadow-md">
            THE DEALER
          </h1>
          <RulebookDrawer />
        </div>

        {/* Player Count */}
        <div className="mb-8 p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-serif text-xl text-foreground mb-1">Gather the Village</h2>
            <p className="text-sm text-muted-foreground">Select the number of players at the table.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              className="h-12 w-12 rounded-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={() => setPlayerCount(Math.max(3, playerCount - 1))}
              disabled={playerCount <= 3}
            >
              <Minus className="w-5 h-5" />
            </Button>
            <div className="w-12 text-center font-serif text-3xl text-foreground">
              {playerCount}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              className="h-12 w-12 rounded-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={() => setPlayerCount(Math.min(10, playerCount + 1))}
              disabled={playerCount >= 10}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scenarios */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-foreground">Scenarios</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Quick Setup</p>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-3 px-1">
              {SCENARIOS.map(scenario => {
                const isValidForCurrentCount = playerCount >= scenario.minPlayers && playerCount <= scenario.maxPlayers;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      if (scenario.id === 'anarchy') {
                        randomizeAnarchy();
                      } else {
                        applyScenario(scenario.id);
                      }
                    }}
                    className="flex flex-col items-start p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-card hover:border-primary/50 transition-colors w-40"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                        scenario.difficulty === 'intro' ? 'text-green-400 bg-green-400/10' :
                        scenario.difficulty === 'easy' ? 'text-blue-400 bg-blue-400/10' :
                        scenario.difficulty === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
                        'text-red-400 bg-red-400/10'
                      }`}>
                        {scenario.difficulty}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {scenario.minPlayers}-{scenario.maxPlayers}P
                      </span>
                    </div>
                    <span className="font-serif text-sm text-foreground text-left whitespace-normal leading-tight">
                      {scenario.name}
                    </span>
                    {scenario.id === 'anarchy' && (
                      <div className="mt-2 flex items-center text-xs text-primary">
                        <Dices className="w-3 h-3 mr-1" /> Randomize
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Roles Grid */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-foreground">The Deck</h2>
            <div className={`text-sm px-3 py-1 rounded-full border ${isReady ? 'border-primary/50 text-primary bg-primary/10' : 'border-destructive/50 text-destructive bg-destructive/10'}`}>
              <span className="font-bold">{selectedCardIds.length}</span> / {requiredCards} cards
            </div>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
            {ALL_CARDS.map(role => (
              <RoleCardToggle
                key={role.id}
                role={role}
                selected={selectedCardIds.includes(role.id)}
                onClick={() => toggleCard(role.id)}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm">
            {!isReady ? (
              <span className="text-destructive font-medium">
                {selectedCardIds.length < requiredCards 
                  ? `Select ${requiredCards - selectedCardIds.length} more` 
                  : `Remove ${selectedCardIds.length - requiredCards} cards`}
              </span>
            ) : (
              <span className="text-primary font-medium flex items-center">
                <Check className="w-4 h-4 mr-2" /> Deck ready
              </span>
            )}
          </div>
          
          <Button 
            size="lg" 
            className={`font-serif text-lg tracking-widest px-8 transition-all duration-500 ${
              isReady 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
            }`}
            onClick={handleStart}
            disabled={!isReady}
          >
            Deal Cards
          </Button>
        </div>
      </div>

    </div>
  );
}
