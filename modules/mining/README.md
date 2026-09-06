# Mining V1 — deterministic mining skills

Módulo de mineração para bots sem LLM, construído sobre **Navigation V1.1**. Ele não implementa pathfinding próprio: encontra alvos, consulta alcançabilidade, pede ao Navigation uma posição de trabalho, seleciona ferramenta, confirma o bloco novamente, minera, verifica a remoção, coleta drops e pode continuar por um veio conectado.

## API
- `findBlocks` — busca blocos por nome, distância e quantidade; `reachableOnly` usa `Navigation.isReachable` sem mover o bot.
- `mineBlock` — alcança, revalida o alvo, equipa ferramenta, minera e verifica a remoção.
- `mineNearest` — tenta candidatos em ordem de proximidade e faz recovery pulando candidatos que falham.
- `mineVein` — BFS 6-direcional limitado por raio/quantidade e mineração sequencial.
- `collectDrop` — aproxima-se de item dropado e confirma pickup por desaparecimento da entidade ou delta de inventário.

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
3. `ToolSelector` usa `Block.canHarvest` como autoridade; heurísticas de nome/tier só ranqueiam ferramentas já válidas.
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
