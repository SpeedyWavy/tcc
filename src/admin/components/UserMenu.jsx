import { useEffect, useRef, useState } from 'react'
import user from '../../assets/place-user.png'
import { Camera, ChevronDown } from 'lucide-react'

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
  const menuRef = useRef(null)

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
    fecharEditor()
  }

  const excluirCadastro = () => {
    setCadastro(cadastroInicial)
    fecharEditor()
  }

  const sairDaConta = () => {
    window.location.href = '/'
  }

  return (
    <>
      <div className="usuario" ref={menuRef}>
        <button
          type="button"
          className="usuario-trigger"
          onClick={() => setMenuAberto((atual) => !atual)}
          aria-haspopup="menu"
          aria-expanded={menuAberto}
        >
          <img src={user} alt="Usuario" />
          <span className="usuario-nome">Usuario</span>
          <ChevronDown className={`usuario-chevron ${menuAberto ? 'aberto' : ''}`} />
        </button>

        {menuAberto && (
          <div className="usuario-popover" role="menu">
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
        <div className="user-edit-overlay" onClick={fecharEditor}>
          <div
            className="user-edit-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-edit-avatar-wrap">
              <div className="user-edit-avatar">
                <img src={user} alt="Usuario" />
                <button type="button" className="user-edit-camera" aria-label="Alterar foto">
                  <Camera />
                </button>
              </div>
            </div>

            <form className="user-edit-form" onSubmit={confirmarEdicao}>
              <label className="user-edit-label">
                Informe o nome o administrador:
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={cadastro.nome}
                  onChange={atualizarCampo('nome')}
                />
              </label>

              <label className="user-edit-label">
                Informe o CPF o administrador:
                <input
                  type="text"
                  placeholder="CPF"
                  value={cadastro.cpf}
                  onChange={atualizarCampo('cpf')}
                />
              </label>

              <label className="user-edit-label">
                Informe o e-mail do administrador:
                <input
                  type="email"
                  placeholder="Email"
                  value={cadastro.email}
                  onChange={atualizarCampo('email')}
                />
              </label>

              <label className="user-edit-label">
                Crie uma nova senha:
                <input
                  type="password"
                  placeholder="Senha"
                  value={cadastro.senha}
                  onChange={atualizarCampo('senha')}
                />
              </label>

              <label className="user-edit-label">
                Confirme a nova senha:
                <input
                  type="password"
                  placeholder="Senha"
                  value={cadastro.confirmarSenha}
                  onChange={atualizarCampo('confirmarSenha')}
                />
              </label>

              <button type="submit" className="user-edit-confirmar">
                Confirmar alteracoes
              </button>
              <button type="button" className="user-edit-excluir" onClick={excluirCadastro}>
                Excluir cadastro
              </button>
              <button type="button" className="user-edit-cancelar" onClick={fecharEditor}>
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
