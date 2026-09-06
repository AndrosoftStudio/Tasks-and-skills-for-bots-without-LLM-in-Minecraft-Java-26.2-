# Checklist de teste real — Minecraft Java 26.2

Faça os testes em mundo controlado, preferencialmente sem itens importantes no inventário.

## 1. Plano

- `moveTo` 5, 10 e 20 blocos em terreno plano.
- repetir com sprint habilitado/desabilitado.
- cancelar no meio usando `AbortController`.
- chamar `stop()` durante `moveTo` e iniciar outra skill logo depois.

Esperado: chegada estável, nenhum controle preso e nenhum conflito de ownership.

## 2. Collision shapes / degraus

Monte uma pista com:

- slab inferior;
- stairs;
- bloco inteiro;
- fence;
- wall;
- teto baixo.

Esperado: slab/stair atravessáveis; full block pode usar jump; fence/wall/teto baixo não devem ser tratados como espaço livre.

## 3. Quedas

Monte bordas com:

- 1 bloco;
- 2 blocos;
- 3 blocos;
- 4+ blocos;
- lava abaixo;
- água abaixo.

Teste `moveTo` e `safeDrop`.

Esperado: quedas configuradas como seguras podem ocorrer; queda acima do limite e lava devem ser rejeitadas.

## 4. Hazards

Teste aproximação contra:

- lava;
- cactus;
- campfire;
- magma block;
- sweet berry bush;
- powder snow.

Esperado: o corredor é classificado como hazard e o bot não avança cegamente.

## 5. Obstacle avoidance local

Crie:

- pilar de 1 bloco de largura;
- pequena parede com saída clara à esquerda;
- pequena parede com saída clara à direita;
- corredor sem saída.

Esperado: o bot contorna obstáculos pequenos quando existe corredor local; beco sem saída pode falhar (Navigation ainda não existe).

## 6. Stuck / recovery

Prenda o bot em geometrias simples onde ele não progride.

Observe eventos:

- `movement:recovery-plan`;
- `movement:avoidance`.

Esperado: recovery limitado, sem loop infinito e sem jump cego em hazard/drop.

## 7. Água

Teste:

- entrar em água rasa;
- atravessar água;
- nadar para cima;
- nadar para baixo;
- `swim({x,y,z})`.

Esperado: sprint é desligado na água, jump/sneak controlam verticalidade e os controles são limpos no fim.

## 8. Escalada

Teste ladder, vine e scaffolding.

- subir usando `climb({ targetY })`;
- descer;
- usar `moveTo` com alvo acima estando alinhado com climbable.

Esperado: progresso vertical monitorado; se perder o climbable antes de chegar, falha em vez de continuar enviando controles sem efeito.

## 9. FollowPlayer

Teste:

1. jogador andando em linha reta;
2. jogador correndo;
3. jogador passando atrás de um pilar;
4. jogador entrando atrás de uma pequena estrutura e reaparecendo;
5. jogador sumindo por mais que `reacquireTimeoutMs`;
6. jogador muito além de `hardMaxDistance`.

Esperado: distância desejada mantida; perda curta usa last-known-position; reacquisition incrementa contador; perda longa falha de forma estruturada.

## 10. Logs para guardar

No primeiro teste real, guarde:

- console completo;
- resultado de cada skill;
- coordenadas do cenário que falhou;
- bloco/estrutura envolvida;
- evento `movement:*` imediatamente anterior à falha.

Esses dados permitem ajustar thresholds físicos sem transformar o módulo em tentativa-e-erro.
