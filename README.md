# Tasks and Skills for Bots Without LLM in Minecraft Java 26.2

Biblioteca modular de **skills determinísticas para bots de Minecraft Java 26.2**, projetada para permitir que bots executem tarefas complexas sem depender de LLM durante o gameplay.

## Objetivo

Separar o comportamento do bot em camadas reutilizáveis:

```text
Planner / State Machine / Behavior Tree
                ↓
             Skills
                ↓
      Navigation / Movement
                ↓
            Mineflayer
                ↓
        Minecraft Java 26.2
```

As skills possuem contratos previsíveis com validação, execução, verificação, recuperação, timeout, cancelamento e cleanup.

## Módulos

| Módulo | Status | Descrição |
| --- | --- | --- |
| `movement` | ✅ V2 | Movimentação primitiva, percepção espacial local, obstáculos, verticalidade, água/escalada, recovery e follow dinâmico |
| `navigation` | ⏳ Futuro | Pathfinding, rotas, `findPath`, `goToBlock`, `goToEntity`, `escapeDanger`, `returnHome` |
| `mining` | ⏳ Futuro | Busca, mineração, veios e coleta |
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
  movement/
  navigation/      # futuro
  mining/          # futuro
  ...
```

Cada módulo deve permanecer utilizável de forma determinística e independente de serviços externos de IA.

## Primeiro módulo: Movement V2

O módulo de movimentação inclui `moveTo`, `followPlayer`, `stop`, `jump`, `sprint`, `lookAt`, `avoidObstacle`, `stepUp`, `safeDrop`, `climb` e `swim`, além de percepção espacial por collision shapes, análise de terreno, obstacle solver local, stuck detection, recovery baseado na causa, reacquisition de jogador e ownership seguro de movimento.

Veja `modules/movement/README.md` para documentação e instruções específicas.

## Princípio do projeto

> O bot deve conseguir jogar por regras, estado, algoritmos e skills determinísticas. Um LLM pode ser adicionado futuramente como planejador de alto nível, mas não deve ser necessário para executar as ações básicas do jogo.
