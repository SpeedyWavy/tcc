import { useEffect, useState } from 'react'
import { ArrowLeft, Bell, Send } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import styles from './css/Mais.module.css'
import { sessionReady, supabase } from '../supabase.js'
import { publicarNotificacao } from '../lib/notificacoesMotoristas.js'
import HistoricoNotificacoes from '../components/HistoricoNotificacoes.jsx'
import SolicitacoesSenha from './components/SolicitacoesSenha.jsx'
import { traduzirMensagemUsuario } from '../lib/traduzirMensagemUsuario.js'

const unidadesIniciais = [
  { id: 'Garcia', unit: 'Garcia', label: 'Unidade Garcia', enabled: false },
  { id: 'Swiss Park', unit: 'Swiss Park', label: 'Unidade Swiss Park', enabled: false },
  { id: 'Vila Mimosa', unit: 'Vila Mimosa', label: 'Unidade Mimosa', enabled: false },
  { id: 'Vivendo e Aprendendo', unit: 'Vivendo e Aprendendo', label: 'Vivendo e Aprendendo', enabled: false },
]

function normalizarStatus(status) {
  return String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

async function carregarRotasDaUnidade(unit) {
  const { data: veiculos, error: erroVeiculos } = await supabase
    .from('vehicles')
    .select('id')
    .eq('unit', unit)

  if (erroVeiculos) throw erroVeiculos
  const vehicleIds = (veiculos || []).map((veiculo) => veiculo.id)
  if (vehicleIds.length === 0) return []

  const { data: rotas, error: erroRotas } = await supabase
    .from('routes')
    .select('id, status, status_before_vacation')
    .in('vehicle_id', vehicleIds)

  if (erroRotas) throw erroRotas
  return rotas || []
}

async function atualizarEstadoFerias(unit, enabled) {
  await sessionReady

  if (enabled) {
    // Bloqueia novos trajetos primeiro. Mesmo que o cancelamento de uma rota
    // falhe, o modo férias já impede o motorista de iniciá-la.
    const { error } = await supabase
      .from('unit_vacations')
      .upsert({ unit, enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'unit' })
    if (error) throw error

    const rotas = await carregarRotasDaUnidade(unit)
    const pendentes = rotas.filter((rota) => normalizarStatus(rota.status) === 'aguardando saida')
    for (const rota of pendentes) {
      const { error: erroCancelamento } = await supabase
        .from('routes')
        .update({ status: 'Cancelado', status_before_vacation: rota.status })
        .eq('id', rota.id)
      if (erroCancelamento) throw erroCancelamento
    }
    return
  }

  // Restaura o status anterior das rotas que foram canceladas por férias.
  const rotas = await carregarRotasDaUnidade(unit)
  const canceladasPorFerias = rotas.filter((rota) => rota.status === 'Cancelado' && rota.status_before_vacation)
  for (const rota of canceladasPorFerias) {
    const { error } = await supabase
      .from('routes')
      .update({ status: rota.status_before_vacation, status_before_vacation: null })
      .eq('id', rota.id)
    if (error) throw error
  }

  const { error } = await supabase
    .from('unit_vacations')
    .upsert({ unit, enabled: false, updated_at: new Date().toISOString() }, { onConflict: 'unit' })
  if (error) throw error
}

export default function Mais() {
  const [mensagemTexto, setMensagemTexto] = useState('')
  const [feedbackFerias, setFeedbackFerias] = useState('')
  const [unidades, setUnidades] = useState(unidadesIniciais)
  const [carregando, setCarregando] = useState(true)
  const [salvandoUnidade, setSalvandoUnidade] = useState('')
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)
  const [feedbackMensagem, setFeedbackMensagem] = useState('')
  const [historicoAberto, setHistoricoAberto] = useState(false)

  useEffect(() => {
    let ativo = true
    const carregarFerias = async () => {
      await sessionReady
      const { data, error } = await supabase.from('unit_vacations').select('unit, enabled')
      if (!ativo) return
      if (error) {
        setFeedbackFerias(`Não foi possível carregar as férias: ${traduzirMensagemUsuario(error.message)}`)
      } else {
        const estadosPorUnidade = new Map((data || []).map((ferias) => [ferias.unit, ferias.enabled]))
        setUnidades(unidadesIniciais.map((unidade) => ({
          ...unidade,
          enabled: estadosPorUnidade.get(unidade.unit) || false,
        })))
      }
      setCarregando(false)
    }

    carregarFerias().catch((error) => {
      if (ativo) {
        setFeedbackFerias(`Não foi possível carregar as férias: ${traduzirMensagemUsuario(error.message)}`)
        setCarregando(false)
      }
    })

    return () => { ativo = false }
  }, [])

  const toggleUnidade = async (unidade) => {
    const enabled = !unidade.enabled
    setSalvandoUnidade(unidade.id)
    setFeedbackFerias('')

    try {
      await atualizarEstadoFerias(unidade.unit, enabled)
      setUnidades((atuais) => atuais.map((item) => item.id === unidade.id ? { ...item, enabled } : item))
      setFeedbackFerias(enabled
        ? `Modo férias ativado para ${unidade.label}. As rotas pendentes foram canceladas.`
        : `Modo férias desativado para ${unidade.label}. As rotas foram restauradas.`)
    } catch (error) {
      // A ativação pode já estar gravada mesmo que algum cancelamento de rota
      // falhe. Recarrega o estado persistido para manter o switch coerente.
      const { data } = await supabase.from('unit_vacations').select('unit, enabled').eq('unit', unidade.unit).maybeSingle()
      if (data) {
        setUnidades((atuais) => atuais.map((item) => item.id === unidade.id ? { ...item, enabled: data.enabled } : item))
      }
      setFeedbackFerias(`Não foi possível concluir a alteração de férias: ${traduzirMensagemUsuario(error.message)}`)
    } finally {
      setSalvandoUnidade('')
    }
  }

  const enviarMensagem = async (event) => {
    event.preventDefault()
    const texto = mensagemTexto.trim()
    if (!texto || enviandoMensagem) return

    setEnviandoMensagem(true)
    setFeedbackMensagem('')
    try {
      await publicarNotificacao(texto)
      setMensagemTexto('')
      setFeedbackMensagem('Mensagem enviada aos motoristas.')
    } catch (error) {
      setFeedbackMensagem(`Não foi possível enviar a mensagem: ${traduzirMensagemUsuario(error.message)}`)
    } finally {
      setEnviandoMensagem(false)
    }
  }

  return (
    <main className="admin-page admin-page--mais">
      <div className="ui-header">
        <div className={styles['logo']}></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <span>Mais</span>
          </div>
        </div>
      </div>

      <div className={styles['mais-grid']}>
        <form className={`${styles['mais-card']} ${styles['mais-card--mensagem']}`} onSubmit={enviarMensagem}>
          <div className={styles['mais-card-header']}>
            <h2>Enviar mensagem</h2>
          </div>
          <textarea
            className={styles['mais-textarea']}
            placeholder="Digite sua mensagem aqui..."
            value={mensagemTexto}
            onChange={(event) => setMensagemTexto(event.target.value)}
            rows={8}
            maxLength={2000}
            required
          />
          {feedbackMensagem && <p role="status">{feedbackMensagem}</p>}
          <div className={styles['mais-card-footer']}>
            <button type="button" className={`${styles['mais-button']} ${styles['mais-button--secondary']}`} onClick={() => setHistoricoAberto(true)}>
              <Bell size={18} /> Histórico
            </button>
            <button type="submit" className={styles['mais-button']} disabled={enviandoMensagem || !mensagemTexto.trim()}>
              <Send size={18} /> {enviandoMensagem ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>

        <section className={`${styles['mais-card']} ${styles['mais-card--ferias']}`}>
          <div className={styles['mais-card-header']}>
            <h2>Férias</h2>
            <p>Ao ativar, as rotas pendentes da unidade são canceladas e não aparecem para iniciar até as férias serem desativadas.</p>
          </div>
          {feedbackFerias && <p role="status">{feedbackFerias}</p>}
          <div className={styles['mais-switch-list']}>
            {unidades.map((unidade) => (
              <label key={unidade.id} className={styles['mais-switch']}>
                <span>{unidade.label}</span>
                <div className={styles['mais-toggle']}>
                  <input
                    type="checkbox"
                    checked={unidade.enabled}
                    disabled={carregando || salvandoUnidade !== ''}
                    onChange={() => toggleUnidade(unidade)}
                    aria-label={`Ativar férias para ${unidade.label}`}
                  />
                  <span className={styles['mais-slider']} />
                </div>
              </label>
            ))}
          </div>
        </section>

        <SolicitacoesSenha />
      </div>
      {historicoAberto && <HistoricoNotificacoes onClose={() => setHistoricoAberto(false)} />}
    </main>
  )
}
