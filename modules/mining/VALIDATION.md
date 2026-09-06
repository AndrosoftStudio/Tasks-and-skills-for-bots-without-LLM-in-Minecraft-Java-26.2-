# Mining V1.1 Validation

## Testes automatizados
`test/mining.test.ts` cobre:
- seleção e equip da melhor ferramenta harvestable;
- recusa de minério sem ferramenta válida;
- descoberta de veio conectado sem incluir bloco distante/desconectado;
- recovery de `mineNearest` ao falhar o primeiro candidato;
- `reachableOnly` usando `isReachable` sem chamar `goToBlock`;
- `findBlock` retornando o alvo mais próximo;
- troca de ferramenta harvestable porém ineficiente por ferramenta melhor;
- reposicionamento até obter linha de visão;
- `BLOCK_NOT_VISIBLE` quando nenhuma tentativa de reposicionamento expõe uma face;
- bloco de gravidade substituído pelo mesmo tipo sem falso `DIG_FAILED`;
- bloco não-gravidade ainda presente após `dig` retornando `DIG_FAILED`;
- bare hands usando `Block.canHarvest(null)` em vez de id `0`.

## Invariantes revisados
- bloco é revalidado depois da navegação;
- alvo é revalidado novamente após cada reposicionamento de LOS bem-sucedido;
- `dig` não é chamado quando não existe face visível;
- adaptador Mineflayer consulta `canSeeBlock` e usa face `raycast` no `dig`;
- remoção pós-dig continua sendo verificada para blocos normais;
- blocos com gravidade não geram falso negativo quando um sucessor igual cai na coordenada;
- `Block.canHarvest` precede heurística de ferramenta e recebe `null` para mão vazia;
- BFS do veio tem raio, limite configurável e hard cap;
- coleta tem deadline;
- loops respeitam `AbortSignal`;
- Mining não duplica A*, walkability ou movement;
- `NavigationV11Adapter` converte explicitamente `goToBlock`, `goToPosition`, `goToEntity` e `isReachable`.

## Limitações conhecidas
Inventário cheio ainda não é resolvido pelo Mining. `collectDrop` pode terminar em `COLLECT_FAILED` após o deadline quando o bot não possui espaço/stack compatível. Gestão de slots, descarte e armazenamento pertencem ao futuro módulo `inventory`.

## Teste real ainda necessário
Servidor Minecraft Java 26.2/Mineflayer real deve validar:
- `bot.canSeeBlock` em minério no chão, teto, paredes e atrás de obstáculos;
- reposicionamento em cavernas estreitas, slabs/stairs e diferenças de altura;
- face `raycast` sob anti-cheat e latência;
- IDs/registry dos blocos de gravidade atuais;
- areia, cascalho e concrete powder caindo imediatamente para a coordenada minerada;
- forma exata das entidades de item no protocolo 26.2;
- timings de `dig` e pickup sob latência;
- inventário completamente cheio e parcialmente stackável;
- blocos protegidos por plugins/claims;
- água/lava ao redor do ponto de mineração;
- troca de ferramenta com inventário real.
