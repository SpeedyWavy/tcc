import { useEffect, useState } from 'react'
import { traduzirMensagemUsuario } from '../lib/traduzirMensagemUsuario.js'
import { X } from 'lucide-react'
import styles from './HistoricoNotificacoes.module.css'
import { carregarNotificacoes } from '../lib/notificacoesMotoristas.js'

function formatarData(valor) {
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function HistoricoNotificacoes({ onClose }) {
  const [notificacoes, setNotificacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    carregarNotificacoes()
      .then((data) => { if (ativo) setNotificacoes(data) })
      .catch((error) => { if (ativo) setErro(traduzirMensagemUsuario(error.message, 'Não foi possível carregar as notificações.')) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="historico-notificacoes-titulo" onClick={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <h2 id="historico-notificacoes-titulo">Notificações anteriores</h2>
          <button type="button" onClick={onClose} aria-label="Fechar histórico"><X /></button>
        </header>
        {carregando ? <p>Carregando notificações...</p> : null}
        {erro ? <p role="alert">{erro}</p> : null}
        {!carregando && !erro && notificacoes.length === 0 ? <p>Nenhuma notificação enviada ainda.</p> : null}
        <div className={styles.lista}>
          {notificacoes.map((notificacao) => (
            <article key={notificacao.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <time dateTime={notificacao.created_at}>{formatarData(notificacao.created_at)}</time>
                {notificacao.active && <span>Atual</span>}
              </div>
              <p>{notificacao.message}</p>
            </article>
          ))}
        </div>
        <button type="button" className={styles.fechar} onClick={onClose}>Fechar</button>
      </section>
    </div>
  )
}
