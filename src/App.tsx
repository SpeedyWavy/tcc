import './App.css'
import doguinho from './assets/doguinho.png'
import doguinho2 from './assets/doguinho2.png'

function App() {
  return (
    <>
      <div className="ui-header">
        <div className="logo">
          <img src={doguinho} alt={doguinho} />
        </div>
        <div className="usuario">
          <h1>Usuario</h1>
          <img src={doguinho2} alt={doguinho2} />
        </div>
        <div className="ui-header-extra"></div>
      </div>

      <div className="ui-button1">
        <a href="/gerenciar-alunos">+ Adicionar Cadastro</a>
      </div>

      <div className="ui-button2">
        <button><a href="">Gerenciar Veiculos</a></button>
      </div>

      <div className="ui-button3">
        <button><a href="">Gerenciar Motoristas</a></button>
      </div>
    </>
  )
}

export default App
