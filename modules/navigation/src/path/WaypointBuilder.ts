import type { NavigationNode, NavigationWaypoint } from '../types/navigation.js'
import { nodePosition } from '../utils/math.js'
export class WaypointBuilder { build(nodes:NavigationNode[]):NavigationWaypoint[]{ return nodes.slice(1).map(n=>({position:nodePosition(n),action:n.actionFromParent??'walk',mode:n.mode,tolerance:n.actionFromParent==='walk'?0.65:0.8,requiresInteraction:n.metadata?.requiresInteraction})) } }
