# Validation

## Navigation V1 baseline

A documentação inicial da V1 citava 33 validações locais, mas a suíte executável real descoberta pelo CI contém **21 testes automatizados** antes das correções da V1.1. A V1.1 adicionou 5 testes de regressão, totalizando **26 testes automatizados**.

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

## CI — confirmado

A V1.1 adiciona `.github/workflows/navigation-ci.yml`. O workflow executa:

```text
npm install
npm test
npm run build
```

com Node.js 22.

Resultado confirmado no GitHub Actions para a V1.1:

```text
26 tests
26 pass
0 fail
```

O `npm run build` (`tsc -p tsconfig.json`) também concluiu com sucesso.

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
