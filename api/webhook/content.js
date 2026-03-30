import { supabase } from '../../lib/supabase.js';
import { sendNewContentEmail } from '../../lib/email.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const {
      title,
      content,
      platform = 'instagram',
      media_urls = [],
      scheduled_date,
      callback_url,
      metadata = {},
    } = req.body;

    // Validação obrigatória
    if (!title) {
      return res.status(400).json({ error: 'O campo "title" é obrigatório.' });
    }
    if (!callback_url) {
      return res.status(400).json({ error: 'O campo "callback_url" é obrigatório (resumeUrl do n8n).' });
    }

    // Salva no Supabase
    const { data, error } = await supabase
      .from('contents')
      .insert([{
        title,
        content,
        platform,
        media_urls,
        scheduled_date: scheduled_date || null,
        callback_url,
        metadata,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) throw error;

    // Envia email de notificação (não bloqueia a resposta)
    sendNewContentEmail(data).catch(err =>
      console.error('Erro ao enviar email de notificação:', err)
    );

    return res.status(201).json({
      success: true,
      message: 'Conteúdo recebido e aguardando aprovação.',
      content_id: data.id,
      status: 'pending',
    });
  } catch (err) {
    console.error('Erro em /api/webhook/content:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
}
