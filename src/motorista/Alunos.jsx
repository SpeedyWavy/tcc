import { useState } from 'react'
import styles from './css/Alunos.module.css'
import student3 from '../assets/student3.png'
import { ArrowLeft, ChevronDown, ChevronRight, Search } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'

function Alunos() {
  const [alunoAberto, setAlunoAberto] = useState(null)
  const [busca, setBusca] = useState('')

  const alunos = [
    {
      id: 1,
      nome: 'Aluno 1',
      rm: '37441',
      unidade: 'Unidade Garcia',
      identificacaoTransporte: 'Linha 01 - Van 3',
      responsavel: 'Responsavel 1',
      contatoResponsavel: '(19) 99999-0001',
      endereco: 'Rua Barata Ribeiro, Cambui, Campinas - SP',
    },
    {
      id: 2,
      nome: 'Aluno 2',
      rm: '27051',
      unidade: 'Unidade Garcia',
      identificacaoTransporte: 'Linha 02 - Onibus 2',
      responsavel: 'Responsavel 2',
      contatoResponsavel: '(19) 99999-0002',
      endereco: 'Avenida Francisco Glicerio, Centro, Campinas - SP',
    },
    {
      id: 3,
      nome: 'Aluno 3',
      rm: '38294',
      unidade: 'Unidade Mimosa',
      identificacaoTransporte: 'Linha 03 - Van 1',
      responsavel: 'Responsavel 3',
      contatoResponsavel: '(19) 99999-0003',
      endereco: 'Rua Geraldo de Almeida Santos, Taquaral, Campinas - SP',
    },
    {
      id: 4,
      nome: 'Aluno 4',
      rm: '39212',
      unidade: 'Unidade Mimosa',
      identificacaoTransporte: 'Linha 04 - Onibus 5',
      responsavel: 'Responsavel 4',
      contatoResponsavel: '(19) 99999-0004',
      endereco: 'Avenida John Boyd Dunlop, Jardim Aurelia, Campinas - SP',
    },
    {
      id: 5,
      nome: 'Aluno 5',
      rm: '37872',
      unidade: 'Unidade Swiss',
      identificacaoTransporte: 'Linha 05 - Van 2',
      responsavel: 'Responsavel 5',
      contatoResponsavel: '(19) 99999-0005',
      endereco: 'Rua Alberto Faria, Vila Itapura, Campinas - SP',
    },
  ]

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
    <main className={`${styles['motorista-page']} ${styles['motorista-page--alunos']}`}>
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
          {alunosFiltrados.map((aluno) => (
            <div key={aluno.id} className={styles['aluno-item']}>
              <div
                className={`aluno aluno${aluno.id} ${alunoAberto === aluno.id ? 'aberto' : ''}`}
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
          ))}
        </div>
      </div>
    </main>
  )
}

export default Alunos
