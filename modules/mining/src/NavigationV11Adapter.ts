import { Vec3 } from 'vec3'
import type { BlockPos, MiningNavigation, MiningNavigationResult, MiningProfile } from './types.js'
type NavProfile='normal'|'safe'|'fast'
type NavResult<T=unknown>={success:boolean;data?:T;reason?:string;errorCode?:string}
export interface NavigationV11Like {
  goToBlock(params:{block:{position:Vec3};interactionDistance?:number;profile?:NavProfile;replan?:boolean},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<NavResult>
  goToPosition(params:{x:number;y:number;z:number;tolerance?:number;profile?:NavProfile;replan?:boolean},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<NavResult>
  goToEntity(params:{entity:{id?:number;position:Vec3};distance?:number;profile?:NavProfile},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<NavResult>
  isReachable(params:{target:Vec3;profile?:NavProfile},options?:{signal?:AbortSignal;timeoutMs?:number}):Promise<NavResult<{reachable:boolean}>>
}
const vec=(p:BlockPos)=>new Vec3(p.x,p.y,p.z)
const profile=(p?:MiningProfile):NavProfile=>p==='FAST'?'fast':p==='SAFE'?'safe':'normal'
const adapt=<T>(r:NavResult<T>):MiningNavigationResult<T>=>({ok:r.success,data:r.data,error:r.success?undefined:{code:r.errorCode,message:r.reason}})
export function adaptNavigationV11(navigation:NavigationV11Like):MiningNavigation{
  return{
    async goToBlock(p,o){return adapt(await navigation.goToBlock({block:{position:vec(p.position)},interactionDistance:p.range,profile:profile(p.profile),replan:true},o))},
    async goToPosition(p,o){return adapt(await navigation.goToPosition({x:p.position.x,y:p.position.y,z:p.position.z,tolerance:p.tolerance,profile:profile(p.profile),replan:true},o))},
    async goToEntity(p,o){return adapt(await navigation.goToEntity({entity:{id:p.entityId,position:vec(p.position)},distance:p.range,profile:profile(p.profile)},o))},
    async isReachable(p,o){return adapt(await navigation.isReachable({target:vec(p.position),profile:profile(p.profile)},o))}
  }
}
