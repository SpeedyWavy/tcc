import { useEffect, useMemo, useState } from 'react'
import styles from './css/GerenciarRotas.module.css'
import {
  ArrowLeft,
  ArrowDownNarrowWide,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  EllipsisVertical,
  Map as MapIcon,
  Search,
  TriangleAlert,
  CircleCheckBig,
  Wand2,
} from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'
import { apiRequest } from '../api.js'
import { supabase } from '../supabase.js'

function normalizarVeiculo(veiculo) {
  return {
    id: veiculo.id,
    placa: veiculo.license_plate || '',
    identificacao: veiculo.identification || veiculo.model || veiculo.license_plate || 'Veiculo',
    motorista: veiculo.driver_name || 'Motorista nao informado',
    motoristaId: veiculo.driver_id || null,
    unidade: veiculo.unit || '',
  }
}

function normalizarAluno(aluno) {
  return {
    id: aluno.id,
    nome: aluno.nome || aluno.name || 'Aluno sem nome',
    routeId: aluno.route_id ?? null,
    rm: aluno.rm || '',
    unidade: aluno.unit || aluno.unidade || '',
  }
}

function normalizarRota(rota) {
  return {
    id: rota.id,
    vehicleId: rota.vehicle_id,
    driverId: rota.driver_id,
    horario: rota.horario || 'Sem horario',
    status: rota.status || 'Aguardando Saida',
    createdAt: rota.created_at || rota.updated_at || null,
    alunos: Array.isArray(rota.students) ? rota.students : [],
  }
}

function obterStatusVeiculo(rotasDoVeiculo) {
  if (!rotasDoVeiculo.length) {
    return 'Aguardando Saida'
  }

  return rotasDoVeiculo[rotasDoVeiculo.length - 1].status || 'Aguardando Saida'
}

function formatarData(valor) {
  if (!valor) {
    return 'Sem data'
  }

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    return 'Sem data'
  }

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function obterClasseStatus(status) {
  return `rotas-status--${(status || 'Aguardando Saida').toLowerCase().replace(/\s+/g, '-')}`
}

function renderizarStatus(status, styles, textoOverride = null) {
  const classeStatus = textoOverride && textoOverride.toLowerCase().startsWith('horario')
    ? 'rotas-status--horario'
    : obterClasseStatus(status)
  const statusTexto = textoOverride || status || 'Aguardando Saida'

  return (
    <span className={`${styles['rotas-status']} ${styles[classeStatus] || ''}`}>
      {statusTexto === 'Atrasado' ? <TriangleAlert className={styles['rotas-status-icone']} /> : null}
      {statusTexto === 'Concluido' ? <CircleCheckBig className={styles['rotas-status-icone']} /> : null}
      <span>{statusTexto}</span>
    </span>
  )
}

