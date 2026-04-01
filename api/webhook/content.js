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
    let {
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

    // Normalização de media_urls: 
    // Se for uma string única com vírgulas (como vindo do n8n por engano), transforma em array
    if (typeof media_urls === 'string') {
      media_urls = media_urls.split(',').map(u => u.trim()).filter(u => u.length > 0);
    } else if (Array.isArray(media_urls) && media_urls.length === 1 && media_urls[0].includes(',')) {
      // Caso ["url1,url2"]
      media_urls = media_urls[0].split(',').map(u => u.trim()).filter(u => u.length > 0);
    }

    // Tenta encontrar o conteúdo pendente mais recente com o mesmo callback_url para agrupar
    const { data: results, error: findError } = await supabase
      .from('contents')
      .select('id, media_urls, metadata')
      .eq('callback_url', callback_url)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    const existing = results && results.length > 0 ? results[0] : null;

    if (existing && !findError) {
      // Agrupa: Adiciona as novas URLs se já não existirem
      const combinedUrls = [...new Set([...(existing.media_urls || []), ...media_urls])];
      
      const { data: updated, error: updateError } = await supabase
        .from('contents')
        .update({ 
          media_urls: combinedUrls,
          title, // Atualiza o título caso tenha vindo diferente
          content,
          metadata: { ...existing.metadata, ...metadata } // Faz merge do metadata
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        message: 'Conteúdo atualizado e agrupado no carrossel.',
        content_id: updated.id,
        status: 'pending',
        is_grouped: true
      });
    }

    // Se não existir, cria um novo
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

    // Envia email de notificação apenas na criação do primeiro item
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
