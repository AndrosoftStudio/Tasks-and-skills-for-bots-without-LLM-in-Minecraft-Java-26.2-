import type { NavigationGoal, NavigationHazard, NavigationNode, NavigationOptions, NavigationPath, PathSearchResult } from '../types/navigation.js'
import type { PathPlanner } from './PathPlanner.js'
import { PriorityQueue } from './PriorityQueue.js'
import type { NavigationHeuristic } from './NavigationHeuristic.js'
import { MinecraftHeuristic } from './NavigationHeuristic.js'
import { NeighborGenerator } from '../world/NeighborGenerator.js'
import { NavigationCostModel } from '../cost/NavigationCostModel.js'
import { WaypointBuilder } from '../path/WaypointBuilder.js'
import { distance3D, goalSatisfied, nodeKey, nodePosition } from '../utils/math.js'
import { throwIfAborted } from '../utils/async.js'
interface CameFrom { parentKey:string; node:NavigationNode }
export class AStarPlanner implements PathPlanner {
  constructor(private readonly neighbors:NeighborGenerator,private readonly costs:NavigationCostModel,private readonly heuristic:NavigationHeuristic=new MinecraftHeuristic(),private readonly waypointBuilder:WaypointBuilder=new WaypointBuilder()){}
  async findPath(start:NavigationNode,goal:NavigationGoal,options:NavigationOptions={},signal?:AbortSignal):Promise<PathSearchResult>{
    const startedAt=Date.now(),timeout=Math.max(1,options.timeout??8_000),maxExpanded=Math.max(1,options.maxExpandedNodes??25_000),maxDistance=Math.max(1,options.maxDistance??256)
    const open=new PriorityQueue<NavigationNode>(),startKey=nodeKey(start),g=new Map<string,number>([[startKey,0]]),came=new Map<string,CameFrom>(),nodes=new Map<string,NavigationNode>([[startKey,start]]),closed=new Set<string>()
    open.push(start,this.heuristic.estimate(start,goal));let expanded=0,encounteredUnknown=false
    while(open.size>0){throwIfAborted(signal);if(Date.now()-startedAt>timeout)return{success:false,status:'timeout',expandedNodes:expanded,reason:`Path search timed out after ${timeout}ms`,durationMs:Date.now()-startedAt};if(expanded>=maxExpanded)return{success:false,status:'search_limit',expandedNodes:expanded,reason:`Expanded node limit ${maxExpanded} reached`,durationMs:Date.now()-startedAt};const current=open.pop()!,currentKey=nodeKey(current);if(closed.has(currentKey))continue;closed.add(currentKey);expanded++;if(goalSatisfied(current,goal)){const path=this.buildPath(currentKey,startKey,came,nodes,g.get(currentKey)??0,goal);return{success:true,status:'found',path,expandedNodes:expanded,durationMs:Date.now()-startedAt}}const currentG=g.get(currentKey)??Infinity,generated=this.neighbors.neighborsWithState(current,options);encounteredUnknown||=generated.encounteredUnknown;for(const edge of generated.neighbors){if(distance3D(start,edge.node)>maxDistance)continue;const key=nodeKey(edge.node);if(closed.has(key))continue;const tentative=currentG+this.costs.cost(edge,options);if(tentative>=(g.get(key)??Infinity))continue;g.set(key,tentative);came.set(key,{parentKey:currentKey,node:edge.node});nodes.set(key,edge.node);open.push(edge.node,tentative+this.heuristic.estimate(edge.node,goal))}if((expanded&511)===0)await new Promise<void>(r=>setImmediate(r))}
    return{success:false,status:encounteredUnknown?'unknown_world':'unreachable',expandedNodes:expanded,reason:encounteredUnknown?'Search reached unloaded/unknown world':'No reachable path found',durationMs:Date.now()-startedAt}
  }
  private buildPath(goalKey:string,startKey:string,came:Map<string,CameFrom>,nodes:Map<string,NavigationNode>,cost:number,goal:NavigationGoal):NavigationPath{const reversed:NavigationNode[]=[];let key=goalKey;for(;;){const n=nodes.get(key);if(!n)break;reversed.push(n);if(key===startKey)break;const c=came.get(key);if(!c)break;key=c.parentKey}const result=reversed.reverse(),hazards:NavigationHazard[]=result.filter(n=>Boolean(n.metadata?.hazard)).map(n=>({position:nodePosition(n),type:n.metadata!.hazard!,severity:10})),waypoints=this.waypointBuilder.build(result);return{nodes:result,waypoints,cost,length:waypoints.length,estimatedTravelTime:this.costs.estimatedSeconds(cost),hazardScore:hazards.reduce((s,h)=>s+h.severity,0),hazards,createdAt:Date.now(),goal}}
}
