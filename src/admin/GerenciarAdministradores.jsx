import { useEffect, useRef, useState } from 'react'
import styles from './css/GerenciarAdministradores.module.css'
import { ArrowLeft, CirclePlus, Search, ChevronDown, ChevronRight, Users } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'
import { apiRequest } from '../api.js'

const administradorInicial = {
  nome: '',
  cpf: '',
  email: '',
  senha: '',
  confirmarSenha: '',
}

function GerenciarAdministradores() {
  const [administradorAberto, setAdministradorAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [editorAberto, setEditorAberto] = useState(false)
  const [novoAdministrador, setNovoAdministrador] = useState(administradorInicial)
  const [administradorEmEdicao, setAdministradorEmEdicao] = useState(null)
  const [administradores, setAdministradores] = useState([])
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const menuRef = useRef(null)
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregarAdministradores = async () => {
    try {
      const data = await apiRequest('/api/admins')
      setAdministradores(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar administradores.')
    }
  }

  useEffect(() => {
    carregarAdministradores()
  }, [])

  useEffect(() => {
    if (!menuAberto) {
      return undefined
    }

    const fecharAoClicarFora = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAberto(null)
      }
    }

    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora)
    }
  }, [menuAberto])

  const alternarAdministrador = (id) => {
    setAdministradorAberto((atual) => (atual === id ? null : id))
  }

  const abrirAdicionar = () => {
    setFormularioAberto(true)
  }

  const fecharAdicionar = () => {
    setFormularioAberto(false)
    setNovoAdministrador(administradorInicial)
  }

  const abrirEditor = (administrador) => {
    setMenuAberto(null)
    setAdministradorEmEdicao(administrador)
    setNovoAdministrador({
      nome: administrador.full_name || '',
      cpf: administrador.cpf || '',
      email: administrador.email || '',
      senha: '',
      confirmarSenha: '',
    })
    setEditorAberto(true)
  }

  const fecharEditor = () => {
    setEditorAberto(false)
    setAdministradorEmEdicao(null)
    setNovoAdministrador(administradorInicial)
  }

  const atualizarCampo = (campo) => (e) => {
    setNovoAdministrador((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  const enviarNovoAdministrador = async (e) => {
    e.preventDefault()

    if (novoAdministrador.senha !== novoAdministrador.confirmarSenha) {
      showError('As senhas do administrador nao conferem.')
      return
    }

    setFormSubmitting(true)
    try {
      await apiRequest('/api/admins', {
        method: 'POST',
        body: JSON.stringify({
          full_name: novoAdministrador.nome.trim(),
          password: novoAdministrador.senha,
          cpf: novoAdministrador.cpf.trim(),
          email: novoAdministrador.email.trim(),
        }),
      })

      await carregarAdministradores()
      showSuccess('Administrador cadastrado com sucesso.')
      fecharAdicionar()
    } catch (error) {
      showError(error.message || 'Erro ao cadastrar administrador.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const salvarEdicaoAdministrador = async (e) => {
    e.preventDefault()

    if (!administradorEmEdicao) {
      return
    }

    if (novoAdministrador.senha && novoAdministrador.senha !== novoAdministrador.confirmarSenha) {
      showError('As senhas do administrador nao conferem.')
      return
    }

    setFormSubmitting(true)
    try {
      await apiRequest(`/api/admins/${administradorEmEdicao.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: novoAdministrador.nome.trim(),
          password: novoAdministrador.senha || undefined,
          cpf: novoAdministrador.cpf.trim(),
          email: novoAdministrador.email.trim(),
        }),
      })

      await carregarAdministradores()
      showSuccess('Administrador atualizado com sucesso.')
      fecharEditor()
    } catch (error) {
      showError(error.message || 'Erro ao atualizar administrador.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const excluirAdministrador = async (administrador) => {
    setMenuAberto(null)
    const confirmou = window.confirm(`Deseja excluir o administrador "${administrador.full_name}"?`)
    if (!confirmou) {
      return
    }

    try {
      await apiRequest(`/api/admins/${administrador.id}`, { method: 'DELETE' })
      await carregarAdministradores()
      showSuccess('Administrador excluido com sucesso.')
      if (administradorEmEdicao?.id === administrador.id) {
        fecharEditor()
      }
    } catch (error) {
      showError(error.message || 'Erro ao excluir administrador.')
    }
  }

  const administradoresFiltrados = administradores.filter((administrador) => {
    const nome = administrador.full_name || ''
    const cpf = administrador.cpf || ''
    const email = administrador.email || ''
    const termo = busca.trim().toLowerCase()

    const passouBusca = !termo || [nome, cpf, email].some((valor) => valor.toLowerCase().includes(termo))

    return passouBusca
  })

  return (
    <main className={`${styles['admin-page']} ${styles['admin-page--administradores']}`}>
      <div className="ui-header">
        <div className={styles['logo']}></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <Users />
            <span>Administradores</span>
          </div>
        </div>
      </div>

      <ActionNotification notification={notification} onClose={clearNotification} />

      <div className={styles['adicionar']}>
        <button type="button" className={styles['adicionar-botao']} onClick={abrirAdicionar}>
          <CirclePlus id="icone-botao" />
          Cadastrar Administrador
        </button>
      </div>

      {formularioAberto && (
        <div className={styles['boadd-overlay']} onClick={fecharAdicionar}>
          <div
            className={styles['boadd-card']}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles['boadd-top']}></div>

            <form className={styles['boadd-form']} onSubmit={enviarNovoAdministrador}>
              <p className={styles['boadd-label']}>Nome Completo</p>
              <input
                type="text"
                placeholder="Digite o nome do administrador"
                value={novoAdministrador.nome}
                onChange={atualizarCampo('nome')}
              />

              <p className={styles['boadd-label']}>Cpf</p>
              <input
                type="text"
                placeholder="Insira o CPF do administrador"
                value={novoAdministrador.cpf}
                onChange={atualizarCampo('cpf')}
              />

              <p className={styles['boadd-label']}>Email</p>
              <input
                type="email"
                placeholder="Informe o email do administrador"
                value={novoAdministrador.email}
                onChange={atualizarCampo('email')}
              />

              <p className={styles['boadd-label']}>Senha</p>
              <input
                type="password"
                placeholder="Crie uma senha"
                value={novoAdministrador.senha}
                onChange={atualizarCampo('senha')}
              />

              <p className={styles['boadd-label']}>Confirmar senha</p>
              <input
                type="password"
                placeholder="Repita a senha"
                value={novoAdministrador.confirmarSenha}
                onChange={atualizarCampo('confirmarSenha')}
              />

              <button type="submit" className={styles['boadd-confirmar']} disabled={formSubmitting}>
                {formSubmitting ? 'Criando...' : 'Criar Cadastro'}
              </button>
              <button type="button" className={styles['boadd-cancelar']} onClick={fecharAdicionar}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {editorAberto && (
        <div className={styles['boadd-overlay']} onClick={fecharEditor}>
          <div className={styles['boadd-card']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['boadd-top']}></div>

            <form className={styles['boadd-form']} onSubmit={salvarEdicaoAdministrador}>
              <p className={styles['boadd-label']}>Nome Completo</p>
              <input type="text" placeholder="Digite o nome do administrador" value={novoAdministrador.nome} onChange={atualizarCampo('nome')} />

              <p className={styles['boadd-label']}>Cpf</p>
              <input type="text" placeholder="Insira o CPF do administrador" value={novoAdministrador.cpf} onChange={atualizarCampo('cpf')} />

              <p className={styles['boadd-label']}>Email</p>
              <input type="email" placeholder="Informe o email do administrador" value={novoAdministrador.email} onChange={atualizarCampo('email')} />

              <p className={styles['boadd-label']}>Nova senha</p>
              <input type="password" placeholder="Deixe em branco para manter a atual" value={novoAdministrador.senha} onChange={atualizarCampo('senha')} />

              <p className={styles['boadd-label']}>Confirmar nova senha</p>
              <input type="password" placeholder="Repita a nova senha" value={novoAdministrador.confirmarSenha} onChange={atualizarCampo('confirmarSenha')} />

              <button type="submit" className={styles['boadd-confirmar']} disabled={formSubmitting}>
                {formSubmitting ? 'Salvando...' : 'Salvar Alteracoes'}
              </button>
              <button type="button" className={styles['boadd-cancelar']} onClick={fecharEditor}>Cancelar</button>
            </form>
          </div>
        </div>
      )}

      <div className={styles['cadastros']}>
        <div className={styles['filtro-area']}>
          <div className={styles['filtro']}>
            <div className={styles['filtro-input-wrap']}>
              <Search className={styles['filtro-icon']} />
              <input
                type="text"
                placeholder="Buscar administrador"
                className={styles['filtro-input']}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles['alunos-grid']}>
          {administradoresFiltrados.map((administrador) => (
            <div key={administrador.id} className={styles['aluno-item']}>
              <div
                className={`${styles.aluno} ${styles[`aluno${administrador.id}`]} ${administradorAberto === administrador.id ? 'aberto' : ''}`}
                onClick={() => alternarAdministrador(administrador.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    alternarAdministrador(administrador.id)
                  }
                }}
              >
                {administradorAberto === administrador.id ? (
                  <ChevronDown className={styles['setinha']} />
                ) : (
                  <ChevronRight className={styles['setinha']} />
                )}
                <h1>{administrador.full_name}</h1>
                <div className={styles['item-acoes']} ref={menuAberto === administrador.id ? menuRef : null}>
                  <button
                    type="button"
                    className={styles['item-acoes-trigger']}
                    aria-haspopup="menu"
                    aria-expanded={menuAberto === administrador.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuAberto((atual) => (atual === administrador.id ? null : administrador.id))
                    }}
                  >
                    &#8801;
                  </button>

                  {menuAberto === administrador.id && (
                    <div className={styles['item-acoes-popover']} role="menu">
                      <button type="button" onClick={() => abrirEditor(administrador)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => excluirAdministrador(administrador)}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {administradorAberto === administrador.id && (
                <div className={styles['aluno-detalhes']}>
                  <div className={styles['aluno-info']}>
                    <p><strong>Nome:</strong> {administrador.full_name}</p>
                    <p><strong>CPF:</strong> {administrador.cpf || 'Nao informado'}</p>
                    <p><strong>Email:</strong> {administrador.email || 'Nao informado'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default GerenciarAdministradores
