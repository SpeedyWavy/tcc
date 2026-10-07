import styles from './css/Inicial.module.css'
import { useEffect, useState } from 'react'
import { Bus, MapPinned, Phone, Users, X } from 'lucide-react'
import wheel from '../assets/wheel.png'
import UserMenu from './components/UserMenu.jsx'
import { sessionReady, supabase } from '../supabase.js'
import { getStoredUser } from '../auth.js'
import { chaveNotificacaoDispensada } from '../lib/notificacoesMotoristas.js'

function Inicial() {
  const [notificacao, setNotificacao] = useState(null)
  const [dispensadaId, setDispensadaId] = useState(() => {
    const usuario = getStoredUser()
    try { return window.localStorage.getItem(chaveNotificacaoDispensada(usuario?.id)) || '' } catch { return '' }
  })

  useEffect(() => {
    let ativo = true
    const carregarNotificacao = async () => {
      await sessionReady
      const { data, error } = await supabase
        .from('driver_announcements')
        .select('id, message, created_at')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!ativo) return
      if (error) {
        console.error('Não foi possível carregar a notificação:', error)
        return
      }
      setNotificacao(data || null)
    }

    carregarNotificacao()
    const intervalo = window.setInterval(carregarNotificacao, 30000)
    return () => { ativo = false; window.clearInterval(intervalo) }
  }, [])

  const fecharNotificacao = () => {
    if (!notificacao) return
    const usuario = getStoredUser()
    try { window.localStorage.setItem(chaveNotificacaoDispensada(usuario?.id), notificacao.id) } catch { /* Mantém o aviso fechado durante a sessão. */ }
    setDispensadaId(notificacao.id)
  }

  return (
    <main className={styles['motorista-home']}>
      <div className="ui-header ui-header--compact">
        <div className={styles['logo']}></div>
        <UserMenu />
        <div className="ui-header-extra ui-header-extra--compact"></div>
      </div>

      {notificacao && notificacao.id !== dispensadaId && (
        <aside className={styles['motorista-notificacao']} role="status" aria-live="polite">
          <div>
            <strong>Aviso da administração</strong>
            <p>{notificacao.message}</p>
          </div>
          <button type="button" onClick={fecharNotificacao} aria-label="Fechar notificação"><X /></button>
        </aside>
      )}

      <section className={styles['motorista-home__actions']}>
        <a href="/motorista-trajeto" className={`${styles['motorista-card']} ${styles['motorista-card--principal']}`}>
          <img src={wheel} alt="" className={styles['motorista-card__image']} />
          <span>Trajeto Atual</span>
        </a>

        <a href="/motorista-veiculo" className={styles['motorista-card']}>
          <Bus />
          <span>Veiculo</span>
        </a>

        <a href="/motorista-rotas" className={styles['motorista-card']}>
          <MapPinned />
          <span>Rotas</span>
        </a>

        <a href="/motorista-alunos" className={styles['motorista-card']}>
          <Users />
          <span>Alunos</span>
        </a>

        <a href="/motorista-contatos" className={styles['motorista-card']}>
          <Phone />
          <span>Contatos</span>
        </a>
      </section>
    </main>
  )
}

export default Inicial

// 
