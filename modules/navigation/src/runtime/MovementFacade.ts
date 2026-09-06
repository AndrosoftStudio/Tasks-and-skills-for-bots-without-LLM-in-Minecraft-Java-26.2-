import type { Vec3 } from 'vec3'
export interface MovementResult<T=unknown>{success:boolean;status:string;reason?:string;data?:T}
export interface MovementFacade {
  moveTo(params:{x:number;y:number;z:number;tolerance?:number;timeout?:number;allowSprint?:boolean;maxSafeDrop?:number;localAvoidance?:boolean},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MovementResult>
  jump(params?:{duration?:number;forward?:boolean;sprint?:boolean},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MovementResult>
  stepUp(params?:{timeout?:number;forward?:boolean;maxRise?:number},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MovementResult>
  safeDrop(params?:{maxDepth?:number;timeout?:number},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MovementResult>
  climb(params:{targetY:number;tolerance?:number;timeout?:number},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MovementResult>
  swim(params?:{x?:number;y?:number;z?:number;tolerance?:number;timeout?:number},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MovementResult>
  stop(params?:{cancelActive?:boolean},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<MovementResult>
}
export interface NavigationLogger { debug(message:string,meta?:Record<string,unknown>):void;info(message:string,meta?:Record<string,unknown>):void;warn(message:string,meta?:Record<string,unknown>):void;error(message:string,meta?:Record<string,unknown>):void }
