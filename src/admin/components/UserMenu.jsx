import { useEffect, useRef, useState } from 'react'
import user from '../../assets/place-user.png'
import { ChevronDown } from 'lucide-react'
import ActionNotification, { useActionNotification } from './ActionNotification.jsx'
import { clearSession, getStoredUser, saveSession } from '../../auth.js'
import styles from './UserMenu.module.css'
import { formatCpf, isCpfComplete } from '../formValidators.js'
import { aplicarModoEscuro, getModoEscuro } from '../../lib/preferenciasMotorista.js'
import ConfiguracoesModal from '../../motorista/components/ConfiguracoesModal.jsx'
import { supabase } from '../../supabase.js'
import { apiRequest } from '../../api.js'
import PhotoUpload from './PhotoUpload.jsx'

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
  const [configuracoesAbertas, setConfiguracoesAbertas] = useState(false)
  const [cadastro, setCadastro] = useState(cadastroInicial)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [usuarioLogado, setUsuarioLogado] = useState(() => getStoredUser())
  const [fotoPerfil, setFotoPerfil] = useState(() => usuarioLogado?.photo_url || null)
  const [fotoEdicao, setFotoEdicao] = useState(null)
  const menuRef = useRef(null)
  const {
    notification,
    showError,
    clearNotification,
  } = useActionNotification()

  useEffect(() => {
    aplicarModoEscuro(getModoEscuro())
  }, [])

  useEffect(() => {
    let ativo = true

    const carregarFotoPerfil = async () => {
      if (!usuarioLogado?.id) return

      const { data, error } = await supabase
        .from('users')
        .select('photo_url')
        .eq('id', usuarioLogado.id)
        .maybeSingle()

      if (!error && ativo && data?.photo_url) {
        setFotoPerfil(data.photo_url)
      }
    }

    carregarFotoPerfil()
    return () => { ativo = false }
  }, [usuarioLogado?.id])

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
    const value = campo === 'cpf' ? formatCpf(event.target.value) : event.target.value
    setCadastro((atual) => ({ ...atual, [campo]: value }))
  }

  const abrirEditor = async () => {
    setMenuAberto(false)
    setCadastro({
      nome: usuarioLogado?.full_name || '',
      cpf: '',
      email: usuarioLogado?.email || '',
      senha: '',
      confirmarSenha: '',
    })
    setFotoEdicao(fotoPerfil)
    setEditorAberto(true)

    try {
      const perfil = await apiRequest(`/api/admins/${usuarioLogado?.id}`)
      if (perfil) {
        setCadastro({
          nome: perfil.full_name || '',
          cpf: formatCpf(perfil.cpf || ''),
          email: perfil.email || '',
          senha: '',
          confirmarSenha: '',
        })
        setFotoPerfil(perfil.photo_url || null)
        setFotoEdicao(perfil.photo_url || null)
      }
    } catch (error) {
      showError(error.message || 'Não foi possivel carregar seu cadastro.')
    }
  }

  const fecharEditor = () => {
    setEditorAberto(false)
    setFotoEdicao(null)
  }

  const abrirConfiguracoes = () => {
    setMenuAberto(false)
    setConfiguracoesAbertas(true)
  }

  const confirmarEdicao = async (event) => {
    event.preventDefault()

    if (!usuarioLogado?.id) {
      showError('Não foi possivel identificar seu cadastro.')
      return
    }

    if (!isCpfComplete(cadastro.cpf)) {
      showError('Informe um CPF com 11 números.')
      return
    }

    if (cadastro.senha && cadastro.senha !== cadastro.confirmarSenha) {
      showError('As senhas não conferem.')
      return
    }

    setFormSubmitting(true)
    try {
      const perfilAtualizado = await apiRequest(`/api/admins/${usuarioLogado.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: cadastro.nome.trim(),
          cpf: cadastro.cpf.trim(),
          email: cadastro.email.trim(),
          password: cadastro.senha || undefined,
          photo_url: fotoEdicao || null,
        }),
      })

      const sessaoAtualizada = {
        ...usuarioLogado,
        full_name: perfilAtualizado?.full_name || cadastro.nome.trim(),
        email: perfilAtualizado?.email || cadastro.email.trim(),
        photo_url: perfilAtualizado?.photo_url || fotoEdicao || null,
      }
      saveSession(null, sessaoAtualizada)
      setUsuarioLogado(sessaoAtualizada)
      setFotoPerfil(perfilAtualizado?.photo_url || fotoEdicao || null)
      clearNotification()
      fecharEditor()
    } catch (error) {
      showError(error.message || 'Não foi possivel atualizar seu cadastro.')
    } finally {
      setFormSubmitting(false)
    }
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
          <img
            src={fotoPerfil || user}
            alt={fotoPerfil ? `Foto de ${usuarioLogado?.full_name || 'usuário'}` : 'Usuário'}
            onError={() => setFotoPerfil(null)}
          />
          <span className={styles['usuario-nome']}>{usuarioLogado?.full_name || 'Usuário'}</span>
          <ChevronDown className={menuAberto ? `${styles['usuario-chevron']} ${styles.aberto}` : styles['usuario-chevron']} />
        </button>

        {menuAberto && (
          <div className={styles['usuario-popover']} role="menu">
            <button type="button" onClick={abrirConfiguracoes}>
              Configuracoes
            </button>
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
            <form className={styles['user-edit-form']} onSubmit={confirmarEdicao}>
              <div className={styles['user-edit-avatar-wrap']}>
                <PhotoUpload
                  photoUrl={fotoEdicao}
                  onPhotoChange={(url) => setFotoEdicao(url)}
                  onUploadingChange={setPhotoUploading}
                  entityType="admin"
                  entityId={usuarioLogado?.id}
                  userName={cadastro.nome || usuarioLogado?.full_name || 'admin'}
                  size={92}
                  iconSize={30}
                  badgeSize={28}
                />
              </div>
              <h2 className={styles['user-edit-title']}>Editar cadastro</h2>
              <label className={styles['user-edit-label']}>
                Nome completo
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={cadastro.nome}
                  onChange={atualizarCampo('nome')}
                />
              </label>

              <label className={styles['user-edit-label']}>
                CPF
                <input
                  type="text"
                  placeholder="CPF"
                  value={cadastro.cpf}
                  onChange={atualizarCampo('cpf')}
                  inputMode="numeric"
                  maxLength={14}
                />
              </label>

              <label className={styles['user-edit-label']}>
                E-mail
                <input
                  type="email"
                  placeholder="Email"
                  value={cadastro.email}
                  onChange={atualizarCampo('email')}
                />
              </label>

              <label className={styles['user-edit-label']}>
                Nova senha
                <input
                  type="password"
                  placeholder="Senha"
                  value={cadastro.senha}
                  onChange={atualizarCampo('senha')}
                />
              </label>

              <label className={styles['user-edit-label']}>
                Confirmar nova senha
                <input
                  type="password"
                  placeholder="Senha"
                  value={cadastro.confirmarSenha}
                  onChange={atualizarCampo('confirmarSenha')}
                />
              </label>

              <button type="submit" className={styles['user-edit-confirmar']} disabled={formSubmitting || photoUploading}>
                {photoUploading ? 'Aguardando upload...' : formSubmitting ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button type="button" className={styles['user-edit-cancelar']} onClick={fecharEditor}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
      {configuracoesAbertas && <ConfiguracoesModal onClose={() => setConfiguracoesAbertas(false)} showNavigation={false} />}
    </>
  )
}

export default UserMenu

// 
