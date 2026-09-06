import type { Neighbor } from '../world/NeighborGenerator.js'
import type { NavigationOptions } from '../types/navigation.js'
const actionMultiplier:Record<string,number>={walk:1,jump:1.55,step_up:1.3,step_down:1.1,drop:1.45,swim:2.8,climb:2.1,open_door:3.5}
export class NavigationCostModel{cost(n:Neighbor,o:NavigationOptions={}):number{const p=o.profile??'normal';let v=n.baseDistance*(actionMultiplier[n.action]??1);v+=n.hazardScore*(p==='safe'?8:p==='fast'?1.5:4);const b=n.node.metadata?.blockBelow??'';if(b.includes('soul_sand'))v*=2.2;if(b.includes('honey'))v*=1.8;if(b.includes('ice'))v*=p==='safe'?1.35:1.05;if(b.includes('slime'))v*=1.2;if(n.node.metadata?.requiresInteraction)v+=8;return v}estimatedSeconds(cost:number):number{return cost/4.1}}
