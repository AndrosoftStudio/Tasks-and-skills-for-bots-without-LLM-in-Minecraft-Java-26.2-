import type { NavigationNode } from '../types/navigation.js'
export class HazardCostModel{score(node:NavigationNode):number{const h=node.metadata?.hazard;if(!h)return 0;if(h.includes('lava'))return Infinity;if(h.includes('fire')||h.includes('cactus')||h.includes('campfire'))return 25;if(h.includes('magma')||h.includes('powder_snow'))return 18;return 10}}
