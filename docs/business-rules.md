# business-rules.md

## Período Operacional

- **Início:** Dia 20 do mês anterior
- **Fim:** Dia 19 do mês atual
- **Exemplo:** 20/04/2026 → 19/05/2026
- Ao chegar o dia 19, o sistema exibe alerta "Período pronto para fechamento"

---

## Jornada Padrão

| Evento | Horário |
|---|---|
| Entrada | 08:00 |
| Saída para almoço | 12:00 |
| Retorno do almoço | 14:00 |
| Saída normal | 18:00 |

**Repouso semanal:** Sábado e Domingo

---

## Mapeamento de Marcações por Posição

As marcações são ordenadas por horário e mapeadas pela posição:

| Posição | Tipo |
|---|---|
| 1ª | Entrada manhã |
| 2ª | Saída manhã |
| 3ª | Entrada tarde |
| 4ª | Saída tarde |
| 5ª | Entrada noite |
| 6ª | Saída noite |

---

## Tolerância de Jornada

Cada ponto da jornada possui tolerância de **±5 minutos**:

| Evento | Normal | Antecipado | Atrasado |
|---|---|---|---|
| Entrada | 07:55 – 08:05 | < 07:55 | > 08:05 |
| Saída almoço | 11:55 – 12:05 | < 11:55 | > 12:05 |
| Retorno almoço | 13:55 – 14:05 | < 13:55 | > 14:05 |
| Saída | 17:55 – 18:05 | < 17:55 | > 18:05 |

---

## Banco de Horas

- Inicia após **18:05** (fora da tolerância de saída)
- Máximo de **2 horas** (até 20:05)
- Exemplo: saída às 19:05 → 60 min de banco

---

## Hora Extra

- Qualquer trabalho realizado **após 20:05** é contabilizado como **Hora Extra**
- O banco continua limitado a 120 min
- Exemplo: saída às 20:45 → 120 min de banco + 40 min de hora extra

---

## Intrajornada

- Qualquer trabalho executado **entre 12:00 e 14:00** gera automaticamente **Hora Extra**
- Calculado como sobreposição real dos pares de marcação com o intervalo
- Requer marcação explícita dentro do período (4+ marcações no dia)
- Exemplo: pares 08:00→12:15 e 13:20→18:00 → 55 min de intrajornada (15+40)

---

## Pendências

Um dia é marcado como **pendente** quando:
- Não possui nenhuma marcação (ausente)
- Possui marcação incompleta (número ímpar de marcações)

**Não** são considerados pendentes dias de fim de semana.

---

## Autorização de Horas Extras

- Obrigatória quando há banco de horas **ou** hora extra em qualquer dia
- O modal de justificativa abre automaticamente ao detectar banco/extra
- **Justificativa obrigatória** — mínimo 5 caracteres
- Sem justificativa o lançamento não é concluído

---

## Status dos Dias no Calendário

| Cor | Significado |
|---|---|
| Verde | Dia completo (≥4 marcações) |
| Amarelo | Dia incompleto (1-3 marcações) |
| Vermelho | Dia ausente (0 marcações) |
| Azul | Possui banco de horas ou hora extra |
| Cinza | Fim de semana |

---

## Exportação DOCX — Cartão de Ponto

- Período: dias 20 do mês anterior até 19 do mês atual
- Cabeçalho: Nome, Matrícula, Função, Lotação, C.Custo, Responsável
- Fins de semana preenchidos com "---"
- Rodapé: FP.CP.11.01 | Revisão 2 | 15/05/2019

---

## Exportação XLSX — Autorização de Horas Extras

- Template original carregado de `/public/templates/autorizacao_horas_extras.xlsx`
- Células preenchidas: **A** (data), **B** (intrajornada), **C** (início), **D** (término), **I** (justificativa)
- Células preservadas: E, F, G, H, J, K, L, M (fórmulas), linha 61 (TOTAL)
- Cabeçalho: B8 (nome), I8 (matrícula), B9 (função), B11 (responsável), I11 (lotação)

---

## OCR — Regras de Extração

- Motor: Tesseract.js 5, lang: `eng`
- Pré-processamento: upscale para 2000px, threshold de Otsu, binarização
- Duas tentativas: PSM SINGLE_BLOCK e PSM AUTO
- Correções automáticas: `.` → `:` entre dígitos de hora, validação de ano 2020-2099
- 4 estratégias de regex em cascata para data, 2 para hora
- Pendência com motivo explícito quando OCR falha

---

## LGPD

- **Dados armazenados:** data, hora, tipo de marcação, justificativas
- **Dados NÃO armazenados:** imagens dos comprovantes (descartadas após OCR)
- **Direitos:** exportar dados (JSON), excluir histórico, excluir conta
- **RLS:** cada usuário acessa apenas seus próprios dados
- **Consentimento:** explícito no primeiro acesso (SetupPerfil)
