import styles from './css/Trajeto.module.css'
import { ArrowLeft } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import volante from '../assets/volante.png'

function Trajeto() {
  const rotaAtiva = false
  const proximoHorario = '07:30'
  const proximoDia = 'Segunda-feira'

  return (
    <main className={styles['motorista-trajeto-page']}>
      <div className="ui-header">
        <div className={styles['logo']} />
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/inicial" aria-label="Voltar para o painel do motorista">
            <ArrowLeft />
          </a>
          <div className={`${styles['titulo-com-icone']} ui-header-extra-title`}>
            <img src={volante} alt="Volante" className={styles['motorista-trajeto__image']} />
            <span>Trajeto Atual</span>
          </div>
        </div>
      </div>

      <section className={styles['conteudo']}>
        {rotaAtiva ? (
          <>
            <div className={styles['card-aviso']}>
              <p className={styles['card-aviso-title']}>Você tem uma nova rota!</p>
              <p className={styles['card-aviso-text']}>
                Para começar o trajeto da <strong>Rota 01</strong>, clique em
                <span className={styles['card-aviso-action']}>Iniciar</span>.
              </p>
            </div>

            <div className={styles['card-botoes']}>
              <button type="button" className={styles['botao-principal']}>Iniciar</button>
              <button type="button" className={styles['botao-secundario']}>Ver detalhes</button>
            </div>

            <div className={styles['detalhes-rota']}>
              <div className={styles['detalhe-item']}>
                <span className={styles['detalhe-label']}>Rota</span>
                <strong>Rota 01</strong>
              </div>
              <div className={styles['detalhe-item']}>
                <span className={styles['detalhe-label']}>Horário</span>
                <strong>07:30</strong>
              </div>
              <div className={styles['detalhe-item']}>
                <span className={styles['detalhe-label']}>Ponto de partida</span>
                <strong>RDS Garcia</strong>
              </div>
            </div>
          </>
        ) : (
          <div className={styles['empty-state']}>
            <div className={styles['empty-card']}>
              <p className={styles['empty-title']}>Nenhum trajeto no momento.</p>
              <p className={styles['empty-text']}>
                O próximo começará às <strong>{proximoHorario}</strong> de <strong>{proximoDia}</strong>.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default Trajeto
