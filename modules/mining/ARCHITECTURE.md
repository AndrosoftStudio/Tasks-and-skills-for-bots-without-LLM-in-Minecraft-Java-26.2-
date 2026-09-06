# Mining V1 Architecture

```text
Planner / Behavior Tree
        ↓
     MiningAPI
        ↓
  MiningService ───────→ ToolSelector
     │      │
     │      └──────────→ MiningWorld
     │                    ↓
     │              Mineflayer adapter
     ↓
MiningNavigation
     ↓
NavigationV11Adapter
     ↓
Navigation V1.1 → Movement V2 → Mineflayer
```

`MiningService` controla orquestração, recovery e verificação. `ToolSelector` é determinístico e usa `Block.canHarvest` quando disponível. `MiningWorld` isola Mineflayer para que o núcleo seja testável sem servidor real.

## Navigation adapter
O contrato interno do Mining é intencionalmente pequeno e usa `ok/data`. `NavigationV11Adapter` converte para o contrato real do Navigation V1.1 (`success/data`, `Vec3`, `goToBlock({block})`, `goToEntity({entity})`, `isReachable({target})`). Isso impede acoplamento com as classes internas do planner e evita duplicar pathfinding.

## Vein discovery
`mineVein` faz BFS limitada em seis vizinhos por face. Blocos apenas diagonais não pertencem automaticamente ao mesmo veio. O seed define o nome padrão aceito; `blockNames` permite agrupar variantes, por exemplo `iron_ore` + `deepslate_iron_ore`.

## Recovery
- candidato inalcançável: `mineNearest` tenta o próximo;
- bloco mudou durante a aproximação: falha segura `BLOCK_CHANGED`;
- ferramenta inadequada: `NO_HARVEST_TOOL` antes de `dig`;
- drop sumiu ou foi coletado por evento: desaparecimento da entidade/delta de inventário valida coleta;
- cancelamento: loops observam `AbortSignal`.

## Limites
V1 não escava túneis automaticamente para expor minério fechado, não coloca tochas, não administra durabilidade e não fabrica ferramentas. Essas responsabilidades devem entrar em módulos/skills posteriores ou numa task composta de mineração.
