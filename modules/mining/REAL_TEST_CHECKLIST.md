# Mining V1 — Real Server Test Checklist

Use um mundo de teste Minecraft Java 26.2 com o bot conectado pelo Mineflayer customizado do projeto.

## 1. Busca
- [ ] `findBlock` encontra carvão exposto próximo.
- [ ] `findBlocks` respeita `maxDistance` e `count`.
- [ ] `reachableOnly:true` não desloca o bot durante a consulta.
- [ ] minério em chunk não carregado não é retornado como alvo válido.

## 2. Ferramenta
- [ ] troca da mão vazia para picareta adequada.
- [ ] prefere picareta apropriada a item harvestable porém ineficiente.
- [ ] recusa minério valioso quando não existe ferramenta capaz de gerar drop.
- [ ] não tenta equipar item que desapareceu do inventário entre seleção e equip.

## 3. Mine block
- [ ] navega para alcance de interação sem entrar dentro do bloco.
- [ ] olha para o alvo antes de cavar.
- [ ] revalida o bloco após a aproximação.
- [ ] retorna `BLOCK_CHANGED` se outro jogador quebrar/substituir o alvo.
- [ ] confirma remoção do bloco após `dig`.

## 4. Vein
- [ ] minera veio conectado nas seis faces.
- [ ] não inclui minério apenas diagonal.
- [ ] respeita `maxBlocks`.
- [ ] respeita `maxRadius`.
- [ ] continua após um bloco individual falhar e registra em `skipped`.

## 5. Drops
- [ ] identifica entidade de item 26.2.
- [ ] usa `goToEntity` para item móvel quando disponível.
- [ ] confirma pickup por desaparecimento da entidade ou aumento do inventário.
- [ ] encerra por timeout quando o drop fica inacessível.

## 6. Segurança / ambiente
- [ ] minério ao lado de lava com perfil `SAFE` usa a política de hazards do Navigation V1.1.
- [ ] mineração perto de água não causa loop infinito.
- [ ] alvo no teto e no chão respeita alcance vertical.
- [ ] região protegida por plugin retorna falha limpa sem travar a task.
- [ ] cancelar via `AbortSignal` interrompe busca/coleta/mineração composta.

## Critério de aceite
Considerar Mining V1 validado em servidor real quando todos os itens críticos de busca, ferramenta, mine block e drops passarem em pelo menos três execuções consecutivas sem intervenção manual.
