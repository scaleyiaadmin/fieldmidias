import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    console.log('Buscando estatísticas no Supabase...');
    const { data: rawData, error } = await supabase
      .from('contents')
      .select('status, created_at');

    if (error) {
      console.error('Erro na consulta do Supabase:', error);
      throw error;
    }
    
    const data = rawData || [];
    console.log(`Dados encontrados: ${data.length} registros.`);
    
    const total = data.length;
    const pending = data.filter(c => c.status === 'pending').length;
    const approved = data.filter(c => c.status === 'approved').length;
    const rejected = data.filter(c => c.status === 'rejected').length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTotal = data.filter(c => new Date(c.created_at) >= sevenDaysAgo).length;

    const decided = approved + rejected;

    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        recent_7_days: recentTotal,
        approval_rate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('Erro crítico em /api/stats:', err);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor ao carregar estatísticas.', 
      details: err.message 
    });
  }
}
