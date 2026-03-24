import './css/App.css'
import user from '../assets/place-user.png'
import { CirclePlus } from 'lucide-react'
import { Bus } from 'lucide-react';
import { Users } from 'lucide-react';
import student from '../assets/student.png'
import moto from '../assets/motorista.png'
import veiculo from '../assets/veiculo.png'
import revisao from '../assets/revisao.png'
import rotas from '../assets/rotas.png'

function App() {
  return (
    <>
      <div className="ui-header">
        <div className="logo">
        </div>
        <div className="usuario">
          <img src={user} alt={user} />
          <p>Usuario</p>
        </div>
        <div className="ui-header-extra"></div>
      </div>

      {/* Botões Menores Redondos */}
      <div className="ui-round">

        <a href="/gerenciar-alunos" className="ui-round-link">
          <div className="ui-round1">
            <img src={student} alt={student} />
            <p>Alunos</p>
          </div>
        </a>

        <a href="/gerenciar-motoristas" className="ui-round-link">
          <div className="ui-round2">
            <img src={moto} alt={moto} />
            <p>Motoristas</p>
          </div>
        </a>

        <div className="ui-round3">
          <img src={veiculo} alt={veiculo} />
          <p>Veiculos</p>
        </div>
        </div>

        <div className="ui-rounds">

        <div className="ui-round4">
          <img src={revisao} alt={revisao} />
          <p>Revisão</p>
        </div>

        <div className="ui-round5">
          <img src={rotas} alt={rotas} />
          <p>Rotas</p>
        </div>
        </div>

      {/* Botões Maiores */}
      <div className="ui-button1">
        <a href="/gerenciar-alunos"><CirclePlus /> Adicionar Cadastro</a>
      </div>

      <div className="ui-button2">
        <button><a href="/gerenciar-veiculos"><Bus /> Gerenciar Veiculos</a></button>
      </div>

      <div className="ui-button3">
        <button><a href="/gerenciar-motoristas"><Users /> Gerenciar Motoristas</a></button>
      </div>
      <div className="ui-button4">
        <button><a href="/gerenciar-administradores"><Users /> Gerenciar Administradores</a></button>
      </div>
    </>
  )
}

export default App
