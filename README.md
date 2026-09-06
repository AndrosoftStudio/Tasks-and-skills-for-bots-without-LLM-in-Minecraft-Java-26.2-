# Tasks and Skills for Bots Without LLM in Minecraft Java 26.2

Biblioteca modular de **skills determinísticas para bots de Minecraft Java 26.2**, projetada para permitir que bots executem tarefas complexas sem depender de LLM durante o gameplay.

## Objetivo

Separar o comportamento do bot em camadas reutilizáveis:

```text
Planner / State Machine / Behavior Tree
                ↓
             Skills
                ↓
            Navigation
                ↓
             Movement
                ↓
            Mineflayer
                ↓
        Minecraft Java 26.2
```

## Módulos

| Módulo | Status | Descrição |
| --- | --- | --- |
| `movement` | ✅ V2 | Movimentação primitiva, percepção espacial local, obstáculos, verticalidade, água/escalada, recovery e follow dinâmico |
| `navigation` | ✅ V1.1 | A* 3D, rotas, custos tipados de hazards, cache espacial/chunk-aware, collision shapes/AABB, slabs/stairs, água/escalada, path validation, replanning, alvos móveis, escape e return home |
| `mining` | ⏳ Próximo | Busca, mineração, veios e coleta |
| `building` | ⏳ Futuro | Colocação, quebra e construção composta |
| `inventory` | ⏳ Futuro | Consulta, seleção, movimentação e equipamento de itens |
| `crafting` | ⏳ Futuro | Receitas e crafting |
| `furnace` | ⏳ Futuro | Combustível, smelting e coleta |
| `food` | ⏳ Futuro | Busca, caça, preparo e consumo |
| `combat` | ⏳ Futuro | Detecção, ataque, defesa, distância e fuga |
| `survival` | ⏳ Futuro | Saúde, fome, perigos, abrigo e sono |
| `entities` | ⏳ Futuro | Busca, acompanhamento e interação com entidades |
| `world` | ⏳ Futuro | Scan, biomas, água, cavernas e posições seguras |
| `interaction` | ⏳ Futuro | Baús, portas e blocos interativos |
| `communication` | ⏳ Futuro | Chat e eventos de comunicação |
| `state` | ⏳ Futuro | Estado consolidado do bot |
| `verification` | ⏳ Futuro | Verificações reutilizáveis de sucesso e segurança |

## Estrutura

```text
modules/
  movement/       # ✅ Movement V2
  navigation/     # ✅ Navigation V1.1
  mining/         # próximo
  ...
```

## Movement V2

Fornece `moveTo`, `followPlayer`, `stop`, `jump`, `sprint`, `lookAt`, `avoidObstacle`, `stepUp`, `safeDrop`, `climb` e `swim`, além de percepção espacial local e recovery.

Veja `modules/movement/README.md`.

## Navigation V1.1

Fornece `findPath`, `followPath`, `goToPosition`, `goToBlock`, `goToEntity`, `replanPath`, `findSafeRoute`, `findNearestReachable`, `isReachable`, `estimatePathCost`, `escapeDanger` e `returnHome`.

O A* trabalha em mundo 3D, trata slabs/stairs por alturas fracionárias, testa o volume corporal contra `Block.shapes`, diferencia mundo desconhecido de ar, usa custos específicos por tipo de hazard e mantém cache espacial/chunk-aware para evitar invalidação global desnecessária em servidores movimentados.

Veja `modules/navigation/README.md`.

## Princípio do projeto

> O bot deve conseguir jogar por regras, estado, algoritmos e skills determinísticas. Um LLM pode ser adicionado futuramente como planejador de alto nível, mas não deve ser necessário para executar as ações básicas do jogo.
