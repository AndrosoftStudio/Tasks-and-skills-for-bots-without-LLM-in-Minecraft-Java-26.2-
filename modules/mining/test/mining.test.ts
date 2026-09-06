import test from 'node:test'
import assert from 'node:assert/strict'
import { MiningService, ToolSelector, type BlockPos, type InventoryItem, type ItemEntity, type MiningBlock, type MiningNavigation, type MiningWorld } from '../src/index.js'

class FakeWorld implements MiningWorld{
  pos:BlockPos={x:0,y:64,z:0}
  blocks=new Map<string,MiningBlock>()
  items:InventoryItem[]=[{name:'iron_pickaxe',type:10,count:1}]
  held:InventoryItem|null=null
  drops:ItemEntity[]=[]
  count=0
  visible=true
  gravity=new Set<string>(['sand','gravel'])
  preserveAfterDig=false

  k(p:BlockPos){return`${p.x},${p.y},${p.z}`}
  getBotPosition(){return this.pos}
  getBlock(p:BlockPos){return this.blocks.get(this.k(p))??null}
  findBlocks(names:string[],o:BlockPos,d:number,c:number){return [...this.blocks.values()].filter(b=>names.includes(b.name)&&Math.hypot(b.position.x-o.x,b.position.y-o.y,b.position.z-o.z)<=d).slice(0,c)}
  canDig(){return true}
  canSeeBlock(){return this.visible}
  isGravityBlock(b:MiningBlock){return this.gravity.has(b.name)}
  getHeldItem(){return this.held}
  getInventory(){return this.items}
  async equip(i:InventoryItem){this.held=i}
  async lookAtBlock(){}
  async dig(b:MiningBlock){if(!this.preserveAfterDig)this.blocks.delete(this.k(b.position));this.drops=[{id:7,name:'item',type:'object',position:b.position}];this.count++}
  getItemEntities(){const r=this.drops;this.drops=[];return r}
  inventoryCount(){return this.count}
  async wait(){}
}

const nav:MiningNavigation={
  async goToBlock(){return{ok:true}},
  async goToPosition(){return{ok:true}},
  async goToEntity(){return{ok:true}},
  async isReachable(){return{ok:true,data:{reachable:true}}}
}

test('mineBlock equips a harvestable tool and verifies removal',async()=>{
  const w=new FakeWorld(),p={x:1,y:64,z:0}
  w.blocks.set(w.k(p),{name:'iron_ore',position:p,canHarvest:id=>id===10})
  const r=await new MiningService(w,nav).mineBlock({position:p,collectDrops:false})
  assert.equal(r.ok,true)
  assert.equal(r.data?.tool,'iron_pickaxe')
  assert.equal(w.getBlock(p),null)
})

test('mineBlock refuses valuable block without harvest tool',async()=>{
  const w=new FakeWorld();w.items=[]
  const p={x:1,y:64,z:0}
  w.blocks.set(w.k(p),{name:'diamond_ore',position:p,canHarvest:()=>false})
  const r=await new MiningService(w,nav).mineBlock({position:p,collectDrops:false})
  assert.equal(r.ok,false)
  assert.equal(r.error?.code,'NO_HARVEST_TOOL')
})

test('mineVein discovers only connected matching blocks',async()=>{
  const w=new FakeWorld()
  for(const p of [{x:1,y:64,z:0},{x:2,y:64,z:0},{x:2,y:65,z:0},{x:5,y:64,z:0}])w.blocks.set(w.k(p),{name:'coal_ore',position:p,canHarvest:()=>true})
  const r=await new MiningService(w,nav).mineVein({position:{x:1,y:64,z:0},collectDrops:false})
  assert.equal(r.ok,true)
  assert.equal(r.data?.mined.length,3)
})

test('mineNearest skips unreachable candidates',async()=>{
  const w=new FakeWorld(),a={x:1,y:64,z:0},b={x:3,y:64,z:0}
  w.blocks.set(w.k(a),{name:'coal_ore',position:a,canHarvest:()=>true})
  w.blocks.set(w.k(b),{name:'coal_ore',position:b,canHarvest:()=>true})
  let calls=0
  const n:MiningNavigation={async goToBlock(){calls++;return{ok:calls>1}},async isReachable(){return{ok:true,data:{reachable:true}}}}
  const r=await new MiningService(w,n).mineNearest({names:'coal_ore',collectDrops:false})
  assert.equal(r.ok,true)
  assert.deepEqual(r.data?.position,b)
})

