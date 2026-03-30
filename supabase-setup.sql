-- ============================================
-- Field Mídias - Setup do Banco de Dados
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Tabela principal de conteúdos
CREATE TABLE IF NOT EXISTS contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  platform TEXT DEFAULT 'instagram',
  media_urls TEXT[] DEFAULT '{}',
  scheduled_date TIMESTAMPTZ,
  callback_url TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_name TEXT,
  review_comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_platform ON contents(platform);

-- Habilitar RLS (Row Level Security) - desabilitado pois é sistema interno
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (sistema interno, sem auth)
CREATE POLICY "allow_all" ON contents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS contents_updated_at ON contents;
CREATE TRIGGER contents_updated_at
  BEFORE UPDATE ON contents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
