import { useEffect, useMemo, useState } from 'react'
import styles from '../admin/css/GerenciarRotas.module.css'
import motoristaStyles from './css/Rotas.module.css'
import { ArrowLeft, ChevronDown, ChevronRight, Map as MapIcon, MapPinned, Search, TriangleAlert, CircleCheckBig } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import RouteMap from './components/RouteMap.jsx'
import { apiRequest } from '../api.js'
import { ListSkeleton } from '../components/Skeleton.jsx'
import { ENDERECOS_UNIDADES } from '../lib/unidadesEnderecos.js'

function normalizarVeiculo(veiculo) {
  return {
    id: veiculo.id,
    placa: veiculo.license_plate || '',
    identificacao: veiculo.identification || veiculo.model || veiculo.license_plate || 'Veículo',
    motorista: veiculo.driver_name || 'Motorista não informado',
    unidade: veiculo.unit || '',
  }
}

function normalizarRota(rota, alunosPorId) {
  const alunosDaRota = Array.isArray(rota.students)
    ? rota.students
    : Array.isArray(rota.stops)
      ? rota.stops
      : []

  return {
    id: rota.id,
    vehicleId: rota.vehicle_id || rota.vehicleId,
    horario: rota.horario_label || rota.horario || '',
    horarioInicio: rota.horario_inicio || null,
    status: rota.status || 'Aguardando Saída',
    direction: rota.direction || null,
    createdAt: rota.created_at || rota.updated_at || null,
    alunos: alunosDaRota
      .map((aluno, indice) => {
        const idAluno = aluno.student_id || aluno.studentId || aluno.id
        const alunoCompleto = alunosPorId.get(String(idAluno))
        return {
          ...alunoCompleto,
          ...aluno,
          id: idAluno || alunoCompleto?.id || `${rota.id}-${indice}`,
          nome: aluno.nome || aluno.name || aluno.student_name || alunoCompleto?.nome || alunoCompleto?.name || '',
          address: aluno.address || aluno.endereco || alunoCompleto?.address || alunoCompleto?.endereco || '',
          latitude: aluno.latitude ?? alunoCompleto?.latitude ?? null,
          longitude: aluno.longitude ?? alunoCompleto?.longitude ?? null,
          order: aluno.order ?? indice + 1,
        }
      })
      .sort((a, b) => Number(a.order) - Number(b.order)),
  }
}

function classeStatus(status) {
  return `rotas-status--${(status || 'Aguardando Saída').toLowerCase().replace(/\s+/g, '-')}`
}

