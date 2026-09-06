# Mining V1.1 — Real Test Checklist

Use este checklist em um servidor Minecraft Java 26.2 real com o fork Mineflayer 26.2 configurado pelo módulo.

## 1. Linha de visão
- [ ] Minério exposto na parede: minera sem reposicionamento desnecessário.
- [ ] Minério dentro do alcance mas atrás de uma parede: não chama `dig` imediatamente.
- [ ] Existe uma posição lateral acessível: o bot reposiciona e minera quando `canSeeBlock` passa a `true`.
- [ ] Nenhuma posição acessível expõe o bloco: retorna `BLOCK_NOT_VISIBLE`.
- [ ] O alvo é quebrado/trocado por outro jogador durante o reposicionamento: retorna `BLOCK_CHANGED`.
- [ ] Minério no teto e no chão consegue obter uma face visível sem entrar no bloco.

## 2. Raycast de dig
- [ ] `dig(..., 'raycast')` funciona no fork Mineflayer 26.2.
- [ ] Face visível escolhida é aceita em servidor vanilla.
- [ ] Testar em servidor com anti-cheat para confirmar que a orientação/face não dispara falsos positivos.

## 3. Ferramentas
- [ ] Mão vazia em bloco harvestable usa `canHarvest(null)`.
- [ ] Ferro/diamante não são minerados com ferramenta incapaz de produzir o drop quando `requireHarvestable=true`.
- [ ] Ferramenta correta substitui item harvestable porém mais lento quando disponível.
- [ ] Item desaparecendo do inventário antes de `equip` resulta em falha controlada.

## 4. Verificação pós-dig
- [ ] Stone/ore removido realmente desaparece e retorna sucesso.
- [ ] Servidor/plugin cancela a quebra e o mesmo bloco normal continua presente: retorna `DIG_FAILED`.
- [ ] Areia com outra areia acima: quebrar a inferior não retorna falso `DIG_FAILED` quando a superior cai no mesmo lugar.
- [ ] Repetir com gravel.
- [ ] Repetir com concrete powder.
- [ ] Testar anvil/dragon egg apenas em ambiente controlado, confirmando comportamento do servidor.

## 5. Veios
- [ ] Veio conectado por faces é descoberto.
- [ ] Bloco apenas diagonal não entra automaticamente no veio.
- [ ] `maxBlocks` interrompe a expansão.
- [ ] Hard cap 128 não é ultrapassado.
- [ ] `maxRadius` impede expansão distante.
- [ ] Bloco do veio mudando durante a execução é pulado com segurança.

## 6. Drops e inventário
- [ ] Drop próximo é coletado e confirmado por delta de inventário/desaparecimento da entidade.
- [ ] Outro player coleta o drop primeiro: rotina não trava indefinidamente.
- [ ] Inventário completamente cheio: `collectDrop` termina em `COLLECT_FAILED` após o deadline, sem loop infinito.
- [ ] Inventário cheio mas com stack parcial compatível: confirmar pickup quando houver espaço no stack.
- [ ] Registrar esse comportamento como limite intencional até existir o módulo `inventory`.

## 7. Ambiente perigoso
- [ ] Mineração ao lado de lava respeita a rota segura escolhida pelo Navigation.
- [ ] Água ao redor do alvo não quebra reposicionamento.
- [ ] Slabs/stairs/cavernas estreitas não levam o candidato de LOS para posição inválida sem recovery.

## 8. Cancelamento e latência
- [ ] Abort durante busca.
- [ ] Abort durante reposicionamento.
- [ ] Abort durante dig.
- [ ] Abort durante coleta.
- [ ] Latência alta não causa loop infinito nem múltiplos digs concorrentes.
