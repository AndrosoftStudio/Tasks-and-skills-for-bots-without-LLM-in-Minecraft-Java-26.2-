# Mining V1 — deterministic mining skills

Módulo de mineração para bots sem LLM, construído sobre **Navigation V1.1**. Ele não implementa pathfinding próprio: encontra alvos, consulta alcançabilidade, pede ao Navigation uma posição de trabalho, seleciona ferramenta, confirma o bloco novamente, minera, verifica a remoção, coleta drops e pode continuar por um veio conectado.

## Skills públicas
- `findBlock` — encontra o bloco correspondente mais próximo; pode exigir alcançabilidade sem mover o bot.
- `mineBlock` — alcança, revalida o alvo, equipa a melhor ferramenta harvestable, minera e verifica a remoção.
- `mineNearest` — tenta candidatos em ordem de proximidade e faz recovery pulando candidatos que falham.
- `collectDrop` — aproxima-se de item dropado e confirma pickup por desaparecimento da entidade ou delta de inventário.
- `mineVein` — BFS 6-direcional limitada por raio/quantidade e mineração sequencial.

A consulta auxiliar `findBlocks` retorna vários candidatos e aceita `reachableOnly`; nesse modo usa `Navigation.isReachable` sem deslocar o bot.

As classes `FindBlockSkill`, `MineBlockSkill`, `MineNearestSkill`, `CollectDropSkill` e `MineVeinSkill` também são exportadas explicitamente, cada uma com `name`, `defaultTimeoutMs` e `execute`.

## Integração com Navigation V1.1
A API real do Navigation usa `goToBlock({ block })`, `goToEntity({ entity })`, `isReachable({ target })`, perfis `normal/safe/fast` e resultados com `success`. O Mining expõe `adaptNavigationV11()` e `createMiningForNavigationV11()` para adaptar essa API explicitamente.

```ts
const mining = createMiningForNavigationV11({
  world: new MineflayerMiningWorld(bot),
  navigation
})

await mining.mineNearest({
  names: ['diamond_ore', 'deepslate_diamond_ore'],
  maxDistance: 48,
  profile: 'SAFE',
  collectDrops: true
})
```

## Segurança e invariantes
1. Revalida o bloco **depois** da navegação para evitar minerar uma coordenada que mudou.
2. Por padrão `requireHarvestable=true`: não destrói minério se nenhuma ferramenta disponível puder produzir o drop.
3. `ToolSelector` usa `Block.canHarvest` como autoridade; entre as ferramentas válidas, prefere a mais apropriada/eficiente em vez de manter cegamente o item atualmente segurado.
4. `mineVein` usa `maxBlocks=32` por padrão, hard cap 128, e `maxRadius=8` por padrão.
5. Todos os loops respeitam `AbortSignal`.
6. Coleta possui deadline e não bloqueia indefinidamente.
7. `findBlocks({reachableOnly:true})` é uma consulta sem efeito colateral.

## Pipeline
```text
find target
   ↓
isReachable? (query only)
   ↓
goToBlock
   ↓
revalidate target
   ↓
ToolSelector / canHarvest
   ↓
lookAt → dig → verify removal
   ↓
collectDrop
```

Veja também `ARCHITECTURE.md`, `VALIDATION.md` e `test/mining.test.ts`.
