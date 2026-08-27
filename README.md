# Times e Tarefas

Monorepo com uma API REST (Express e TypeScript, arquitetura hexagonal) e um aplicativo mobile (Expo, TypeScript, NativeWind) para gestão de times e tarefas, com relacionamento N:N entre eles.

```
teams-tasks/
├── apps/
│   ├── api/                 API REST: Express, Prisma, PostgreSQL
│   └── mobile/              App: Expo, Expo Router, NativeWind, React Query
├── packages/
│   └── shared/              Contratos Zod compartilhados pelas duas pontas
├── specs/                   O que o sistema garante, regra a regra
├── docker-compose.yml       PostgreSQL 16 para desenvolvimento
└── biome.json               Lint e format únicos para todo o monorepo
```

## Sumário

1. [Stack e por que cada escolha](#stack-e-por-que-cada-escolha)
2. [Como rodar](#como-rodar)
3. [Scripts](#scripts)
4. [Decisões arquiteturais](#decisões-arquiteturais)
5. [Modelo de dados](#modelo-de-dados)
6. [API: contratos e exemplos](#api-contratos-e-exemplos)
7. [Tratamento de erros](#tratamento-de-erros)
8. [Testes](#testes)
9. [Estrutura de pastas](#estrutura-de-pastas)
10. [Deploy](#deploy)
11. [O que eu faria diferente em produção](#o-que-eu-faria-diferente-em-produção)

A documentação está dividida em três, cada uma respondendo uma pergunta diferente:

| Documento | Responde |
|---|---|
| este `README.md` | Como rodar o projeto, e por que a arquitetura é assim |
| [`specs/`](specs/README.md) | O que o sistema **garante**: regras numeradas, casos de borda e o teste que prova cada uma |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Convenções que valem para toda mudança, e as armadilhas conhecidas desta base |

## Stack e por que cada escolha

| Camada | Escolha | Motivo |
|---|---|---|
| Monorepo | pnpm workspaces | Um pacote `shared` com schemas Zod dá tipagem ponta a ponta sem codegen |
| API | Express 5 e TypeScript | Arquitetura hexagonal, Clean Architecture e SOLID, sem framework opinado no caminho |
| Banco | PostgreSQL 16 e Prisma | O N:N entre tarefas e times é relacional puro. Migrations versionadas e tipos gerados |
| Validação | Zod | O mesmo schema valida a entrada da API e o formulário do aplicativo |
| App | Expo SDK 57 e Expo Router | Rotas por arquivo, tipadas em tempo de compilação |
| Estilo | NativeWind 4 | Requisito do enunciado: estilização sem `styled-components` |
| Server state | React Query 5 | Cache, invalidação, atualizações otimistas e persistência offline |
| Formulários | react-hook-form e Zod | Validação declarativa reusando os schemas compartilhados |
| Offline | MMKV com fallback para AsyncStorage | O cache do React Query sobrevive ao aplicativo fechado |
| Lint e format | Biome | Um binário para os dois, sem conflito de regras entre linter e formatter |
| Testes | Vitest e Supertest na API, Jest e RNTL no app | Unitário sem banco, integração com Postgres real |

## Como rodar

### Pré-requisitos

* Node.js 20.11 ou superior (desenvolvido na 24)
* pnpm 9 ou superior: `npm i -g pnpm`
* Docker, para o PostgreSQL
* Para abrir o aplicativo: Expo Go no celular, um emulador, ou apenas o navegador

### Caminho rápido

```bash
git clone https://github.com/adriangvaldes/teams-tasks.git
cd teams-tasks

pnpm install
cp apps/api/.env.example apps/api/.env

# Sobe o Postgres, aplica as migrations e popula 3 times e 10 tarefas
pnpm setup
```

Depois, em dois terminais:

```bash
pnpm dev:api        # API em http://localhost:3333
```

```bash
pnpm dev:mobile     # Metro. Tecle "w" para abrir no navegador
```

Confirme que a API subiu:

```bash
curl http://localhost:3333/health/ready
# {"data":{"status":"ready","database":"up"}}
```

### Se você já tem PostgreSQL instalado na máquina

Leia isto antes de abrir um chamado de bug. O serviço nativo ocupa a porta 5432, e o Docker no Windows não falha de forma visível nessa colisão: `docker ps` reporta `0.0.0.0:5432->5432/tcp`, mas quem atende `localhost:5432` continua sendo o servidor nativo. O sintoma é traiçoeiro porque tudo funciona, só que contra o banco errado.

Para diagnosticar, conecte **de fora**, pela porta publicada — é isso que a API faz:

```bash
docker exec -e PGPASSWORD=postgres teams-tasks-db psql -h host.docker.internal -p 5432 -U postgres -d teams_tasks -c "select version()"
```

Se a versão retornada não for `16.x on x86_64-pc-linux-musl`, quem está atendendo é o servidor nativo. Não use `docker compose exec postgres psql …` para este diagnóstico: esse comando roda *dentro* do container e sempre responde 16, mesmo quando a porta está sequestrada.

O contra-teste é olhar as tabelas pelo lado de dentro. Se o `pnpm setup` disse que deu certo mas isto vem vazio, as migrations foram para o banco errado:

```bash
docker compose exec postgres psql -U postgres -d teams_tasks -c "\dt"
```

Para corrigir, publique o container em outra porta: crie um `.env` na raiz com `POSTGRES_PORT=5433`, ajuste a porta no `DATABASE_URL` de `apps/api/.env` e rode `pnpm db:reset`.

### O aplicativo encontra a API sozinho

`localhost` significa coisas diferentes em cada alvo, então a URL é resolvida em tempo de execução:

| Alvo | URL usada | Como é descoberta |
|---|---|---|
| Navegador e simulador iOS | `http://localhost:3333` | Padrão |
| Emulador Android | `http://10.0.2.2:3333` | `10.0.2.2` é o host visto de dentro do emulador |
| Celular físico com Expo Go | `http://<ip-da-máquina>:3333` | Extraído do `hostUri` do Metro |

No celular físico, computador e telefone precisam estar na mesma rede, e o firewall precisa liberar a porta 3333. No Windows:

```powershell
New-NetFirewallRule -DisplayName "Teams Tasks API" -Direction Inbound -LocalPort 3333 -Protocol TCP -Action Allow
```

### Variáveis de ambiente do aplicativo

O aplicativo tem uma única variável, `EXPO_PUBLIC_API_URL`, e ela é opcional em desenvolvimento porque a resolução automática acima cobre esse caso. Ela existe para apontar o aplicativo a um backend publicado.

O valor não fica em arquivo versionado. Mora nas environment variables do EAS, por ambiente:

```bash
cd apps/mobile
pnpm env:pull          # baixa o ambiente development para .env.local, que é gitignored
pnpm env:list          # confere o que existe em cada ambiente
```

Para definir o valor, o que é feito uma vez por quem tem acesso ao projeto:

```bash
pnpm dlx eas-cli@22.2.0 env:set \
  --name EXPO_PUBLIC_API_URL \
  --value https://sua-api.exemplo.app \
  --environment production \
  --visibility plaintext
```

`plaintext` é intencional e não descuido. Qualquer variável com prefixo `EXPO_PUBLIC_` é embutida no bundle pelo Expo, então marcá-la como secreta daria falsa sensação de proteção. Um segredo de verdade jamais deve usar esse prefixo.

O `eas-cli` não é dependência do projeto de propósito. Ele traz cerca de 317 pacotes e um build script nativo opcional que fazia `pnpm install` sair com código 1 no Windows, o que quebraria o primeiro passo deste README. Os scripts o invocam via `pnpm dlx` com a versão fixada.

### Offline com MMKV

O MMKV é módulo nativo e não roda no Expo Go. O aplicativo trata isso com uma porta de armazenamento: usa MMKV quando disponível e cai para `AsyncStorage` caso contrário, então `pnpm dev:mobile` funciona sem nenhum build customizado. Para exercitar o MMKV de verdade:

```bash
cd apps/mobile
pnpm build:dev      # dev client via EAS, perfil development
```

## Scripts

Na raiz:

| Script | O que faz |
|---|---|
| `pnpm setup` | `install`, `db:up`, `db:migrate` e `seed` |
| `pnpm start` | API em modo produção. Exige `pnpm build` antes |
| `pnpm dev:api` | API em watch mode |
| `pnpm dev:mobile` | Metro bundler |
| `pnpm test` | Suíte unitária de todos os pacotes |
| `pnpm test:all` | Tudo, incluindo integração. Exige Docker |
| `pnpm typecheck` | `tsc --noEmit` em todos os pacotes |
| `pnpm lint` | Biome em `apps` e `packages` |
| `pnpm format` | Biome com `--write` |
| `pnpm db:up` e `pnpm db:down` | Sobe e derruba o Postgres |
| `pnpm db:reset` | Recria o volume do banco, apagando os dados |
| `pnpm db:migrate` | Aplica migrations em desenvolvimento |
| `pnpm seed` | Repopula 3 times e 10 tarefas. Idempotente |

Na API, via `pnpm --filter @teams-tasks/api <script>`: `test:unit`, `test:integration`, `test:all`, `test:coverage`, `db:studio`, `db:deploy`, `build` e `start`.

## Decisões arquiteturais

### Por que REST e não GraphQL

O enunciado permitia os dois. Escolhi REST porque, neste domínio, GraphQL cobraria complexidade sem entregar o benefício correspondente.

**O grafo tem profundidade 2.** Duas entidades e um N:N raso. O ganho de GraphQL, que é o cliente escolher a forma de um grafo profundo, não se materializa aqui.

**O monorepo já resolveu o problema que GraphQL resolveria.** O pacote `shared` exporta os schemas Zod e os DTOs consumidos pelas duas pontas, então o contrato é tipado e validado em tempo de compilação e também em tempo de execução. Codegen de GraphQL brilha quando front e back são repositórios separados, que não é o caso.

**Os diferenciais escolhidos empurram para REST.** Em REST a chave de cache é `['tasks', filtros]`, estável e grossa. Em GraphQL a chave é documento mais variáveis, o que fragmenta o cache persistido em MMKV. A solução idiomática seria um cache normalizado como Apollo ou urql, que duplicaria o papel do React Query exigido no enunciado.

**O envelope de erro é HTTP nativo.** O contrato pede `{ error: { code, message, details? } }` com status codes. GraphQL responde `200 OK` com `errors[]`.

**Paginação.** `limit` e `offset` com `{ data, meta }` é exatamente o que foi pedido. A convenção GraphQL empurraria para Relay connections.

Como o transporte é um adapter de borda, adicionar `/graphql` depois seria um adapter novo sobre os mesmos casos de uso, sem tocar em domínio.

### Por que PostgreSQL

Uma tarefa pertence a zero ou mais times e um time tem muitas tarefas. N:N com integridade referencial é o cenário canônico de banco relacional. Em MongoDB isso viraria um array de referências mantido à mão.

Os filtros do enunciado, que são `teamId`, `status`, `search`, ordenação, paginação e contagem por time, são consultas relacionais com índices. O Prisma dá migrations versionadas, seed script e tipos gerados, o que atende diretamente o requisito de reprodutibilidade local.

### Camadas do backend

Arquitetura hexagonal com as dependências apontando sempre para dentro:

```
                    ┌─────────────────────────────────────┐
   HTTP  ────────►  │  interfaces/http                    │  adapters de ENTRADA
                    │  routes, controllers, presenters    │
                    └──────────────┬──────────────────────┘
                                   │ depende de ports/in
                    ┌──────────────▼──────────────────────┐
                    │  application                        │
                    │  use-cases, ports, dtos, mappers    │
                    └──────────────┬──────────────────────┘
                                   │ depende de domain
                    ┌──────────────▼──────────────────────┐
                    │  domain                             │
                    │  entities, value objects, errors    │  ZERO dependências
                    └─────────────────────────────────────┘
                                   ▲
                    ┌──────────────┴──────────────────────┐
   Postgres ◄─────  │  infrastructure                     │  adapters de SAÍDA
                    │  prisma, pino, uuid, clock          │  implementa ports/out
                    └─────────────────────────────────────┘
```

A regra é numerável. Cada camada só importa de camadas de índice menor:

| Índice | Camada | Pode importar de |
|---|---|---|
| 0 | `domain` | nada |
| 1 | `application` | `domain` |
| 2 | `infrastructure` | `domain` e `application` |
| 2 | `interfaces/http` | `domain` e `application` |
| 3 | `container` e `main` | todas |

O que essa separação compra, concretamente:

* **O domínio é testável sozinho.** 33 testes de invariantes rodam sem banco, sem HTTP e sem mock.
* **Os casos de uso rodam contra fakes em memória.** As portas foram declaradas com tipos de domínio, então a suíte inteira executa em milissegundos.
* **`Clock` e `IdGenerator` são portas.** Nenhuma camada acima do `main.ts` chama `new Date()` ou gera UUID. Os testes fixam o tempo e afirmam valores exatos, em vez de "algo parecido com uma data".
* **O domínio não conhece HTTP.** Ele classifica erros como `VALIDATION`, `NOT_FOUND` ou `CONFLICT`. Traduzir para 400, 404 e 409 é trabalho de um único middleware.

Não há container de injeção de dependência, como tsyringe ou inversify. O wiring é manual no `container.ts`, porque em um domínio de duas entidades um container troca validação em tempo de compilação por decorators, metadata de reflexão e erros em tempo de execução.

### Patterns escolhidos no aplicativo

| Pattern | Motivo |
|---|---|
| React Query | O estado que importa é server state: cache, revalidação, invalidação e atualizações otimistas. Não faz sentido duplicar isso em Redux |
| Sem Zustand ou Redux | Depois do React Query sobrou apenas estado de tela, como o texto da busca e o filtro ativo. `useState` local resolve, e uma store global aqui seria cerimônia |
| Query keys centralizadas | Toda chave de tarefa começa com `['tasks']`, então uma mutação invalida todas as listas montadas sem precisar saber quais filtros estão ativos |
| `useInfiniteQuery` | Consome a paginação `limit` e `offset` da API com carregamento incremental ao chegar no fim da lista |
| Schema de formulário separado do schema de request | No formulário a data é `dd/mm/aaaa` e vazio é string vazia. No contrato é ISO 8601 e `null`. As regras de campo, porém, vêm de `shared`: o mínimo de 3 caracteres do título é a mesma definição nas duas pontas |
| Porta de armazenamento | Permite MMKV com dev client e AsyncStorage no Expo Go, sem escolher entre offline e "roda com um comando" |

### Atualizações otimistas

A ação rápida de status responde antes da resposta do servidor, com rollback por snapshot em caso de erro. Dois detalhes separam "otimista" de "otimista e correto":

1. **`isOverdue` é recalculado localmente.** Tarefa concluída não está atrasada, e sem isso o rótulo vermelho ficaria na tela até a revalidação.
2. **Listas filtradas por status têm o item removido, não apenas atualizado.** O filtro está na própria query key, então dá para saber que, numa lista "Pendentes", a tarefa que acabou de virar "Concluída" não pertence mais. O `meta.total` daquela lista é ajustado junto.

## Modelo de dados

```mermaid
erDiagram
    TEAMS ||--o{ TASK_TEAMS : "tem"
    TASKS ||--o{ TASK_TEAMS : "pertence a"

    TEAMS {
        uuid id PK
        varchar(60) name UK
        char(7) color_hex
        varchar(500) description "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    TASKS {
        uuid id PK
        varchar(120) title
        varchar(2000) description "nullable"
        task_status status "PENDING | IN_PROGRESS | DONE"
        timestamptz due_date "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    TASK_TEAMS {
        uuid task_id PK,FK
        uuid team_id PK,FK
        timestamptz assigned_at
    }
```

### Invariantes por campo

| Entidade | Campo | Regra |
|---|---|---|
| Team | `name` | 2 a 60 caracteres. Único ignorando caixa. Espaços repetidos colapsados |
| Team | `colorHex` | Formato `#RRGGBB`, normalizado para maiúscula |
| Team | `description` | Até 500 caracteres. Texto vazio vira `null` |
| Team | `taskCount` | Derivado, nunca persistido |
| Task | `title` | 3 a 120 caracteres. Espaços repetidos colapsados |
| Task | `description` | Até 2000 caracteres. Texto vazio vira `null` |
| Task | `status` | `PENDING`, `IN_PROGRESS` ou `DONE` |
| Task | `dueDate` | ISO 8601, opcional |
| Task | `isOverdue` | Derivado: prazo no passado e status diferente de `DONE` |
| Task | `teamIds` | Zero ou mais, sem repetição, no máximo 20 |

### Decisões de schema

* **`task_teams` é tabela de junção explícita**, e não relação implícita do Prisma. Permite atributos no vínculo, como `assigned_at`, deixa o N:N visível no modelo lógico, e o update de tarefa reconcilia o conjunto por diferença em vez de apagar e recriar, o que preserva `assigned_at` dos vínculos mantidos.
* **`ON DELETE CASCADE` nos vínculos.** Apagar um time remove os vínculos, não as tarefas. Uma tarefa pode existir sem nenhum time, e é isso que "zero ou mais times" significa.
* **`created_at` e `updated_at` sem `DEFAULT now()`.** Os timestamps vêm da porta `Clock`, o que mantém o tempo injetável e os testes determinísticos.
* **IDs gerados pela aplicação**, não pelo banco. A entidade nasce completa em memória e é validável antes de qualquer entrada ou saída.
* **`timestamptz`** para eliminar ambiguidade de fuso.
* **Índices** em `status`, `due_date`, `created_at`, `title` e `task_teams.team_id`, cobrindo os filtros e ordenações expostos.

### Migrations, seed e reprodutibilidade

```bash
pnpm db:up          # Postgres 16 no Docker, com healthcheck
pnpm db:migrate     # prisma migrate dev, em desenvolvimento
pnpm seed           # 3 times e 10 tarefas, com IDs fixos
```

* A migration inicial está versionada em `apps/api/prisma/migrations`. Em CI e no deploy roda `prisma migrate deploy`, que é idempotente e nunca destrutivo.
* O seed passa pelas entidades de domínio e pelos repositórios, não por inserts crus. Se uma invariante mudar, o seed quebra junto e nunca produz dado que a aplicação rejeitaria.
* Os IDs do seed são fixos, o que torna a repopulação idempotente e faz os exemplos de `curl` abaixo funcionarem copiando e colando.
* Os testes de integração usam o mesmo container em um schema separado, `integration_test`, então rodar a suíte nunca apaga os dados do seed.
* `prisma generate` roda no `postinstall`, o que garante `pnpm typecheck` funcionando em um clone limpo, antes do primeiro comando de banco.

## API: contratos e exemplos

Base: `http://localhost:3333`

Toda resposta de sucesso é `{ data, meta? }`. Toda falha é `{ error: { code, message, details? } }`, inclusive rota inexistente.

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Liveness. Não consulta o banco |
| `GET` | `/health/ready` | Readiness. Verifica a conexão |
| `GET` | `/api/teams` | Lista times. `search`, `limit`, `offset`, `sort` |
| `POST` | `/api/teams` | Cria time |
| `GET` | `/api/teams/:id` | Detalhe do time, com `taskCount` |
| `PUT` | `/api/teams/:id` | Atualização parcial |
| `DELETE` | `/api/teams/:id` | Remove time e desvincula tarefas |
| `GET` | `/api/tasks` | Lista tarefas. `teamId` e `status` aceitam lista, mais `search`, `limit`, `offset`, `sort` |
| `POST` | `/api/tasks` | Cria tarefa |
| `GET` | `/api/tasks/:id` | Detalhe da tarefa |
| `PUT` | `/api/tasks/:id` | Atualização parcial |
| `PATCH` | `/api/tasks/:id/status` | Ação rápida: altera apenas o status |
| `DELETE` | `/api/tasks/:id` | Remove tarefa |

### Convenções

**Ordenação** usa valores fechados no formato `campo:direção`:

* Times: `name:asc` (padrão), `name:desc`, `createdAt:asc`, `createdAt:desc`
* Tarefas: `createdAt:desc` (padrão), `createdAt:asc`, `dueDate:asc`, `dueDate:desc`, `title:asc`, `title:desc`, `status:asc`, `status:desc`

Ordenar por `dueDate` joga nulos para o fim, porque tarefa sem prazo não deve aparecer antes das que têm prazo. Toda ordenação desempata por `id`, sem o que a paginação pode repetir ou perder itens quando há empate no campo ordenado.

**Filtros de lista.** `teamId` e `status` aceitam um valor ou vários separados por vírgula:

```
GET /api/tasks?status=PENDING,DONE&teamId=<uuid>,<uuid>
```

Dentro de um filtro os valores são OR — qualquer um dos times, qualquer um dos status. Entre filtros continua AND. Um valor único segue válido, então `?status=PENDING` funciona como sempre funcionou.

A lista é normalizada num único lugar, no schema Zod compartilhado: separa por vírgula, apara espaços, descarta vazios e deduplica. Lista vazia equivale a filtro ausente. Se qualquer item for inválido a requisição inteira é rejeitada, com `details[].path` apontando o índice culpado, como `status.1`. Times têm teto de 20 por consulta.

**Paginação** usa `limit`, com padrão 20 e teto 100, e `offset`, com padrão 0. O `meta` traz `total`, `limit`, `offset` e `hasMore`. O `total` é o do conjunto filtrado, não o da página.

**Semântica de `PUT`** é de atualização parcial. Campo ausente preserva o valor atual, campo enviado como `null` limpa, e `teamIds` substitui o conjunto de times em vez de acrescentar.

### Exemplos

<details open>
<summary><b>Listar times com metadata</b></summary>

```bash
curl -s "http://localhost:3333/api/teams?limit=2" | jq
```

```json
{
  "data": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "name": "Design System",
      "colorHex": "#DB2777",
      "description": "Componentes, tokens e acessibilidade",
      "taskCount": 3,
      "createdAt": "2026-08-20T18:04:11.201Z",
      "updatedAt": "2026-08-20T18:04:11.201Z"
    },
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "name": "Plataforma",
      "colorHex": "#059669",
      "description": "Infraestrutura, CI/CD e observabilidade",
      "taskCount": 4,
      "createdAt": "2026-08-20T18:04:11.201Z",
      "updatedAt": "2026-08-20T18:04:11.201Z"
    }
  ],
  "meta": { "total": 3, "limit": 2, "offset": 0, "hasMore": true }
}
```
</details>

<details>
<summary><b>Criar time</b></summary>

```bash
curl -s -X POST http://localhost:3333/api/teams \
  -H 'Content-Type: application/json' \
  -d '{"name":"Squad Beta","colorHex":"#7c3aed","description":"Time de growth"}' | jq
```

Responde `201 Created`. Note que `colorHex` volta normalizado para maiúscula.
</details>

<details>
<summary><b>Nome de time duplicado, resposta 409</b></summary>

```bash
curl -s -X POST http://localhost:3333/api/teams \
  -H 'Content-Type: application/json' \
  -d '{"name":"squad alpha","colorHex":"#111111"}' | jq
```

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Já existe um time chamado \"squad alpha\"",
    "details": [{ "path": "name", "message": "Já existe um time chamado \"squad alpha\"" }]
  }
}
```

A unicidade é insensível a maiúsculas, porque para o usuário "Squad Alpha" e "squad alpha" são o mesmo time.
</details>

<details>
<summary><b>Filtrar tarefas por time e status, com busca</b></summary>

```bash
curl -s "http://localhost:3333/api/tasks?teamId=33333333-3333-4333-8333-333333333333&status=PENDING&search=indices&sort=dueDate:asc" | jq
```

Os filtros aceitam vários valores. A consulta abaixo devolve o que estiver pendente **ou** concluído, em qualquer um dos dois times:

```bash
curl -s "http://localhost:3333/api/tasks?status=PENDING,DONE&teamId=11111111-1111-4111-8111-111111111111,33333333-3333-4333-8333-333333333333" | jq '.meta'
```

```json
{
  "data": [
    {
      "id": "a0000005-0000-4000-8000-000000000005",
      "title": "Revisar indices de busca de tarefas",
      "description": "Avaliar pg_trgm para o filtro de busca textual.",
      "status": "PENDING",
      "dueDate": "2026-08-19T18:00:00.000Z",
      "teams": [
        { "id": "33333333-3333-4333-8333-333333333333", "name": "Plataforma", "colorHex": "#059669" }
      ],
      "isOverdue": true,
      "createdAt": "2026-08-20T18:04:11.310Z",
      "updatedAt": "2026-08-20T18:04:11.310Z"
    }
  ],
  "meta": { "total": 1, "limit": 20, "offset": 0, "hasMore": false }
}
```

Os times vêm embutidos na tarefa de propósito, para que a lista renderize o chip de cor sem um request extra. No servidor isso não gera N+1: uma única consulta resolve os times de toda a página.
</details>

<details>
<summary><b>Criar tarefa em dois times</b></summary>

```bash
curl -s -X POST http://localhost:3333/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{
        "title": "Integrar app ao deploy",
        "description": "Apontar EXPO_PUBLIC_API_URL para a API publicada",
        "status": "IN_PROGRESS",
        "dueDate": "2026-09-15T18:00:00.000Z",
        "teamIds": [
          "11111111-1111-4111-8111-111111111111",
          "33333333-3333-4333-8333-333333333333"
        ]
      }' | jq
```
</details>

<details>
<summary><b>Ação rápida: marcar como concluída</b></summary>

```bash
curl -s -X PATCH http://localhost:3333/api/tasks/a0000001-0000-4000-8000-000000000001/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"DONE"}' | jq '.data | {title, status, isOverdue}'
```

```json
{ "title": "Implementar tela de listagem de tarefas", "status": "DONE", "isOverdue": false }
```
</details>

<details>
<summary><b>Limpar campos e trocar os times</b></summary>

```bash
curl -s -X PUT http://localhost:3333/api/tasks/a0000007-0000-4000-8000-000000000007 \
  -H 'Content-Type: application/json' \
  -d '{"description": null, "teamIds": []}' | jq '.data | {title, description, teams}'
```

A `description` foi limpa e a tarefa ficou sem time. O `title` foi preservado porque não veio no payload.
</details>

<details>
<summary><b>Validação: título curto, resposta 400 com details por campo</b></summary>

```bash
curl -s -X POST http://localhost:3333/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"ab","dueDate":"ontem"}' | jq
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Requisição inválida",
    "details": [
      { "path": "title", "message": "Título deve ter ao menos 3 caracteres" },
      { "path": "dueDate", "message": "Data de vencimento deve ser uma data ISO 8601 válida" }
    ]
  }
}
```

Todos os campos inválidos voltam de uma vez, e não apenas o primeiro. É o que permite ao formulário do aplicativo marcar tudo em um único submit, usando o `path` para posicionar cada mensagem sob o campo correto.
</details>

<details>
<summary><b>Time inexistente ao vincular, resposta 404</b></summary>

```bash
curl -s -X POST http://localhost:3333/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Tarefa órfã","teamIds":["99999999-9999-4999-8999-999999999999"]}' | jq
```

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Time(s) não encontrado(s): 99999999-9999-4999-8999-999999999999",
    "details": [{ "path": "teamIds", "message": "Um ou mais times informados não existem" }]
  }
}
```

A integridade referencial é checada na aplicação para produzir um erro legível, em vez de um erro cru de foreign key.
</details>

Cada exemplo acima é um `curl` completo, e Insomnia e Postman importam `curl` colado diretamente.

## Tratamento de erros

O domínio classifica o erro pela categoria semântica e não conhece HTTP. A tradução para status code acontece em um único middleware.

### Catálogo

| Origem | Situação | Status | Código |
|---|---|---|---|
| Domínio | Invariante violada | 400 | `VALIDATION_ERROR` |
| Domínio | Recurso inexistente | 404 | `NOT_FOUND` |
| Domínio | Nome de time em uso | 409 | `CONFLICT` |
| Transporte | Payload não passa no schema Zod | 400 | `VALIDATION_ERROR` |
| Transporte | JSON malformado | 400 | `VALIDATION_ERROR` |
| Transporte | Corpo acima de 1 MB | 413 | `VALIDATION_ERROR` |
| Transporte | Charset ou encoding não suportado | 415 | `VALIDATION_ERROR` |
| Transporte | Requisição interrompida | 400 | `VALIDATION_ERROR` |
| Roteamento | Rota inexistente | 404 | `NOT_FOUND` |
| Qualquer | Falha inesperada | 500 | `INTERNAL_ERROR` |

Uma falha inesperada é registrada com stack para investigação, mas a resposta nunca devolve detalhe interno.

### Corridas com o banco

Verificar a precondição no caso de uso resolve o caso comum, mas não elimina a corrida entre duas requisições simultâneas. Sem tradução, esses encontros virariam 500 genérico. Os erros conhecidos do Prisma são traduzidos na infraestrutura, que é a camada que conhece o Prisma:

| Código Prisma | Situação | Vira |
|---|---|---|
| `P2002` em `name` | Dois times criados com o mesmo nome ao mesmo tempo | `CONFLICT` |
| `P2003` | Time apagado entre a validação e a escrita do vínculo | `NOT_FOUND` |
| `P2025` | Registro apagado entre a leitura e a escrita | `NOT_FOUND` |

Uma violação de unicidade em outro campo não é mascarada como nome duplicado. Ela sobe como falha inesperada, para não mentir sobre a causa.

### Nível de processo

`unhandledRejection` e `uncaughtException` são registrados antes de encerrar. Sem isso o processo morreria sem deixar rastro, e a plataforma reiniciaria o container sem que ninguém soubesse por quê.

### No aplicativo

* `ApiError` carrega `status`, `code` e `details`, e expõe a categoria por bandeira em vez de comparação de strings na tela.
* `fieldErrors` converte os `details` no formato do react-hook-form, então um 409 de nome duplicado aparece embaixo do campo e não em um alerta genérico.
* Falha de rede vira `NETWORK_ERROR` com mensagem acionável, em vez do texto técnico do fetch.
* O cliente HTTP tem timeout de 15 segundos combinado com o sinal de cancelamento do React Query, porque rede móvel pendura conexão e a tela ficaria em loading para sempre.
* Cancelamento pelo React Query é repassado como erro original, para não aparecer como falha de rede ao usuário.
* Um `ErrorBoundary` próprio no layout raiz captura exceção de renderização e oferece ação de tentar novamente. Em desenvolvimento ele mostra a stack, em produção apenas a orientação.
* O `QueryClient` não repete requisição em erro 4xx, porque insistir em um 404 ou em um 400 de validação apenas atrasa a mensagem na tela. Mutações não têm retry nenhum, para não criar duas tarefas por causa de uma resposta perdida.

## Testes

```bash
pnpm test                                        # suíte unitária de todos os pacotes
pnpm test:all                                    # tudo, incluindo integração
pnpm --filter @teams-tasks/api test:unit         # domínio e casos de uso, sem banco
pnpm --filter @teams-tasks/api test:integration  # HTTP e Postgres reais
pnpm --filter @teams-tasks/api test:coverage
pnpm --filter @teams-tasks/mobile test
```

### Estratégia por camada

| Suíte | O que exercita | Precisa de banco |
|---|---|---|
| Domínio | Invariantes de `Team` e `Task`, isoladas | não |
| Aplicação | Casos de uso contra fakes em memória das portas | não |
| HTTP | Middleware de erro com o app real, via Supertest | não |
| Infraestrutura | Tradução dos erros do Prisma, com stubs | não |
| Integração | App real e Postgres real, do roteamento ao banco | sim |
| Componentes | Renderização e interação com React Native Testing Library | não |

### Cobertura atual

| Pacote | Statements | Observação |
|---|---|---|
| API, domínio e aplicação | 94,2% | Escopo configurado no `vitest.config.ts` |
| Aplicativo | 45,3% | `api-error` e os componentes de filtro em 100%, `http-client` em 92%, `use-tasks` em 66% |

Os números são medidos, não estimados. A cobertura do aplicativo é a mais baixa, e a divisão importa mais que o total: o que decide comportamento está coberto — cliente HTTP, atualizações otimistas, filtros, formatação de data, contraste de cor. O que puxa o número para baixo é apresentação sem lógica própria: `bottom-sheet.tsx`, que é animação e gesto verificados à mão, `task-list.tsx`, que compõe peças já testadas, e a camada de `storage`, que é a maior dívida real da suíte.

Total de **244 testes**: 94 unitários e 47 de integração na API, 103 no aplicativo.

### O que os testes protegem

Os casos escolhidos são os que regridem em silêncio:

* Filtros combinados e o `total` permanecendo o do conjunto filtrado
* Semântica de patch, com `undefined` preservando e `null` limpando
* `changeStatus` idempotente, protegendo a ação rápida de duplo toque
* `isOverdue` falso para tarefa concluída com prazo vencido
* Ausência de N+1, verificada por spy: uma única chamada ao repositório resolve os times de toda a página, com ids deduplicados
* Apagar um time desvincula as tarefas sem apagá-las
* Atualização otimista aplicada antes da resposta, com rollback em falha
* Datas que costumam passar batido, como 31 de fevereiro, 29 de fevereiro em ano bissexto, e 23:59 de hoje ainda sendo hoje
* Contraste do chip de time calculado por luminância, para texto legível sobre qualquer cor cadastrada

Os testes de integração aplicam as migrations com `migrate deploy`, o mesmo comando de produção, então a suíte valida os arquivos versionados e não um schema empurrado por `db push`.

## Estrutura de pastas

```
apps/api/src/
├── domain/                    Regras de negócio. Não importa Express, Prisma, Zod nem shared
│   ├── shared/                Entity, UniqueEntityId, DomainError
│   ├── team/                  Team, TeamName, ColorHex
│   └── task/                  Task, TaskTitle, TaskStatus
├── application/
│   ├── ports/in/              Interfaces UseCase, consumidas pelos controllers
│   ├── ports/out/             TeamRepository, TaskRepository, IdGenerator, Clock, Logger
│   ├── dtos/                  Entrada e saída por caso de uso
│   ├── mappers/               Domínio para DTO de aplicação
│   ├── services/              TeamLoader, carregamento em lote
│   └── use-cases/             Um arquivo, uma intenção
├── infrastructure/            Implementações concretas das portas de saída
│   ├── persistence/prisma/    Repositórios, mappers e tradução de erro
│   ├── logging/ id/ time/     Pino, UUID, Date
│   └── config/                Env validado com Zod
├── interfaces/http/           Adapter de entrada
│   ├── controllers/ routes/
│   ├── presenters/            DTO de aplicação para JSON, com Date virando ISO 8601
│   └── errors/                DomainError para status HTTP
├── container.ts               Composition root, único lugar com classes concretas
└── main.ts                    Bootstrap, sinais e graceful shutdown

apps/mobile/
├── app/                       Rotas por arquivo
│   ├── (tabs)/                Tarefas e Times
│   ├── tasks/                 new, [id], [id]/edit
│   └── teams/                 new, [id], [id]/edit
└── src/
    ├── api/                   Cliente HTTP, erro tipado, query keys
    ├── hooks/                 React Query, incluindo as atualizações otimistas
    ├── forms/                 Schemas de formulário
    ├── components/            Domínio e UI, incluindo o sheet de filtros
    ├── storage/               Porta, MMKV, AsyncStorage e persistidor
    ├── lib/                   QueryClient, formatação, cor, status
    └── config/                Resolução da URL da API

packages/shared/src/
├── common/                    Envelope de resposta e paginação
├── team/                      Schemas Zod e TeamDTO
└── task/                      Schemas Zod e TaskDTO
```

## Deploy

A imagem está pronta e validada rodando, mas não há instância publicada. O trial da conta usada expirou durante o desenvolvimento e hospedar exigiria plano pago, então o deploy ficou de fora. É diferencial opcional no enunciado, e o artefato que ele consumiria está verificado.

O que foi efetivamente exercitado:

```bash
# Build a partir da RAIZ, porque o contexto precisa incluir packages/shared
docker build -f apps/api/Dockerfile -t teams-tasks-api .

# Rodando contra o Postgres do compose
docker run --rm --network teams-tasks_default \
  -e DATABASE_URL="postgresql://postgres:postgres@postgres:5432/teams_tasks?schema=public" \
  -e NODE_ENV=production -p 3334:3333 teams-tasks-api

curl http://localhost:3334/health/ready
```

Verificado nesse container: `prisma migrate deploy` aplicou as migrations, o servidor subiu, `/health` e `/health/ready` responderam 200, os endpoints serviram requests com log JSON estruturado, e `SIGTERM` disparou o graceful shutdown.

### Publicando

`railway.json` já declara builder `DOCKERFILE`, o caminho do Dockerfile e o healthcheck. Com um plano ativo:

```bash
railway init --name teams-tasks
railway add --database postgres
railway up
```

Depois basta ligar `DATABASE_URL` ao serviço do Postgres e definir `NODE_ENV=production`. O `CMD` aplica as migrations no start, de forma idempotente e não destrutiva, diferente de `migrate dev`, que jamais deve rodar em produção.

O healthcheck aponta para `/health`, que é liveness e não toca no banco. Se apontasse para `/health/ready`, uma indisponibilidade momentânea do Postgres derrubaria o container em loop de restart.

Detalhes do Dockerfile que valem registro, porque cada um custou uma falha real:

* O schema do Prisma é copiado junto dos manifests, antes do código, porque o `postinstall` roda `prisma generate` e precisa do schema. O custo em cache é baixo, já que o schema muda menos que o código.
* O binário do Prisma é invocado direto de `node_modules/.bin`, e não via `pnpm exec`. O pnpm faz um check de integridade do `node_modules` antes de executar qualquer coisa e, como a imagem de runtime não carrega os manifests de todo o workspace, ele concluía que a árvore estava desatualizada e tentava rodar `pnpm install` dentro do container, falhando por não ter rede.
* O estágio de runtime não habilita corepack, porque não usa pnpm.
* O OpenSSL é instalado explicitamente, já que o engine do Prisma para Alpine é linkado contra o OpenSSL do sistema.

## O que eu faria diferente em produção

Escolhas deliberadamente simplificadas para o escopo deste teste.

**Autenticação e autorização.** Hoje a API é aberta. Em produção: JWT com refresh token, escopo por usuário e por time, e rate limiting por IP e por conta, com store em Redis e não em memória, porque memória não sobrevive a mais de uma instância.

**Busca textual.** `ILIKE '%termo%'` não usa índice B-tree e degrada linearmente. O passo seguinte é `pg_trgm` com índice GIN e, se a busca virar recurso de primeira classe, um índice `tsvector` com ranking.

**Paginação por cursor.** `limit` e `offset` foram pedidos no enunciado e estão corretos aqui, mas `OFFSET` grande faz o Postgres varrer e descartar linhas. Com volume, paginação por cursor sobre `(created_at, id)` resolve. O desempate por `id` que já existe na ordenação é justamente o que viabiliza isso.

**Cache.** Redis na listagem de times, que muda pouco e é lida em toda tela, com invalidação nas mutações. Mais `ETag` e `If-None-Match` nos GETs de detalhe, para o cliente reaproveitar resposta com 304.

**Observabilidade.** Os logs já são JSON estruturado com Pino. Faltam: `x-request-id` propagado e correlacionado em cada log, tracing distribuído com OpenTelemetry para ver o tempo gasto no Postgres, métricas de latência por rota em p95 e p99, e alerta em taxa de erro. Erros não tratados deveriam ir para um agregador, não apenas para o stdout.

**Escala.** O `PrismaClient` já usa pool. Com várias instâncias, um pooler externo como PgBouncer evita esgotar as conexões do Postgres. Réplica de leitura para as listagens, e fila para o que não precisa ser síncrono, como notificação de prazo.

**Segurança.** `CORS_ORIGIN` fixo na origem do aplicativo em vez de `*`. Helmet já está no lugar. Auditoria de quem alterou o quê, e segredos em um gerenciador em vez de `.env` no servidor.

**Banco.** Backup com point-in-time recovery e restauração testada de verdade. Constraint de unicidade insensível a maiúsculas no próprio banco, com `CREATE UNIQUE INDEX ON teams (lower(name))`. Hoje a regra é garantida na aplicação e reforçada pela tradução do erro do Prisma, mas o `UNIQUE` do Postgres diferencia maiúsculas.

**Mobile.** Detecção de conectividade real com NetInfo alimentando o `onlineManager` do React Query, já que hoje o aplicativo assume online e trata a falha quando ela ocorre. Fila de mutações offline com replay ao reconectar. Relato de erros com source maps. EAS Update para correções sem passar pela loja. E testes de ponta a ponta no fluxo crítico de criar e concluir tarefa.

**CI.** GitHub Actions rodando `typecheck`, `lint`, unitários e integração com Postgres em service container a cada pull request, e deploy automático no merge, com a migration aplicada antes do rollout do novo código.

## Licença

MIT. Veja [LICENSE](LICENSE).
