import { useEffect, useState } from 'react'
import styles from './css/Alunos.module.css'
import student3 from '../assets/student3.png'
import { ArrowLeft, ChevronDown, ChevronRight, Search } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'
import { apiRequest } from '../api.js'

const normalizarAluno = (aluno) => ({
  id: aluno.id,
  nome: aluno.name || aluno.nome || '',
  rm: aluno.rm || '',
  unidade: aluno.unit || aluno.unidade || 'Nao informada',
  identificacaoTransporte: aluno.transport_identification || aluno.identificacaoTransporte || aluno.transporte || 'Nao informado',
  responsavel: aluno.responsible_name || aluno.responsavel || 'Nao informado',
  contatoResponsavel: aluno.parent_contact || aluno.contato_responsavel || 'Nao informado',
  endereco: aluno.address || aluno.endereco || 'Nao informado',
})

function Alunos() {
  const [alunoAberto, setAlunoAberto] = useState(null)
  const [busca, setBusca] = useState('')
  const [alunos, setAlunos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    const carregarAlunos = async () => {
      setCarregando(true)
      setErro('')

      try {
        const data = await apiRequest('/api/students')
        if (!ativo) {
          return
        }

        const lista = Array.isArray(data) ? data.map(normalizarAluno) : []
        setAlunos(lista)
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Erro ao carregar alunos.')
        }
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarAlunos()

    return () => {
      ativo = false
    }
  }, [])

  const alternarAluno = (id) => {
    setAlunoAberto((atual) => (atual === id ? null : id))
  }

  const alunosFiltrados = alunos.filter((aluno) =>
    [
      aluno.nome,
      aluno.rm,
      aluno.unidade,
      aluno.identificacaoTransporte,
      aluno.responsavel,
      aluno.contatoResponsavel,
      aluno.endereco,
    ]
      .join(' ')
      .toLowerCase()
      .includes(busca.toLowerCase())
  )

  return (
    <main className="motorista-page motorista-page--alunos">
      <div className="ui-header">
        <div className={styles['logo']}></div>
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/inicial" aria-label="Voltar para o painel do motorista">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <img src={student3} alt={student3} className={styles['ui-header-extra-icon']} />
            <span>Alunos</span>
          </div>
        </div>
      </div>

      <div className={styles['cadastros']}>
        <div className={styles['motorista-alunos-busca']}>
          <div className={styles['motorista-alunos-busca-wrap']}>
            <Search className={styles['motorista-alunos-busca-icon']} />
            <input
              type="text"
              placeholder="Buscar aluno"
              className={styles['motorista-alunos-busca-input']}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className={styles['alunos-grid']}>
          {carregando ? (
            <p className={styles['estado-lista']}>Carregando alunos...</p>
          ) : erro ? (
            <p className={styles['estado-lista']}>{erro}</p>
          ) : alunosFiltrados.length === 0 ? (
            <p className={styles['estado-lista']}>Nenhum aluno encontrado.</p>
          ) : (
            alunosFiltrados.map((aluno) => (
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
                  {alunoAberto === aluno.id ? (
                    <ChevronDown className={styles['setinha']} />
                  ) : (
                    <ChevronRight className={styles['setinha']} />
                  )}
                  <h1>{aluno.nome}</h1>
                  <p className={styles['pontinhos']}>&#8801;</p>
                </div>

                {alunoAberto === aluno.id && (
                  <div className={styles['aluno-detalhes']}>
                    <div className={styles['aluno-card-top']}>
                      <div className={styles['aluno-foto']} />
                      <div className={styles['aluno-info']}>
                        <p><strong>RM:</strong> {aluno.rm}</p>
                        <p><strong>Unidade:</strong> {aluno.unidade}</p>
                        <p><strong>Transporte:</strong> {aluno.identificacaoTransporte}</p>
                        <p><strong>Responsavel:</strong> {aluno.responsavel}</p>
                      </div>
                    </div>
                    <div className={styles['aluno-info-extra']}>
                      <p><strong>Contato do responsavel:</strong> {aluno.contatoResponsavel}</p>
                      <p><strong>Endereco:</strong> {aluno.endereco}</p>
                    </div>
                    <div className={styles['aluno-mapa']}>
                      <div className={styles['mapa-placeholder']} />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}

export default Alunos
