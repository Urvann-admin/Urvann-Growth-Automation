// Hub and Substores mapping
export interface HubMapping {
  hub: string;
  substores: string[];
}

export const HUB_MAPPINGS: HubMapping[] = [
  { hub: 'Whitefield', substores: ['bgl-e', 'bgl-e2'] },
  { hub: 'Thanissandra', substores: ['bgl-n', 'bgl-n2'] },
  { hub: 'HSR', substores: ['bgl-s1', 'bgl-s2', 'bgl-w1', 'bgl-w2'] },
  { hub: 'Noi', substores: ['noi'] },
  { hub: 'Ghaziabad', substores: ['ghaziabad'] },
  { hub: 'Chhatarpur', substores: ['sdel', 'sdelhi'] },
  { hub: 'Rohini', substores: ['rohini'] },
  { hub: 'Roh', substores: ['roh'] },
  { hub: 'Uttam', substores: ['uttam'] },
  { hub: 'Dwarka', substores: ['dwarka'] },
  { hub: 'dncr', substores: ['dncr'] },
  { hub: 'Gurugram', substores: ['gurugram'] },
  { hub: 'Greater Noida', substores: ['greaternoida'] },
  { hub: 'Kalkaji', substores: ['kalkaji'] },
  { hub: 'Vasant Kunj', substores: ['vasantkunj'] },
  { hub: 'India', substores: ['india'] },
];

// Helper functions
export const getAllSubstores = (): string[] => {
  return HUB_MAPPINGS.flatMap(mapping => mapping.substores);
};

export const getSubstoresByHub = (hub: string): string[] => {
  const mapping = HUB_MAPPINGS.find(m => m.hub === hub);
  return mapping ? mapping.substores : [];
};

export const getHubBySubstore = (substore: string): string | null => {
  const mapping = HUB_MAPPINGS.find(m => m.substores.includes(substore));
  return mapping ? mapping.hub : null;
};

// Format substore names for UI display
export const formatSubstoreForDisplay = (substore: string): string => {
  const displayMap: Record<string, string> = {
    'greaternoida': 'GREATERN',
    'vasantkunj': 'VASANTK',
    'ghaziabad': 'GZB',
  };
  
  return displayMap[substore.toLowerCase()] || substore.toUpperCase();
};


