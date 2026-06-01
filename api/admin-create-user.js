const { createClient } = require('@supabase/supabase-js');

const ADMIN_EMAIL = 'brunosouto1108@gmail.com';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Sem autorização' });

  const supabaseUrl  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY não configurada no Vercel' });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verifica se quem chama é o admin
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user || user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { email, hotel_name, total_uh, status } = req.body || {};
  if (!email || !hotel_name) {
    return res.status(400).json({ error: 'Email e nome do hotel são obrigatórios' });
  }

  // Gera senha temporária legível
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let tempPassword = '';
  for (let i = 0; i < 8; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];
  tempPassword += 'A1!';

  // Cria o usuário no Supabase Auth (email já confirmado)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createErr) {
    return res.status(400).json({ error: createErr.message });
  }

  // Atualiza o perfil (trigger já criou com hotel_name vazio e status trial)
  await admin
    .from('audit_profiles')
    .update({
      hotel_name,
      total_uh: total_uh ? parseInt(total_uh) : null,
      subscription_status: status || 'trial',
      updated_at: new Date().toISOString(),
    })
    .eq('id', created.user.id);

  return res.status(200).json({ success: true, email, password: tempPassword });
};
