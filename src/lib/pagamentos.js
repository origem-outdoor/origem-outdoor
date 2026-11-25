import { supabase } from './supabase'
import { hojeISO } from './contasRecorrentes'

// ---------------------------------------------------------------------------
// Pagamentos de parcelas
//
// O banco guarda o status da parcela como 'pendente', 'paga' ou 'cancelada'.
// "Atrasada" não é gravada: é calculada pela data de vencimento.
// O status geral do contrato (aguardando / parcial / pago / atrasado) sempre
// é calculado a partir das parcelas, para todas as telas mostrarem o mesmo.
// ---------------------------------------------------------------------------

// Aceita também os nomes antigos ('pago', 'atrasado', 'atrasada')
export function statusParcela(s) {
  if (s === 'paga' || s === 'pago') return 'paga'
  if (s === 'cancelada') return 'cancelada'
  return 'pendente'
}

export function statusGeralDasParcelas(parcelas) {
  const ativas = (parcelas || []).filter(p => statusParcela(p.status) !== 'cancelada')
  if (ativas.length === 0) return 'aguardando'
  const pagas = ativas.filter(p => statusParcela(p.status) === 'paga')
  if (pagas.length === ativas.length) return 'pago'
  const hoje = hojeISO()
  const atrasada = ativas.some(p => statusParcela(p.status) !== 'paga' && p.data_vencimento && p.data_vencimento < hoje)
  if (atrasada) return 'atrasado'
  return pagas.length > 0 ? 'parcial' : 'aguardando'
}

// Recalcula o status de pagamento do contrato a partir das parcelas gravadas
// no banco. Chamar depois de qualquer mudança em uma parcela.
export async function sincronizarPagamentoContrato(contratoId) {
  if (!contratoId) return {}
  const { data: parcs, error } = await supabase
    .from('parcelas')
    .select('status, data_vencimento, data_pagamento')
    .eq('contrato_id', contratoId)
  if (error || !parcs || parcs.length === 0) return { error }
  const atualizacao = { status_pagamento: statusGeralDasParcelas(parcs) }
  // Contrato à vista (1 parcela): a data do pagamento também fica no contrato
  if (parcs.length === 1) {
    atualizacao.data_pagamento = statusParcela(parcs[0].status) === 'paga' ? (parcs[0].data_pagamento || null) : null
  }
  const { error: erroContrato } = await supabase.from('contratos').update(atualizacao).eq('id', contratoId)
  return { error: erroContrato }
}
