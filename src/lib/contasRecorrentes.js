import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Contas recorrentes
//
// Cada conta recorrente é uma "corrente" de lançamentos. O lançamento mais
// recente da corrente fica com recorrente = true (é a "ponta"). Quando o mês
// vira, a ponta gera o lançamento seguinte e passa a bola: ela fica com
// recorrente = false (mantendo a frequência, só para exibir o selo) e o novo
// lançamento vira a ponta.
//
// O id do lançamento seguinte é calculado a partir do id do anterior. Assim,
// se duas pessoas abrirem o sistema ao mesmo tempo, o banco recusa o segundo
// insert (mesmo id) e nunca nasce conta duplicada.
// ---------------------------------------------------------------------------

const MESES_POR_FREQUENCIA = { mensal: 1, bimestral: 2, anual: 12 }

const LIMITE_LANCAMENTOS_POR_CARGA = 36

function iso(ano, mes, dia) {
  return ano + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0')
}

// Data de hoje no fuso do aparelho, em 'AAAA-MM-DD'
export function hojeISO() {
  const d = new Date()
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

// 'AAAA-MM-DD' -> 'AAAA-MM'
export function mesDe(dataISO) {
  return dataISO ? String(dataISO).slice(0, 7) : null
}

export function mesAtual() {
  return mesDe(hojeISO())
}

// Soma meses a uma data. Se o dia não existe no mês de destino (ex: dia 31
// em fevereiro), usa o último dia daquele mês.
export function somarMeses(dataISO, n) {
  const [ano, mes, dia] = String(dataISO).slice(0, 10).split('-').map(Number)
  const total = ano * 12 + (mes - 1) + n
  const novoAno = Math.floor(total / 12)
  const novoMes = (total % 12) + 1
  const ultimoDia = new Date(novoAno, novoMes, 0).getDate()
  return iso(novoAno, novoMes, Math.min(dia, ultimoDia))
}

// Soma meses a um 'AAAA-MM'
export function somarMesesAoMes(mesISO, n) {
  return mesDe(somarMeses(mesISO + '-01', n))
}

// Data do próximo lançamento de uma conta recorrente (ou null)
export function proximoVencimento(conta) {
  const passo = MESES_POR_FREQUENCIA[conta && conta.frequencia]
  if (!passo || !conta.data_vencimento) return null
  return somarMeses(conta.data_vencimento, passo)
}

// Id do lançamento seguinte, calculado a partir do id do anterior
async function idDoProximo(idAnterior) {
  const texto = new TextEncoder().encode('origem-outdoor:conta-recorrente:' + idAnterior)
  const hash = new Uint8Array(await window.crypto.subtle.digest('SHA-1', texto))
  const b = hash.slice(0, 16)
  b[6] = (b[6] & 0x0f) | 0x50
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20)
}

function montarProximo(conta, id, dataVencimento) {
  return {
    id,
    descricao: conta.descricao,
    valor: conta.valor,
    data_vencimento: dataVencimento,
    status: 'pendente',
    categoria: conta.categoria,
    beneficiario: conta.beneficiario,
    forma_pagamento: conta.forma_pagamento,
    numero_documento: null,
    observacoes: conta.observacoes,
    recorrente: true,
    frequencia: conta.frequencia,
    data_pagamento: null,
  }
}

// Cria o lançamento seguinte de uma conta recorrente.
// Retorna { proximo, jaExistia, error }.
export async function criarProximoLancamento(conta) {
  const data = proximoVencimento(conta)
  if (!data) return { error: { message: 'Conta sem frequência definida' } }
  if (!window.crypto || !window.crypto.subtle) return { error: { message: 'Navegador sem suporte' } }
  const proximo = montarProximo(conta, await idDoProximo(conta.id), data)
  const { error } = await supabase.from('contas_pagar').insert(proximo)
  if (error && error.code === '23505') return { proximo, jaExistia: true }
  if (error) return { error }
  return { proximo, jaExistia: false }
}

async function executarGeracao() {
  if (!window.crypto || !window.crypto.subtle) return 0
  const { data: pontas, error } = await supabase.from('contas_pagar').select('*').eq('recorrente', true)
  if (error || !pontas) return 0

  const limite = mesAtual()
  let criadas = 0

  for (const ponta of pontas) {
    let atual = ponta
    for (let i = 0; i < LIMITE_LANCAMENTOS_POR_CARGA; i++) {
      const data = proximoVencimento(atual)
      // Só lança quando o mês do próximo vencimento já chegou
      if (!data || mesDe(data) > limite) break

      const r = await criarProximoLancamento(atual)
      if (r.error) break

      const { error: erroPonta } = await supabase.from('contas_pagar').update({ recorrente: false }).eq('id', atual.id)
      if (erroPonta) break

      // Se o próximo já existia, ele segue por conta própria na próxima carga
      if (r.jaExistia) break
      criadas++
      atual = r.proximo
    }
  }
  return criadas
}

let geracaoEmAndamento = null

// Lança no mês as contas recorrentes que ainda não entraram.
// Pode ser chamada de vários lugares: só roda uma vez por vez.
export function gerarRecorrentes() {
  if (!geracaoEmAndamento) {
    geracaoEmAndamento = executarGeracao()
      .catch(() => 0)
      .finally(() => { geracaoEmAndamento = null })
  }
  return geracaoEmAndamento
}

// Previsão (sem gravar nada) das recorrentes que vão cair em um mês futuro
export function preverRecorrentes(contas, mesAlvo) {
  const previstas = []
  for (const ponta of contas) {
    if (!ponta.recorrente) continue
    const passo = MESES_POR_FREQUENCIA[ponta.frequencia]
    if (!passo || !ponta.data_vencimento) continue
    let data = ponta.data_vencimento
    for (let i = 0; i < 240; i++) {
      data = somarMeses(data, passo)
      if (mesDe(data) > mesAlvo) break
      if (mesDe(data) === mesAlvo) {
        previstas.push({
          ...ponta,
          id: 'prevista-' + ponta.id,
          data_vencimento: data,
          status: 'pendente',
          data_pagamento: null,
          numero_documento: null,
          prevista: true,
        })
        break
      }
    }
  }
  return previstas
}
