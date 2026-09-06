# Mining V1.1 — deterministic mining skills

Módulo de mineração para bots sem LLM, construído sobre **Navigation V1.1**. Ele não implementa pathfinding próprio: encontra alvos, consulta alcançabilidade, pede ao Navigation uma posição de trabalho, confirma linha de visão, reposiciona quando necessário, seleciona ferramenta, revalida o bloco, minera, verifica o resultado, coleta drops e pode continuar por um veio conectado.

## API
- `findBlock` — retorna o bloco correspondente mais próximo.
- `findBlocks` — busca blocos por nome, distância e quantidade; `reachableOnly` usa `Navigation.isReachable` sem mover o bot.
- `mineBlock` — alcança, revalida o alvo, garante uma face visível, equipa ferramenta, minera e verifica o resultado.
- `mineNearest` — tenta candidatos em ordem de proximidade e faz recovery pulando candidatos que falham.
- `mineVein` — BFS 6-direcional limitado por raio/quantidade e mineração sequencial.
- `collectDrop` — aproxima-se de item dropado e confirma pickup por desaparecimento da entidade ou delta de inventário.

## Mining V1.1

### Linha de visão e reposicionamento
`goToBlock` garante proximidade, mas proximidade não implica uma face clicável. Depois da aproximação o Mining chama `MiningWorld.canSeeBlock`.

Se o alvo estiver bloqueado, `MiningService` tenta posições ao redor do bloco através de `MiningNavigation.goToPosition`. Cada movimento é seguido por nova revalidação do alvo e nova checagem de LOS. Se nenhuma posição produzir uma face visível, a execução termina com `BLOCK_NOT_VISIBLE` sem chamar `dig`.

O adaptador Mineflayer usa `bot.canSeeBlock` e faz `dig` com face `raycast`.

### Verificação de blocos com gravidade
Para blocos normais, se depois de `dig` o mesmo bloco ainda aparece na posição, o resultado continua sendo `DIG_FAILED`.

Para blocos com gravidade — como areia, cascalho, concrete powder e anvils — a resolução bem-sucedida de `dig` é tratada como evidência de que o bloco original foi quebrado mesmo quando outro bloco do mesmo tipo cai imediatamente para a mesma coordenada. Isso evita falso negativo causado por comparação apenas pelo nome.

### Harvestability sem ferramenta
Ausência de ferramenta agora é representada como `null` em `Block.canHarvest`, não pelo id mágico `0`.

## Integração com Navigation V1.1
A API real do Navigation usa `goToBlock({ block })`, `goToPosition({ x, y, z })`, `goToEntity({ entity })`, `isReachable({ target })`, perfis `normal/safe/fast` e resultados com `success`. O Mining expõe `adaptNavigationV11()` e `createMiningForNavigationV11()` para adaptar essa API explicitamente.

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
1. Revalida o bloco **depois** da navegação e novamente durante reposicionamentos de LOS.
2. Nunca chama `dig` sem uma face visível quando `canSeeBlock` está disponível.
3. Por padrão `requireHarvestable=true`: não destrói minério se nenhuma ferramenta disponível puder produzir o drop.
4. `ToolSelector` usa `Block.canHarvest` como autoridade; heurísticas de nome/tier só ranqueiam ferramentas já válidas.
5. `mineVein` usa `maxBlocks=32` por padrão, hard cap 128, e `maxRadius=8` por padrão.
6. Todos os loops respeitam `AbortSignal`.
7. Coleta possui deadline e não bloqueia indefinidamente.
8. `findBlocks({reachableOnly:true})` é uma consulta sem efeito colateral.
9. Verificação pós-dig diferencia blocos normais de blocos sujeitos a queda.

## Limitações conhecidas
- **Inventário cheio:** `collectDrop` ainda não gerencia slots, stacking, descarte ou armazenamento. Se o inventário não puder aceitar o drop, a coleta pode terminar em `COLLECT_FAILED` após o deadline. Essa responsabilidade ficará no módulo `inventory`; o Mining apenas relata a falha.
- O Mining V1.1 não abre túneis automaticamente para minério completamente fechado, não coloca tochas, não gerencia durabilidade e não fabrica ferramentas.
- Plugins de proteção/claims podem negar a quebra mesmo quando o bloco é alcançável e visível.

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
canSeeBlock?
  ├─ yes ───────────────┐
  └─ no → reposition ───┤
                        ↓
             ToolSelector / canHarvest
                        ↓
              lookAt → dig(raycast)
                        ↓
             verify normal/gravity
                        ↓
                  collectDrop
```

Veja também `ARCHITECTURE.md`, `VALIDATION.md`, `REAL_TEST_CHECKLIST.md` e `test/mining.test.ts`.
