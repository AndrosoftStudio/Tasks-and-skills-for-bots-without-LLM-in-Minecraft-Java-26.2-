# Mining V1.1 Architecture

```text
Planner / Behavior Tree
        ↓
     MiningAPI
        ↓
  MiningService ───────→ ToolSelector
     │      │
     │      └──────────→ MiningWorld
     │                    ↓
     │              Mineflayer adapter
     ↓
MiningNavigation
     ↓
NavigationV11Adapter
     ↓
Navigation V1.1 → Movement V2 → Mineflayer
```

`MiningService` controla orquestração, recovery e verificação. `ToolSelector` é determinístico e usa `Block.canHarvest` quando disponível. `MiningWorld` isola Mineflayer para que o núcleo seja testável sem servidor real.

## Navigation adapter
O contrato interno do Mining é intencionalmente pequeno e usa `ok/data`. `NavigationV11Adapter` converte para o contrato real do Navigation V1.1 (`success/data`, `Vec3`, `goToBlock({block})`, `goToPosition({x,y,z})`, `goToEntity({entity})`, `isReachable({target})`). Isso impede acoplamento com as classes internas do planner e evita duplicar pathfinding.

`goToPosition` existe na fachada do Mining apenas para recovery de linha de visão. A escolha de caminho, collision shapes, hazards e execução continuam pertencendo ao Navigation.

## Linha de visão
Depois de `goToBlock`, o Mining revalida o alvo e consulta `MiningWorld.canSeeBlock`. Se a face não estiver visível, gera candidatos em um anel horizontal ao redor do bloco, em até três níveis verticais, e tenta reposicionar através de Navigation.

Cada reposicionamento bem-sucedido é seguido por:
1. nova leitura do bloco;
2. confirmação de nome/tipo do alvo original;
3. nova consulta de linha de visão.

Se nenhuma posição válida produzir LOS, retorna `BLOCK_NOT_VISIBLE` sem executar `dig`.

## Vein discovery
`mineVein` faz BFS limitada em seis vizinhos por face. Blocos apenas diagonais não pertencem automaticamente ao mesmo veio. O seed define o nome padrão aceito; `blockNames` permite agrupar variantes, por exemplo `iron_ore` + `deepslate_iron_ore`.

## Verificação pós-dig
Para blocos normais, encontrar novamente o mesmo nome/tipo na coordenada após `dig` indica `DIG_FAILED`.

Para blocos sujeitos a gravidade, a mesma comparação não é suficiente: o bloco original pode ter sido quebrado e outro bloco idêntico pode ter caído imediatamente para a posição. Nesses casos, a conclusão bem-sucedida de `dig` é aceita como evidência causal da quebra e a presença posterior de um bloco igual não é tratada automaticamente como falha.

O adaptador Mineflayer usa face `raycast` durante `dig`.

## Recovery
- candidato inalcançável: `mineNearest` tenta o próximo;
- bloco mudou durante aproximação/reposicionamento: `BLOCK_CHANGED`;
- sem linha de visão após tentativas limitadas: `BLOCK_NOT_VISIBLE`;
- ferramenta inadequada: `NO_HARVEST_TOOL` antes de `dig`;
- drop sumiu ou foi coletado: desaparecimento da entidade/delta de inventário valida coleta;
- cancelamento: loops observam `AbortSignal`.

## Limites
Mining V1.1 não escava túneis automaticamente para expor minério fechado, não coloca tochas, não administra durabilidade, não fabrica ferramentas e não gerencia inventário cheio. Essas responsabilidades devem entrar em módulos/skills posteriores ou numa task composta de mineração.
