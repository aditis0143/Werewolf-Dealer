export type Faction = 'Village' | 'Werewolf' | 'Tanner' | 'Alternating';

export interface RoleDef {
  id: string;
  baseRole: string;
  faction: Faction;
  difficulty: number;
  nightOrder: number | null; // null for "No night action"
  description: string;
  tip: string;
  copyNumber?: number; // 1, 2, or 3 for duplicates
}

export const BASE_ROLES = [
  {
    baseRole: 'Werewolf',
    faction: 'Werewolf' as Faction,
    difficulty: 1,
    nightOrder: 2,
    description: 'Both wake to identify each other. Lone wolf (only 1 werewolf in play): may look at 1 center card.',
    tip: "Claim to be a villager. Lone wolf can claim the center card's role."
  },
  {
    baseRole: 'Villager',
    faction: 'Village' as Faction,
    difficulty: 1,
    nightOrder: null,
    description: 'No special ability.',
    tip: "Be clear you're a villager — werewolves will also claim this."
  },
  {
    baseRole: 'Seer',
    faction: 'Village' as Faction,
    difficulty: 1,
    nightOrder: 5,
    description: 'Look at one player\'s card OR two center cards. Does not swap.',
    tip: 'Wait before revealing — let werewolves incriminate themselves first.'
  },
  {
    baseRole: 'Robber',
    faction: 'Village' as Faction,
    difficulty: 1,
    nightOrder: 6,
    description: 'Swap your card with any player\'s card, then look at your new card. You join that card\'s faction.',
    tip: 'You may have switched teams overnight.'
  },
  {
    baseRole: 'Troublemaker',
    faction: 'Village' as Faction,
    difficulty: 1,
    nightOrder: 7,
    description: 'Swap two OTHER players\' cards without looking.',
    tip: 'Remember who you swapped — their starting roles are now reversed.'
  },
  {
    baseRole: 'Drunk',
    faction: 'Village' as Faction,
    difficulty: 2,
    nightOrder: 8,
    description: 'Swap your card with one center card without looking. You don\'t know your new role.',
    tip: 'You might be a werewolf without knowing it.'
  },
  {
    baseRole: 'Insomniac',
    faction: 'Village' as Faction,
    difficulty: 1,
    nightOrder: 9,
    description: 'Wake last and check if your card changed.',
    tip: 'Only useful when Robber or Troublemaker is in play.'
  },
  {
    baseRole: 'Hunter',
    faction: 'Village' as Faction,
    difficulty: 2,
    nightOrder: null,
    description: 'If you die in the vote, the player you\'re pointing at also dies.',
    tip: 'Try to get killed while pointing at a suspected werewolf.'
  },
  {
    baseRole: 'Mason',
    faction: 'Village' as Faction,
    difficulty: 3,
    nightOrder: 4,
    description: 'Both Masons wake and see each other. If only one Mason wakes, the other is in the center.',
    tip: 'Recommended only with 7+ players — too powerful in small games.'
  },
  {
    baseRole: 'Tanner',
    faction: 'Tanner' as Faction,
    difficulty: 2,
    nightOrder: null,
    description: 'Wins ONLY if they die. If Tanner dies alongside werewolves, both Tanner and village win. If Tanner dies alone, only Tanner wins.',
    tip: 'Act suspicious to get voted out.'
  },
  {
    baseRole: 'Minion',
    faction: 'Werewolf' as Faction,
    difficulty: 2,
    nightOrder: 3,
    description: 'Wakes after werewolves. Werewolves raise thumbs (eyes closed) so Minion sees them. Werewolves don\'t know who the Minion is. If no werewolves: Minion wins only if they survive and another dies.',
    tip: 'You can sacrifice yourself to protect the werewolves.'
  },
  {
    baseRole: 'Shapeshifter',
    faction: 'Alternating' as Faction,
    difficulty: 3,
    nightOrder: 1,
    description: 'Wakes first and looks at one player\'s card, imitating that role without swapping.',
    tip: 'At game end, reveal which card you looked at.'
  }
];

export const ALL_CARDS: RoleDef[] = [
  { ...BASE_ROLES.find(r => r.baseRole === 'Werewolf')!, id: 'werewolf-1', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Werewolf')!, id: 'werewolf-2', copyNumber: 2 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Villager')!, id: 'villager-1', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Villager')!, id: 'villager-2', copyNumber: 2 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Villager')!, id: 'villager-3', copyNumber: 3 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Seer')!, id: 'seer', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Robber')!, id: 'robber', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Troublemaker')!, id: 'troublemaker', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Drunk')!, id: 'drunk', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Insomniac')!, id: 'insomniac', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Hunter')!, id: 'hunter', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Mason')!, id: 'mason-1', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Mason')!, id: 'mason-2', copyNumber: 2 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Tanner')!, id: 'tanner', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Minion')!, id: 'minion', copyNumber: 1 },
  { ...BASE_ROLES.find(r => r.baseRole === 'Shapeshifter')!, id: 'shapeshifter', copyNumber: 1 },
];

