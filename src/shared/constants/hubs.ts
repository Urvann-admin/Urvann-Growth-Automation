// Hub and Substores mapping
export interface HubMapping {
  hub: string;
  substores: string[];
}

export const HUB_MAPPINGS: HubMapping[] = [
  { hub: 'Whitefield', substores: ['bgl-e', 'bgl-e2'] },
  { hub: 'Thanissandra', substores: ['bgl-n', 'bgl-n2'] },
  { hub: 'HSR', substores: ['bgl-s1', 'bgl-s2', 'bgl-w1', 'bgl-w2'] },
  { hub: 'Noida', substores: ['noi', 'greaternoida', 'kalkaji', 'greaternoida-west'] },
  { hub: 'Rohini', substores: ['roh'] },
  { hub: 'Dwarka', substores: ['dwarka', 'uttam', 'vasantkunj'] },
  { hub: 'Faridabad', substores: ['dncr'] },
  { hub: 'Ghaziabad', substores: ['ghaziabad', 'gzb', 'east-delhi'] },
  { hub: 'Gurugram', substores: ['gurugram'] },
  { hub: 'India', substores: ['india', 'rest-of-india', 'ahmedabad', 'pune', 'hyderabad', 'mumbai', 'kolkata', 'chandigarh', 'all-over-india'] },
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
    'rest-of-india': 'ROI',
    'all-over-india': 'AOI',
  };
  
  return displayMap[substore.toLowerCase()] || substore.toUpperCase();
};


