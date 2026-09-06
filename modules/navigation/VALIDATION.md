# Validation

Validação local realizada antes do primeiro commit do Navigation.

## TypeScript

- `strict: true`
- `noUncheckedIndexedAccess: true`
- build/typecheck concluído sem erros.

## Unit/integration tests

**33/33 testes passaram.**

Cobertura funcional inclui:

- PriorityQueue;
- A* reto;
- A* contornando parede de dois blocos;
- search limit;
- água e custo;
- ladder vertical;
- chunk/world UNKNOWN;
- step up;
- safe drop;
- diagonal corner-cut prevention;
- slab com altura 0.5;
- AABB pegando colisão apenas lateral;
- path optimizer;
- path invalidado por mudança no mundo;
- lock/preemption segura;
- timeout/cancelamento;
- `goToPosition` + Movement facade;
- replan após falha de Movement;
- `isReachable` sem mover o bot;
- seleção por navigation cost;
- `goToEntity` replanejando alvo móvel;
- `returnHome`;
- invalidação do cache por revisão;
- penalidade de proximidade de lava.

## Benchmark sintético em mapa plano

Última execução antes da publicação:

| Distância diagonal | Nós expandidos | Tempo aproximado |
| ---: | ---: | ---: |
| 10 | 11 | ~14 ms |
| 32 | 33 | ~18 ms |
| 64 | 65 | ~23 ms |
| 100 | 101 | ~27 ms |

Os valores são de ambiente de validação sintético, não do Minecraft real.

## Ainda não validado

O módulo ainda precisa do teste de integração no Minecraft Java 26.2 real, especialmente collision shapes/version data, física de water/climb e handoff Navigation → Movement sob latência real do servidor.
