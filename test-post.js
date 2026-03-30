// Using global fetch from Node 18+
const postContent = {
  title: '🚀 Novidade Field Control - Gestão de Equipes em Campo',
  content: 'Você sabia que empresas que usam a Field Control reduzem em até 40% o tempo de deslocamento das equipes?\n\nNosso software de gestão de campo conecta gestores e técnicos em tempo real, trazendo mais eficiência, controle e resultados para o seu negócio.\n\n✅ Ordens de serviço digitais\n✅ Rastreamento em tempo real\n✅ Relatórios automáticos\n✅ Assinatura digital do cliente',
  platform: 'instagram',
  media_urls: [
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'
  ],
  scheduled_date: '2026-04-02T10:00:00-03:00',
  callback_url: 'https://exemplo-n8n.com/webhook/resume/test-abc123',
  metadata: {
    campaign: 'Lançamento Q2 2026',
    created_by: 'Automação IA — n8n',
    objective: 'Geração de leads'
  }
};

async function sendPost() {
  const result = await fetch('http://localhost:3000/api/webhook/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postContent)
  });
  console.log(await result.json());
}

sendPost();