function GerenciarRotas() {
  const [veiculos, setVeiculos] = useState([])
  const [rotas, setRotas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [busca, setBusca] = useState('')
  const [veiculoAberto, setVeiculoAberto] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [criandoPorVeiculoId, setCriandoPorVeiculoId] = useState(null)
  const [associandoAlunoId, setAssociandoAlunoId] = useState(null)
  const [alunoSelecionadoPorRota, setAlunoSelecionadoPorRota] = useState({})
  const [erroAssociacaoPorRota, setErroAssociacaoPorRota] = useState({})
  const [menuRotaAberto, setMenuRotaAberto] = useState(null)
  const [rotaEditandoId, setRotaEditandoId] = useState(null)
  const [alunosEdicaoPorRota, setAlunosEdicaoPorRota] = useState({})
  const [salvandoEdicaoRotaId, setSalvandoEdicaoRotaId] = useState(null)
  const [excluindoRotaId, setExcluindoRotaId] = useState(null)
  const [gerandoRotas, setGerandoRotas] = useState(false)
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregarDados = async () => {
    setCarregando(true)

    try {
      const [veiculosData, rotasData, alunosData] = await Promise.all([
        apiRequest('/api/vehicles'),
        apiRequest('/api/routes'),
        apiRequest('/api/students'),
      ])

      setVeiculos(Array.isArray(veiculosData) ? veiculosData.map(normalizarVeiculo) : [])
      setRotas(Array.isArray(rotasData) ? rotasData.map(normalizarRota) : [])
      setAlunos(Array.isArray(alunosData) ? alunosData.map(normalizarAluno) : [])
    } catch (error) {
      showError(error.message || 'Erro ao carregar rotas.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const rotasPorVeiculo = useMemo(() => {
    const mapa = new Map()

    for (const rota of [...rotas].sort((a, b) => {
      const dataA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dataB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dataA - dataB
    })) {
      const lista = mapa.get(rota.vehicleId) || []
      lista.push(rota)
      mapa.set(rota.vehicleId, lista)
    }

    return mapa
  }, [rotas])

  const veiculosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return veiculos.filter((veiculo) => {
      const rotasDoVeiculo = rotasPorVeiculo.get(veiculo.id) || []
      const textoRotas = rotasDoVeiculo
        .flatMap((rota) => [
          rota.horario,
          ...rota.alunos.map((aluno) => aluno.nome || aluno.name || ''),
        ])
        .join(' ')
        .toLowerCase()

      const textoVeiculo = [
        veiculo.identificacao,
        veiculo.placa,
        veiculo.motorista,
        veiculo.unidade,
      ]
        .join(' ')
        .toLowerCase()

      return !termo || textoVeiculo.includes(termo) || textoRotas.includes(termo)
    })
  }, [busca, rotasPorVeiculo, veiculos])

  const alternarVeiculo = (id) => {
    setVeiculoAberto((atual) => (atual === id ? null : id))
  }

  const criarNovaRota = async (veiculo) => {
    setCriandoPorVeiculoId(veiculo.id)

    try {
      await apiRequest('/api/routes', {
        method: 'POST',
        body: JSON.stringify({
          vehicle_id: veiculo.id,
          driver_id: veiculo.motoristaId,
          stops: [],
        }),
      })

      await carregarDados()
      setVeiculoAberto(veiculo.id)
      showSuccess('Nova rota criada com sucesso.')
    } catch (error) {
      showError(error.message || 'Nao foi possivel criar a rota.')
    } finally {
      setCriandoPorVeiculoId(null)
    }
  }

  const associarAlunoARota = async (rota, alunoId) => {
    if (!alunoId) {
      showError('Selecione um aluno para vincular à rota.')
      return
    }

    const aluno = alunos.find((item) => item.id === alunoId)
    if (!aluno) {
      showError('Aluno não encontrado.')
      return
    }

    if (aluno.routeId && aluno.routeId !== rota.id) {
      showError('Este aluno já está vinculado a outra rota.')
      return
    }

    setAssociandoAlunoId(rota.id)

    try {
      await apiRequest(`/api/students/${aluno.id}`, {
        method: 'PUT',
        body: JSON.stringify({ route_id: rota.id }),
      })

      await carregarDados()
      setAlunoSelecionadoPorRota((atual) => ({ ...atual, [rota.id]: '' }))
      setErroAssociacaoPorRota((atual) => ({ ...atual, [rota.id]: '' }))
      showSuccess('Aluno vinculado à rota com sucesso.')
    } catch (error) {
      showError(error.message || 'Não foi possível vincular o aluno.')
    } finally {
      setAssociandoAlunoId(null)
    }
  }

  const alternarMenuRota = (rotaId) => {
    setMenuRotaAberto((atual) => (atual === rotaId ? null : rotaId))
  }

  const iniciarEdicaoRota = (rota) => {
    setMenuRotaAberto(null)
    setRotaEditandoId(rota.id)
    setAlunosEdicaoPorRota((atual) => ({
      ...atual,
      [rota.id]: (rota.alunos || []).map((aluno) => ({
        ...aluno,
        nome: aluno.nome || aluno.name || 'Aluno sem nome',
      })),
    }))
  }

  const moverAlunoNaRota = (rotaId, index, direcao) => {
    setAlunosEdicaoPorRota((atual) => {
      const lista = [...(atual[rotaId] || [])]
      const alvo = index + direcao
      if (alvo < 0 || alvo >= lista.length) {
        return atual
      }

      const [item] = lista.splice(index, 1)
      lista.splice(alvo, 0, item)
      return { ...atual, [rotaId]: lista }
    })
  }

  const removerAlunoDaRota = (rotaId, alunoId) => {
    setAlunosEdicaoPorRota((atual) => ({
      ...atual,
      [rotaId]: (atual[rotaId] || []).filter((aluno) => aluno.id !== alunoId),
    }))
  }

  const salvarEdicaoRota = async (rota) => {
    const alunosParaSalvar = alunosEdicaoPorRota[rota.id] || []

    setSalvandoEdicaoRotaId(rota.id)

    try {
      await apiRequest(`/api/routes/${rota.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: rota.status,
          stops: alunosParaSalvar.map((aluno, index) => ({
            student_id: aluno.id,
            student_name: aluno.nome || aluno.name || 'Aluno sem nome',
            address: aluno.address || '',
            order: index + 1,
          })),
        }),
      })

      await carregarDados()
      setRotaEditandoId(null)
      setMenuRotaAberto(null)
      showSuccess('Rota atualizada com sucesso.')
    } catch (error) {
      showError(error.message || 'Não foi possível editar a rota.')
    } finally {
      setSalvandoEdicaoRotaId(null)
    }
  }

  const excluirRota = async (rota) => {
    setExcluindoRotaId(rota.id)

    try {
      await apiRequest(`/api/routes/${rota.id}`, {
        method: 'DELETE',
      })

      await carregarDados()
      setMenuRotaAberto(null)
      showSuccess('Rota excluída com sucesso.')
    } catch (error) {
      showError(error.message || 'Não foi possível excluir a rota.')
    } finally {
      setExcluindoRotaId(null)
    }
  }

  const filtrarPlaceholder = 'Filtrar por...'

  const gerarRotasAutomaticamente = async () => {
    setGerandoRotas(true)

    try {
      const { data, error } = await supabase.functions.invoke('generate-routes', { method: 'POST' })
      if (error) {
        throw error
      }

      await carregarDados()

      const partes = [
        `${data.rotasCriadas} rota(s) criada(s)`,
        `${data.alunosAlocados} aluno(s) alocado(s)`,
      ]
      if (data.alunosSemVeiculo?.length) {
        partes.push(`${data.alunosSemVeiculo.length} sem veiculo disponivel`)
      }
      if (data.alunosPersonalizados?.length) {
        partes.push(`${data.alunosPersonalizados.length} com percurso personalizado (atribuicao manual)`)
      }
      if (data.alunosSemCoordenada?.length) {
        partes.push(`${data.alunosSemCoordenada.length} sem coordenadas cadastradas`)
      }

      showSuccess(partes.join(' - '))
    } catch (error) {
      showError(error.message || 'Nao foi possivel gerar as rotas automaticamente.')
    } finally {
      setGerandoRotas(false)
    }
  }

  return (
    <div className={`${styles['admin-page']} ${styles['admin-page--rotas']}`}>
      <div className="ui-header">
        <div className={styles.logo} />
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/app" aria-label="Voltar para o painel">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <MapIcon />
            <span>Rotas</span>
          </div>
        </div>
      </div>

      <ActionNotification notification={notification} onClose={clearNotification} />

      <main className={styles['rotas-pagina']}>
        <section className={`${styles['cadastros']} ${styles['rotas-cadastros']}`}>
          <div className={styles['rotas-acoes-topo']}>
            <button
              type="button"
              className={styles['rotas-gerar-automatico']}
              onClick={gerarRotasAutomaticamente}
              disabled={gerandoRotas}
            >
              <Wand2 />
              <span>{gerandoRotas ? 'Gerando rotas...' : 'Gerar rotas automaticamente'}</span>
            </button>
          </div>

          <div className={styles['filtro-linha']}>
            <div className={`${styles['filtro']} ${styles['rotas-filtro']}`}>
              <div className={styles['filtro-input-wrap']}>
                <Search className={styles['filtro-icon']} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className={styles['filtro-input']}
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>

              <button type="button" className={styles['filtro-botao']} aria-label={filtrarPlaceholder}>
                <ArrowDownNarrowWide className={styles['filtro-botao-icone']} />
                <span>{filtrarPlaceholder}</span>
              </button>
            </div>
          </div>
        </section>

        {carregando ? <p className={styles['estado']}>Carregando rotas...</p> : null}

        {!carregando ? (
          <section className={styles['rotas-tabela']}>
            <div className={styles['rotas-cabecalho']}>
              <div className={styles['rotas-coluna']}>Veiculo</div>
              <div className={`${styles['rotas-coluna']} ${styles['rotas-coluna--status']}`}>Status</div>
            </div>

            {veiculosFiltrados.length === 0 ? (
              <p className={styles['estado']}>Nenhum veiculo encontrado.</p>
            ) : (
              veiculosFiltrados.map((veiculo) => {
                const aberto = veiculoAberto === veiculo.id
                const rotasDoVeiculo = rotasPorVeiculo.get(veiculo.id) || []
                const statusVeiculo = obterStatusVeiculo(rotasDoVeiculo)

                return (
                  <article key={veiculo.id} className={styles['rotas-bloco']}>
                    <button type="button" className={styles['veiculo-linha']} onClick={() => alternarVeiculo(veiculo.id)}>
                      <div className={styles['rotas-celula--veiculo']}>
                        {aberto ? (
                          <ChevronDown className={styles['rotas-seta']} />
                        ) : (
                          <ChevronRight className={styles['rotas-seta']} />
                        )}
                        <div className={styles['rotas-veiculo-texto']}>
                          <span className={styles['rotas-nome-veiculo']}>{veiculo.identificacao}</span>
                          <span className={styles['rotas-subtexto']}>
                            {veiculo.placa || 'Sem placa'} - {veiculo.motorista}
                          </span>
                        </div>
                      </div>

                      <div className={styles['rotas-celula--status']}>
                        {renderizarStatus(statusVeiculo, styles)}
                      </div>
                    </button>

                    {aberto ? (
                      <div className={styles['rotas-conteudo']}>
                        {rotasDoVeiculo.length === 0 ? (
                          <p className={styles['vazio']}>Nenhuma rota anterior para este veiculo.</p>
                        ) : (
                          rotasDoVeiculo.map((rota, indice) => (
                            <article key={rota.id} className={styles['rota-card']}>
                              <div className={styles['rota-linha']}>
                                <div className={styles['rotas-celula--veiculo']}>
                                  <ChevronRight className={styles['rotas-seta']} />
                                  <span className={styles['rotas-nome-veiculo']}>{`Rota ${indice + 1}`}</span>
                                  <div className={styles['rota-menu-wrap']}>
                                    <button
                                      type="button"
                                      className={styles['rota-menu']}
                                      aria-label={`Opcoes de Rota ${indice + 1}`}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        alternarMenuRota(rota.id)
                                      }}
                                    >
                                      <EllipsisVertical />
                                    </button>

                                    {menuRotaAberto === rota.id ? (
                                      <div className={styles['rota-menu-dropdown']}>
                                        <button
                                          type="button"
                                          className={styles['rota-menu-item']}
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            iniciarEdicaoRota(rota)
                                          }}
                                        >
                                          Editar rota
                                        </button>
                                        <button
                                          type="button"
                                          className={styles['rota-menu-item']}
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            excluirRota(rota)
                                          }}
                                          disabled={excluindoRotaId === rota.id}
                                        >
                                          {excluindoRotaId === rota.id ? 'Excluindo...' : 'Excluir rota'}
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <div className={styles['rotas-celula--status']}>
                                  {renderizarStatus(rota.status, styles, `Horario ${indice + 1}`)}
                                </div>
                              </div>

                              {rotaEditandoId === rota.id ? (
                                <div className={styles['rota-edicao']}>
                                  <div className={styles['rota-edicao-lista']}>
                                    {(alunosEdicaoPorRota[rota.id] || []).length === 0 ? (
                                      <p className={styles['vazio']}>Nenhum aluno vinculado nesta rota.</p>
                                    ) : (
                                      (alunosEdicaoPorRota[rota.id] || []).map((aluno, index) => (
                                        <div key={aluno.id || `${aluno.nome}-${index}`} className={styles['rota-edicao-item']}>
                                          <span>{aluno.nome || aluno.name || 'Aluno sem nome'}</span>
                                          <div className={styles['rota-edicao-acoes-item']}>
                                            <button
                                              type="button"
                                              className={styles['rota-edicao-botao']}
                                              onClick={() => moverAlunoNaRota(rota.id, index, -1)}
                                              disabled={index === 0}
                                            >
                                              ↑
                                            </button>
                                            <button
                                              type="button"
                                              className={styles['rota-edicao-botao']}
                                              onClick={() => moverAlunoNaRota(rota.id, index, 1)}
                                              disabled={index === (alunosEdicaoPorRota[rota.id] || []).length - 1}
                                            >
                                              ↓
                                            </button>
                                            <button
                                              type="button"
                                              className={styles['rota-edicao-botao']}
                                              onClick={() => removerAlunoDaRota(rota.id, aluno.id)}
                                            >
                                              Remover
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  <div className={styles['rota-edicao-acoes']}>
                                    <button
                                      type="button"
                                      className={styles['rota-edicao-cancelar']}
                                      onClick={() => setRotaEditandoId(null)}
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      className={styles['rota-edicao-salvar']}
                                      onClick={() => salvarEdicaoRota(rota)}
                                      disabled={salvandoEdicaoRotaId === rota.id}
                                    >
                                      {salvandoEdicaoRotaId === rota.id ? 'Salvando...' : 'Salvar alterações'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className={styles['rotas-alunos']}>
                                    {rota.alunos.length === 0 ? (
                                      <p className={styles['vazio']}>Sem alunos vinculados.</p>
                                    ) : (
                                      rota.alunos.map((aluno) => (
                                        <p key={aluno.id || aluno.nome || aluno.name}>
                                          {aluno.nome || aluno.name || 'Aluno sem nome'}
                                        </p>
                                      ))
                                    )}
                                  </div>

                                  <div className={styles['rota-associacao']}>
                                <label className={styles['rota-associacao-label']} htmlFor={`aluno-rota-${rota.id}`}>
                                  Vincular aluno à rota
                                </label>
                                <div className={styles['rota-associacao-controles']}>
                                  <select
                                    id={`aluno-rota-${rota.id}`}
                                    className={styles['rota-associacao-select']}
                                    value={alunoSelecionadoPorRota[rota.id] || ''}
                                    onChange={(event) => {
                                      setAlunoSelecionadoPorRota((atual) => ({ ...atual, [rota.id]: event.target.value }))
                                      setErroAssociacaoPorRota((atual) => ({ ...atual, [rota.id]: '' }))
                                    }}
                                    disabled={associandoAlunoId === rota.id}
                                  >
                                    <option value="">Selecione um aluno</option>
                                    {alunos
                                      .filter((aluno) => !aluno.routeId || aluno.routeId === rota.id)
                                      .map((aluno) => (
                                        <option key={aluno.id} value={aluno.id}>
                                          {aluno.nome} {aluno.rm ? `- ${aluno.rm}` : ''}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    type="button"
                                    className={styles['rota-associacao-botao']}
                                    onClick={() => associarAlunoARota(rota, alunoSelecionadoPorRota[rota.id])}
                                    disabled={associandoAlunoId === rota.id || !alunoSelecionadoPorRota[rota.id]}
                                  >
                                    {associandoAlunoId === rota.id ? 'Vinculando...' : 'Vincular'}
                                  </button>
                                </div>
                                    {erroAssociacaoPorRota[rota.id] ? (
                                      <p className={styles['rota-associacao-erro']}>{erroAssociacaoPorRota[rota.id]}</p>
                                    ) : null}
                                  </div>
                                </>
                              )}
                            </article>
                          ))
                        )}

                        <button
                          type="button"
                          className={styles['nova-rota']}
                          onClick={() => criarNovaRota(veiculo)}
                          disabled={criandoPorVeiculoId === veiculo.id}
                        >
                          <CirclePlus />
                          <span>{criandoPorVeiculoId === veiculo.id ? 'Criando...' : 'Nova Rota'}</span>
                        </button>
                      </div>
                    ) : null}
                  </article>
                )
              })
            )}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default GerenciarRotas

// 