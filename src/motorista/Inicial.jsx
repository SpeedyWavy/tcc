import styles from './css/Inicial.module.css'
import { Bus, MapPinned, Phone, Users } from 'lucide-react'
import wheel from '../assets/wheel.png'
import UserMenu from './components/UserMenu.jsx'

function Inicial() {
  return (
    <main className={styles['motorista-home']}>
      <div className="ui-header ui-header--compact">
        <div className={styles['logo']}></div>
        <UserMenu />
        <div className="ui-header-extra ui-header-extra--compact"></div>
      </div>

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