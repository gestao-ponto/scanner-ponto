# architecture.md

## Estrutura de Diretórios

```
src/
├── app/
│   ├── components/
│   │   ├── calendar/
│   │   │   └── Calendario.tsx        # Calendário com status por dia
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx         # Cards e gráficos de resumo
│   │   │   └── OvertimeModal.tsx     # Modal de autorização HE
│   │   ├── records/
│   │   │   └── Registros.tsx         # Tabela de marcações com filtros
│   │   └── reports/
│   │       └── Exportacao.tsx        # Painel de exportação DOCX/XLSX
│   └── pages/
│       ├── AppLayout.tsx             # Layout principal + bottom nav
│       ├── Configuracoes.tsx         # Perfil, LGPD, conta
│       ├── Login.tsx                 # Tela de login Google
│       └── SetupPerfil.tsx           # Cadastro inicial do colaborador
│
├── features/
│   ├── auth/
│   │   ├── index.ts
│   │   └── useAuth.ts                # Hook de autenticação Google OAuth
│   ├── ocr/
│   │   ├── index.ts
│   │   ├── ocrEngine.ts              # Tesseract + pré-processamento + normalização
│   │   └── Scanner.tsx               # UI de captura (foto/upload/manual)
│   └── work-records/
│       ├── index.ts
│       ├── calculations.ts           # Cálculo de banco/extra/intrajornada
│       ├── recordsService.ts         # CRUD com offline-first
│       ├── syncService.ts            # Fila de sincronização offline→online
│       └── useRecords.ts             # Hook de registros de ponto
│
├── services/
│   ├── export/
│   │   ├── index.ts
│   │   ├── exportDocx.ts             # Gerador de Cartão de Ponto
│   │   └── exportXlsx.ts            # Preenchedor de Autorização HE
│   └── supabase/
│       ├── index.ts
│       ├── client.ts                 # Cliente Supabase configurado
│       └── localDb.ts               # IndexedDB via idb (offline)
│
├── store/
│   └── index.ts                      # Zustand stores (auth, records, UI, overtime)
│
├── types/
│   └── index.ts                      # Tipos TypeScript globais
│
├── utils/
│   ├── index.ts
│   └── dateUtils.ts                  # Período, conversões de data/hora
│
├── constants/
│   └── index.ts                      # Jornada, OCR, SYNC, STORAGE_KEYS
│
├── validators/
│   └── index.ts                      # Validação de data, hora, justificativa
│
├── tests/
│   ├── calculations.test.ts          # Testes de cálculos de ponto
│   └── validators.test.ts            # Testes de validadores
│
├── App.tsx                           # Roteamento raiz (login → setup → app)
├── main.tsx                          # Entrypoint React
├── index.css                         # Tailwind + classes customizadas
└── vite-env.d.ts
```

---

## Fluxo de Dados

```
Foto/Upload
    ↓
ocrEngine.ts (Tesseract + normalização)
    ↓
Scanner.tsx (fila sequencial)
    ↓
useRecords.ts (hook)
    ↓
recordsService.ts (CRUD)
    ├→ localDb.ts (IndexedDB — sempre)
    └→ supabase/client.ts (se online)
           ↓ (se offline)
        syncService.ts (fila + retry)
```

---

## Fluxo de Exportação

```
useRecords → records[]
    ↓
exportDocx.ts → gerarCartaoPonto()
    └→ .docx download

getHorasExtras() → overtime[]
    ↓
exportXlsx.ts → gerarAutorizacaoHorasExtras()
    └→ carrega template do /public/templates/
    └→ preenche A,B,C,D,I
    └→ .xlsx download
```

---

## Offline-First

```
Ação do usuário
    ↓
saveRecordLocal() — IndexedDB
    ↓
navigator.onLine?
    ├─ SIM → supabase.insert() → markRecordSynced()
    └─ NÃO → enqueuePendingSync()
                    ↓
            window 'online' event
                    ↓
            processSyncQueue() → retry (max 5x)
```

---

## Banco de Dados (Supabase)

```
profiles          — dados do colaborador (1:1 com auth.users)
work_records      — marcações de ponto
overtime_records  — autorizações de hora extra
period_closures   — fechamentos de período
audit_logs        — auditoria de ações
consents          — consentimentos LGPD
```

Todas as tabelas com **RLS ativo**: `auth.uid() = user_id`

---

## PWA

- Service Worker gerado pelo Workbox via `vite-plugin-pwa`
- Estratégia: `NetworkFirst` para chamadas Supabase, `CacheFirst` para assets estáticos
- Instalável em Android e iOS
- Funciona offline com dados do IndexedDB

---

## Deploy

```
git push main
    ↓
GitHub Actions (.github/workflows/deploy.yml)
    ↓
npm ci → inject .env secrets → npm run build
    ↓
dist/ → GitHub Pages
    ↓
https://andressonmds1996.github.io/scanner-ponto/
```

---

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon pública do Supabase |

Configuradas como **secrets** no GitHub para o workflow de deploy.
