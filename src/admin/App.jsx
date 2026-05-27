import styles from './css/App.module.css'
import { CirclePlus, Bus, Users } from 'lucide-react'
import student from '../assets/student.png'
import moto from '../assets/motorista.png'
import veiculo from '../assets/veiculo.png'
import revisao from '../assets/revisao.png'
import rotas from '../assets/rotas.png'
import mais from '../assets/mais.png'
import UserMenu from './components/UserMenu.jsx'

function App() {
  return (
    <>
      <div className="ui-header ui-header--compact">
        <div className={styles['logo']}>
        </div>
        <UserMenu />
        <div className="ui-header-extra ui-header-extra--compact"></div>
      </div>

      <div className={styles['ui-round']}>
        <a href="/gerenciar-alunos" className={styles['ui-round-link']}>
          <div className={styles['ui-round1']}>
            <img src={student} alt={student} />
            <p>Alunos</p>
          </div>
        </a>

        <a href="/gerenciar-motoristas" className={styles['ui-round-link']}>
          <div className={styles['ui-round2']}>
            <img src={moto} alt={moto} />
            <p>Motoristas</p>
          </div>
        </a>

        <a href="/gerenciar-veiculos" className={styles['ui-round-link']}>
          <div className={styles['ui-round3']}>
            <img src={veiculo} alt={veiculo} />
            <p>Veiculos</p>
          </div>
        </a>
      </div>

      <div className={styles['ui-rounds']}>
        <a href="/gerenciar-revisoes" className={styles['ui-round-link']}>
          <div className={styles['ui-round4']}>
            <img src={revisao} alt={revisao} />
            <p>Revisão</p>
          </div>
        </a>

        <a href="/gerenciar-rotas" className={styles['ui-round-link']}>
          <div className={styles['ui-round5']}>
            <img src={rotas} alt={rotas} />
            <p>Rotas</p>
          </div>
        </a>

        <a href="/mais" className={styles['ui-round-link']}>
          <div className={styles['ui-round6']}>
            <img src={mais} alt={mais} />
            <p>Mais</p>
          </div>
        </a>

      </div>

      <div className={styles['ui-button1']}>
        <a href="/gerenciar-alunos"><CirclePlus /> Adicionar Cadastro</a>
      </div>

      <div className={styles['ui-button2']}>
        <button><a href="/gerenciar-veiculos"><Bus /> Gerenciar Veiculos</a></button>
      </div>

      <div className={styles['ui-button3']}>
        <button><a href="/gerenciar-motoristas"><Users /> Gerenciar Motoristas</a></button>
      </div>
      <div className={styles['ui-button4']}>
        <button><a href="/gerenciar-administradores"><Users /> Gerenciar Administradores</a></button>
      </div>
    </>
  )
}

export default App
