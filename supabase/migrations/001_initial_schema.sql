-- ============================================================
-- Gestor de Ponto SENAI — Schema Supabase
-- Executar no SQL Editor do projeto Supabase
-- ============================================================

-- ─── Extensão UUID ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  matricula    TEXT NOT NULL,
  funcao       TEXT NOT NULL,
  lotacao      TEXT NOT NULL DEFAULT 'CETEC PALMAS',
  centro_custo TEXT,
  responsavel  TEXT,
  lgpd_aceite      BOOLEAN NOT NULL DEFAULT FALSE,
  lgpd_aceite_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── work_records ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_records (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       DATE NOT NULL,
  hora       TIME NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN (
               'entrada_manha','saida_manha',
               'entrada_tarde','saida_tarde',
               'entrada_noite','saida_noite'
             )),
  origem     TEXT NOT NULL CHECK (origem IN ('ocr','upload','manual')),
  criado_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_records_user_data
  ON work_records (user_id, data);

-- ─── overtime_records ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS overtime_records (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data             DATE NOT NULL,
  intrajornada     BOOLEAN NOT NULL DEFAULT FALSE,
  horario_inicio   TIME NOT NULL,
  horario_termino  TIME NOT NULL,
  banco_horas      INTEGER NOT NULL DEFAULT 0,   -- em minutos
  hora_extra_50    INTEGER NOT NULL DEFAULT 0,   -- em minutos
  hora_extra_100   INTEGER NOT NULL DEFAULT 0,   -- em minutos
  justificativa    TEXT NOT NULL,
  criado_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overtime_user_data
  ON overtime_records (user_id, data);

-- ─── period_closures ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS period_closures (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periodo_inicio   DATE NOT NULL,
  periodo_fim      DATE NOT NULL,
  total_horas      INTEGER NOT NULL DEFAULT 0,
  total_banco      INTEGER NOT NULL DEFAULT 0,
  total_extra      INTEGER NOT NULL DEFAULT 0,
  fechado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  docx_gerado      BOOLEAN NOT NULL DEFAULT FALSE,
  xlsx_gerado      BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao       TEXT NOT NULL,
  tabela     TEXT,
  registro   UUID,
  detalhes   JSONB,
  criado_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── consents (LGPD) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,  -- 'lgpd_aceite', 'marketing', etc.
  aceito      BOOLEAN NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  criado_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Trigger: atualizar updated_at em profiles ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS — Row Level Security ─────────────────────────────────────────────────

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_closures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents         ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: own only" ON profiles
  FOR ALL USING (auth.uid() = user_id);

-- work_records
CREATE POLICY "work_records: own only" ON work_records
  FOR ALL USING (auth.uid() = user_id);

-- overtime_records
CREATE POLICY "overtime: own only" ON overtime_records
  FOR ALL USING (auth.uid() = user_id);

-- period_closures
CREATE POLICY "closures: own only" ON period_closures
  FOR ALL USING (auth.uid() = user_id);

-- audit_logs (somente leitura, insert via trigger)
CREATE POLICY "audit: own read" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- consents
CREATE POLICY "consents: own only" ON consents
  FOR ALL USING (auth.uid() = user_id);
