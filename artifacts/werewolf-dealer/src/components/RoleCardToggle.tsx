import React from 'react';
import { RoleDef } from '@/lib/game-data';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface RoleCardToggleProps {
  role: RoleDef;
  selected: boolean;
  onClick: () => void;
}

export function RoleCardToggle({ role, selected, onClick }: RoleCardToggleProps) {
  const isWolf = role.faction === 'Werewolf';
  const isVillage = role.faction === 'Village';
  const isTanner = role.faction === 'Tanner';

  const romanNumeral = (num?: number) => {
    if (!num || num === 1) return '';
    return num === 2 ? ' II' : num === 3 ? ' III' : '';
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden border-2 transition-all duration-300 flex flex-col justify-between p-3 text-left group",
        selected 
          ? "border-primary bg-card/80 shadow-[0_0_15px_rgba(212,175,55,0.15)] transform scale-[1.02]" 
          : "border-border/40 bg-card/40 hover:border-primary/50 hover:bg-card/60 grayscale-[0.5] opacity-70"
      )}
    >
      {/* Background texture gradient */}
      <div className={cn(
        "absolute inset-0 opacity-20 bg-gradient-to-br",
        isWolf ? "from-destructive/40 to-transparent" :
        isVillage ? "from-blue-500/30 to-transparent" :
        isTanner ? "from-orange-500/30 to-transparent" :
        "from-purple-500/30 to-transparent"
      )} />

      {/* Selected Indicator */}
      <div className={cn(
        "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity duration-300 z-10",
        selected ? "bg-primary text-primary-foreground opacity-100" : "opacity-0"
      )}>
        <Check className="w-4 h-4" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-primary text-[10px]">
            {'⭐'.repeat(role.difficulty)}
          </span>
        </div>
        <h3 className="font-serif text-base leading-tight text-foreground shadow-black drop-shadow-md">
          {role.baseRole}
          {romanNumeral(role.copyNumber)}
        </h3>
        
        <div className="mt-1">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-sm border uppercase tracking-wider font-semibold shadow-black drop-shadow-md",
            isWolf ? "text-destructive border-destructive/30 bg-destructive/10" :
            isVillage ? "text-blue-300 border-blue-400/30 bg-blue-400/10" :
            isTanner ? "text-orange-300 border-orange-400/30 bg-orange-400/10" :
            "text-purple-300 border-purple-400/30 bg-purple-400/10"
          )}>
            {role.faction}
          </span>
        </div>
      </div>

      <div className="relative z-10">
        {role.nightOrder ? (
          <div className="text-[10px] text-primary/80 uppercase tracking-widest font-semibold border-t border-primary/20 pt-1">
            Wake: {role.nightOrder}
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold border-t border-border/20 pt-1">
            No Wake
          </div>
        )}
      </div>
    </button>
  );
}
