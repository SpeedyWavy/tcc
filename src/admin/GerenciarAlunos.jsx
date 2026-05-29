import { useEffect, useRef, useState } from 'react'
import styles from './css/GerenciarAlunos.module.css'
import student2 from '../assets/student2.png'
import student3 from '../assets/student3.png'
import { ArrowLeft, CirclePlus, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { ArrowDownNarrowWide } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import { apiRequest } from '../api.js'

const alunoInicial = {
  nome: '',
  rm: '',
  responsavel: '',
  contatoResponsavel: '',
  endereco: '',
  transporte: '',
  unidade: 'Garcia',
}

function GerenciarAlunos() {
  const [alunoAberto, setAlunoAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [editorAberto, setEditorAberto] = useState(false)
  const [novoAluno, setNovoAluno] = useState(alunoInicial)
  const [alunoEmEdicao, setAlunoEmEdicao] = useState(null)
  const [alunos, setAlunos] = useState([])
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState(null)
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [filtrosAplicados, setFiltrosAplicados] = useState({ unidade: [], responsavel: [], transporte: [] })
  const [filtrosRascunho, setFiltrosRascunho] = useState({ unidade: [], responsavel: [], transporte: [] })
  const menuRef = useRef(null)
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregarAlunos = async () => {
    try {
      const data = await apiRequest('/api/students')
      setAlunos(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar alunos.')
    }
  }

  useEffect(() => {
    carregarAlunos()
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

  const alternarAluno = (id) => {
    setAlunoAberto((atual) => (atual === id ? null : id))
  }

  const abrirAdicionar = () => {
    setFormularioAberto(true)
  }

  const fecharAdicionar = () => {
    setFormularioAberto(false)
    setNovoAluno(alunoInicial)
  }

  const abrirEditor = (aluno) => {
    setMenuAberto(null)
    setAlunoEmEdicao(aluno)
    setNovoAluno({
      nome: aluno.name || aluno.nome || '',
      rm: aluno.rm || '',
      responsavel: aluno.responsible_name || aluno.responsavel || '',
      contatoResponsavel: aluno.parent_contact || aluno.contato_responsavel || '',
      endereco: aluno.address || aluno.endereco || '',
      transporte: aluno.transport_identification || aluno.transporte || '',
      unidade: aluno.unit || aluno.unidade || 'Garcia',
    })
    setEditorAberto(true)
  }

  const fecharEditor = () => {
    setEditorAberto(false)
    setAlunoEmEdicao(null)
    setNovoAluno(alunoInicial)
  }

  const atualizarCampo = (campo) => (e) => {
    setNovoAluno((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  const validarAluno = () => {
    const nome = novoAluno.nome.trim()
    const rm = novoAluno.rm.trim()
    const responsavel = novoAluno.responsavel.trim()
    const contatoResponsavel = novoAluno.contatoResponsavel.trim()
    const endereco = novoAluno.endereco.trim()
    const transporte = novoAluno.transporte.trim()
    const unidade = novoAluno.unidade.trim()

    if (!nome || !rm || !responsavel || !contatoResponsavel || !endereco || !transporte || !unidade) {
      showError('Preencha todos os campos do cadastro do aluno.')
      return null
    }

    return {
      name: nome,
      rm,
      responsible_name: responsavel,
      parent_contact: contatoResponsavel,
      address: endereco,
      transport_identification: transporte,
      unit: unidade,
    }
  }

  const enviarNovoAluno = async (e) => {
    e.preventDefault()

    const payload = validarAluno()
    if (!payload) {
      return
    }

    try {
      await apiRequest('/api/students', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      await carregarAlunos()
      showSuccess('Aluno cadastrado com sucesso.')
      fecharAdicionar()
    } catch (error) {
      showError(error.message || 'Erro ao cadastrar aluno.')
    }
  }

  const salvarEdicaoAluno = async (e) => {
    e.preventDefault()

    if (!alunoEmEdicao) {
      return
    }

    const payload = validarAluno()
    if (!payload) {
      return
    }

    try {
      await apiRequest(`/api/students/${alunoEmEdicao.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      await carregarAlunos()
      showSuccess('Aluno atualizado com sucesso.')
      fecharEditor()
    } catch (error) {
      showError(error.message || 'Erro ao atualizar aluno.')
    }
  }

  const excluirAluno = async (aluno) => {
    setMenuAberto(null)
    const confirmou = window.confirm(`Deseja excluir o aluno "${aluno.name}"?`)
    if (!confirmou) {
      return
    }

    try {
      await apiRequest(`/api/students/${aluno.id}`, { method: 'DELETE' })
      await carregarAlunos()
      showSuccess('Aluno excluido com sucesso.')
      if (alunoEmEdicao?.id === aluno.id) {
        fecharEditor()
      }
    } catch (error) {
      showError(error.message || 'Erro ao excluir aluno.')
    }
  }

  const opcoesUnidade = [...new Set(alunos.map((aluno) => aluno.unit || aluno.unidade).filter(Boolean))]
  const opcoesMotorista = [...new Set(alunos.map((aluno) => aluno.responsible_name || aluno.responsavel).filter(Boolean))]
  const opcoesVeiculo = [...new Set(alunos.map((aluno) => aluno.transport_identification || aluno.transporte).filter(Boolean))]

  const secoesFiltro = [
    { id: 'unidade', label: 'Unidade', options: opcoesUnidade.map((value) => ({ value, label: value })) },
    { id: 'responsavel', label: 'Motorista', options: opcoesMotorista.map((value) => ({ value, label: value })) },
    { id: 'transporte', label: 'Veiculo', options: opcoesVeiculo.map((value) => ({ value, label: value })) },
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
    const vazio = { unidade: [], responsavel: [], transporte: [] }
    setFiltrosRascunho(vazio)
    setFiltrosAplicados(vazio)
  }

  const abrirFiltros = () => {
    setFiltrosRascunho(filtrosAplicados)
    setFiltroAberto((atual) => !atual)
  }

  const alunosFiltrados = alunos.filter((aluno) => {
    const nome = aluno.name || aluno.nome || ''
    const rm = aluno.rm || ''
    const responsavel = aluno.responsible_name || aluno.responsavel || ''
    const unidade = aluno.unit || aluno.unidade || ''
    const transporte = aluno.transport_identification || aluno.transporte || ''
    const contato = aluno.parent_contact || aluno.contato_responsavel || ''
    const endereco = aluno.address || aluno.endereco || ''

    const termo = busca.trim().toLowerCase()
    const passouBusca =
      !termo ||
      [nome, rm, responsavel, unidade, transporte, contato, endereco]
        .some((valor) => valor.toLowerCase().includes(termo))

    const passouUnidade = filtrosAplicados.unidade.length === 0 || filtrosAplicados.unidade.includes(unidade)
    const passouResponsavel = filtrosAplicados.responsavel.length === 0 || filtrosAplicados.responsavel.includes(responsavel)
    const passouTransporte = filtrosAplicados.transporte.length === 0 || filtrosAplicados.transporte.includes(transporte)

    return passouBusca && passouUnidade && passouResponsavel && passouTransporte
  })

  return (
    <main className={`${styles['admin-page']} ${styles['admin-page--alunos']}`}>
      <div className="ui-header">
        <div className={styles.logo}></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <img src={student3} alt="" className={styles['ui-header-extra-icon']} />
            <span>Alunos</span>
          </div>
        </div>
      </div>

      <ActionNotification notification={notification} onClose={clearNotification} />

      <div className={styles['adicionar']}>
        <button type="button" className={styles['adicionar-botao']} onClick={abrirAdicionar}>
          <CirclePlus id="icone-botao" />
          Cadastrar Aluno
        </button>
      </div>

      {formularioAberto && (
        <div className={styles['boadd-overlay']} onClick={fecharAdicionar}>
          <div className={styles['boadd-card']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['boadd-top']}>
              <div className={styles['boadd-avatar']}>
                <img src={student2} alt="" />
              </div>
            </div>

            <form className={styles['boadd-form']} onSubmit={enviarNovoAluno}>
              <input type="text" placeholder="Digite o nome do aluno" value={novoAluno.nome} onChange={atualizarCampo('nome')} required />
              <input type="text" placeholder="Insira o RM do aluno" value={novoAluno.rm} onChange={atualizarCampo('rm')} required />
              <input type="text" placeholder="Nome do responsavel" value={novoAluno.responsavel} onChange={atualizarCampo('responsavel')} required />
              <input type="text" placeholder="Contato do responsavel" value={novoAluno.contatoResponsavel} onChange={atualizarCampo('contatoResponsavel')} required />
              <input type="text" placeholder="Endereco do aluno" value={novoAluno.endereco} onChange={atualizarCampo('endereco')} required />

              <select value={novoAluno.transporte} onChange={atualizarCampo('transporte')} required>
                <option value="">Identificacao do transporte</option>
                <option value="Linha 01 - Van 3">Linha 01 - Van 3</option>
                <option value="Linha 02 - Onibus 2">Linha 02 - Onibus 2</option>
                <option value="Linha 03 - Van 1">Linha 03 - Van 1</option>
                <option value="Linha 04 - Onibus 5">Linha 04 - Onibus 5</option>
                <option value="Linha 05 - Van 2">Linha 05 - Van 2</option>
              </select>

              <div className={styles['boadd-unidade']}>
                <p>Unidade:</p>
                <label>
                  <input type="radio" name="unidade" value="Garcia" checked={novoAluno.unidade === 'Garcia'} onChange={atualizarCampo('unidade')} required />
                  Garcia
                </label>
                <label>
                  <input type="radio" name="unidade" value="Vila Mimosa" checked={novoAluno.unidade === 'Vila Mimosa'} onChange={atualizarCampo('unidade')} required />
                  Mimosa
                </label>
                <label>
                  <input type="radio" name="unidade" value="Swiss Park" checked={novoAluno.unidade === 'Swiss Park'} onChange={atualizarCampo('unidade')} required />
                  Swiss Park
                </label>
                <label>
                  <input type="radio" name="unidade" value="Vivendo e Aprendendo" checked={novoAluno.unidade === 'Vivendo e Aprendendo'} onChange={atualizarCampo('unidade')} required />
                  Vivendo e Aprendendo
                </label>
              </div>

              <button type="submit" className={styles['boadd-confirmar']}>
                Criar Cadastro
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
            <div className={styles['boadd-top']}>
              <div className={styles['boadd-avatar']}>
                <img src={student2} alt="" />
              </div>
            </div>

            <form className={styles['boadd-form']} onSubmit={salvarEdicaoAluno}>
              <input type="text" placeholder="Digite o nome do aluno" value={novoAluno.nome} onChange={atualizarCampo('nome')} required />
              <input type="text" placeholder="Insira o RM do aluno" value={novoAluno.rm} onChange={atualizarCampo('rm')} required />
              <input type="text" placeholder="Nome do responsavel" value={novoAluno.responsavel} onChange={atualizarCampo('responsavel')} required />
              <input type="text" placeholder="Contato do responsavel" value={novoAluno.contatoResponsavel} onChange={atualizarCampo('contatoResponsavel')} required />
              <input type="text" placeholder="Endereco do aluno" value={novoAluno.endereco} onChange={atualizarCampo('endereco')} required />

              <select value={novoAluno.transporte} onChange={atualizarCampo('transporte')} required>
                <option value="">Identificacao do transporte</option>
                <option value="Linha 01 - Van 3">Linha 01 - Van 3</option>
                <option value="Linha 02 - Onibus 2">Linha 02 - Onibus 2</option>
                <option value="Linha 03 - Van 1">Linha 03 - Van 1</option>
                <option value="Linha 04 - Onibus 5">Linha 04 - Onibus 5</option>
                <option value="Linha 05 - Van 2">Linha 05 - Van 2</option>
              </select>

              <div className={styles['boadd-unidade']}>
                <p>Unidade:</p>
                <label>
                  <input type="radio" name="unidade-edicao" value="Garcia" checked={novoAluno.unidade === 'Garcia'} onChange={atualizarCampo('unidade')} required />
                  Garcia
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Vila Mimosa" checked={novoAluno.unidade === 'Vila Mimosa'} onChange={atualizarCampo('unidade')} required />
                  Mimosa
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Swiss Park" checked={novoAluno.unidade === 'Swiss Park'} onChange={atualizarCampo('unidade')} required />
                  Swiss Park
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Vivendo e Aprendendo" checked={novoAluno.unidade === 'Vivendo e Aprendendo'} onChange={atualizarCampo('unidade')} required />
                  Vivendo e Aprendendo
                </label>
              </div>

              <button type="submit" className={styles['boadd-confirmar']}>Salvar Alteracoes</button>
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
                placeholder="Buscar aluno"
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

        <div className={styles['alunos-grid']}>
          {alunosFiltrados.map((aluno) => (
            <div key={aluno.id} className={styles['aluno-item']}>
              <div
                className={`${styles.aluno} ${styles[`aluno${aluno.id}`]} ${alunoAberto === aluno.id ? styles.aberto : ''}`}
                onClick={() => alternarAluno(aluno.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    alternarAluno(aluno.id)
                  }
                }}
              >
                {alunoAberto === aluno.id ? <ChevronDown className={styles['setinha']} /> : <ChevronRight className={styles['setinha']} />}
                <h1>{aluno.name || aluno.nome}</h1>
                <div className={styles['item-acoes']} ref={menuAberto === aluno.id ? menuRef : null}>
                  <button
                    type="button"
                    className={styles['item-acoes-trigger']}
                    aria-haspopup="menu"
                    aria-expanded={menuAberto === aluno.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuAberto((atual) => (atual === aluno.id ? null : aluno.id))
                    }}
                  >
                    &#8801;
                  </button>

                  {menuAberto === aluno.id && (
                    <div className={styles['item-acoes-popover']} role="menu">
                      <button type="button" onClick={() => abrirEditor(aluno)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => excluirAluno(aluno)}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {alunoAberto === aluno.id && (
                <div className={styles['aluno-detalhes']}>
                  <div className={styles['aluno-card-top']}>
                    <div className={styles['aluno-foto']} />
                    <div className={styles['aluno-info']}>
                      <p><strong>RM:</strong> {aluno.rm || 'Nao informado'}</p>
                      <p><strong>Unidade:</strong> {aluno.unit || aluno.unidade || 'Nao informada'}</p>
                      <p><strong>Transporte:</strong> {aluno.transport_identification || aluno.transporte || 'Nao informado'}</p>
                      <p><strong>Responsavel:</strong> {aluno.responsible_name || aluno.responsavel || 'Nao informado'}</p>
                    </div>
                  </div>
                  <div className={styles['aluno-info-extra']}>
                    <p><strong>Contato do responsavel:</strong> {aluno.parent_contact || aluno.contato_responsavel || 'Nao informado'}</p>
                    <p><strong>Endereco:</strong> {aluno.address || aluno.endereco}</p>
                  </div>
                  <div className={styles['aluno-mapa']}>
                    <div className={styles['mapa-placeholder']} />
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

export default GerenciarAlunos
