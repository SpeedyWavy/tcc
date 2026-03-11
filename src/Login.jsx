import './Login.css'
import logords from './assets/logo-rds.png'

function Login() {
  return (
    <>
      <main>
        <div className="inicio">
          <img className="logo-inicio" src={logords} alt={logords} />
          <p>Transporte RDS</p>
        </div>

        <div className="ui-inputs">
          <form action="">
            <input type="email" placeholder="Insira seu Email" />
            <input type="password" placeholder="Senha de Acesso" />
            {/* <a href="#">Forgot your Password</a> */}
            <button type="button" onClick={() => { window.location.href = '/app'; }}>
              Acessar
            </button>
            
          </form>
        </div>

        <div className="icones">

          <p id="footers">Não tem um Cadastro? <a href="#">Contate-nos!</a></p>
            <div className="continue">
            <div className="linha"></div>
            <p id="with">Placeholder de acesso</p>
            <div className="linha2"></div>
          </div>
          <button
            id="google"
            type="button"
            onClick={() => { window.location.href = '/app'; }}
          >
            Admin
          </button>
          <button id="apple" type="button">Motorista</button>
          <button type="button">Usuario</button>
        </div>

    </main>
    </>
  )
}

export default Login
