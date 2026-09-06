# Minecraft Movement Skills V2 — Java 26.2

Biblioteca de **skills determinísticas de movimentação** para bots Minecraft Java, escrita em **TypeScript + Mineflayer**. O gameplay não depende de LLM.

A V2 transforma o módulo de uma camada de “andar reto com reação simples” em um **executor local de locomoção**: ele percebe um corredor com largura corporal, entende collision shapes parciais, distingue modos de locomoção, desvia de obstáculos locais, trata quedas, sobe, nada, escala, diagnostica tipos de stuck e segue alvos temporariamente perdidos.

> Escopo importante: isto ainda é **Movement**, não `Navigation`. Não há A* global, mineração de passagem nem construção de ponte. A V2 é responsável por executar bem movimentos locais; o futuro módulo Navigation decidirá rotas longas.

## Estado da V2

| Área | V2 |
|---|---|
| Estrutura de skills | 🟢 |
| Cancelamento / timeout | 🟢 |
| Lock / ownership | 🟢 |
| Obstáculos simples | 🟢 |
| Recovery | 🟢 |
| Percepção espacial | 🟢 |
| Verticalidade local | 🟢 |
| Água / escalada | 🟢 |
| Seguimento complexo | 🟢 |
| Pathfinding global A* | fora do escopo (Navigation) |
| Teste em servidor real 26.2 | pendente para o usuário |

“🟢” aqui significa **implementado e coberto pela validação local**, pronto para teste de integração no Minecraft real; não significa que já foi validado em todas as geometrias possíveis do jogo.

## Skills públicas

### Originais

- `moveTo`
- `followPlayer`
- `stop`
- `jump`
- `sprint`
- `lookAt`
- `avoidObstacle`

### Novas primitives V2

- `stepUp`
- `safeDrop`
- `climb`
- `swim`

## Infraestrutura V2

- `SkillRunner`
- `SkillRegistry`
- `MovementController`
- `MovementLock` com handoff seguro
- `TerrainAnalyzer`
- `SpatialProbe`
- `LocalObstacleSolver`
- `LocalMovementEngine`
- `StuckDetector` V2
- `RecoveryPlanner`
- `TargetTracker`

## Percepção espacial

A V1 sondava essencialmente um ponto à frente. A V2 usa um corredor com múltiplas lanes representando a largura do jogador:

```text
              direção
                 ↑

        ●        ●        ●
      esquerda centro   direita

      largura aproximada do corpo
```

Cada lane verifica:

- colisão nos pés;
- colisão na parte superior do corpo;
- altura do obstáculo;
- collision shapes reais do bloco;
- água;
- lava;
- climbables;
- portas/gates/trapdoors sólidos;
- hazards;
- superfície de pouso abaixo;
- profundidade da queda.

Isso permite diferenciar melhor slabs, stairs e blocos parciais em vez de considerar tudo um cubo inteiro.

## Terreno e hazards

O analisador reconhece semanticamente classes úteis para movimento, incluindo:

- água / lava;
- ladders;
- vines;
- scaffolding;
- weeping/twisting/cave vines;
- doors / trapdoors / fence gates quando possuem colisão;
- fire / soul fire;
- cactus;
- campfire;
- magma block;
- sweet berry bush;
- powder snow;
- wither rose.

Blocos/chunks não carregados são tratados conservadoramente como inseguros.

## Quedas

`TerrainAnalyzer.analyzeDropAt()` procura uma superfície abaixo do corredor e devolve:

```ts
{
  depth,
  landingY,
  landingBlock,
  fluid,
  hazard,
  safe,
  reason
}
```

Por padrão, `moveTo` aceita apenas quedas locais de até 3 blocos (configurável por `maxSafeDrop`) ou pouso em água identificado como seguro pelo analisador local.

Use a primitive explícita:

```ts
await movement.safeDrop({ maxDepth: 3 })
```

Ela só inicia a queda se **todas as lanes corporais** da borda analisada forem seguras.

## Modos de locomoção

A V2 detecta dinamicamente:

```text
ground
airborne
falling
swimming
climbing
```

`LocalMovementEngine` muda os controles de acordo com o modo. Por exemplo:

- ground → forward/jump/sprint/local avoidance;
- swimming → forward + jump para subir / sneak para descer;
- climbing → subida controlada ou descida por gravidade;
- falling → evita recovery agressivo no meio da queda.

## Verticalidade

### stepUp

```ts
await movement.stepUp({ maxRise: 1.25 })
```

Valida se existe um degrau atravessável à frente e confirma ganho real de altura.

### safeDrop

```ts
await movement.safeDrop({ maxDepth: 3 })
```

Analisa a queda antes de atravessar a borda e aguarda pouso.

### climb

```ts
await movement.climb({ targetY: 72 })
```

Requer uma superfície climbable próxima, monitora progresso vertical e falha se perder contato antes do alvo.

### swim

```ts
await movement.swim({ x: 12, y: 65, z: -4 })
```

Ou uma ação curta sem alvo:

```ts
await movement.swim({ duration: 1200 })
```

