import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const id = req.query.id || (req.params && req.params.id);
  const { decision, reviewer_name, comment } = req.body;

  if (!decision || !['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: '"decision" deve ser "approved" ou "rejected".' });
  }
  if (decision === 'rejected' && !comment) {
    return res.status(400).json({ error: 'Um comentário é obrigatório ao rejeitar.' });
  }

  try {
    // Busca o conteúdo
    const { data: content, error: fetchError } = await supabase
      .from('contents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !content) {
      return res.status(404).json({ error: 'Conteúdo não encontrado.', debug_id: id, debug_error: fetchError });
    }

    if (content.status !== 'pending') {
      return res.status(409).json({
        error: `Este conteúdo já foi ${content.status === 'approved' ? 'aprovado' : 'rejeitado'}.`,
      });
    }

    // Atualiza no Supabase
    const { error: updateError } = await supabase
      .from('contents')
      .update({
        status: decision,
        reviewer_name: reviewer_name || 'Equipe Field',
        review_comment: comment || null,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Faz callback para o n8n retomar o workflow
    const webhookUrl = content.callback_url || 'https://n8n-n8n.8uygwt.easypanel.host/webhook/approval-callback';

    if (webhookUrl) {
      try {
        const callbackPayload = {
          content_id: id,
          decision,
          reviewer: reviewer_name || 'Equipe Field',
          comments: comment || null,
          decided_at: new Date().toISOString(),
          content: {
            title: content.title,
            text: content.content,
            platform: content.platform,
            media_urls: content.media_urls || [],
            scheduled_date: content.scheduled_date,
            metadata: content.metadata || {},
          },
        };

        const callbackRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(callbackPayload),
          signal: AbortSignal.timeout(10000), // timeout 10s
        });

        if (!callbackRes.ok) {
          console.warn(`Callback retornou status ${callbackRes.status}. O n8n pode não ter recebido.`);
        }
      } catch (callbackErr) {
        // Não falha a requisição se o callback falhar — o status já foi atualizado
        console.error('Erro ao chamar callback do n8n:', callbackErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: decision === 'approved'
        ? 'Conteúdo aprovado! O n8n foi notificado e irá publicar.'
        : 'Conteúdo rejeitado. O n8n foi notificado.',
      content_id: id,
      decision,
    });
  } catch (err) {
    console.error('Erro em /api/contents/[id]/decide:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
}
