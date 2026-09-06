# Changelog

## 0.1.1 — Navigation V1.1

- `HazardCostModel` integrado de verdade ao `NavigationCostModel`.
- Custos diretos agora diferenciam lava, fogo/fogueira, cactus, magma, powder snow e berry bush.
- Gradiente de proximidade de hazards agora também usa o modelo tipado e respeita perfil `fast` / `normal` / `safe`.
- `CachedNavigationWorld` deixou de limpar todo o cache em qualquer revisão quando o backend expõe eventos espaciais.
- `blockUpdate` invalida somente uma pequena vizinhança do bloco alterado.
- `chunkColumnLoad` / `chunkColumnUnload` invalidam apenas entradas indexadas no chunk afetado.
- Mantido fallback global por revisão para implementações genéricas de `NavigationWorld` sem eventos de invalidação espacial.
- Adicionados 5 testes de regressão para hazard costs e cache espacial/chunk-aware.
- GitHub Actions adicionado para executar testes e build automaticamente em mudanças do Navigation.
- CI confirmado: **26/26 testes automatizados passando** e `tsc` concluído com sucesso.
- Versão do módulo atualizada para `0.1.1`.

## 0.1.0 — Navigation V1

- A* 3D determinístico.
- Binary heap PriorityQueue.
- NavigationWorld + Mineflayer adapter + cache invalidável.
- AABB corporal contra collision shapes.
- Alturas fracionárias para slabs/stairs.
- Ground/swimming/climbing nodes.
- Horizontal, diagonal, step, drop, swim e climb neighbors.
- Cost model e hazard proximity penalty.
- UNKNOWN world/chunk handling.
- Path validation e conservative optimization.
- Path execution exclusivamente via Movement facade.
- Replanning por mudança/falha.
- Dynamic entity navigation.
- Safe route, escape danger e return home.
- Navigation lock com priority/preemption.
- Timeout, cancellation e search limits.
- A suíte automatizada executável da V1 tinha 21 testes; a contagem documental anterior de 33 foi corrigida na V1.1.
