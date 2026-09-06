import type { NavigationGoal, NavigationNode } from '../types/navigation.js'
import { octile3DHeuristic } from '../utils/math.js'
export interface NavigationHeuristic { estimate(node:NavigationNode,goal:NavigationGoal):number }
export class MinecraftHeuristic implements NavigationHeuristic { estimate(node:NavigationNode,goal:NavigationGoal):number{return octile3DHeuristic(node,goal)} }
