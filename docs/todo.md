# todo.md

## Concluído ✓

- [x] Estrutura base React + TypeScript + Vite
- [x] Autenticação Google OAuth via Supabase
- [x] Schema SQL completo com RLS
- [x] OCR com Tesseract.js (eng, threshold Otsu, 4 estratégias regex)
- [x] Captura por foto (`capture="environment"`) e upload múltiplo
- [x] Fila sequencial de processamento OCR
- [x] Offline-first com IndexedDB
- [x] Sincronização automática com retry
- [x] Cálculo de banco de horas, hora extra e intrajornada
- [x] Dashboard com cards de resumo
- [x] Calendário com status por dia
- [x] Tabela de registros com filtros
- [x] Modal de autorização de horas extras com justificativa obrigatória
- [x] Exportação DOCX — Cartão de Ponto
- [x] Exportação XLSX — Autorização HE com template preservation
- [x] PWA instalável com Service Worker
- [x] Configurações LGPD (exportar/excluir dados)
- [x] Deploy automático GitHub Pages
- [x] Refatoração de estrutura de diretórios
- [x] Documentação (project-context, business-rules, architecture, todo)
- [x] Testes unitários (calculations, validators)

---

## Pendente / Melhorias futuras

### Alta prioridade

- [ ] Testar OCR em mais modelos Samsung com a nova abordagem `capture="environment"`
- [ ] Verificar se registros "pendente sync" anteriores foram corrigidos com a correção HH:mm:ss
- [ ] Teste de exportação DOCX com período real completo (20→19)
- [ ] Teste de exportação XLSX com múltiplos registros de hora extra

### Média prioridade

- [ ] Adicionar suporte a feriados nacionais (marcar dias como feriado no calendário)
- [ ] Histórico de períodos fechados (visualizar meses anteriores)
- [ ] Notificação push quando há registros pendentes de confirmação
- [ ] Modo escuro/claro (hoje só escuro)
- [ ] Edição de registros existentes (hoje só exclusão)

### Baixa prioridade

- [ ] Gráficos de banco de horas e horas extras por mês (recharts)
- [ ] Exportação em PDF do cartão de ponto
- [ ] Compartilhamento do cartão de ponto gerado
- [ ] Suporte a múltiplos períodos (retroativo)
- [ ] Testes E2E com Playwright

---

## Bugs conhecidos

- [ ] Em alguns dispositivos Samsung, o `capture="environment"` ainda pode abrir câmera frontal dependendo do browser — workaround: usar aba Upload da galeria
- [ ] Registros com status "pendente sync" anteriores à correção do formato HH:mm:ss precisam ser re-enviados manualmente

---

## Notas técnicas

- O template XLSX deve estar em `/public/templates/autorizacao_horas_extras.xlsx`
- O template DOCX do cartão de ponto é recriado programaticamente (não usa template físico)
- O Tesseract usa lang `eng` (não `por`) por estabilidade de CDN no browser
- O worker do Tesseract é singleton — terminateOCR() deve ser chamado ao desmontar
- A coluna `hora` no Supabase é `TIME` — sempre enviar no formato `HH:mm:ss`
