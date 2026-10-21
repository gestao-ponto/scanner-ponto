-- ============================================================
-- Turnos especiais — dias em que a jornada padrão não se aplica
-- Executar no SQL Editor do projeto Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS special_shift_days (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       DATE NOT NULL,
  criado_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, data)
);

CREATE INDEX IF NOT EXISTS idx_special_shift_user_data
  ON special_shift_days (user_id, data);

ALTER TABLE special_shift_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "special_shift_days: own only" ON special_shift_days
  FOR ALL USING (auth.uid() = user_id);
