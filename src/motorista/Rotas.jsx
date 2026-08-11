import { useEffect, useMemo, useState } from 'react'
import styles from './css/Rotas.module.css'
import { ArrowLeft, ChevronDown, ChevronRight, Info, MapPinned, Search } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import { apiRequest } from '../api.js'

function normalizarRota(rota) {
  return {
    id: rota.id || rota.route_id || rota.vehicle_id || Math.random().toString(36).slice(2, 10),
    rota: rota.rota || rota.route || 'Rota',
    horario: rota.horario || rota.created_at || rota.updated_at || 'Sem horário',
    status: rota.status || 'Em andamento',
    vehicleName: rota.vehicle_name || rota.vehicle || rota.vehicle_id || 'Veiculo nao informado',
    driverName: rota.driver_name || rota.driver || rota.driver_id || 'Motorista nao informado',
    students: Array.isArray(rota.students)
      ? rota.students.map((student) => ({
          id: student.id,
          nome: student.nome || student.name || 'Aluno sem nome',
        }))
      : [],
  }
}

function Rotas() {
  const [busca, setBusca] = useState('')
  const [rotas, setRotas] = useState([])
  const [rotaAberta, setRotaAberta] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    const carregarRotas = async () => {
      setCarregando(true)
      setErro('')

      try {
        const data = await apiRequest('/api/routes')
        if (!ativo) {
          return
        }

        const rotasRecebidas = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : [])
        setRotas(rotasRecebidas.map(normalizarRota))
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Erro ao carregar rotas.')
        }
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarRotas()

    return () => {
      ativo = false
    }
  }, [])

  const rotasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return rotas.filter((rota) => {
      const texto = [
        rota.rota,
        rota.horario,
        rota.vehicleName,
        rota.driverName,
        ...rota.students.map((student) => student.nome),
      ]
        .join(' ')
        .toLowerCase()

      return !termo || texto.includes(termo)
    })
  }, [busca, rotas])

  const alternarRota = (id) => {
    setRotaAberta((atual) => (atual === id ? null : id))
  }

  return (
    <main className={styles['motorista-rotas-page']}>
      <div className="ui-header">
        <div className={styles['logo']} />
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/inicial" aria-label="Voltar para o painel do motorista">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <MapPinned className={styles['ui-header-extra-icon']} />
            <span>Rotas</span>
          </div>
        </div>
      </div>

      <section className={styles['conteudo']}>
        <div className={styles['barra-pesquisa']}>
          <Search className={styles['icone-pesquisa']} />
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className={styles['cabecalho']}>
          <div className={styles['coluna-rota']}>Rota</div>
          <div className={styles['coluna-horario']}>Horário</div>
        </div>

        {carregando ? <p className={styles['estado']}>Carregando rotas...</p> : null}
        {erro ? <p className={styles['estado']}>{erro}</p> : null}

        {!carregando && !erro ? (
          <div className={styles['lista']}>
            {rotasFiltradas.length === 0 ? (
              <p className={styles['estado']}>Nenhuma rota encontrada.</p>
            ) : (
              rotasFiltradas.map((rota) => {
                const aberta = rotaAberta === rota.id

                return (
                  <article key={rota.id} className={styles['bloco']}>
                    <button
                      type="button"
                      className={styles['linha']}
                      onClick={() => alternarRota(rota.id)}
                      aria-expanded={aberta}
                    >
                      <div className={styles['coluna-rota']}>
                        {aberta ? <ChevronDown className={styles['seta']} /> : <ChevronRight className={styles['seta']} />}
                        <span>{rota.rota}</span>
                      </div>
                      <div className={styles['coluna-horario']}>{rota.horario}</div>
                    </button>

                    {aberta ? (
                      <div className={styles['detalhes']}>
                        {rota.students.length === 0 ? (
                          <p className={styles['sem-alunos']}>Nenhum aluno nesta rota.</p>
                        ) : (
                          rota.students.map((student) => (
                            <div key={student.id || student.nome || student.name} className={styles['aluno']}>
                              <span>{student.nome || student.name || 'Aluno sem nome'}</span>
                              <button type="button" className={styles['info']} aria-label={`Detalhes de ${student.nome || student.name}`}>
                                <Info />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </article>
                )
              })
            )}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default Rotas

// 