test('findBlocks reachableOnly uses query-only reachability and never moves',async()=>{
  const w=new FakeWorld(),a={x:1,y:64,z:0},b={x:2,y:64,z:0}
  w.blocks.set(w.k(a),{name:'coal_ore',position:a,canHarvest:()=>true})
  w.blocks.set(w.k(b),{name:'coal_ore',position:b,canHarvest:()=>true})
  let moves=0
  const n:MiningNavigation={async goToBlock(){moves++;return{ok:true}},async isReachable({position}){return{ok:true,data:{reachable:position.x===2}}}}
  const r=await new MiningService(w,n).findBlocks({names:'coal_ore',reachableOnly:true})
  assert.equal(r.ok,true)
  assert.equal(r.data?.length,1)
  assert.equal(r.data?.[0]?.position.x,2)
  assert.equal(moves,0)
})

test('findBlock returns nearest matching block',async()=>{
  const w=new FakeWorld()
  for(const p of [{x:4,y:64,z:0},{x:2,y:64,z:0}])w.blocks.set(w.k(p),{name:'coal_ore',position:p,canHarvest:()=>true})
  const r=await new MiningService(w,nav).findBlock({names:'coal_ore'})
  assert.equal(r.ok,true)
  assert.equal(r.data?.position.x,2)
})

test('mineBlock switches from harvestable held item to efficient harvestable tool',async()=>{
  const w=new FakeWorld();w.held={name:'wooden_shovel',type:11,count:1};w.items=[w.held,{name:'iron_pickaxe',type:10,count:1}]
  const p={x:1,y:64,z:0}
  w.blocks.set(w.k(p),{name:'iron_ore',position:p,canHarvest:id=>id===10||id===11})
  const r=await new MiningService(w,nav).mineBlock({position:p,collectDrops:false})
  assert.equal(r.ok,true)
  assert.equal(r.data?.tool,'iron_pickaxe')
  assert.equal(w.held?.name,'iron_pickaxe')
})

test('mineBlock repositions until target has line of sight',async()=>{
  const w=new FakeWorld();w.visible=false
  const p={x:1,y:64,z:0};w.blocks.set(w.k(p),{name:'iron_ore',position:p,canHarvest:id=>id===10})
  let repositionCalls=0
  const n:MiningNavigation={
    async goToBlock(){return{ok:true}},
    async goToPosition(){repositionCalls++;if(repositionCalls===2)w.visible=true;return{ok:true}},
    async isReachable(){return{ok:true,data:{reachable:true}}}
  }
  const r=await new MiningService(w,n).mineBlock({position:p,collectDrops:false,maxRepositionAttempts:4})
  assert.equal(r.ok,true)
  assert.equal(repositionCalls,2)
})

test('mineBlock returns BLOCK_NOT_VISIBLE when repositioning cannot expose a face',async()=>{
  const w=new FakeWorld();w.visible=false
  const p={x:1,y:64,z:0};w.blocks.set(w.k(p),{name:'iron_ore',position:p,canHarvest:id=>id===10})
  const n:MiningNavigation={async goToBlock(){return{ok:true}},async goToPosition(){return{ok:false}},async isReachable(){return{ok:true,data:{reachable:true}}}}
  const r=await new MiningService(w,n).mineBlock({position:p,collectDrops:false,maxRepositionAttempts:3})
  assert.equal(r.ok,false)
  assert.equal(r.error?.code,'BLOCK_NOT_VISIBLE')
  assert.equal(w.count,0)
})

test('gravity replacement with same block name does not create a false DIG_FAILED',async()=>{
  const w=new FakeWorld();w.preserveAfterDig=true
  const p={x:1,y:64,z:0};w.blocks.set(w.k(p),{name:'sand',position:p,canHarvest:()=>true})
  const r=await new MiningService(w,nav).mineBlock({position:p,collectDrops:false})
  assert.equal(r.ok,true)
  assert.equal(w.count,1)
})

test('same-name non-gravity block after dig is still DIG_FAILED',async()=>{
  const w=new FakeWorld();w.preserveAfterDig=true
  const p={x:1,y:64,z:0};w.blocks.set(w.k(p),{name:'stone',position:p,canHarvest:()=>true})
  const r=await new MiningService(w,nav).mineBlock({position:p,collectDrops:false})
  assert.equal(r.ok,false)
  assert.equal(r.error?.code,'DIG_FAILED')
})

test('ToolSelector passes null to canHarvest for bare hands',()=>{
  const w=new FakeWorld();w.items=[];w.held=null
  let received:number|null|undefined
  const block:MiningBlock={name:'dirt',position:{x:0,y:64,z:0},canHarvest:id=>{received=id;return id===null}}
  const d=new ToolSelector(w).choose(block)
  assert.equal(received,null)
  assert.equal(d.harvestable,true)
  assert.equal(d.item,null)
})
