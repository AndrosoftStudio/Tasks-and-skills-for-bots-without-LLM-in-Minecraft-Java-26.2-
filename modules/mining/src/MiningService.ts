import { ToolSelector } from './ToolSelector.js'
import type { BlockPos, CollectDropParams, FindBlockParams, FindOneBlockParams, ItemEntity, MineBlockParams, MinedBlockData, MineNearestParams, MineVeinData, MineVeinParams, MiningBlock, MiningErrorCode, MiningNavigation, MiningResult, MiningRunOptions, MiningWorld } from './types.js'

const dist=(a:BlockPos,b:BlockPos)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)
const key=(p:BlockPos)=>`${p.x},${p.y},${p.z}`
const neighbors=(p:BlockPos):BlockPos[]=>[
  {x:p.x+1,y:p.y,z:p.z},{x:p.x-1,y:p.y,z:p.z},
  {x:p.x,y:p.y+1,z:p.z},{x:p.x,y:p.y-1,z:p.z},
  {x:p.x,y:p.y,z:p.z+1},{x:p.x,y:p.y,z:p.z-1}
]
const ringDirections:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[
  [1,0],[-1,0],[0,1],[0,-1],
  [Math.SQRT1_2,Math.SQRT1_2],[Math.SQRT1_2,-Math.SQRT1_2],[-Math.SQRT1_2,Math.SQRT1_2],[-Math.SQRT1_2,-Math.SQRT1_2]
]

export class MiningService {
  private readonly tools:ToolSelector
  constructor(private readonly world:MiningWorld,private readonly navigation:MiningNavigation){this.tools=new ToolSelector(world)}

  private fail<T>(code:MiningErrorCode,message:string,cause?:unknown):MiningResult<T>{return{ok:false,error:{code,message,cause}}}
  private check(signal?:AbortSignal){if(signal?.aborted)throw Object.assign(new Error('aborted'),{code:'ABORTED'})}
  private sameTarget(expected:MiningBlock,current:MiningBlock|null):current is MiningBlock{return !!current&&current.name===expected.name&&(expected.type===undefined||current.type===expected.type)}

  async findBlocks(params:FindBlockParams,options:MiningRunOptions={}):Promise<MiningResult<MiningBlock[]>>{
    try{
      this.check(options.signal)
      const names=Array.isArray(params.names)?params.names:[params.names]
      const origin=params.origin??this.world.getBotPosition()
      const found=this.world.findBlocks(names,origin,params.maxDistance??64,params.count??16).sort((a,b)=>dist(origin,a.position)-dist(origin,b.position))
      if(!params.reachableOnly)return{ok:true,data:found}
      const reachable:MiningBlock[]=[]
      for(const block of found){
        this.check(options.signal)
        const r=await this.navigation.isReachable({position:block.position,profile:params.profile??'NORMAL'},{signal:options.signal,timeoutMs:options.timeoutMs})
        if(r.ok&&r.data?.reachable)reachable.push(block)
      }
      return{ok:true,data:reachable}
    }catch(e){return this.fail((e as {code?:MiningErrorCode}).code??'UNREACHABLE','failed to find reachable blocks',e)}
  }

  async findBlock(params:FindOneBlockParams,options:MiningRunOptions={}):Promise<MiningResult<MiningBlock>>{
    const r=await this.findBlocks({...params,count:16},options)
    if(!r.ok)return{ok:false,error:r.error}
    const block=r.data?.[0]
    return block?{ok:true,data:block}:this.fail('BLOCK_NOT_FOUND','no matching block found')
  }

  async mineBlock(params:MineBlockParams,options:MiningRunOptions={}):Promise<MiningResult<MinedBlockData>>{
    try{
      this.check(options.signal)
      const initial=this.world.getBlock(params.position)
      if(!initial)return this.fail('BLOCK_NOT_FOUND','target block is not loaded or no longer exists')
      if(initial.diggable===false||!this.world.canDig(initial))return this.fail('NOT_DIGGABLE',`block ${initial.name} cannot be dug`)

      const nav=await this.navigation.goToBlock({position:initial.position,range:params.range??1.6,profile:params.profile??'NORMAL'},{signal:options.signal,timeoutMs:options.timeoutMs})
      if(!nav.ok)return this.fail('UNREACHABLE','navigation could not reach a mining position',nav.error)

      let block=this.world.getBlock(params.position)
      if(!this.sameTarget(initial,block))return this.fail('BLOCK_CHANGED','target changed before digging')

      const visible=await this.ensureVisible(initial,block,params,options)
      if(!visible.ok)return{ok:false,error:visible.error}
      if(!visible.data)return this.fail('BLOCK_NOT_VISIBLE','line-of-sight validation returned no visible target')
      block=visible.data
      if(block.diggable===false||!this.world.canDig(block))return this.fail('NOT_DIGGABLE',`block ${block.name} cannot be dug from the visible mining position`)

      const decision=await this.tools.equipBest(block)
      if((params.requireHarvestable??true)&&!decision.harvestable)return this.fail('NO_HARVEST_TOOL',`no suitable tool can harvest ${block.name}`)

      await this.world.lookAtBlock(block)
      await this.world.dig(block,options.signal)
      await this.world.wait(50,options.signal)

      const after=this.world.getBlock(params.position)
      if(this.sameTarget(block,after)&&!this.world.isGravityBlock(block))return this.fail('DIG_FAILED','dig completed but the original non-gravity target still appears to be present')

      let collected=false
      if(params.collectDrops??true){
        const c=await this.collectDrop({origin:block.position,maxDistance:params.collectRadius??5,timeoutMs:3500},options)
        collected=c.ok
      }
      return{ok:true,data:{blockName:block.name,position:block.position,tool:decision.item?.name??null,collected}}
    }catch(e){
      const code=(e as {code?:MiningErrorCode}).code
      return this.fail(code??(options.signal?.aborted?'ABORTED':'DIG_FAILED'),'mining failed',e)
    }
  }

