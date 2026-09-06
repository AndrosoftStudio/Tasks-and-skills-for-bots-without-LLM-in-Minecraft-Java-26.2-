# Mining V1 Validation

## Validação local executada
O núcleo independente de Mineflayer foi compilado com TypeScript strict (`types.ts`, `ToolSelector.ts`, `MiningService.ts`, `skills.ts`) e passou em smoke test de seleção/equip de ferramenta, remoção do bloco e resultado tipado.

## Testes automatizados no módulo
`test/mining.test.ts` cobre:
- seleção e equip de ferramenta harvestable antes do dig;
- troca de item atualmente segurado por ferramenta harvestable mais apropriada;
- recusa de minério sem ferramenta válida;
- descoberta de veio conectado sem incluir bloco distante/desconectado;
- recovery de `mineNearest` ao falhar o primeiro candidato;
- `reachableOnly` usando `isReachable` sem chamar `goToBlock`;
- `findBlock` retornando o candidato correspondente mais próximo.

## Invariantes revisados
- bloco é revalidado depois da navegação;
- remoção pós-dig é verificada;
- `Block.canHarvest` precede heurística de ferramenta;
- BFS do veio tem raio, limite configurável e hard cap;
- coleta tem deadline;
- loops respeitam `AbortSignal`;
- Mining não duplica A*, walkability ou movement;
- `NavigationV11Adapter` converte explicitamente o contrato público do Navigation V1.1;
- as cinco skills públicas possuem wrappers explícitos com nome e timeout padrão.

## Teste real ainda necessário
Servidor Minecraft Java 26.2/Mineflayer real deve validar:
- IDs do registry para todos os blocos atuais;
- forma exata das entidades de item no protocolo 26.2;
- timings de `dig` e pickup sob latência;
- blocos protegidos por plugins/claims;
- água/lava ao redor do ponto de mineração;
- minério exposto em teto/chão e alcance vertical;
- troca de ferramenta com inventário real.
