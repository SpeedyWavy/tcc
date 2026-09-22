import { useEffect, useMemo, useState } from 'react'
import styles from './css/Trajeto.module.css'
import { ArrowLeft, Phone, Navigation2, MapPin } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import RouteMap from './components/RouteMap.jsx'
import volante from '../assets/volante.png'
import { supabase } from '../supabase.js'
import { getStoredUser } from '../auth.js'
import { apiRequest } from '../api.js'
import { ENDERECOS_UNIDADES } from '../lib/unidadesEnderecos.js'
import {
  getPreferenciaNavegacao,
  NAVEGACAO_WAZE,
  getModoNavegacao,
  MODO_PASSO_A_PASSO,
  MODO_ROTA_COMPLETA,
  MODO_EMBUTIDO,
} from '../lib/preferenciasMotorista.js'
import { resetarRotasProximas, escolherRotaAtual, STATUS_EM_TRANSITO, STATUS_CONCLUIDO } from '../lib/rotaStatus.js'

// O link de multiplos destinos do Google Maps aceita no maximo 9 destinos
// (contando o destino final) - confirmado na documentacao oficial. Rotas
// maiores precisam ser abertas em blocos.
const MAX_DESTINOS_GOOGLE_MAPS = 9

// Raio de proximidade (em metros) usado no modo embutido pra considerar que
// o motorista chegou numa parada e avancar sozinho pra proxima.
const RAIO_CHEGADA_METROS = 60

function montarLinkNavegacao(parada) {
  if (parada.latitude == null || parada.longitude == null) {
    return null
  }

  if (getPreferenciaNavegacao() === NAVEGACAO_WAZE) {
    return `https://waze.com/ul?ll=${parada.latitude},${parada.longitude}&navigate=yes`
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${parada.latitude},${parada.longitude}&travelmode=driving`
}

// Quebra a rota inteira em blocos de ate 9 destinos, montando um link do
// Google Maps por bloco. Sem origem fixa: o Maps usa a localizacao atual do
// motorista automaticamente, o que funciona bem tanto pro primeiro bloco
// quanto pros seguintes (o motorista abre o link de onde estiver na hora).
function montarBlocosRotaCompleta(paradas) {
  const paradasComCoordenadas = paradas.filter((p) => p.latitude != null && p.longitude != null)

  const blocosBrutos = []
  for (let i = 0; i < paradasComCoordenadas.length; i += MAX_DESTINOS_GOOGLE_MAPS) {
    blocosBrutos.push(paradasComCoordenadas.slice(i, i + MAX_DESTINOS_GOOGLE_MAPS))
  }

  return blocosBrutos.map((bloco) => {
    const destino = bloco[bloco.length - 1]
    const waypoints = bloco.slice(0, -1)

    const params = new URLSearchParams({
      api: '1',
      destination: `${destino.latitude},${destino.longitude}`,
      travelmode: 'driving',
    })

    if (waypoints.length > 0) {
      params.set('waypoints', waypoints.map((w) => `${w.latitude},${w.longitude}`).join('|'))
    }

    return {
      url: `https://www.google.com/maps/dir/?${params.toString()}`,
      alunos: bloco,
    }
  })
}

