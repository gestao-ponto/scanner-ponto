# Política de Resposta a Incidentes de Segurança — LGPD art. 48

**Sistema:** Gestor de Ponto SENAI — CETEC Palmas  
**Controlador:** SENAI CETEC Palmas  
**Atualizado em:** junho/2026

---

## 1. O que é um incidente

Qualquer evento que comprometa dados pessoais armazenados no sistema:

- Acesso não autorizado ao banco de dados (Supabase)
- Vazamento de credenciais (Google OAuth, Service Role Key)
- Exclusão ou alteração indevida de registros de ponto
- Falha na Edge Function expondo dados de usuários

---

## 2. Prazo legal

O art. 48 da LGPD exige notificação à **ANPD e aos titulares afetados em até 72 horas** após a ciência do incidente.

---

## 3. Passos imediatos (primeiras 2 horas)

1. **Isolar** — revogar a chave comprometida no Supabase Dashboard ou Google Cloud Console
2. **Avaliar** — consultar `audit_logs` para identificar registros afetados e período
3. **Registrar** — anotar data/hora da descoberta, natureza e estimativa de titulares afetados
4. **Escalar** — comunicar ao responsável pela unidade CETEC Palmas

---

## 4. Notificação à ANPD

Acessar o portal: https://www.gov.br/anpd  
Canal de notificação de incidentes → preencher formulário com:

- Natureza dos dados afetados
- Número estimado de titulares
- Medidas adotadas
- Contato do responsável

---

## 5. Notificação aos titulares

Comunicar por e-mail institucional (Google Workspace) os usuários afetados com:

- O que aconteceu
- Quais dados foram expostos
- O que foi feito para corrigir
- O que o titular deve fazer (ex: trocar senha Google)

---

## 6. Dados armazenados no sistema

| Dado | Onde | Sensível? |
|---|---|---|
| Nome, matrícula, função | `profiles` | Baixo |
| Datas e horários de ponto | `work_records` | Baixo |
| Justificativas de hora extra | `overtime_records` | Baixo |
| user_agent do navegador | `consents` | Baixo |
| Imagens dos comprovantes | **Não armazenadas** | — |

---

## 7. Contatos de referência

| Papel | Contato |
|---|---|
| Responsável técnico | Andresson Mouzinho |
| ANPD | https://www.gov.br/anpd |