function Rotas() {
  const [veiculos, setVeiculos] = useState([])
  const [rotas, setRotas] = useState([])
  const [busca, setBusca] = useState('')
  const [veiculoAberto, setVeiculoAberto] = useState(null)
  const [rotaAberta, setRotaAberta] = useState(null)
  const [rotaMapaAberto, setRotaMapaAberto] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      apiRequest('/api/routes'),
      apiRequest('/api/vehicles'),
      apiRequest('/api/students'),
    ])
      .then(([rotasData, veiculosData, alunosData]) => {
        if (!ativo) return
        const rotasRecebidas = Array.isArray(rotasData) ? rotasData : []
        const alunosPorId = new Map((Array.isArray(alunosData) ? alunosData : []).map((aluno) => [String(aluno.id), aluno]))
        const veiculosRecebidos = Array.isArray(veiculosData) ? veiculosData : []
        const veiculosPorId = new Map()
        veiculosRecebidos.forEach((veiculo) => {
          veiculosPorId.set(String(veiculo.id), normalizarVeiculo(veiculo))
        })
        rotasRecebidas.forEach((rota) => {
          const id = rota.vehicle_id || rota.vehicleId
          if (id && !veiculosPorId.has(String(id))) {
            veiculosPorId.set(String(id), normalizarVeiculo({
              id,
              identification: rota.vehicle_name || rota.vehicle,
              license_plate: rota.license_plate,
              driver_name: rota.driver_name || rota.driver,
              unit: rota.unit || rota.vehicle_unit,
            }))
          }
        })
        setVeiculos([...veiculosPorId.values()])
        setRotas(rotasRecebidas.map((rota) => normalizarRota(rota, alunosPorId)))
      })
      .catch((error) => {
        if (ativo) setErro(error.message || 'Erro ao carregar rotas.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => { ativo = false }
  }, [])

  const rotasPorVeiculo = useMemo(() => {
    const mapa = new Map()
    for (const rota of [...rotas].sort((a, b) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0))) {
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
      const texto = [veiculo.identificacao, veiculo.placa, veiculo.motorista, veiculo.unidade,
        ...rotasDoVeiculo.flatMap((rota) => [rota.horario, rota.status, ...rota.alunos.map((aluno) => aluno.nome || aluno.name || '')])]
        .join(' ').toLowerCase()
      return !termo || texto.includes(termo)
    })
  }, [busca, rotasPorVeiculo, veiculos])

  return (
    <div className={`${styles['admin-page']} ${styles['admin-page--rotas']} ${motoristaStyles['motorista-rotas-page']}`}>
      <div className="ui-header">
        <div className={styles.logo} />
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/inicial" aria-label="Voltar para o painel do motorista"><ArrowLeft /></a>
          <div className="ui-header-extra-title"><MapPinned /><span>Rotas</span></div>
        </div>
      </div>

      <main className={styles['rotas-pagina']}>
        <section className={styles.cadastros}>
          <div className={styles['filtro-linha']}>
            <div className={styles.filtro}>
              <div className={styles['filtro-input-wrap']}>
                <Search className={styles['filtro-icon']} />
                <input className={styles['filtro-input']} type="text" placeholder="Buscar..." value={busca} onChange={(event) => setBusca(event.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {carregando ? <ListSkeleton rows={5} /> : null}
        {erro ? <p className={styles.estado}>{erro}</p> : null}
        {!carregando && !erro ? (
          <section className={styles['rotas-tabela']}>
            <div className={styles['rotas-cabecalho']}>
              <div className={styles['rotas-coluna']}>Veículo</div>
              <div className={`${styles['rotas-coluna']} ${styles['rotas-coluna--status']}`}>Status</div>
            </div>
            {veiculosFiltrados.length === 0 ? <p className={styles.estado}>Nenhum veículo encontrado.</p> : veiculosFiltrados.map((veiculo) => {
              const aberto = veiculoAberto === veiculo.id
              const rotasDoVeiculo = rotasPorVeiculo.get(veiculo.id) || []
              const statusVeiculo = rotasDoVeiculo.at(-1)?.status || 'Aguardando Saída'
              return (
                <article key={veiculo.id} className={styles['rotas-bloco']}>
                  <button type="button" className={styles['veiculo-linha']} onClick={() => setVeiculoAberto(aberto ? null : veiculo.id)} aria-expanded={aberto}>
                    <div className={styles['rotas-celula--veiculo']}>
                      {aberto ? <ChevronDown className={styles['rotas-seta']} /> : <ChevronRight className={styles['rotas-seta']} />}
                      <div className={styles['rotas-veiculo-texto']}>
                        <span className={styles['rotas-nome-veiculo']}>{veiculo.identificacao}</span>
                        <span className={styles['rotas-subtexto']}>{veiculo.placa || 'Sem placa'} - {veiculo.motorista}</span>
                      </div>
                    </div>
                    <div className={styles['rotas-celula--status']}>
                      <span className={`${styles['rotas-status']} ${styles[classeStatus(statusVeiculo)] || ''}`}>
                        {statusVeiculo === 'Atrasado' ? <TriangleAlert className={styles['rotas-status-icone']} /> : null}
                        {statusVeiculo === 'Concluído' || statusVeiculo === 'Concluido' ? <CircleCheckBig className={styles['rotas-status-icone']} /> : null}
                        <span>{statusVeiculo}</span>
                      </span>
                    </div>
                  </button>
                  {aberto ? <div className={styles['rotas-conteudo']}>
                    {rotasDoVeiculo.length === 0 ? <p className={styles.vazio}>Nenhuma rota para este veículo.</p> : rotasDoVeiculo.map((rota, indice) => {
                      const horario = rota.horario && rota.horario !== 'Sem horário' && rota.horario !== 'Sem horario'
                        ? rota.horario : rota.horarioInicio ? `Horário ${rota.horarioInicio}` : `Horário ${indice + 1}`
                      const mapaAberto = rotaMapaAberto === rota.id
                      return <article key={rota.id} className={styles['rota-card']}>
                        <button type="button" className={styles['rota-linha']} onClick={() => setRotaAberta(rotaAberta === rota.id ? null : rota.id)} aria-expanded={rotaAberta === rota.id}>
                          <div className={styles['rotas-celula--veiculo']}>
                            {rotaAberta === rota.id ? <ChevronDown className={styles['rotas-seta']} /> : <ChevronRight className={styles['rotas-seta']} />}
                            <div className={styles['rotas-veiculo-texto']}><span className={styles['rotas-nome-veiculo']}>{rota.direction || 'Rota'}</span></div>
                          </div>
                          <div className={styles['rotas-celula--status']}><span className={`${styles['rotas-status']} ${styles['rotas-status--horario']}`}>{horario}</span></div>
                        </button>
                        {rotaAberta === rota.id ? <div className={styles['rotas-alunos']}>
                          {rota.alunos.length === 0 ? <p className={styles.vazio}>Sem alunos vinculados.</p> : <>
                            {rota.alunos.map((aluno) => <p key={aluno.id || aluno.nome || aluno.name}>{aluno.nome || aluno.name || 'Aluno sem nome'}</p>)}
                            <button type="button" className={styles['rota-ver-mapa']} onClick={() => setRotaMapaAberto(mapaAberto ? null : rota.id)}>
                              <MapIcon size={16} />{mapaAberto ? 'Ocultar mapa' : 'Ver no mapa'}
                            </button>
                            {mapaAberto ? <RouteMap enderecoOrigem={ENDERECOS_UNIDADES[veiculo.unidade]} paradas={rota.alunos.map((aluno) => {
                              return { id: aluno.id, nome: aluno.nome || aluno.name || 'Aluno sem nome', endereco: aluno.address || '', latitude: aluno.latitude ?? null, longitude: aluno.longitude ?? null }
                            })} height={240} /> : null}
                          </>}
                        </div> : null}
                      </article>
                    })}
                  </div> : null}
                </article>
              )
            })}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default Rotas