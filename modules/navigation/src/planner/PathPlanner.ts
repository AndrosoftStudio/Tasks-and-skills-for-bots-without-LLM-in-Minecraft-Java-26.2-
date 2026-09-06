import type { NavigationGoal, NavigationNode, NavigationOptions, PathSearchResult } from '../types/navigation.js'
export interface PathPlanner { findPath(start:NavigationNode,goal:NavigationGoal,options?:NavigationOptions,signal?:AbortSignal):Promise<PathSearchResult> }
