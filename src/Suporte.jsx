import './Suporte.css'
import { ArrowLeft } from 'lucide-react'

function Suporte() {
  return (
    <main className="suporte-page">
      <div className="ui-header1"></div>
      <div className="ui-header2 suporte-header-back">
        <a href="/" className="suporte-back-link" aria-label="Voltar para o login">
          <ArrowLeft />
          <span>Voltar</span>
        </a>
      </div>

      <div className="login-logo"></div>
      <h1>Suporte</h1>

      <div className="suporte-formulario">
        <p id='email' >Insira seu Email</p>
        <input type="text" placeholder="Email" />
        <p id='aviso' >Um Email Sera enviado aos administradores para alterar a sua Senha</p>
      </div>

      <button type="button" className="suporte-botao">
        Enviar
      </button>

      <div className="page-footer">
        <div className="ui-footer"></div>
        <div className="ui-footer1"></div>
      </div>
    </main>
  )
}

export default Suporte
