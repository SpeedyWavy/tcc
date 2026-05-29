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
} from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import ActionNotification, { useActionNotification } from './components/ActionNotification.jsx'
import { apiRequest } from '../api.js'

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
  const [busca, setBusca] = useState('')
  const [veiculoAberto, setVeiculoAberto] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [criandoPorVeiculoId, setCriandoPorVeiculoId] = useState(null)
  const { notification, showError, showSuccess, clearNotification } = useActionNotification()

  const carregarDados = async () => {
    setCarregando(true)

    try {
      const [veiculosData, rotasData] = await Promise.all([
        apiRequest('/api/vehicles'),
        apiRequest('/api/routes'),
      ])

      setVeiculos(Array.isArray(veiculosData) ? veiculosData.map(normalizarVeiculo) : [])
      setRotas(Array.isArray(rotasData) ? rotasData.map(normalizarRota) : [])
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

  const filtrarPlaceholder = 'Filtrar por...'

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
                                  <button
                                    type="button"
                                    className={styles['rota-menu']}
                                    aria-label={`Opcoes de Rota ${indice + 1}`}
                                  >
                                    <EllipsisVertical />
                                  </button>
                                </div>

                                <div className={styles['rotas-celula--status']}>
                                  {renderizarStatus(rota.status, styles, `Horario ${indice + 1}`)}
                                </div>
                              </div>

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