## Local obstacle solver

O módulo continua sem A*, mas agora obstáculos imediatos não significam automaticamente “fail”.

Quando o corredor está bloqueado, o solver examina headings laterais:

```text
       esquerda     alvo      direita
           \         ↑         /
            \       BOT       /
```

Cada alternativa recebe uma pontuação de clearance levando em conta:

- colisão;
- queda insegura;
- hazard;
- parede/teto baixo;
- degrau atravessável.

O solver pode escolher:

```text
jump
left
right
back
swim
climb
forward
stop
```

Ele resolve **desvios locais**, não labirintos ou rotas longas.

## StuckDetector V2

Em vez de somente `stuck = true/false`, a V2 classifica:

```text
no_motion
no_progress
oscillating
falling
none
```

A análise usa:

- progresso em direção ao objetivo;
- displacement;
- distância realmente percorrida pela trajetória;
- velocidade média;
- velocidade vertical.

Isso evita tratar `← → ← →` como se fosse progresso útil e evita aplicar um recovery agressivo enquanto o personagem simplesmente está caindo.

## Recovery V2

`RecoveryPlanner` combina:

- causa do stuck;
- análise espacial atual;
- melhor corredor lateral;
- número da tentativa;
- classificação de movimento inseguro.

Exemplos:

```text
queda / lava / hazard
  → recua primeiro
  → procura corredor lateral seguro
  → nunca pula cegamente para frente

falling
  → espera física resolver

step
  → jump

oscillating / no_progress
  → deslocamento lateral deliberado
```

O número máximo de tentativas continua limitado pelo `SkillRunner`.

## FollowPlayer V2

`followPlayer` não falha mais imediatamente quando o jogador desaparece do tracking.

Fluxo:

```text
alvo visível
   ↓
atualiza lastKnownPosition
   ↓
alvo some
   ↓
continua até lastKnownPosition
   ↓
chegou?
   ↓
faz sweep visual determinístico
   ↓
alvo reapareceu?
   ├─ sim → continua follow
   └─ não → espera até reacquireTimeoutMs e só então falha
```

Exemplo:

```ts
await movement.followPlayer({
  username: 'Steve',
  distance: 3,
  maxDistance: 48,
  hardMaxDistance: 96,
  sprintDistance: 8,
  reacquireTimeoutMs: 8000,
  lastKnownTolerance: 1.5,
  localAvoidance: true,
  timeout: 60_000
})
```

`maxDistance` é uma distância “soft”; `hardMaxDistance` é o corte absoluto.

O resultado inclui `reacquisitions` e `lastKnownPosition`.

## MovementLock V2

Preemption agora faz handoff seguro:

```text
Skill A possui movimento
       ↓
Skill B pede preempt
       ↓
AbortSignal de A é disparado
       ↓
A executa cleanup e release
       ↓
SÓ ENTÃO B recebe ownership
```

Isso evita a race da V1 em que A podia executar `stopAll()` depois de B já ter começado.

`stop()` também cancela o dono atual e aguarda sua liberação antes de retornar sucesso.

## Uso rápido

```ts
import mineflayer from 'mineflayer'
import { createMovementSkills } from './src/index.js'

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'MovementBot',
  version: '26.2'
})

bot.once('spawn', async () => {
  const movement = createMovementSkills(bot)

  const result = await movement.moveTo({
    x: 20,
    y: 64,
    z: 20,
    tolerance: 0.75,
    maxSafeDrop: 3,
    localAvoidance: true,
    timeout: 20_000
  })

  console.log(result)
})
```

## Cancelamento

```ts
const abort = new AbortController()
const task = movement.moveTo(
  { x: 100, y: 64, z: 100 },
  { signal: abort.signal }
)

setTimeout(() => abort.abort(), 2000)
console.log(await task)
```

## Eventos adicionais V2

Além de `skill:*`, a V2 emite:

```text
movement:avoidance
movement:recovery-plan
movement:target-lost
movement:target-reacquired
```

## Minecraft Java 26.2

O projeto continua configurado para Node.js 22+ e para a distribuição independente `mineflayer-26.2` da Complexity-ML. O código de Movement usa a API pública herdada de Mineflayer; não chama extensões privadas do fork.

A troca para Mineflayer upstream oficial deve exigir apenas atualizar a dependência quando o upstream tiver suporte 26.2 adequado para o ambiente.

## Instalação

```bash
npm install
npm run build
npm test
```

Teste com servidor:

```bash
npm run example
```

Variáveis opcionais:

```text
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=MovementBot
MC_VERSION=26.2
```

## O que ainda pertence a Navigation

A V2 deliberadamente não implementa:

- A*;
- path graph global;
- planejar rota ao redor de uma casa inteira;
- construir ponte;
- minerar parede para abrir caminho;
- parkour complexo;
- barco / cavalo / entidades montadas;
- elytra;
- abrir portas como política de navegação/interação.

Esses casos exigem planejamento, interação ou controladores especializados acima da camada Movement.

Veja `REAL_TEST_CHECKLIST.md` antes do teste no Minecraft real.
