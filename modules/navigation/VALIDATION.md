# Validation

## Navigation V1 baseline

A V1 original foi validada localmente com **33/33 testes passando** antes da primeira publicação.

Cobertura existente inclui PriorityQueue, A* reto/contorno/search limit, água, ladder, UNKNOWN world/chunk, step up, safe drop, diagonal corner-cut prevention, slabs, AABB lateral, path optimizer/validator, lock/preemption, timeout/cancelamento, `goToPosition`, replan após falha de Movement, `isReachable`, seleção por navigation cost, alvo móvel em `goToEntity`, `returnHome`, cache por revisão e proximidade de lava.

## Navigation V1.1 regression coverage

Foram adicionados **5 testes de regressão** especificamente para as correções desta versão:

- `HazardCostModel` diferencia severidade por tipo de hazard;
- perfil `safe` > `normal` > `fast` no custo de proximidade;
- `NavigationCostModel` realmente aplica `HazardCostModel` e torna lava direta `Infinity`;
- `blockUpdate` espacial não remove posições de cache não relacionadas;
- invalidação por chunk não remove cache de outro chunk;
- fallback global por `revision()` continua funcionando para implementações de `NavigationWorld` sem `onInvalidate`.

Os testes estão em `HazardCostModel.test.ts` e `NavigationWorldCache.test.ts`.

## CI

A V1.1 adiciona `.github/workflows/navigation-ci.yml`. Alterações em `modules/navigation/**` passam a executar no GitHub Actions:

```text
npm install
npm test
npm run build
```

com Node.js 22.

## TypeScript

O projeto permanece configurado com:

- `strict: true`;
- `noUncheckedIndexedAccess: true`.

## Benchmark sintético da V1

| Distância diagonal | Nós expandidos | Tempo aproximado |
| ---: | ---: | ---: |
| 10 | 11 | ~14 ms |
| 32 | 33 | ~18 ms |
| 64 | 65 | ~23 ms |
| 100 | 101 | ~27 ms |

Os valores são do ambiente sintético da V1 e não representam um servidor Minecraft real.

## Ainda precisa de teste real

O módulo ainda precisa do teste de integração no Minecraft Java 26.2 real, especialmente collision shapes/version data, física de water/climb, dinâmica de chunks e desempenho do cache espacial sob muitas atualizações de mundo.
