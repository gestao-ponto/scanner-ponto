# Gestor de Ponto SENAI

PWA para gerenciamento individual de registros de ponto — OCR ao vivo, exportação de Cartão de Ponto (DOCX) e Autorização de Horas Extras (XLSX).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript + Vite |
| Estilo | TailwindCSS |
| OCR | Tesseract.js |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Offline | IndexedDB (idb) + Service Worker (Workbox) |
| Exportação | docx.js + ExcelJS + FileSaver |
| Deploy | GitHub Pages |

---

## 1. Configuração do Supabase

### 1.1 Criar projeto

1. Acesse [supabase.com](https://supabase.com) → New Project
2. Escolha região: South America - São Paulo
3. Anote a **URL** e a **anon key** (Settings → API)

### 1.2 Executar migrations

No SQL Editor do Supabase, cole e execute:

```
supabase/migrations/001_initial_schema.sql
```

Tabelas criadas com RLS completo:
- `profiles` — dados do colaborador
- `work_records` — marcações de ponto
- `overtime_records` — registros de hora extra
- `period_closures` — fechamentos de período
- `audit_logs` — auditoria
- `consents` — consentimentos LGPD

### 1.3 Configurar Google OAuth

1. Supabase → Authentication → Providers → Google → Enable
2. No [Google Cloud Console](https://console.cloud.google.com):
   - APIs & Services → Credentials → OAuth 2.0 Client IDs
   - Application type: **Web application**
   - Authorized redirect URIs: `https://<PROJETO>.supabase.co/auth/v1/callback`
3. Cole Client ID e Client Secret no Supabase

### 1.4 Configurar URL de redirect

Supabase → Authentication → URL Configuration:

```
Site URL: https://gestao-ponto.github.io/scanner-ponto/
Additional redirect URL: https://gestao-ponto.github.io/scanner-ponto
```

---

## 2. Configuração local

```bash
git clone https://gestao-ponto.github.io/scanner-ponto
cd scanner-ponto
npm install
cp .env.example .env
# Preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
npm run dev
```

---

## 3. Deploy GitHub Pages

### Secrets do repositório

GitHub → Settings → Secrets and variables → Actions:

| Secret | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon key |

### Habilitar Pages

Settings → Pages → Source: **GitHub Actions**

Push na `main` dispara o deploy automaticamente.

URL: `https://gestao-ponto.github.io/scanner-ponto`

---

## 4. Regras de negócio

**Período:** Dia 20 do mês anterior → Dia 19 do mês atual

**Banco de horas:** 18:00 → 20:00

**Hora extra:** após 20:00

**Intrajornada:** trabalho entre 12:00 e 14:00 → hora extra

**Mapeamento de marcações:** 1ª=entrada manhã, 2ª=saída manhã, 3ª=entrada tarde, 4ª=saída tarde, 5ª=entrada noite, 6ª=saída noite

---

## 5. Exportação XLSX

O template original `autorizacao_horas_extras.xlsx` fica em `/public/templates/`.

Apenas as células **A, B, C, D, I** são preenchidas.
Todas as fórmulas (E, F, G, H, J, K, L, M, linha 61 TOTAL) são preservadas.

---

## 6. Troubleshooting

| Problema | Solução |
|---|---|
| Câmera não abre | HTTPS obrigatório; verificar permissão do navegador |
| OCR não detecta | Melhorar iluminação; usar aba Upload |
| Login Google não redireciona | Verificar redirect URLs no Supabase e Google Console |
| XLSX sem cálculos | Excel → Fórmulas → Calcular Agora |
| Sync não funciona | Verificar policies RLS no Supabase |
