import type { Vec3 } from 'vec3'

export type LocomotionMode = 'ground' | 'swimming' | 'climbing' | 'airborne'
export type NavigationAction = 'walk' | 'jump' | 'step_up' | 'step_down' | 'drop' | 'swim' | 'climb' | 'open_door'
export type NavigationPriority = 'normal' | 'high' | 'emergency'

export interface NavigationNode { x:number; y:number; z:number; mode:LocomotionMode; actionFromParent?:NavigationAction; metadata?:{ blockBelow?:string; hazard?:string; water?:boolean; climbable?:boolean; requiresInteraction?:boolean; dropDepth?:number } }
export interface NavigationGoal { position:Vec3; tolerance?:number; verticalTolerance?:number }
export interface NavigationHazard { position:Vec3; type:string; severity:number }
export interface NavigationWaypoint { position:Vec3; action:NavigationAction; mode:LocomotionMode; tolerance?:number; requiresInteraction?:boolean }
export interface NavigationPath { nodes:NavigationNode[]; waypoints:NavigationWaypoint[]; cost:number; length:number; estimatedTravelTime:number; hazardScore:number; hazards:NavigationHazard[]; createdAt:number; goal:NavigationGoal }
export type PathSearchStatus='found'|'unreachable'|'timeout'|'cancelled'|'search_limit'|'unknown_world'
export interface PathSearchResult { success:boolean; status:PathSearchStatus; path?:NavigationPath; expandedNodes:number; reason?:string; durationMs:number }
export interface NavigationOptions { maxDistance?:number; maxExpandedNodes?:number; timeout?:number; allowWater?:boolean; allowClimbing?:boolean; allowSafeDrops?:boolean; maxSafeDrop?:number; allowClosedDoors?:boolean; avoidHazards?:boolean; optimizePath?:boolean; profile?:'normal'|'safe'|'fast' }
export interface FindPathParams extends NavigationOptions { target:Vec3|NavigationGoal }
export interface FollowPathParams { path:NavigationPath; replanOnBlock?:boolean; maxReplans?:number; waypointTolerance?:number; timeout?:number }
export interface GoToPositionParams extends NavigationOptions { x:number;y:number;z:number;tolerance?:number;replan?:boolean;maxReplans?:number;priority?:NavigationPriority }
export interface BlockLike { position:Vec3; name?:string }
export interface EntityLike { position:Vec3; id?:number; name?:string; username?:string; height?:number }
export interface GoToBlockParams extends NavigationOptions { block:BlockLike; interactionDistance?:number; timeout?:number; replan?:boolean; maxReplans?:number }
export interface GoToEntityParams extends NavigationOptions { entity:EntityLike; distance?:number; repathDistance?:number; timeout?:number; maxReplans?:number }
export interface ReplanPathParams extends NavigationOptions { target:Vec3|NavigationGoal; previousPath?:NavigationPath }
export interface IsReachableParams extends NavigationOptions { target:Vec3|NavigationGoal; maxCost?:number }
export interface EstimatePathCostParams extends NavigationOptions { target:Vec3|NavigationGoal }
export interface PathCostEstimate { reachable:boolean; cost?:number; estimatedDistance?:number; estimatedTravelTime?:number; hazardScore?:number }
export interface FindNearestReachableParams extends NavigationOptions { targets:Array<Vec3|NavigationGoal>; maxCandidates?:number }
export interface FindSafeRouteParams extends NavigationOptions { target:Vec3|NavigationGoal }
export interface EscapeDangerParams extends NavigationOptions { dangerPositions:Vec3[]; minimumDistance?:number; searchRadius?:number; candidateCount?:number; timeout?:number }
export interface ReturnHomeParams extends NavigationOptions { home?:Vec3; timeout?:number; maxReplans?:number }
export interface NavigationExecutionData { path:NavigationPath; replans:number; finalPosition:Vec3; finalDistance:number }
export interface GoToEntityData extends NavigationExecutionData { targetPosition:Vec3 }
export interface EscapeDangerData extends NavigationExecutionData { safePosition:Vec3; minimumDangerDistance:number }
export enum NavigationErrorCode { INVALID_START='INVALID_START',INVALID_GOAL='INVALID_GOAL',GOAL_BLOCKED='GOAL_BLOCKED',GOAL_UNREACHABLE='GOAL_UNREACHABLE',NO_VALID_NEARBY_POSITION='NO_VALID_NEARBY_POSITION',PATH_NOT_FOUND='PATH_NOT_FOUND',PATH_BLOCKED='PATH_BLOCKED',SEARCH_LIMIT='SEARCH_LIMIT',CHUNK_UNLOADED='CHUNK_UNLOADED',MOVEMENT_FAILED='MOVEMENT_FAILED',REPLAN_LIMIT='REPLAN_LIMIT',TARGET_LOST='TARGET_LOST',TIMEOUT='TIMEOUT',CANCELLED='CANCELLED',LOCKED='LOCKED',INTERNAL_ERROR='INTERNAL_ERROR' }
export class NavigationError extends Error { constructor(public readonly code:NavigationErrorCode,message:string,public readonly details?:Record<string,unknown>){super(message);this.name='NavigationError'} }
export type NavigationStatus='success'|'failed'|'cancelled'|'timeout'|'blocked'
export interface NavigationResult<T=unknown>{success:boolean;status:NavigationStatus;reason?:string;errorCode?:NavigationErrorCode;data?:T;attempts:number;startedAt:number;finishedAt:number;durationMs:number}
