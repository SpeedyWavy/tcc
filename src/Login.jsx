import './Login.css'
import logords from './assets/logo-rds.png'

function Login() {
  return (
    <>
      <main>
        <div className="ui-header1"></div>
        <div className="ui-header2"></div>
        <div className="login-logo"></div>
        <h1>Bem Vindo</h1>
        <div className="opcoes">
          <p>Insira seu Email</p>
          <input type="text" placeholder='Email'/>
          <p>Insira sua Senha</p>
          <input type="text" placeholder='Senha'/>
        </div>

        <div className="entrar">
          <h2>Entrar</h2>
        </div>

        <div className="ui-footer"></div>
        <div className="ui-footer1"></div>

        <div className="icones">
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
