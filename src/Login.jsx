import './Login.css'

function Login() {
  return (
    <>
      <main className="login-page">
        {/* Barras superiores */}
        <div className="ui-header1"></div>
        <div className="ui-header2"></div>
        {/* Marca do sistema */}
        <div className="login-logo"></div>
        <h1>Bem Vindo</h1>
        {/* Campos de acesso */}
        <div className="opcoes">
          <p>Insira seu Email</p>
          <input type="text" placeholder='Email'/>
          <div className="campo-senha">
            <p>Insira sua Senha</p>
            <input type="text" placeholder='Senha'/>
            <div className="esqueci">
              <a href="/suporte">Esqueceu a Senha?</a>
            </div>
          </div>
        </div>
        

        {/* Botao principal */}
        <div className="entrar">
          <h2>Entrar</h2>
        </div>

        {/* Opcoes de acesso */}
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
          <button
            id="apple"
            type="button"
            onClick={() => { window.location.href = '/inicial'; }}
          >
            Motorista
          </button>
          <button type="button">Usuario</button>
        </div>

        {/* Rodape visual */}
        <div className="page-footer">
          <div className="ui-footer"></div>
          <div className="ui-footer1"></div>
        </div>

    </main>
    </>
  )
}

export default Login
