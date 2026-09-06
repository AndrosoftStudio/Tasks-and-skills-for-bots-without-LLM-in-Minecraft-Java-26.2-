# Minecraft Java 26.2 — Navigation real test checklist

Use uma área controlada antes de testar em survival importante.

1. Plano: `goToPosition` 30 blocos.
2. Parede 5×2: contornar sem tentar atravessar.
3. Obstáculo em L: encontrar a abertura.
4. Slabs: subir/descer sequência de meio bloco.
5. Stairs: subir e descer escada longa.
6. Degrau full block: step-up.
7. Queda 1 bloco: step-down.
8. Queda 2–3 blocos: safe drop permitido.
9. Queda profunda: rota deve evitar.
10. Corredor estreito: corpo não pode atravessar colisão impossível.
11. Fence/wall: tratar como bloqueio.
12. Água: entrar, atravessar e sair.
13. Ladder: subir e descer.
14. Vine/scaffolding: validar climb.
15. Lava no caminho: evitar.
16. Lava ao lado do caminho: perfil safe deve preferir afastamento quando houver alternativa.
17. Cactus/campfire/magma: evitar em perfil seguro.
18. Porta aberta: passagem física se collision shape permitir.
19. Porta fechada: não atravessar magicamente; exigir Interaction quando habilitado.
20. Bloco colocado durante rota: invalidar/replanejar.
21. Bloco quebrado abrindo atalho: nova busca deve poder usar caminho novo.
22. Chunk descarregado: nunca tratar UNKNOWN como ar.
23. `goToBlock`: parar em posição interagível próxima.
24. `goToEntity`: entidade parada.
25. `goToEntity`: entidade andando e mudando de direção.
26. `findNearestReachable`: alvo perto bloqueado vs alvo mais longe acessível.
27. `findSafeRoute`: comparar caminho curto perigoso e longo seguro.
28. `escapeDanger`: perigo atrás do bot; escolher posição segura e executar.
29. `returnHome`: voltar de 50+ blocos.
30. Cancelar A* com AbortController.
31. Cancelar no meio de `followPath`.
32. Forçar Movement a falhar e observar replan limitado.
33. Iniciar navegação normal e depois `escapeDanger`: emergency preemption deve assumir sem controles presos.
