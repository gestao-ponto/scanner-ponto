# project-context.md

## Visão Geral

**Nome:** Gestor de Ponto SENAI
**Repositório:** https://github.com/andressonmds1996/scanner-ponto
**Deploy:** https://andressonmds1996.github.io/scanner-ponto/
**Versão:** 1.0.0

PWA para gerenciamento individual de registros de ponto de colaboradores do SENAI CETEC Palmas.
Permite fotografar comprovantes impressos pelo relógio de ponto IDCLASS BIO PROX, extrair DATA e HORA via OCR e exportar automaticamente o Cartão de Ponto (DOCX) e a Autorização de Horas Extras (XLSX).

---

## Problema que resolve

Colaboradores precisam preencher manualmente o cartão de ponto e a planilha de horas extras a partir de comprovantes impressos. O processo é manual, sujeito a erros e esquecimentos.

---

## Usuário alvo

Colaboradores individuais do SENAI CETEC Palmas. Cada colaborador usa sua própria conta. Não existe perfil de gestor ou RH.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilo | TailwindCSS 3 |
| OCR | Tesseract.js 5 (lang: eng) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Autenticação | Google OAuth via Supabase Auth |
| Offline | IndexedDB (idb) + Service Worker (Workbox) |
| Exportação | docx.js + ExcelJS + FileSaver |
| Deploy | GitHub Pages via GitHub Actions |
| Testes | Vitest |

---

## Infraestrutura

- **Supabase Project ID:** dfamlghcweieygjlbzay
- **Supabase URL:** https://dfamlghcweieygjlbzay.supabase.co
- **GitHub:** https://github.com/andressonmds1996/scanner-ponto
- **GitHub Pages:** https://andressonmds1996.github.io/scanner-ponto/
- **Google OAuth redirect:** https://dfamlghcweieygjlbzay.supabase.co/auth/v1/callback

---

## Comprovante IDCLASS BIO PROX

Formato real do comprovante:

```
COMPROVANTE DE REGISTRO DE PONTO DO TRABALHADOR
RSOCIAL:SENAI CETEC PALMAS LOCAL:CETEC PALMAS
NREP:000140037503121900 MODELO:IDCLASS BIO PROX
CNPJ:03777465000222 CEI:000000000000000
NOME:ANDRESSON MOUZINHO DE SOUSA CPF:20143107393
NSR:000092841 DATA:01/06/2026 HORA:12:01
AD:ENTRCZKZGD7HP...
```

**Campos extraídos:** DATA (DD/MM/YYYY) e HORA (HH:mm)

**Atenção:** O OCR pode quebrar a data em múltiplas linhas: `DATA:01/0\n6/2026`

---

## Decisões de arquitetura

- **Offline-first:** registros salvos no IndexedDB antes de enviar ao Supabase
- **Template preservation:** o XLSX é carregado do template original, apenas A/B/C/D/I são preenchidos — fórmulas preservadas
- **Sem imagens armazenadas:** imagens são descartadas após extração OCR (LGPD)
- **Scanner contínuo removido:** substituído por `input capture="environment"` para evitar problemas de seleção de lente em Samsung
- **hora no formato HH:mm:ss:** coluna TIME do Supabase requer segundos