export const SCENARIOS = [
  {
    id: 'first-night',
    name: 'The First Night',
    difficulty: 'intro',
    minPlayers: 3,
    maxPlayers: 5,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'werewolf-2', 'seer', 'robber', 'troublemaker', 'villager-1'];
      if (players >= 4) base.push('villager-2');
      if (players >= 5) base.push('villager-3');
      return base;
    }
  },
  {
    id: 'moonstruck',
    name: 'Moonstruck',
    difficulty: 'easy',
    minPlayers: 3,
    maxPlayers: 6,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'werewolf-2', 'insomniac', 'robber', 'troublemaker', 'villager-1'];
      if (players >= 4) base.push('villager-2');
      if (players >= 5) base.push('seer');
      if (players >= 6) base.push('villager-3');
      return base;
    }
  },
  {
    id: 'lonely-night',
    name: 'Lonely Night',
    difficulty: 'easy',
    minPlayers: 3,
    maxPlayers: 4,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'seer', 'robber', 'troublemaker', 'villager-1', 'villager-2'];
      if (players >= 4) base.push('villager-3');
      return base;
    }
  },
  {
    id: 'confusion',
    name: 'Confusion',
    difficulty: 'medium',
    minPlayers: 3,
    maxPlayers: 9,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'werewolf-2', 'drunk', 'robber', 'troublemaker', 'insomniac'];
      if (players >= 4) base.push('villager-1');
      if (players >= 5) base.push('seer');
      if (players >= 6) base.push('villager-2');
      if (players >= 7) base.push('villager-3');
      if (players >= 8) base.push('minion');
      if (players >= 9) base.push('mason-1', 'mason-2');
      return base;
    }
  },
  {
    id: 'payback',
    name: 'Payback',
    difficulty: 'medium',
    minPlayers: 4,
    maxPlayers: 7,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'werewolf-2', 'hunter', 'seer', 'robber', 'drunk', 'insomniac'];
      if (players >= 5) base.push('troublemaker');
      if (players >= 6) base.push('villager-1');
      if (players >= 7) base.push('villager-2');
      return base;
    }
  },
  {
    id: 'secret-companions',
    name: 'Secret Companions',
    difficulty: 'medium',
    minPlayers: 6,
    maxPlayers: 7,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'werewolf-2', 'minion', 'hunter', 'seer', 'robber', 'troublemaker', 'mason-1', 'mason-2'];
      if (players >= 7) base.push('villager-1');
      return base;
    }
  },
  {
    id: 'hours-of-despair',
    name: 'Hours of Despair',
    difficulty: 'medium',
    minPlayers: 4,
    maxPlayers: 13,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'werewolf-2', 'tanner', 'seer', 'robber', 'drunk', 'insomniac'];
      if (players >= 5) base.push('troublemaker');
      if (players >= 6) base.push('villager-1');
      if (players >= 7) base.push('mason-1', 'mason-2');
      if (players >= 8) base.push('hunter');
      if (players >= 9) base.push('minion');
      if (players >= 10) base.push('villager-2');
      if (players >= 12) base.push('shapeshifter');
      if (players >= 13) base.push('villager-3');
      return base;
    }
  },
  {
    id: 'twilight-alliance',
    name: 'Twilight Alliance',
    difficulty: 'hard',
    minPlayers: 5,
    maxPlayers: 13,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'werewolf-2', 'mason-1', 'mason-2', 'minion', 'robber', 'troublemaker', 'insomniac'];
      if (players >= 6) base.push('drunk');
      if (players >= 7) base.push('seer');
      if (players >= 8) base.push('villager-1');
      if (players >= 9) base.push('villager-2');
      if (players >= 10) base.push('tanner');
      if (players >= 11) base.push('hunter');
      if (players >= 12) base.push('shapeshifter');
      if (players >= 13) base.push('villager-3');
      return base;
    }
  },
  {
    id: 'revenant',
    name: 'Revenant',
    difficulty: 'hard',
    minPlayers: 8,
    maxPlayers: 13,
    getCards: (players: number) => {
      const base = ['werewolf-1', 'werewolf-2', 'shapeshifter', 'minion', 'hunter', 'seer', 'robber', 'troublemaker', 'villager-1', 'mason-1', 'mason-2'];
      if (players >= 9) base.push('insomniac');
      if (players >= 10) base.push('drunk');
      if (players >= 11) base.push('villager-2');
      if (players >= 12) base.push('villager-3');
      if (players >= 13) base.push('tanner');
      return base;
    }
  },
  {
    id: 'anarchy',
    name: 'Anarchy',
    difficulty: 'hard',
    minPlayers: 3,
    maxPlayers: 13,
    getCards: (players: number) => {
      // Base required for anarchy
      const base = ['werewolf-1', 'werewolf-2', 'villager-1'];
      // It returns the fixed ones; the UI has a special button to randomize the rest
      return base;
    }
  }
];

// Helper to shuffle cards using Fisher-Yates
export function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
