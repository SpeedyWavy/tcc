import { useEffect, useRef, useState } from 'react'
import styles from './css/GerenciarMotoristas.module.css'
import motorista2 from '../assets/motorista2.png'
import motorista3 from '../assets/motorista3.png'
import { ArrowLeft, ArrowDownNarrowWide, CirclePlus, Search, ChevronDown, ChevronRight } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import PhotoUpload from './components/PhotoUpload.jsx'
import { apiRequest } from '../api.js'
import { supabase } from '../supabase.js'

const motoristaInicial = {
  nome: '',
  cpf: '',
  rg: '',
  categoriaCnh: '',
  identificacaoTransporte: '',
  contato: '',
  horarios: '',
  unidade: 'Garcia',
  fotoUrl: null,
}

const acessoInicial = {
  email: '',
  senha: '',
  confirmarSenha: '',
}

function GerenciarMotoristas() {
  const [motoristaAberto, setMotoristaAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [editorAberto, setEditorAberto] = useState(false)
  const [passoCadastro, setPassoCadastro] = useState(1)
  const [novoMotorista, setNovoMotorista] = useState(motoristaInicial)
  const [acessoMotorista, setAcessoMotorista] = useState(acessoInicial)
  const [motoristaEmEdicao, setMotoristaEmEdicao] = useState(null)
  const [passoEdicao, setPassoEdicao] = useState(1)
  const [motoristas, setMotoristas] = useState([])
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState(null)
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [filtrosAplicados, setFiltrosAplicados] = useState({ unidade: [], horarios: [], transporte: [] })
  const [filtrosRascunho, setFiltrosRascunho] = useState({ unidade: [], horarios: [], transporte: [] })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [fotoUrlArmazenado, setFotoUrlArmazenado] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const menuRef = useRef(null)
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregarMotoristas = async () => {
    try {
      const data = await apiRequest('/api/drivers')
      setMotoristas(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar motoristas.')
    }
  }

  useEffect(() => {
    carregarMotoristas()
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

  const alternarMotorista = (id) => {
    setMotoristaAberto((atual) => (atual === id ? null : id))
  }

  const abrirAdicionar = () => {
    setFormularioAberto(true)
    setPassoCadastro(1)
  }

  const fecharAdicionar = () => {
    setFormularioAberto(false)
    setPassoCadastro(1)
    setNovoMotorista(motoristaInicial)
    setAcessoMotorista(acessoInicial)
    setFotoUrlArmazenado(null)
    setPhotoUploading(false)
  }

  const abrirEditor = (motorista) => {
    setMenuAberto(null)
    setMotoristaEmEdicao(motorista)
    setNovoMotorista({
      nome: motorista.full_name || '',
      cpf: motorista.cpf || '',
      rg: motorista.rg || '',
      categoriaCnh: motorista.cnh_category || '',
      identificacaoTransporte: motorista.transport_identification || '',
      contato: motorista.contact || '',
      horarios: motorista.schedules || '',
      unidade: motorista.unit || 'Garcia',
      fotoUrl: motorista.photo_url || null,
    })
    setFotoUrlArmazenado(motorista.photo_url || null)
    setAcessoMotorista({
      email: motorista.email || '',
      senha: '',
      confirmarSenha: '',
    })
    setPassoEdicao(1)
    setEditorAberto(true)
  }

  const fecharEditor = () => {
    setEditorAberto(false)
    setMotoristaEmEdicao(null)
    setPassoEdicao(1)
    setNovoMotorista(motoristaInicial)
    setAcessoMotorista(acessoInicial)
    setFotoUrlArmazenado(null)
    setPhotoUploading(false)
  }

  const atualizarCampo = (campo) => (e) => {
    setNovoMotorista((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  const atualizarAcesso = (campo) => (e) => {
    setAcessoMotorista((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  const handlePhotoChange = async (photoUrl, filePath) => {
    setNovoMotorista((atual) => ({ ...atual, fotoUrl: photoUrl ?? null }))
    setFotoUrlArmazenado(filePath)

    // If editing an existing driver, persist the photo_url immediately
    if (photoUrl && motoristaEmEdicao?.id) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ photo_url: photoUrl })
          .eq('id', motoristaEmEdicao.id)

        if (error) {
          showError(error.message || 'Erro ao atualizar foto do motorista.')
        } else {
          await carregarMotoristas()
          showSuccess('Foto do motorista atualizada.')
        }
      } catch (err) {
        showError(err.message || 'Erro ao atualizar foto do motorista.')
      }
    }
  }

  const irParaAcesso = () => {
    setPassoCadastro(2)
  }

  const voltarParaDados = () => {
    setPassoCadastro(1)
  }

  const enviarNovoMotorista = async (e) => {
    e.preventDefault()

    if (!novoMotorista.cpf.trim()) {
      showError('Informe o CPF do motorista para criar o cadastro.')
      return
    }

    if (acessoMotorista.senha !== acessoMotorista.confirmarSenha) {
      showError('As senhas do motorista nao conferem.')
      return
    }

    setFormSubmitting(true)
    try {
      await apiRequest('/api/drivers', {
        method: 'POST',
        body: JSON.stringify({
          full_name: novoMotorista.nome.trim(),
          password: acessoMotorista.senha,
          cpf: novoMotorista.cpf.trim(),
          email: acessoMotorista.email.trim(),
          rg: novoMotorista.rg.trim(),
          cnh_category: novoMotorista.categoriaCnh,
          transport_identification: novoMotorista.identificacaoTransporte.trim(),
          contact: novoMotorista.contato.trim(),
          schedules: novoMotorista.horarios.trim(),
          unit: novoMotorista.unidade,
          photo_url: novoMotorista.fotoUrl || null,
          photo_path: fotoUrlArmazenado || null,
        }),
      })

      await carregarMotoristas()
      showSuccess('Motorista cadastrado com sucesso.')
      fecharAdicionar()
    } catch (error) {
      showError(error.message || 'Erro ao cadastrar motorista.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const salvarEdicaoMotorista = async (e) => {
    e.preventDefault()

    if (!motoristaEmEdicao) {
      return
    }

    if (!novoMotorista.cpf.trim()) {
      showError('O CPF do motorista e obrigatorio.')
      return
    }

    if (acessoMotorista.senha && acessoMotorista.senha !== acessoMotorista.confirmarSenha) {
      showError('As senhas do motorista nao conferem.')
      return
    }

    setFormSubmitting(true)
    try {
      await apiRequest(`/api/drivers/${motoristaEmEdicao.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: novoMotorista.nome.trim(),
          password: acessoMotorista.senha || undefined,
          cpf: novoMotorista.cpf.trim(),
          email: acessoMotorista.email.trim(),
          rg: novoMotorista.rg.trim(),
          cnh_category: novoMotorista.categoriaCnh,
          transport_identification: novoMotorista.identificacaoTransporte.trim(),
          contact: novoMotorista.contato.trim(),
          schedules: novoMotorista.horarios.trim(),
          unit: novoMotorista.unidade,
          photo_url: novoMotorista.fotoUrl || null,
          photo_path: fotoUrlArmazenado || null,
        }),
      })

      await carregarMotoristas()
      showSuccess('Motorista atualizado com sucesso.')
      fecharEditor()
    } catch (error) {
      showError(error.message || 'Erro ao atualizar motorista.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const excluirMotorista = async (motorista) => {
    setMenuAberto(null)
    const confirmou = window.confirm(`Deseja excluir o motorista "${motorista.full_name}"?`)
    if (!confirmou) {
      return
    }

    try {
      await apiRequest(`/api/drivers/${motorista.id}`, { method: 'DELETE' })
      await carregarMotoristas()
      showSuccess('Motorista excluido com sucesso.')
      if (motoristaEmEdicao?.id === motorista.id) {
        fecharEditor()
      }
    } catch (error) {
      showError(error.message || 'Erro ao excluir motorista.')
    }
  }

  const opcoesUnidade = [...new Set(motoristas.map((motorista) => motorista.unit).filter(Boolean))]
  const opcoesHorarios = [...new Set(motoristas.map((motorista) => motorista.schedules).filter(Boolean))]
  const opcoesTransporte = [...new Set(motoristas.map((motorista) => motorista.transport_identification).filter(Boolean))]

  const secoesFiltro = [
    { id: 'unidade', label: 'Unidade', options: opcoesUnidade.map((value) => ({ value, label: value })) },
    { id: 'horarios', label: 'Horarios', options: opcoesHorarios.map((value) => ({ value, label: value })) },
    { id: 'transporte', label: 'Veiculo', options: opcoesTransporte.map((value) => ({ value, label: value })) },
  ]

  const alternarFiltro = (secao, valor) => {
    setFiltrosRascunho((atual) => {
      const valores = atual[secao] || []
      const existe = valores.includes(valor)
      return {
        ...atual,
        [secao]: existe ? valores.filter((item) => item !== valor) : [...valores, valor],
      }
    })
  }

  const aplicarFiltros = () => {
    setFiltrosAplicados(filtrosRascunho)
    setFiltroAberto(false)
  }

  const limparFiltros = () => {
    const vazio = { unidade: [], horarios: [], transporte: [] }
    setFiltrosRascunho(vazio)
    setFiltrosAplicados(vazio)
  }

  const abrirFiltros = () => {
    setFiltrosRascunho(filtrosAplicados)
    setFiltroAberto((atual) => !atual)
  }

  const motoristasFiltrados = motoristas.filter((motorista) => {
    const nome = motorista.full_name || ''
    const cpf = motorista.cpf || ''
    const rg = motorista.rg || ''
    const horarios = motorista.schedules || ''
    const transporte = motorista.transport_identification || ''
    const contato = motorista.contact || ''
    const unidade = motorista.unit || ''
    const termo = busca.trim().toLowerCase()

    const passouBusca =
      !termo ||
      [nome, cpf, rg, horarios, transporte, contato, unidade].some((valor) => valor.toLowerCase().includes(termo))

    const passouUnidade = filtrosAplicados.unidade.length === 0 || filtrosAplicados.unidade.includes(unidade)
    const passouHorarios = filtrosAplicados.horarios.length === 0 || filtrosAplicados.horarios.includes(horarios)
    const passouTransporte = filtrosAplicados.transporte.length === 0 || filtrosAplicados.transporte.includes(transporte)

    return passouBusca && passouUnidade && passouHorarios && passouTransporte
  })

  return (
    <main className={`${styles['admin-page']} ${styles['admin-page--motoristas']}`}>
      <div className="ui-header">
        <div className={styles['logo']}></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <img src={motorista3} alt="" className={styles['ui-header-extra-icon']} />
            <span>Motoristas</span>
          </div>
        </div>
      </div>

      <ActionNotification notification={notification} onClose={clearNotification} />

      <div className={styles['adicionar']}>
        <button type="button" className={styles['adicionar-botao']} onClick={abrirAdicionar}>
          <CirclePlus id="icone-botao" />
          Cadastrar Motorista
        </button>
      </div>

      {formularioAberto && (
        <div className={styles['boadd-overlay']} onClick={fecharAdicionar}>
          <div className={styles['boadd-card']} onClick={(e) => e.stopPropagation()}>
            {passoCadastro === 1 && (
              <div className={styles['boadd-top']}>
                <PhotoUpload
                  photoUrl={novoMotorista.fotoUrl}
                  onPhotoChange={handlePhotoChange}
                  onUploadingChange={setPhotoUploading}
                  entityType="driver"
                  entityId={motoristaEmEdicao?.id}
                  userName={novoMotorista.nome}
                />
              </div>
            )}

            <form className={styles['boadd-form']} onSubmit={enviarNovoMotorista}>
              {passoCadastro === 1 ? (
                <>
                  <input type="text" placeholder="Digite o nome do motorista" value={novoMotorista.nome} onChange={atualizarCampo('nome')} />
                  <input type="text" placeholder="Insira o CPF" value={novoMotorista.cpf} onChange={atualizarCampo('cpf')} required />
                  <input type="text" placeholder="Insira o RG" value={novoMotorista.rg} onChange={atualizarCampo('rg')} />

                  <select value={novoMotorista.categoriaCnh} onChange={atualizarCampo('categoriaCnh')}>
                    <option value="">Categoria da CNH</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Veiculo / identificacao do transporte"
                    value={novoMotorista.identificacaoTransporte}
                    onChange={atualizarCampo('identificacaoTransporte')}
                  />
                  <input type="text" placeholder="Contato" value={novoMotorista.contato} onChange={atualizarCampo('contato')} />
                  <input type="text" placeholder="Horarios" value={novoMotorista.horarios} onChange={atualizarCampo('horarios')} />

                  <div className={styles['boadd-unidade']}>
                    <p>Unidade:</p>
                    <label>
                      <input type="radio" name="unidade" value="Garcia" checked={novoMotorista.unidade === 'Garcia'} onChange={atualizarCampo('unidade')} />
                      Garcia
                    </label>
                    <label>
                      <input type="radio" name="unidade" value="Vila Mimosa" checked={novoMotorista.unidade === 'Vila Mimosa'} onChange={atualizarCampo('unidade')} />
                      Mimosa
                    </label>
                    <label>
                      <input type="radio" name="unidade" value="Swiss Park" checked={novoMotorista.unidade === 'Swiss Park'} onChange={atualizarCampo('unidade')} />
                      Swiss Park
                    </label>
                  </div>

                  <button type="button" className={styles['boadd-confirmar']} onClick={irParaAcesso} disabled={photoUploading}>
                    {photoUploading ? 'Aguardando upload...' : 'Continuar'}
                  </button>
                  <button type="button" className={styles['boadd-cancelar']} onClick={fecharAdicionar}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <h2 className={styles['boadd-titulo']}>Acesso do Motorista</h2>
                  <label className={styles['boadd-label']}>
                    Informe o e-mail do motorista:
                    <input type="email" placeholder="Email" value={acessoMotorista.email} onChange={atualizarAcesso('email')} />
                  </label>
                  <label className={styles['boadd-label']}>
                    Crie uma senha:
                    <input type="password" placeholder="Senha" value={acessoMotorista.senha} onChange={atualizarAcesso('senha')} />
                  </label>
                  <label className={styles['boadd-label']}>
                    Confirme a senha:
                    <input type="password" placeholder="Senha" value={acessoMotorista.confirmarSenha} onChange={atualizarAcesso('confirmarSenha')} />
                  </label>

                  <button type="submit" className={styles['boadd-confirmar']} disabled={photoUploading || formSubmitting}>
                    {photoUploading ? 'Aguardando upload...' : formSubmitting ? 'Criando...' : 'Criar Cadastro'}
                  </button>
                  <button type="button" className={styles['boadd-voltar']} onClick={voltarParaDados}>
                    Voltar
                  </button>
                  <button type="button" className={styles['boadd-cancelar']} onClick={fecharAdicionar}>
                    Cancelar
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {editorAberto && (
        <div className={styles['boadd-overlay']} onClick={fecharEditor}>
          <div className={styles['boadd-card']} onClick={(e) => e.stopPropagation()}>
            {passoEdicao === 1 && (
              <div className={styles['boadd-top']}>
                <PhotoUpload
                  photoUrl={novoMotorista.fotoUrl}
                  onPhotoChange={handlePhotoChange}
                  onUploadingChange={setPhotoUploading}
                  entityType="driver"
                  entityId={motoristaEmEdicao?.id}
                  userName={novoMotorista.nome}
                />
              </div>
            )}

            <form className={styles['boadd-form']} onSubmit={salvarEdicaoMotorista}>
              {passoEdicao === 1 ? (
                <>
                  <input type="text" placeholder="Digite o nome do motorista" value={novoMotorista.nome} onChange={atualizarCampo('nome')} />
                  <input type="text" placeholder="Insira o CPF" value={novoMotorista.cpf} onChange={atualizarCampo('cpf')} required />
                  <input type="text" placeholder="Insira o RG" value={novoMotorista.rg} onChange={atualizarCampo('rg')} />

                  <select value={novoMotorista.categoriaCnh} onChange={atualizarCampo('categoriaCnh')}>
                    <option value="">Categoria da CNH</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>

                  <input type="text" placeholder="Veiculo / identificacao do transporte" value={novoMotorista.identificacaoTransporte} onChange={atualizarCampo('identificacaoTransporte')} />
                  <input type="text" placeholder="Contato" value={novoMotorista.contato} onChange={atualizarCampo('contato')} />
                  <input type="text" placeholder="Horarios" value={novoMotorista.horarios} onChange={atualizarCampo('horarios')} />

                  <div className={styles['boadd-unidade']}>
                    <p>Unidade:</p>
                    <label>
                      <input type="radio" name="unidade-edicao" value="Garcia" checked={novoMotorista.unidade === 'Garcia'} onChange={atualizarCampo('unidade')} />
                      Garcia
                    </label>
                    <label>
                      <input type="radio" name="unidade-edicao" value="Vila Mimosa" checked={novoMotorista.unidade === 'Vila Mimosa'} onChange={atualizarCampo('unidade')} />
                      Mimosa
                    </label>
                    <label>
                      <input type="radio" name="unidade-edicao" value="Swiss Park" checked={novoMotorista.unidade === 'Swiss Park'} onChange={atualizarCampo('unidade')} />
                      Swiss Park
                    </label>
                  </div>

                  <button type="button" className={styles['boadd-confirmar']} onClick={() => setPassoEdicao(2)}>Continuar</button>
                  <button type="button" className={styles['boadd-cancelar']} onClick={fecharEditor}>Cancelar</button>
                </>
              ) : (
                <>
                  <h2 className={styles['boadd-titulo']}>Acesso do Motorista</h2>
                  <label className={styles['boadd-label']}>
                    Informe o e-mail do motorista:
                    <input type="email" placeholder="Email" value={acessoMotorista.email} onChange={atualizarAcesso('email')} />
                  </label>
                  <label className={styles['boadd-label']}>
                    Nova senha:
                    <input type="password" placeholder="Deixe em branco para manter a atual" value={acessoMotorista.senha} onChange={atualizarAcesso('senha')} />
                  </label>
                  <label className={styles['boadd-label']}>
                    Confirme a nova senha:
                    <input type="password" placeholder="Senha" value={acessoMotorista.confirmarSenha} onChange={atualizarAcesso('confirmarSenha')} />
                  </label>

                  <button type="submit" className={styles['boadd-confirmar']} disabled={photoUploading || formSubmitting}>
                    {photoUploading ? 'Aguardando upload...' : formSubmitting ? 'Salvando...' : 'Salvar Alteracoes'}
                  </button>
                  <button type="button" className={styles['boadd-voltar']} onClick={() => setPassoEdicao(1)}>Voltar</button>
                  <button type="button" className={styles['boadd-cancelar']} onClick={fecharEditor}>Cancelar</button>
                </>
              )}
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
                placeholder="Buscar motorista"
                className={styles['filtro-input']}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <button type="button" className={styles['filtro-botao']} onClick={abrirFiltros}>
              <ArrowDownNarrowWide className={styles['icone-filtro']} />
              <span className={styles['busca-filtro']}>Filtrar Por...</span>
            </button>
          </div>

          <FilterPanel
            open={filtroAberto}
            title="Filtre por..."
            sections={secoesFiltro}
            draftFilters={filtrosRascunho}
            onToggle={alternarFiltro}
            onApply={aplicarFiltros}
            onClear={limparFiltros}
            onClose={() => setFiltroAberto(false)}
          />
        </div>

        <div className={styles['motoristas-grid']}>
          {motoristasFiltrados.map((motorista) => (
            <div key={motorista.id} className={styles['motorista-item']}>
              <div
                className={`${styles.motorista} ${styles[`motorista${motorista.id}`]} ${motoristaAberto === motorista.id ? 'aberto' : ''}`}
                onClick={() => alternarMotorista(motorista.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    alternarMotorista(motorista.id)
                  }
                }}
              >
                {motoristaAberto === motorista.id ? <ChevronDown className={styles['setinha']} /> : <ChevronRight className={styles['setinha']} />}
                <h1>{motorista.full_name}</h1>
                <div className={styles['item-acoes']} ref={menuAberto === motorista.id ? menuRef : null}>
                  <button
                    type="button"
                    className={styles['item-acoes-trigger']}
                    aria-haspopup="menu"
                    aria-expanded={menuAberto === motorista.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuAberto((atual) => (atual === motorista.id ? null : motorista.id))
                    }}
                  >
                    &#8801;
                  </button>

                  {menuAberto === motorista.id && (
                    <div className={styles['item-acoes-popover']} role="menu">
                      <button type="button" onClick={() => abrirEditor(motorista)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => excluirMotorista(motorista)}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {motoristaAberto === motorista.id && (
                <div className={styles['motorista-detalhes']}>
                  <div className={styles['motorista-card-top']}>
                    <div className={styles['motorista-foto']}>
                      {motorista.photo_url ? (
                        <img src={motorista.photo_url} alt={motorista.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: '#999', fontSize: '24px' }}>📷</span>
                      )}
                    </div>
                    <div className={styles['motorista-info']}>
                      <p><strong>CPF:</strong> {motorista.cpf || 'Nao informado'}</p>
                      <p><strong>RG:</strong> {motorista.rg || 'Nao informado'}</p>
                      <p><strong>CNH:</strong> {motorista.cnh_category || 'Nao informada'}</p>
                      <p><strong>Veiculo:</strong> {motorista.transport_identification || 'Nao informado'}</p>
                    </div>
                  </div>
                  <div className={styles['motorista-info-extra']}>
                    <p><strong>Contato:</strong> {motorista.contact || 'Nao informado'}</p>
                    <p><strong>Horarios:</strong> {motorista.schedules || 'Nao informado'}</p>
                    <p><strong>Unidade:</strong> {motorista.unit || 'Nao informada'}</p>
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

export default GerenciarMotoristas
