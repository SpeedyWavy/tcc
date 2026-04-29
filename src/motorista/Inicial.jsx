import './css/Inicial.css'
import { Bus, MapPinned, Phone, Users } from 'lucide-react'
import wheel from '../assets/wheel.png'
import UserMenu from './components/UserMenu.jsx'

function Inicial() {
  return (
    <main className="motorista-home">
      <div className="ui-header ui-header--compact">
        <div className="logo"></div>
        <UserMenu />
        <div className="ui-header-extra ui-header-extra--compact"></div>
      </div>

      <section className="motorista-home__actions">
        <a href="#" className="motorista-card motorista-card--principal">
          <img src={wheel} alt="" className="motorista-card__image" />
          <span>Trajeto Atual</span>
        </a>

        <a href="#" className="motorista-card">
          <Bus />
          <span>Veiculo</span>
        </a>

        <a href="#" className="motorista-card">
          <MapPinned />
          <span>Rotas</span>
        </a>

        <a href="/motorista-alunos" className="motorista-card">
          <Users />
          <span>Alunos</span>
        </a>

        <a href="#" className="motorista-card">
          <Phone />
          <span>Contatos</span>
        </a>
      </section>
    </main>
  )
}

export default Inicial
