

# 📘 Painel Operacional — Frontend

Frontend responsável pela criação, edição, análise e validação de esquemas operacionais rodoviários, integrando regras de domínio, geolocalização, avaliação operacional (ANTT) e comunicação direta com a API do Painel Operacional.

> **Stack:** React + Vite + TypeScript + TailwindCSS + shadcn/ui

---

## 🧭 Visão Geral

Este frontend **não é apenas uma interface gráfica**.
Ele mantém um **modelo operacional em memória**, aplicando regras de domínio sobre os pontos da rota antes mesmo de persistir dados na API.

A aplicação é orientada a **fluxos operacionais completos**, não a telas isoladas.

Os fluxos centrais do sistema são:

1. Listagem e navegação de esquemas (Home)
2. Cadastro e edição de locais operacionais (Locations)
3. Criação e edição de esquemas operacionais (SchemeCreate)
4. Visualização analítica de esquemas (SchemeDetail)
5. Integração assistida com regras operacionais (avaliação backend / ANTT)

---

## 🧠 Modelo de Domínio Mantido no Frontend (Route Engine)

O núcleo do frontend está em:

```
src/pages/SchemeCreate/createSchemeHandlers.ts
```

O sistema mantém **invariantes operacionais** sobre cada ponto da rota (`RoutePoint`).

### Fonte de verdade

Cada ponto possui:

```ts
functions: PointFunction[]
```

Essa é a **única fonte de verdade**.

Flags como:

* `isRestStop`
* `isSupportPoint`
* `isDriverChange`
* `isBoardingPoint`
* `isDropoffPoint`

são **sempre derivadas** dessas functions.

---

### Campos derivados automaticamente

A cada alteração na lista de pontos, o sistema recalcula automaticamente:

| Campo                           | Origem                                                   |
| ------------------------------- | -------------------------------------------------------- |
| `order`                         | Sequência real dos pontos                                |
| `distanceKm`                    | Distância entre pontos                                   |
| `cumulativeDistanceKm`          | Soma acumulada                                           |
| `driveTimeMin`                  | Tempo de deslocamento                                    |
| `arrivalTime` / `departureTime` | Calculados a partir do ponto inicial + horário da viagem |

Isso é garantido por:

```
recalcAllRoutePoints()
```

---

### Integração com distâncias reais

Ao adicionar ou atualizar pontos:

1. O frontend consulta:

   ```
   /road-segments/road-distance
   ```
2. Se falhar, utiliza cálculo Haversine local
3. O endpoint retorna `roadSegmentUuid`, preservado para persistência posterior

---

## 🧩 Fluxo de Criação de Esquema (CreateScheme)

Arquivo principal:

```
src/pages/SchemeCreate/CreateSchemePage.tsx
```

### Chave única do esquema

Um esquema é identificado por:

```
lineCode + direction + tripTime
```

Ao preencher esses campos, o frontend:

1. Procura automaticamente se já existe um esquema (`findSchemeByKey`)
2. Se existir:

   * Carrega pontos existentes
   * Carrega avaliação de regras do backend
   * Entra em modo edição automaticamente

---

### Modal orientado a fluxo operacional

O modal de pontos funciona em três modos:

| Modo          | Uso                                                    |
| ------------- | ------------------------------------------------------ |
| `add`         | Inserir novo ponto                                     |
| `editInitial` | Definir/editar ponto inicial                           |
| `insertAfter` | Inserir ponto no local exato de uma violação detectada |

---

### Integração com avaliação de regras (ANTT)

O backend devolve uma avaliação por ponto.

O frontend:

1. Normaliza os dados (`lib/rules`)
2. Converte em alertas por ponto
3. Exibe `ViolationActionDivider` exatamente onde a regra foi violada
4. Converte a violação em ação:

   * Abre o modal já com `preset` correto
   * Posiciona o ponto automaticamente no local da correção

Essa é a principal integração UX ↔ regra operacional.

---

## 🌐 Camada de Comunicação com API

Centralizada em:

```
src/services/api.ts
```

### Padrão de chamadas

* `API_URL` via `.env (VITE_API_URL)`
* `apiGet`, `apiPost`, `apiPut`
* Tratamento de erro centralizado
* Sempre retorna `res.json()`

---

### Salvamento de esquema

Hook responsável:

```
src/hooks/useSaveScheme.ts
```

Funções:

* Injeta headers de autenticação via `AuthContext`
* Controla `isSaving` e `error`
* Usa `services/schemes/saveScheme`

---

## 🏠 Home — View Models e Persistência Local

Arquivo:

```
src/pages/Home/HomePage.tsx
```

A Home combina três fontes de dados:

| Fonte              | Uso                             |
| ------------------ | ------------------------------- |
| API (`useSchemes`) | Lista completa de esquemas      |
| `schemeStorage`    | Recentes e Favoritos            |
| `AuthContext`      | Gating de ações administrativas |

---

### DTO → Snapshot (ViewModel)

A UI nunca consome DTO direto da API.

Fluxo:

```
SchemeListItem (API) → SchemeCardSnapshot (UI)
```

Mapper localizado em:

```
lib/schemeMappers.ts
```

---

### Regras de UX

* Busca só filtra com **3 ou mais caracteres**
* Filtros: Todos / Recentes / Favoritos
* Favoritos e recentes persistidos em storage

---

## 📍 Cadastro de Locais e Geolocalização

Arquivo:

```
src/pages/Locations/LocationCreatePage.tsx
```

Funcionalidades:

* Buscar por sigla → entra em modo edição
* CRUD completo de locais
* Conversão de Plus Code:

  * Detecta UF no texto
  * Completa códigos curtos com coordenadas de referência
* Validação de latitude e longitude

---

## 🧱 Arquitetura de Pastas

```
pages/        → Orquestração de fluxos
components/   → UI e componentes de domínio
hooks/        → Data access e estados assíncronos
services/     → Comunicação com API
types/        → DTOs e View Models
lib/          → Regras, mappers, storage e helpers
context/      → Autenticação e estados globais
data/         → Dados estáticos (ex: lista de linhas)
```

---

## 🔐 Autenticação

Gerenciada por:

```
context/AuthContext
```

Modos:

* Público: apenas visualização
* Autenticado: criação e edição

Headers são injetados automaticamente nos hooks de persistência.

---

## ▶️ Como rodar o projeto

```bash
npm install
npm run dev
```

Criar `.env`:

```
VITE_API_URL=http://localhost:3333
```

---

## 🧪 Primeiros 10 minutos no sistema

1. Acesse a Home
2. Clique em **Criar/Editar esquema**
3. Informe código da linha, sentido e horário
4. Defina o ponto inicial
5. Adicione pontos
6. Observe alertas automáticos de regras
7. Salve o esquema

---

## 🧭 Princípios Arquiteturais do Frontend

* Pages orquestram fluxo, não regra
* Handlers mantêm invariantes operacionais
* UI nunca usa DTO direto da API
* Functions dos pontos são fonte de verdade
* Regras do backend geram ações automáticas de UX
* Persistência local melhora a experiência do usuário
