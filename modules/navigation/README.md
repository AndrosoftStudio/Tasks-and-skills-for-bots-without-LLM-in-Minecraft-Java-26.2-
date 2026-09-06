# Navigation V1.1 — Minecraft Java 26.2 deterministic bot skills

Segundo módulo do projeto. O `Navigation` decide **por onde ir**; o `Movement V2` continua responsável por executar fisicamente cada trecho.

## Skills

- `findPath`
- `followPath`
- `goToPosition`
- `goToBlock`
- `goToEntity`
- `replanPath`
- `findSafeRoute`
- `findNearestReachable`
- `isReachable`
- `estimatePathCost`
- `escapeDanger`
- `returnHome`

## O que existe de verdade

- A* 3D com heap binário.
- Nós com modos `ground`, `swimming`, `climbing` e `airborne`.
- Alturas fracionárias para slabs/stairs e superfícies parciais.
- Validação do corpo usando AABB de aproximadamente 0,6 x 1,8 contra `Block.shapes`.
- Geração de vizinhos para walk, diagonal, step up/down, safe drop, swim e climb.
- Bloqueio de diagonal quando os cantos não comportam o corpo.
- Modelo de custo por terreno/ação.
- `HazardCostModel` ativo no custo real da rota, diferenciando lava, fogo/fogueira, cactus, magma, powder snow e berry bush.
- Perfil de risco `fast` / `normal` / `safe` aplicado também ao gradiente de proximidade de hazards.
- Mundo desconhecido/chunk não carregado tratado como `UNKNOWN`, nunca como ar.
- Cache de blocos limitado com invalidação espacial por bloco/vizinhança e invalidação por chunk; fallback global permanece apenas para backends que não expõem eventos espaciais.
- Path optimizer conservador para trechos retos.
- Path validator antes da execução.
- Replanning quando Movement falha ou um waypoint fica inválido.
- Alvo dinâmico em `goToEntity` com replanejamento em chunks de rota.
- `NavigationLock` com prioridade e preemption segura para `escapeDanger`.
- AbortSignal, timeout, limites de expansão e yield periódico do A*.

## Correções da V1.1

### Hazard cost real

O `HazardCostModel` deixou de ser código morto. Ele agora participa diretamente de `NavigationCostModel` e também calcula o custo de proximidade usado pelo `WalkabilityAnalyzer`. Isso faz o planner distinguir tipos de perigo e aumentar/reduzir a aversão conforme o perfil escolhido.

### Cache espacial

`CachedNavigationWorld` não limpa mais todo o cache a cada `blockUpdate`/chunk event quando o backend fornece eventos espaciais. Mudanças em bloco invalidam apenas uma pequena vizinhança, enquanto load/unload de chunk remove somente entradas indexadas naquele chunk. Implementações genéricas de `NavigationWorld` sem eventos continuam usando invalidação global por revisão como fallback seguro.

## Relação com Movement V2

O Navigation não usa `bot.setControlState()`.

Ele executa waypoints através de uma interface compatível com o Movement V2:

```text
A* / Path Planner
      ↓
Waypoints
      ↓
PathExecutor
      ↓
Movement V2
  moveTo / stepUp / safeDrop / climb / swim
```

## Exemplo de API

```ts
const navigation = createNavigation({
  bot,
  movement,
  home: new Vec3(0, 64, 0)
})

await navigation.goToPosition({
  x: 100,
  y: 64,
  z: -20,
  replan: true
})

const path = await navigation.findPath({
  target: new Vec3(150, 70, 40),
  avoidHazards: true,
  profile: 'safe'
})
```

## Instalação

```bash
cd modules/navigation
npm install
npm test
npm run build
```

Node.js 22+.

## Limites intencionais desta versão

O módulo **não** quebra nem coloca blocos, não constrói pontes/pilares, não faz parkour extremo, não controla elytra/barcos/minecarts e não abre portas sozinho. Portas que exigem interação podem ser identificadas como `requiresInteraction`; a execução deve ser integrada ao futuro módulo `Interaction`.

Esses limites são intencionais para manter a separação entre Navigation, Movement, Mining, Building e Interaction.