  private async ensureVisible(expected:MiningBlock,current:MiningBlock,params:MineBlockParams,options:MiningRunOptions):Promise<MiningResult<MiningBlock>>{
    if(this.world.canSeeBlock(current))return{ok:true,data:current}
    if(!this.navigation.goToPosition)return this.fail('BLOCK_NOT_VISIBLE','target is in range but no visible face is available and navigation cannot reposition')

    const radius=Math.max(1.1,Math.min(params.repositionRadius??1.6,3.5))
    const maxAttempts=Math.max(0,Math.min(params.maxRepositionAttempts??12,24))
    const candidates:BlockPos[]=[]
    for(const dy of [0,-1,1])for(const [dx,dz] of ringDirections)candidates.push({x:expected.position.x+dx*radius,y:expected.position.y+dy,z:expected.position.z+dz*radius})

    for(const candidate of candidates.slice(0,maxAttempts)){
      this.check(options.signal)
      const moved=await this.navigation.goToPosition({position:candidate,tolerance:0.6,profile:params.profile??'NORMAL'},{signal:options.signal,timeoutMs:options.timeoutMs})
      if(!moved.ok)continue
      const refreshed=this.world.getBlock(expected.position)
      if(!this.sameTarget(expected,refreshed))return this.fail('BLOCK_CHANGED','target changed while repositioning for line of sight')
      if(this.world.canSeeBlock(refreshed))return{ok:true,data:refreshed}
    }
    return this.fail('BLOCK_NOT_VISIBLE',`could not obtain line of sight after ${maxAttempts} reposition attempts`)
  }

  async mineNearest(params:MineNearestParams,options:MiningRunOptions={}):Promise<MiningResult<MinedBlockData>>{
    const f=await this.findBlocks({...params,count:8},options)
    if(!f.ok)return{ok:false,error:f.error}
    for(const b of f.data??[]){
      const r=await this.mineBlock({position:b.position,profile:params.profile,requireHarvestable:params.requireHarvestable,collectDrops:params.collectDrops},options)
      if(r.ok)return r
    }
    return this.fail('BLOCK_NOT_FOUND','no reachable matching block could be mined')
  }

  async collectDrop(params:CollectDropParams={},options:MiningRunOptions={}):Promise<MiningResult<{entityId:number|null}>>{
    const origin=params.origin??this.world.getBotPosition(),deadline=Date.now()+(params.timeoutMs??3500),before=this.world.inventoryCount()
    let target:ItemEntity|undefined
    while(Date.now()<deadline){
      try{
        this.check(options.signal)
        const items=this.world.getItemEntities(origin,params.maxDistance??6).sort((a,b)=>dist(origin,a.position)-dist(origin,b.position))
        target=items[0]
        if(!target){
          if(this.world.inventoryCount()>before)return{ok:true,data:{entityId:null}}
          await this.world.wait(100,options.signal)
          continue
        }
        if(this.navigation.goToEntity){
          const r=await this.navigation.goToEntity({entityId:target.id,position:target.position,range:0.8,profile:'NORMAL'},{signal:options.signal,timeoutMs:Math.max(250,deadline-Date.now())})
          if(!r.ok)return this.fail('COLLECT_FAILED','could not reach dropped item',r.error)
        }else{
          const r=await this.navigation.goToBlock({position:target.position,range:0.8,profile:'NORMAL'},{signal:options.signal,timeoutMs:Math.max(250,deadline-Date.now())})
          if(!r.ok)return this.fail('COLLECT_FAILED','could not reach dropped item',r.error)
        }
        for(let i=0;i<12;i++){
          if(this.world.inventoryCount()>before||!this.world.getItemEntities(origin,params.maxDistance??6).some(e=>e.id===target!.id))return{ok:true,data:{entityId:target.id}}
          await this.world.wait(75,options.signal)
        }
      }catch(e){return this.fail(options.signal?.aborted?'ABORTED':'COLLECT_FAILED','drop collection failed',e)}
    }
    return this.fail('COLLECT_FAILED','timed out waiting for dropped item pickup; a full inventory is one possible cause')
  }

  async mineVein(params:MineVeinParams,options:MiningRunOptions={}):Promise<MiningResult<MineVeinData>>{
    const first=this.world.getBlock(params.position)
    if(!first)return this.fail('BLOCK_NOT_FOUND','vein seed block not found')
    const names=new Set(params.blockNames?.length?params.blockNames:[first.name])
    const maxBlocks=Math.max(1,Math.min(params.maxBlocks??32,128)),maxRadius=params.maxRadius??8,queue=[first.position],seen=new Set<string>(),targets:BlockPos[]=[]
    while(queue.length&&targets.length<maxBlocks){
      const p=queue.shift()!
      if(seen.has(key(p)))continue
      seen.add(key(p))
      if(dist(first.position,p)>maxRadius)continue
      const b=this.world.getBlock(p)
      if(!b||!names.has(b.name))continue
      targets.push(p)
      queue.push(...neighbors(p))
    }
    targets.sort((a,b)=>dist(this.world.getBotPosition(),a)-dist(this.world.getBotPosition(),b))
    const mined:MinedBlockData[]=[],skipped:BlockPos[]=[]
    for(const p of targets){
      this.check(options.signal)
      const r=await this.mineBlock({position:p,profile:params.profile,requireHarvestable:params.requireHarvestable,collectDrops:params.collectDrops},options)
      if(r.ok&&r.data)mined.push(r.data);else skipped.push(p)
    }
    return{ok:true,data:{blockName:first.name,requested:targets.length,mined,skipped}}
  }
}
