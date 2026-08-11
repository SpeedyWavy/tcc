import styles from './Suporte.module.css'
import { ArrowLeft } from 'lucide-react'

function Suporte() {
  return (
    <main className={styles['suporte-page']}>
      <div className={styles['ui-header1']}></div>
      <div className={`${styles['ui-header2']} ${styles['suporte-header-back']}`}>
        <a href="/" className={styles['suporte-back-link']} aria-label="Voltar para o login">
          <ArrowLeft />
          <span>Voltar</span>
        </a>
      </div>

      <div className={styles['login-logo']}></div>
      <h1>Suporte</h1>

      <div className={styles['suporte-formulario']}>
        <p id='email' >Insira seu Email</p>
        <input type="text" placeholder="Email" />
        <p id='aviso' >Um Email Sera enviado aos administradores para alterar a sua Senha</p>
      </div>

      <button type="button" className={styles['suporte-botao']}>
        Enviar
      </button>

      <div className={styles['page-footer']}>
        <div className={styles['ui-footer']}></div>
        <div className={styles['ui-footer1']}></div>
      </div>
    </main>
  )
}

export default Suporte
// 