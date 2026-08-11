import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import styles from './css/Mais.module.css'

const unidadesIniciais = [
  { id: 1, label: 'Unidade Garcia', enabled: false },
  { id: 2, label: 'Unidade Swiss Park', enabled: false },
  { id: 3, label: 'Unidade Mimosa', enabled: false },
  { id: 4, label: 'Vivendo e Aprendendo', enabled: false }
]

export default function Mais() {
  const [message, setMessage] = useState('')
  const [unidades, setUnidades] = useState(unidadesIniciais)

  const toggleUnidade = (id) => {
    setUnidades((current) =>
      current.map((unidade) =>
        unidade.id === id ? { ...unidade, enabled: !unidade.enabled } : unidade
      )
    )
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
        <section className={`${styles['mais-card']} ${styles['mais-card--mensagem']}`}>
          <div className={styles['mais-card-header']}>
            <h2>Enviar mensagem</h2>
          </div>
          <textarea
            className={styles['mais-textarea']}
            placeholder="Digite sua mensagem aqui..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={8}
          />
          <div className={styles['mais-card-footer']}>
            <button type="button" className={styles['mais-button']}>
              Enviar
            </button>
          </div>
        </section>

        <section className={`${styles['mais-card']} ${styles['mais-card--ferias']}`}>
          <div className={styles['mais-card-header']}>
            <h2>Férias</h2>
          </div>
          <div className={styles['mais-switch-list']}>
            {unidades.map((unidade) => (
              <label key={unidade.id} className={styles['mais-switch']}>
                <span>{unidade.label}</span>
                <div className={styles['mais-toggle']}>
                  <input
                    type="checkbox"
                    checked={unidade.enabled}
                    onChange={() => toggleUnidade(unidade.id)}
                  />
                  <span className={styles['mais-slider']} />
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
// 