import { useEffect, useRef, useState } from 'react'
import styles from './css/GerenciarVeiculos.module.css'
import { ArrowLeft, ArrowDownNarrowWide, Bus, CirclePlus, Search, ChevronRight, ChevronDown } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import MotoristaSelect from './components/MotoristaSelect.jsx'
import { apiRequest } from '../api.js'
import { formatPlate, isPlateComplete, onlyDigits } from './formValidators.js'

const veiculoInicial = {
  placa: '',
  identificacao: '',
  motoristaResp: '',
  capacidadeTotal: '',
  unidade: 'Garcia',
}

function GerenciarVeiculos() {
  const [veiculoAberto, setVeiculoAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [editorAberto, setEditorAberto] = useState(false)
  const [novoVeiculo, setNovoVeiculo] = useState(veiculoInicial)
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState(null)
  const [veiculos, setVeiculos] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState(null)
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [filtrosAplicados, setFiltrosAplicados] = useState({ unidade: [], capacidade: [], status: [], motorista: [] })
  const [filtrosRascunho, setFiltrosRascunho] = useState({ unidade: [], capacidade: [], status: [], motorista: [] })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const menuRef = useRef(null)
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregarVeiculos = async () => {
    try {
      const data = await apiRequest('/api/vehicles')
      setVeiculos(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar veiculos.')
    }
  }

  const carregarMotoristas = async () => {
    try {
      const data = await apiRequest('/api/drivers')
      setMotoristas(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar motoristas.')
    }
  }

  useEffect(() => {
    carregarVeiculos()
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

  const alternarVeiculo = (id) => {
    setVeiculoAberto((atual) => (atual === id ? null : id))
  }

  const abrirAdicionar = () => {
    setFormularioAberto(true)
  }

  const fecharAdicionar = () => {
    setFormularioAberto(false)
    setNovoVeiculo(veiculoInicial)
  }

  const abrirEditor = (veiculo) => {
    setMenuAberto(null)
    setVeiculoEmEdicao(veiculo)
    setNovoVeiculo({
      placa: formatPlate(veiculo.license_plate || ''),
      identificacao: onlyDigits(veiculo.identification || veiculo.model || '', 12),
      motoristaResp: veiculo.driver_name || '',
      capacidadeTotal: onlyDigits(veiculo.capacity || '', 3),
      unidade: veiculo.unit || 'Garcia',
    })
    setEditorAberto(true)
  }

  const fecharEditor = () => {
    setEditorAberto(false)
    setVeiculoEmEdicao(null)
    setNovoVeiculo(veiculoInicial)
  }

  const atualizarCampo = (campo) => (e) => {
    const formatters = {
      placa: formatPlate,
      identificacao: (value) => onlyDigits(value, 12),
      capacidadeTotal: (value) => onlyDigits(value, 3),
    }
    const value = formatters[campo] ? formatters[campo](e.target.value) : e.target.value
    setNovoVeiculo((atual) => ({ ...atual, [campo]: value }))
  }

  const enviarNovoVeiculo = async (e) => {
    e.preventDefault()

    if (novoVeiculo.placa.trim() && !isPlateComplete(novoVeiculo.placa)) {
      showError('Informe uma placa com 7 caracteres, contendo letras e numeros.')
      return
    }

    if (!Number(novoVeiculo.capacidadeTotal)) {
      showError('Informe a capacidade total do veiculo.')
      return
    }

    if (!novoVeiculo.identificacao.trim()) {
      showError('Informe a identificação do veículo para criar o cadastro.')
      return
    }

    setFormSubmitting(true)
    try {
      await apiRequest('/api/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          license_plate: novoVeiculo.placa.trim(),
          model: novoVeiculo.identificacao.trim(),
          identification: novoVeiculo.identificacao.trim(),
          driver_name: novoVeiculo.motoristaResp.trim(),
          capacity: Number(novoVeiculo.capacidadeTotal),
          unit: novoVeiculo.unidade,
        }),
      })

      await carregarVeiculos()
      showSuccess('Veículo cadastrado com sucesso.')
      fecharAdicionar()
    } catch (error) {
      showError(error.message || 'Erro ao cadastrar veículo.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const salvarEdicaoVeiculo = async (e) => {
    e.preventDefault()

    if (!veiculoEmEdicao) {
      return
    }

    if (novoVeiculo.placa.trim() && !isPlateComplete(novoVeiculo.placa)) {
      showError('Informe uma placa com 7 caracteres, contendo letras e numeros.')
      return
    }

    if (!Number(novoVeiculo.capacidadeTotal)) {
      showError('Informe a capacidade total do veiculo.')
      return
    }

    if (!novoVeiculo.identificacao.trim()) {
      showError('A identificação do veículo é obrigatória.')
      return
    }

    setFormSubmitting(true)
    try {
      await apiRequest(`/api/vehicles/${veiculoEmEdicao.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          license_plate: novoVeiculo.placa.trim(),
          model: novoVeiculo.identificacao.trim(),
          identification: novoVeiculo.identificacao.trim(),
          driver_name: novoVeiculo.motoristaResp.trim(),
          capacity: Number(novoVeiculo.capacidadeTotal),
          unit: novoVeiculo.unidade,
        }),
      })

      await carregarVeiculos()
      showSuccess('Veículo atualizado com sucesso.')
      fecharEditor()
    } catch (error) {
      showError(error.message || 'Erro ao atualizar veículo.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const excluirVeiculo = async (veiculo) => {
    setMenuAberto(null)
    const confirmou = window.confirm(`Deseja excluir o veículo "${veiculo.identification || veiculo.model || veiculo.license_plate}"?`)
    if (!confirmou) {
      return
    }

    try {
      await apiRequest(`/api/vehicles/${veiculo.id}`, { method: 'DELETE' })
      await carregarVeiculos()
      showSuccess('Veículo excluído com sucesso.')
      if (veiculoEmEdicao?.id === veiculo.id) {
        fecharEditor()
      }
    } catch (error) {
      showError(error.message || 'Erro ao excluir veículo.')
    }
  }

  const opcoesUnidade = [...new Set(veiculos.map((veiculo) => veiculo.unit).filter(Boolean))]
  const opcoesCapacidade = [...new Set(veiculos.map((veiculo) => String(veiculo.capacity || '')).filter(Boolean))]
  const opcoesStatus = [...new Set(veiculos.map((veiculo) => veiculo.status).filter(Boolean))]
  const opcoesMotorista = [...new Set(veiculos.map((veiculo) => veiculo.driver_name).filter(Boolean))]

  const secoesFiltro = [
    { id: 'unidade', label: 'Unidade', options: opcoesUnidade.map((value) => ({ value, label: value })) },
    { id: 'capacidade', label: 'Capacidade Maxima', options: opcoesCapacidade.map((value) => ({ value, label: value })) },
    { id: 'status', label: 'Status', options: opcoesStatus.map((value) => ({ value, label: value })) },
    { id: 'motorista', label: 'Motorista', options: opcoesMotorista.map((value) => ({ value, label: value })) },
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
    const vazio = { unidade: [], capacidade: [], status: [], motorista: [] }
    setFiltrosRascunho(vazio)
    setFiltrosAplicados(vazio)
  }

  const abrirFiltros = () => {
    setFiltrosRascunho(filtrosAplicados)
    setFiltroAberto((atual) => !atual)
  }

  const veiculosFiltrados = veiculos.filter((veiculo) => {
    const placa = veiculo.license_plate || ''
    const modelo = veiculo.model || ''
    const identificacao = veiculo.identification || ''
    const motorista = veiculo.driver_name || ''
    const unidade = veiculo.unit || ''
    const capacidade = String(veiculo.capacity || '')
    const status = veiculo.status || ''
    const termo = busca.trim().toLowerCase()

    const passouBusca =
      !termo ||
      [placa, modelo, identificacao, motorista, unidade, status].some((valor) => valor.toLowerCase().includes(termo))

    const passouUnidade = filtrosAplicados.unidade.length === 0 || filtrosAplicados.unidade.includes(unidade)
    const passouCapacidade = filtrosAplicados.capacidade.length === 0 || filtrosAplicados.capacidade.includes(capacidade)
    const passouStatus = filtrosAplicados.status.length === 0 || filtrosAplicados.status.includes(status)
    const passouMotorista = filtrosAplicados.motorista.length === 0 || filtrosAplicados.motorista.includes(motorista)

    return passouBusca && passouUnidade && passouCapacidade && passouStatus && passouMotorista
  })

  return (
    <main className={`${styles['admin-page']} ${styles['admin-page--veiculos']}`}>
      <div className="ui-header">
        <div className={styles['logo']}></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <Bus />
            <span>Veiculos</span>
          </div>
        </div>
      </div>

      <ActionNotification notification={notification} onClose={clearNotification} />

      <div className={styles['adicionar']}>
        <button type="button" className={styles['adicionar-botao']} onClick={abrirAdicionar}>
          <CirclePlus id="icone-botao" />
          Cadastrar Veiculo
        </button>
      </div>

      {formularioAberto && (
        <div className={styles['boadd-overlay']} onClick={fecharAdicionar}>
          <div className={styles['boadd-card']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['boadd-top']}></div>

            <form className={styles['boadd-form']} onSubmit={enviarNovoVeiculo}>
              <p className={styles['boadd-label']}>Placa</p>
              <input type="text" placeholder="Digite a placa do veiculo" value={novoVeiculo.placa} onChange={atualizarCampo('placa')} maxLength={8} />

              <p className={styles['boadd-label']}>Identificacao</p>
              <input type="text" placeholder="Numero de identificacao do veiculo" value={novoVeiculo.identificacao} onChange={atualizarCampo('identificacao')} inputMode="numeric" maxLength={12} required />

              <p className={styles['boadd-label']}>Motorista</p>
              <MotoristaSelect
                motoristas={motoristas}
                valor={novoVeiculo.motoristaResp}
                onChange={atualizarCampo('motoristaResp')}
                placeholder="Selecione um motorista"
              />

              <p className={styles['boadd-label']}>Capacidade</p>
              <input type="text" placeholder="Capacidade total" value={novoVeiculo.capacidadeTotal} onChange={atualizarCampo('capacidadeTotal')} inputMode="numeric" maxLength={3} />

              <p className={styles['boadd-label']}>Unidade de atução</p>
              <div className={styles['boadd-unidade']}>
                <p className={styles['boadd-unidade-titulo']}>Unidade:</p>
                <label>
                  <input type="radio" name="unidade" value="Garcia" checked={novoVeiculo.unidade === 'Garcia'} onChange={atualizarCampo('unidade')} />
                  Garcia
                </label>
                <label>
                  <input type="radio" name="unidade" value="Vila Mimosa" checked={novoVeiculo.unidade === 'Vila Mimosa'} onChange={atualizarCampo('unidade')} />
                  Vila Mimosa
                </label>
                <label>
                  <input type="radio" name="unidade" value="Swiss Park" checked={novoVeiculo.unidade === 'Swiss Park'} onChange={atualizarCampo('unidade')} />
                  Swiss Park
                </label>
                <label>
                  <input type="radio" name="unidade" value="Vivendo e Aprendendo" checked={novoVeiculo.unidade === 'Vivendo e Aprendendo'} onChange={atualizarCampo('unidade')} />
                  Vivendo e Aprendendo
                </label>
              </div>

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

            <form className={styles['boadd-form']} onSubmit={salvarEdicaoVeiculo}>
              <p className={styles['boadd-label']}>Placa</p>
              <input type="text" placeholder="Digite a placa do veiculo" value={novoVeiculo.placa} onChange={atualizarCampo('placa')} maxLength={8} />

              <p className={styles['boadd-label']}>Identificacao</p>
              <input type="text" placeholder="Numero de identificacao do veiculo" value={novoVeiculo.identificacao} onChange={atualizarCampo('identificacao')} inputMode="numeric" maxLength={12} required />

              <p className={styles['boadd-label']}>Motorista</p>
              <MotoristaSelect
                motoristas={motoristas}
                valor={novoVeiculo.motoristaResp}
                onChange={atualizarCampo('motoristaResp')}
                placeholder="Selecione um motorista"
              />

              <p className={styles['boadd-label']}>Capacidade</p>
              <input type="text" placeholder="Capacidade total" value={novoVeiculo.capacidadeTotal} onChange={atualizarCampo('capacidadeTotal')} inputMode="numeric" maxLength={3} />

              <p className={styles['boadd-label']}>Unidade de atuacao</p>
              <div className={styles['boadd-unidade']}>
                <p className={styles['boadd-unidade-titulo']}>Unidade:</p>
                <label>
                  <input type="radio" name="unidade-edicao" value="Garcia" checked={novoVeiculo.unidade === 'Garcia'} onChange={atualizarCampo('unidade')} />
                  Garcia
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Vila Mimosa" checked={novoVeiculo.unidade === 'Vila Mimosa'} onChange={atualizarCampo('unidade')} />
                  Vila Mimosa
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Swiss Park" checked={novoVeiculo.unidade === 'Swiss Park'} onChange={atualizarCampo('unidade')} />
                  Swiss Park
                </label>
                <label>
                  <input type="radio" name="unidade-edicao" value="Vivendo e Aprendendo" checked={novoVeiculo.unidade === 'Vivendo e Aprendendo'} onChange={atualizarCampo('unidade')} />
                  Vivendo e Aprendendo
                </label>
              </div>

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
                placeholder="Buscar veiculo"
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
          {veiculosFiltrados.map((veiculo) => (
            <div key={veiculo.id} className={styles['aluno-item']}>
              <div
                className={`${styles.aluno} ${styles[`aluno${veiculo.id}`]} ${veiculoAberto === veiculo.id ? styles.aberto : ''}`}
                onClick={() => alternarVeiculo(veiculo.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    alternarVeiculo(veiculo.id)
                  }
                }}
              >
                {veiculoAberto === veiculo.id ? <ChevronDown className={styles['setinha']} /> : <ChevronRight className={styles['setinha']} />}
                <h1>{veiculo.identification || veiculo.model || veiculo.license_plate}</h1>
                <div className={styles['item-acoes']} ref={menuAberto === veiculo.id ? menuRef : null}>
                  <button
                    type="button"
                    className={styles['item-acoes-trigger']}
                    aria-haspopup="menu"
                    aria-expanded={menuAberto === veiculo.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuAberto((atual) => (atual === veiculo.id ? null : veiculo.id))
                    }}
                  >
                    &#8801;
                  </button>

                  {menuAberto === veiculo.id && (
                    <div className={styles['item-acoes-popover']} role="menu">
                      <button type="button" onClick={() => abrirEditor(veiculo)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => excluirVeiculo(veiculo)}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {veiculoAberto === veiculo.id && (
                <div className={styles['aluno-detalhes']}>
                  <div className={styles['aluno-info']}>
                    <p><strong>Placa:</strong> {veiculo.license_plate}</p>
                    <p><strong>Identificacao do Veiculo:</strong> {veiculo.identification || veiculo.model}</p>
                    <p><strong>Capacidade Total:</strong> {veiculo.capacity}</p>
                    <p><strong>Motorista:</strong> {veiculo.driver_name || 'Nao informado'}</p>
                    <p><strong>Status:</strong> {veiculo.status || 'Nao informado'}</p>
                    <p><strong>Unidade:</strong> {veiculo.unit || 'Nao informada'}</p>
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

export default GerenciarVeiculos
