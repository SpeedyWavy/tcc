import { useEffect, useRef, useState } from 'react'
import user from '../../assets/place-user.png'
import { Camera, ChevronDown } from 'lucide-react'
import ActionNotification, { useActionNotification } from './ActionNotification.jsx'
import { clearSession, getStoredUser } from '../../auth.js'
import styles from './UserMenu.module.css'

const cadastroInicial = {
  nome: '',
  cpf: '',
  email: '',
  senha: '',
  confirmarSenha: '',
}

function UserMenu() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [editorAberto, setEditorAberto] = useState(false)
  const [cadastro, setCadastro] = useState(cadastroInicial)
  const [usuarioLogado] = useState(() => getStoredUser())
  const menuRef = useRef(null)
  const {
    notification,
    showError,
    clearNotification,
  } = useActionNotification()

  useEffect(() => {
    if (!menuAberto) {
      return undefined
    }

    const fecharAoClicarFora = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAberto(false)
      }
    }

    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora)
    }
  }, [menuAberto])

  const atualizarCampo = (campo) => (event) => {
    setCadastro((atual) => ({ ...atual, [campo]: event.target.value }))
  }

  const abrirEditor = () => {
    setMenuAberto(false)
    setEditorAberto(true)
  }

  const fecharEditor = () => {
    setEditorAberto(false)
  }

  const confirmarEdicao = (event) => {
    event.preventDefault()
    showError('Erro ao editar cadastro.')
    fecharEditor()
  }

  const excluirCadastro = () => {
    showError('Erro ao excluir cadastro.')
    fecharEditor()
  }

  const sairDaConta = () => {
    clearSession()
    window.location.href = '/'
  }

  return (
    <>
      <ActionNotification notification={notification} onClose={clearNotification} />
      <div className={styles.usuario} ref={menuRef}>
        <button
          type="button"
          className={styles['usuario-trigger']}
          onClick={() => setMenuAberto((atual) => !atual)}
          aria-haspopup="menu"
          aria-expanded={menuAberto}
        >
          <img src={user} alt="Usuario" />
          <span className={styles['usuario-nome']}>{usuarioLogado?.full_name || 'Usuario'}</span>
          <ChevronDown className={menuAberto ? `${styles['usuario-chevron']} ${styles.aberto}` : styles['usuario-chevron']} />
        </button>

        {menuAberto && (
          <div className={styles['usuario-popover']} role="menu">
            <button type="button" onClick={abrirEditor}>
              Editar Cadastro
            </button>
            <button type="button" onClick={sairDaConta}>
              Sair da Conta
            </button>
          </div>
        )}
      </div>

      {editorAberto && (
        <div className={styles['user-edit-overlay']} onClick={fecharEditor}>
          <div
            className={styles['user-edit-card']}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles['user-edit-avatar-wrap']}>
              <div className={styles['user-edit-avatar']}>
                <img src={user} alt="Usuario" />
                <button type="button" className={styles['user-edit-camera']} aria-label="Alterar foto">
                  <Camera />
                </button>
              </div>
            </div>

            <form className={styles['user-edit-form']} onSubmit={confirmarEdicao}>
              <label className={styles['user-edit-label']}>
                Informe o nome o administrador:
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={cadastro.nome}
                  onChange={atualizarCampo('nome')}
                />
              </label>

              <label className={styles['user-edit-label']}>
                Informe o CPF o administrador:
                <input
                  type="text"
                  placeholder="CPF"
                  value={cadastro.cpf}
                  onChange={atualizarCampo('cpf')}
                />
              </label>

              <label className={styles['user-edit-label']}>
                Informe o e-mail do administrador:
                <input
                  type="email"
                  placeholder="Email"
                  value={cadastro.email}
                  onChange={atualizarCampo('email')}
                />
              </label>

              <label className={styles['user-edit-label']}>
                Crie uma nova senha:
                <input
                  type="password"
                  placeholder="Senha"
                  value={cadastro.senha}
                  onChange={atualizarCampo('senha')}
                />
              </label>

              <label className={styles['user-edit-label']}>
                Confirme a nova senha:
                <input
                  type="password"
                  placeholder="Senha"
                  value={cadastro.confirmarSenha}
                  onChange={atualizarCampo('confirmarSenha')}
                />
              </label>

              <button type="submit" className={styles['user-edit-confirmar']}>
                Confirmar alteracoes
              </button>
              <button type="button" className={styles['user-edit-excluir']} onClick={excluirCadastro}>
                Excluir cadastro
              </button>
              <button type="button" className={styles['user-edit-cancelar']} onClick={fecharEditor}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default UserMenu
