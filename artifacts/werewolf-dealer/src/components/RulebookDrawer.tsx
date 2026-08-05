import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { BASE_ROLES } from '@/lib/game-data';

export function RulebookDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/10 transition-colors">
          <BookOpen className="w-4 h-4" />
          Rulebook
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-card border-l-border/50 text-card-foreground p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle className="font-serif text-2xl text-primary tracking-wide">
            Grimoire of Rules
          </SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="how-to-play" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-2">
            <TabsList className="w-full grid grid-cols-2 bg-background">
              <TabsTrigger value="how-to-play">How to Play</TabsTrigger>
              <TabsTrigger value="roles">Roles Guide</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="how-to-play" className="mt-0 space-y-6 text-sm text-muted-foreground leading-relaxed">
                <section>
                  <h3 className="text-lg font-serif text-foreground mb-2">Setup</h3>
                  <p>Shuffle the selected cards (Player Count + 3). Deal one card face-down to each player. Place the remaining 3 cards face-down in the center.</p>
                </section>
                
                <section>
                  <h3 className="text-lg font-serif text-foreground mb-2">The Night</h3>
                  <p>Everyone closes their eyes. Roles wake up in a specific order to perform their night actions. Only one role wakes at a time.</p>
                </section>
                
                <section>
                  <h3 className="text-lg font-serif text-foreground mb-2">The Day</h3>
                  <p>Everyone opens their eyes. Players have a limited time (usually 5-10 minutes) to discuss, lie, and deduce who the werewolves are. You may claim any role, but you may NEVER look at your card again during the day.</p>
                </section>
                
                <section>
                  <h3 className="text-lg font-serif text-foreground mb-2">The Vote</h3>
                  <p>After time is up, players count "3, 2, 1" and simultaneously point at one other player. The player with the most votes dies.</p>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    <li>If there is a tie, all tied players die.</li>
                    <li>If everyone receives exactly 1 vote, no one dies.</li>
                  </ul>
                </section>
                
                <section>
                  <h3 className="text-lg font-serif text-foreground mb-2">Win Conditions</h3>
                  <ul className="list-disc pl-4 space-y-2">
                    <li><strong>Village Team:</strong> Wins if at least one Werewolf dies. If no Werewolves are in play, they win ONLY if no one dies.</li>
                    <li><strong>Werewolf Team:</strong> Wins if no Werewolf dies.</li>
                    <li><strong>Tanner:</strong> Wins ONLY if they die. If they die alongside a Werewolf, both Tanner and Village win.</li>
                    <li><strong>Switched Cards:</strong> The card in front of you at the end of the game is your team. It doesn't matter what your starting card was.</li>
                  </ul>
                </section>
              </TabsContent>
              
              <TabsContent value="roles" className="mt-0 space-y-6">
                {BASE_ROLES.sort((a, b) => {
                  if (a.nightOrder && b.nightOrder) return a.nightOrder - b.nightOrder;
                  if (a.nightOrder) return -1;
                  if (b.nightOrder) return 1;
                  return a.baseRole.localeCompare(b.baseRole);
                }).map(role => (
                  <div key={role.baseRole} className="border border-border/50 rounded-lg p-4 bg-background/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-serif text-lg text-foreground tracking-wide">{role.baseRole}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border border-border/50 ${
                          role.faction === 'Werewolf' ? 'text-destructive bg-destructive/10' :
                          role.faction === 'Village' ? 'text-blue-400 bg-blue-400/10' :
                          role.faction === 'Tanner' ? 'text-orange-400 bg-orange-400/10' :
                          'text-purple-400 bg-purple-400/10'
                        }`}>
                          {role.faction}
                        </span>
                        <span className="text-primary text-xs" title={`Difficulty: ${role.difficulty}`}>
                          {'⭐'.repeat(role.difficulty)}
                        </span>
                      </div>
                    </div>
                    {role.nightOrder && (
                      <div className="text-xs text-primary/70 mb-2 uppercase tracking-widest font-semibold">
                        Night Order: {role.nightOrder}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {role.description}
                    </p>
                    <div className="bg-primary/5 border border-primary/20 rounded p-2 text-xs text-primary/90 italic">
                      <span className="font-semibold not-italic">Tip:</span> {role.tip}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
