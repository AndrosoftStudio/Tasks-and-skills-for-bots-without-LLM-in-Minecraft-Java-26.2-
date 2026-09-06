# Tasks and Skills for Bots Without LLM in Minecraft Java 26.2

Biblioteca modular de **skills determinísticas para bots de Minecraft Java 26.2**, projetada para permitir que bots executem tarefas complexas sem depender de LLM durante o gameplay.

## Objetivo

Separar o comportamento do bot em camadas reutilizáveis:

```text
Planner / State Machine / Behavior Tree
                ↓
          Task / Domain Skills
          (Mining, Building...)
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
| `mining` | ✅ V1.1 | Busca, LOS/reposition, seleção de ferramenta, mineração verificada, tratamento de blocos com gravidade, veios, coleta e recovery |
| `building` | ⏳ Próximo | Colocação, quebra e construção composta |
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
  mining/         # ✅ Mining V1.1
  building/       # próximo
  ...
```

## Movement V2

Fornece `moveTo`, `followPlayer`, `stop`, `jump`, `sprint`, `lookAt`, `avoidObstacle`, `stepUp`, `safeDrop`, `climb` e `swim`, além de percepção espacial local e recovery.

Veja `modules/movement/README.md`.

## Navigation V1.1

Fornece `findPath`, `followPath`, `goToPosition`, `goToBlock`, `goToEntity`, `replanPath`, `findSafeRoute`, `findNearestReachable`, `isReachable`, `estimatePathCost`, `escapeDanger` e `returnHome`.

O A* trabalha em mundo 3D, trata slabs/stairs por alturas fracionárias, testa o volume corporal contra `Block.shapes`, diferencia mundo desconhecido de ar, usa custos específicos por tipo de hazard e mantém cache espacial/chunk-aware para evitar invalidação global desnecessária em servidores movimentados.

Veja `modules/navigation/README.md`.

## Mining V1.1

Fornece as skills `findBlock`, `mineBlock`, `mineNearest`, `collectDrop` e `mineVein`, além da consulta auxiliar `findBlocks`.

O módulo reutiliza Navigation V1.1 por meio de um adaptador explícito, consulta `isReachable` sem deslocar o bot, revalida o alvo após a aproximação, verifica linha de visão, tenta reposicionar por `goToPosition`, usa `Block.canHarvest(null)` para mão vazia, faz `dig` com face por raycast e diferencia blocos normais de blocos sujeitos a gravidade na verificação pós-dig.

Inventário cheio permanece uma limitação explícita do Mining até existir o módulo `inventory`.

Veja `modules/mining/README.md`.

## Princípio do projeto

> O bot deve conseguir jogar por regras, estado, algoritmos e skills determinísticas. Um LLM pode ser adicionado futuramente como planejador de alto nível, mas não deve ser necessário para executar as ações básicas do jogo.
