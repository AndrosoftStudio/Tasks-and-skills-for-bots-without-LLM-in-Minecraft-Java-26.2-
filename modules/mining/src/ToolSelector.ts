import type { InventoryItem, MiningBlock, MiningWorld, ToolDecision } from './types.js'
const tierScore=(name:string)=> name.includes('netherite_')?60:name.includes('diamond_')?50:name.includes('iron_')?40:name.includes('golden_')?35:name.includes('stone_')?30:name.includes('wooden_')?20:0
const toolScore=(name:string,block:string)=>{
  if (/(ore|stone|deepslate|netherrack|obsidian|anvil|rail)/.test(block) && name.endsWith('_pickaxe')) return 100
  if (/(log|wood|stem|hyphae|planks|bookshelf|chest)/.test(block) && name.endsWith('_axe')) return 100
  if (/(dirt|sand|gravel|clay|snow|soul_sand)/.test(block) && name.endsWith('_shovel')) return 100
  if (/(leaves|wool|cobweb)/.test(block) && (name==='shears'||name.endsWith('_hoe'))) return 90
  return 0
}
const itemKey=(i:InventoryItem)=>`${i.type}:${i.metadata??0}`
export class ToolSelector {
  constructor(private readonly world:MiningWorld){}
  choose(block:MiningBlock):ToolDecision {
    const held=this.world.getHeldItem()
    const byKey=new Map<string,InventoryItem>()
    for(const item of this.world.getInventory())byKey.set(itemKey(item),item)
    if(held)byKey.set(itemKey(held),held)
    const can=(item:InventoryItem)=> block.canHarvest ? block.canHarvest(item.type) : true
    const candidates=[...byKey.values()].filter(can).sort((a,b)=>(toolScore(b.name,block.name)+tierScore(b.name))-(toolScore(a.name,block.name)+tierScore(a.name)))
    const item=candidates[0]??null
    if(item)return{item,harvestable:true,reason:held&&itemKey(item)===itemKey(held)?'best tool already held':'best harvestable inventory tool'}
    const bareHarvestable=block.canHarvest ? block.canHarvest(0) : true
    return {item:null,harvestable:bareHarvestable,reason:bareHarvestable?'block is harvestable without a tool':'no inventory item can harvest block'}
  }
  async equipBest(block:MiningBlock):Promise<ToolDecision>{const d=this.choose(block);const held=this.world.getHeldItem();if(d.item&&(!held||itemKey(held)!==itemKey(d.item)))await this.world.equip(d.item,'hand');return d}
}
