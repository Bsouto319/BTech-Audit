import { supabase } from './supabase';

export async function saveAuditRun({ fileName, auditDate, schemaName, rows, hotelName }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: run, error: runErr } = await supabase
    .from('audit_runs')
    .insert({
      user_id:       user.id,
      hotel_name:    hotelName,
      file_name:     fileName,
      ref_date:      auditDate,
      schema_name:   schemaName,
      total_rows:    rows.length,
      total_receita: rows.reduce((s, r) => s + r.diaria, 0),
    })
    .select('id')
    .single();

  if (runErr) throw runErr;

  const toInsert = rows.map(r => ({
    run_id:         run.id,
    user_id:        user.id,
    ref_date:       auditDate,
    uh:             r.uh,
    nome:           r.nome,
    categoria:      r.categoria,
    diaria:         r.diaria,
    trf:            r.trf,
    chegada:        r.chegada || null,
    partida:        r.partida || null,
    razao_social:   r.razaoSocial,
    origem:         r.origem,
    segmento:       r.segmento,
    tipo_uh:        r.tipoUH,
    adultos:        r.adultos,
    obs:            r.obs,
    confidencial:   r.confidencial,
    has_divergencia: r.trf !== null && Math.abs(r.diaria - r.trf) > 1,
    diff_value:     r.trf !== null ? r.diaria - r.trf : 0,
  }));

  for (let i = 0; i < toInsert.length; i += 100) {
    const { error } = await supabase.from('audit_rows').insert(toInsert.slice(i, i + 100));
    if (error) throw error;
  }

  return run.id;
}

export async function checkExistingRun(auditDate) {
  const { data } = await supabase
    .from('audit_runs')
    .select('id, file_name, created_at')
    .eq('ref_date', auditDate)
    .order('created_at', { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

export async function fetchHistory(startDate, endDate) {
  const [{ data: rowData, error: rowErr }, { data: runData, error: runErr }] = await Promise.all([
    supabase
      .from('audit_rows')
      .select('nome, categoria, diaria, trf, has_divergencia, diff_value, razao_social, ref_date, chegada, partida, tipo_uh')
      .gte('ref_date', startDate)
      .lte('ref_date', endDate)
      .order('ref_date'),
    supabase
      .from('audit_runs')
      .select('id, ref_date, total_rows, total_receita, file_name, created_at')
      .gte('ref_date', startDate)
      .lte('ref_date', endDate)
      .order('ref_date'),
  ]);

  if (rowErr) throw rowErr;
  if (runErr) throw runErr;

  return { rows: rowData || [], runs: runData || [] };
}