function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (v) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function Trajeto() {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [veiculo, setVeiculo] = useState(null)
  const [rota, setRota] = useState(null)
  const [paradas, setParadas] = useState([])
  const [indiceAtual, setIndiceAtual] = useState(0)
  const [processando, setProcessando] = useState(false)
  const [modoNavegacao] = useState(() => getModoNavegacao())

  const [detalhesAbertos, setDetalhesAbertos] = useState(false)
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const [rotaFinalizada, setRotaFinalizada] = useState(false)

  const [administradoresAbertos, setAdministradoresAbertos] = useState(false)
  const [administradores, setAdministradores] = useState([])
  const [carregandoAdministradores, setCarregandoAdministradores] = useState(false)

  // Modo "Rota completa no Google Maps"
  const [blocoAtual, setBlocoAtual] = useState(0)

  // Modo "Navegação embutida no app"
  const [posicaoAtual, setPosicaoAtual] = useState(null)
  const [erroGeolocalizacao, setErroGeolocalizacao] = useState('')

  useEffect(() => {
    carregarRota()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carregarRota = async () => {
    setCarregando(true)
    setErro('')

    try {
      const usuarioLogado = getStoredUser()
      if (!usuarioLogado?.id) {
        throw new Error('Motorista nao identificado. Faca login novamente.')
      }

      const { data: veiculoData, error: erroVeiculo } = await supabase
        .from('vehicles')
        .select('id, unit, license_plate, identification')
        .eq('driver_id', usuarioLogado.id)
        .maybeSingle()

      if (erroVeiculo) throw erroVeiculo

      if (!veiculoData) {
        setVeiculo(null)
        setRota(null)
        setParadas([])
        return
      }

      setVeiculo(veiculoData)

      // Reaproveita rotas concluidas que estao proximas do horario de
      // inicio de novo (1h antes) - roda sempre que a tela carrega, ja que
      // e exatamente quando o motorista costuma abrir o app.
      await resetarRotasProximas(supabase)

      const { data: rotasData, error: erroRotas } = await supabase
        .from('routes')
        .select('*')
        .eq('vehicle_id', veiculoData.id)
        .neq('status', STATUS_CONCLUIDO)

      if (erroRotas) throw erroRotas

      // O veiculo pode ter uma rota de Ida e uma de Volta aguardando ao
      // mesmo tempo - escolhe a certa pelo horario (ou a que ja estiver em
      // andamento, se houver).
      const rotaData = escolherRotaAtual(rotasData || [])

      if (!rotaData) {
        setRota(null)
        setParadas([])
        return
      }

      setRota(rotaData)

      const stops = Array.isArray(rotaData.stops) ? [...rotaData.stops].sort((a, b) => a.order - b.order) : []
      const idsAlunos = stops.map((s) => s.student_id)

      if (idsAlunos.length === 0) {
        setParadas([])
        return
      }

      const { data: alunosData, error: erroAlunos } = await supabase
        .from('students')
        .select('id, name, address, latitude, longitude, responsible_name, parent_contact')
        .in('id', idsAlunos)

      if (erroAlunos) throw erroAlunos

      const alunosPorId = new Map((alunosData || []).map((aluno) => [aluno.id, aluno]))

      const paradasMontadas = stops
        .map((stop) => {
          const aluno = alunosPorId.get(stop.student_id)
          if (!aluno) return null
          return {
            id: aluno.id,
            nome: aluno.name,
            endereco: aluno.address,
            latitude: aluno.latitude,
            longitude: aluno.longitude,
            responsavel: aluno.responsible_name,
            contato: aluno.parent_contact,
          }
        })
        .filter(Boolean)

      setParadas(paradasMontadas)
      setIndiceAtual(0)
      setBlocoAtual(0)
    } catch (error) {
      setErro(error.message || 'Erro ao carregar o trajeto.')
    } finally {
      setCarregando(false)
    }
  }

  const atualizarStatusRota = async (novoStatus) => {
    if (!rota) return false

    setProcessando(true)
    try {
      const { error } = await supabase.from('routes').update({ status: novoStatus }).eq('id', rota.id)
      if (error) throw error

      setRota((atual) => (atual ? { ...atual, status: novoStatus } : atual))
      return true
    } catch (error) {
      setErro(error.message || 'Erro ao atualizar o status da rota.')
      return false
    } finally {
      setProcessando(false)
    }
  }

  const blocosRotaCompleta = useMemo(() => montarBlocosRotaCompleta(paradas), [paradas])

  const abrirLinkExterno = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const iniciarRota = async () => {
    setIndiceAtual(0)
    setBlocoAtual(0)
    const sucesso = await atualizarStatusRota(STATUS_EM_TRANSITO)

    if (sucesso && modoNavegacao === MODO_ROTA_COMPLETA && blocosRotaCompleta[0]) {
      abrirLinkExterno(blocosRotaCompleta[0].url)
    }
  }

  const proximoAluno = async () => {
    if (indiceAtual < paradas.length - 1) {
      setIndiceAtual((atual) => atual + 1)
      return
    }

    const sucesso = await atualizarStatusRota(STATUS_CONCLUIDO)
    if (sucesso) {
      setRotaFinalizada(true)
    }
  }

  const avancarBloco = async () => {
    if (blocoAtual < blocosRotaCompleta.length - 1) {
      const proximo = blocoAtual + 1
      setBlocoAtual(proximo)
      abrirLinkExterno(blocosRotaCompleta[proximo].url)
      return
    }

    const sucesso = await atualizarStatusRota(STATUS_CONCLUIDO)
    if (sucesso) {
      setRotaFinalizada(true)
    }
  }

  const fecharRotaFinalizada = () => {
    setRotaFinalizada(false)
    setRota(null)
    setParadas([])
    setIndiceAtual(0)
    setBlocoAtual(0)
    setPosicaoAtual(null)
    carregarRota()
  }

  const tentarSair = () => {
    if (rota?.status === STATUS_EM_TRANSITO) {
      setConfirmarSaida(true)
      return
    }
    window.location.href = '/inicial'
  }

  const abrirAdministradores = async () => {
    setAdministradoresAbertos(true)
    setCarregandoAdministradores(true)

    try {
      const data = await apiRequest('/api/contacts')
      const lista = (Array.isArray(data) ? data : []).filter((contato) => contato.role === 'admin')
      setAdministradores(lista)
    } catch (error) {
      setErro(error.message || 'Erro ao carregar administradores.')
    } finally {
      setCarregandoAdministradores(false)
    }
  }

  const parada = paradas[indiceAtual] || null
  const rotaEmAndamento = rota?.status === STATUS_EM_TRANSITO
  const rotaAguardando = rota != null && rota.status !== STATUS_EM_TRANSITO && rota.status !== STATUS_CONCLUIDO
  const enderecoOrigem = veiculo ? ENDERECOS_UNIDADES[veiculo.unit] : null
  const linkNavegacao = parada ? montarLinkNavegacao(parada) : null

  // Modo embutido: acompanha a posicao do motorista via GPS enquanto a rota
  // estiver em andamento.
  useEffect(() => {
    if (modoNavegacao !== MODO_EMBUTIDO || !rotaEmAndamento) {
      return undefined
    }

    if (!('geolocation' in navigator)) {
      setErroGeolocalizacao('Geolocalização não disponível neste dispositivo.')
      return undefined
    }

    const watchId = navigator.geolocation.watchPosition(
      (posicao) => {
        setErroGeolocalizacao('')
        setPosicaoAtual({ lat: posicao.coords.latitude, lng: posicao.coords.longitude })
      },
      (erroGeo) => {
        console.error('Erro de geolocalizacao:', erroGeo)
        setErroGeolocalizacao('Não foi possível acessar sua localização. Verifique a permissão de GPS.')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [modoNavegacao, rotaEmAndamento])

  // Modo embutido: avanca sozinho pra proxima parada quando o motorista
  // chega perto o suficiente da parada atual.
  useEffect(() => {
    if (modoNavegacao !== MODO_EMBUTIDO || !posicaoAtual || !parada || processando) {
      return
    }

    if (parada.latitude == null || parada.longitude == null) {
      return
    }

    const distancia = distanciaMetros(posicaoAtual.lat, posicaoAtual.lng, parada.latitude, parada.longitude)
    if (distancia <= RAIO_CHEGADA_METROS) {
      proximoAluno()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicaoAtual])

  return (
    <main className={styles['motorista-trajeto-page']}>
      <div className="ui-header">
        <div className={styles['logo']} />
        <UserMenu />
        <div className="ui-header-extra">
          <button
            type="button"
            className="ui-back"
            onClick={tentarSair}
            aria-label="Voltar para o painel do motorista"
            style={{ background: 'transparent', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
          >
            <ArrowLeft />
          </button>
          <div className={`${styles['titulo-com-icone']} ui-header-extra-title`}>
            <img src={volante} alt="Volante" className={styles['motorista-trajeto__image']} />
            <span>Trajeto Atual</span>
          </div>
          {rotaEmAndamento && (
            <button
              type="button"
              className={styles['botao-admin']}
              onClick={abrirAdministradores}
              aria-label="Contatar administracao"
              title="Contatar administracao"
            >
              <Phone size={18} />
            </button>
          )}
        </div>
      </div>

      <section className={styles['conteudo']}>
        {carregando ? (
          <p className={styles['estado-carregando']}>Carregando trajeto...</p>
        ) : erro ? (
          <p className={styles['estado-carregando']}>{erro}</p>
        ) : rotaAguardando ? (
          <>
            <div className={styles['card-aviso']}>
              <p className={styles['card-aviso-title']}>Você tem uma nova rota!</p>
              <p className={styles['card-aviso-text']}>
                Para começar o trajeto, clique em
                <span className={styles['card-aviso-action']}>Iniciar</span>.
              </p>
            </div>

            <div className={styles['card-botoes']}>
              <button type="button" className={styles['botao-principal']} onClick={iniciarRota} disabled={processando}>
                {processando ? 'Iniciando...' : 'Iniciar'}
              </button>
              <button
                type="button"
                className={styles['botao-secundario']}
                onClick={() => setDetalhesAbertos((atual) => !atual)}
              >
                {detalhesAbertos ? 'Ocultar detalhes' : 'Ver detalhes'}
              </button>
            </div>

            {detalhesAbertos && (
              <div className={styles['detalhes-rota']}>
                <div className={styles['detalhe-item']}>
                  <span className={styles['detalhe-label']}>Horário</span>
                  <strong>{rota.horario || 'Nao informado'}</strong>
                </div>
                <div className={styles['detalhe-item']}>
                  <span className={styles['detalhe-label']}>Ponto de partida</span>
                  <strong>{veiculo?.unit || 'Nao informado'}</strong>
                </div>
                <div className={styles['detalhe-item']}>
                  <span className={styles['detalhe-label']}>Paradas ({paradas.length})</span>
                  <div className={styles['detalhe-lista']}>
                    {paradas.map((p, index) => (
                      <p key={p.id}>
                        {index + 1}. {p.nome}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : rotaEmAndamento && modoNavegacao === MODO_ROTA_COMPLETA ? (
          <div className={styles['rota-ativa']}>
            <RouteMap enderecoOrigem={enderecoOrigem} paradas={paradas} indiceAtual={-1} height={260} />

            {blocosRotaCompleta[blocoAtual] && (
              <div className={styles['sheet-aluno']}>
                <p className={styles['sheet-nome']}>
                  Bloco {blocoAtual + 1} de {blocosRotaCompleta.length}
                </p>
                <p className={styles['sheet-progresso']}>
                  {blocosRotaCompleta.length > 1
                    ? 'O Google Maps só aceita 9 destinos por vez — por isso a rota foi dividida em blocos.'
                    : 'Todas as paradas cabem em uma única viagem no Google Maps.'}
                </p>

                <div className={styles['detalhe-lista']}>
                  {blocosRotaCompleta[blocoAtual].alunos.map((aluno, index) => (
                    <p key={aluno.id}>
                      {index + 1}. {aluno.nome}
                    </p>
                  ))}
                </div>

                <div className={styles['sheet-rodape']}>
                  <button
                    type="button"
                    className={styles['botao-navegacao']}
                    onClick={() => abrirLinkExterno(blocosRotaCompleta[blocoAtual].url)}
                  >
                    <Navigation2 size={16} />
                    Abrir no Google Maps
                  </button>
                  <button type="button" className={styles['botao-principal']} onClick={avancarBloco} disabled={processando}>
                    {processando
                      ? 'Aguarde...'
                      : blocoAtual < blocosRotaCompleta.length - 1
                        ? 'Bloco concluído, próximo'
                        : 'Finalizar rota'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : rotaEmAndamento ? (
          <div className={styles['rota-ativa']}>
            <RouteMap
              enderecoOrigem={enderecoOrigem}
              paradas={paradas}
              indiceAtual={indiceAtual}
              height={300}
              posicaoAtual={modoNavegacao === MODO_EMBUTIDO ? posicaoAtual : null}
            />

            {modoNavegacao === MODO_EMBUTIDO && (
              <p className={styles['sheet-progresso']}>
                <MapPin size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                {erroGeolocalizacao || (posicaoAtual ? 'Acompanhando sua localização - avança sozinho ao chegar.' : 'Obtendo sua localização...')}
              </p>
            )}

            {parada && (
              <div className={styles['sheet-aluno']}>
                <div className={styles['sheet-alca']} />
                <p className={styles['sheet-nome']}>{parada.nome}</p>
                <p className={styles['sheet-progresso']}>
                  Parada {indiceAtual + 1} de {paradas.length}
                </p>

                <div className={styles['sheet-detalhe']}>
                  <span className={styles['sheet-label']}>Endereço:</span>
                  <span>{parada.endereco || 'Nao informado'}</span>
                </div>
                <div className={styles['sheet-detalhe']}>
                  <span className={styles['sheet-label']}>Responsável:</span>
                  <span>{parada.responsavel || 'Nao informado'}</span>
                </div>
                <div className={styles['sheet-detalhe']}>
                  <span className={styles['sheet-label']}>Contato do responsável:</span>
                  <span>{parada.contato || 'Nao informado'}</span>
                  {parada.contato && (
                    <a className={styles['sheet-ligar']} href={`tel:${parada.contato}`} aria-label="Ligar para o responsavel">
                      <Phone size={16} />
                    </a>
                  )}
                </div>

                <div className={styles['sheet-rodape']}>
                  {linkNavegacao && (
                    <a className={styles['botao-navegacao']} href={linkNavegacao} target="_blank" rel="noopener noreferrer">
                      <Navigation2 size={16} />
                      Abrir navegação
                    </a>
                  )}
                  <button type="button" className={styles['botao-principal']} onClick={proximoAluno} disabled={processando}>
                    {processando ? 'Aguarde...' : indiceAtual < paradas.length - 1 ? 'Próximo aluno' : 'Finalizar rota'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles['empty-state']}>
            <div className={styles['empty-card']}>
              <p className={styles['empty-title']}>Nenhum trajeto no momento.</p>
              <p className={styles['empty-text']}>Assim que uma nova rota for atribuída a você, ela aparecerá aqui.</p>
            </div>
          </div>
        )}
      </section>

      {confirmarSaida && (
        <div className={styles['dialogo-overlay']} onClick={() => setConfirmarSaida(false)}>
          <div className={styles['dialogo-card']} onClick={(e) => e.stopPropagation()}>
            <p className={styles['dialogo-texto']}>Deseja sair com a rota em andamento?</p>
            <div className={styles['dialogo-acoes']}>
              <button
                type="button"
                className={styles['botao-principal']}
                onClick={() => {
                  window.location.href = '/inicial'
                }}
              >
                Sair
              </button>
              <button type="button" className={styles['botao-secundario']} onClick={() => setConfirmarSaida(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {administradoresAbertos && (
        <div className={styles['dialogo-overlay']} onClick={() => setAdministradoresAbertos(false)}>
          <div className={styles['dialogo-card']} onClick={(e) => e.stopPropagation()}>
            <p className={styles['dialogo-titulo']}>Administradores</p>

            {carregandoAdministradores ? (
              <p className={styles['dialogo-texto']}>Carregando...</p>
            ) : administradores.length === 0 ? (
              <p className={styles['dialogo-texto']}>Nenhum administrador encontrado.</p>
            ) : (
              <div className={styles['dialogo-lista']}>
                {administradores.map((admin) => {
                  const telefone = admin.contact || admin.phone || ''
                  return (
                    <a
                      key={admin.id}
                      className={styles['dialogo-item']}
                      href={telefone ? `tel:${telefone}` : undefined}
                    >
                      <span>{admin.full_name || 'Administrador'}</span>
                      {telefone ? <Phone size={16} /> : <span className={styles['dialogo-item-vazio']}>sem telefone</span>}
                    </a>
                  )
                })}
              </div>
            )}

            <button type="button" className={styles['botao-secundario']} onClick={() => setAdministradoresAbertos(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {rotaFinalizada && (
        <div className={styles['dialogo-overlay']} onClick={fecharRotaFinalizada}>
          <div className={styles['dialogo-card']} onClick={(e) => e.stopPropagation()}>
            <p className={styles['dialogo-titulo']}>Rota finalizada!</p>
            <p className={styles['dialogo-texto']}>Aguarde até que novos trajetos se iniciem.</p>
            <button type="button" className={styles['botao-principal']} onClick={fecharRotaFinalizada}>
              Ok
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default Trajeto