import { useState } from 'react'
import './GerenciarMotoristas.css'
import logords from './assets/logo-rds.png'
import user from './assets/place-user.png'
import { CornerDownLeft, ArrowDownNarrowWide, CirclePlus } from 'lucide-react'


function GerenciarMotoristas() {
  const [motoristaAberto, setMotoristaAberto] = useState(null)

  const motoristas = [
    {
      id: 1,
      nome: 'Motorista 1',
      cpf: '000.000.000-01',
      rg: '12.345.678-9',
      cnh: 'B',
      identificacaoTransporte: 'Linha 01 - Van 12',
      contato: '(19) 90000-0001',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Garcia',
    },
    {
      id: 2,
      nome: 'Motorista 2',
      cpf: '000.000.000-02',
      rg: '98.765.432-1',
      cnh: 'D',
      identificacaoTransporte: 'Linha 02 - Onibus 3',
      contato: '(19) 90000-0002',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Mimosa',
    },
    {
      id: 3,
      nome: 'Motorista 3',
      cpf: '000.000.000-03',
      rg: '45.678.912-3',
      cnh: 'B',
      identificacaoTransporte: 'Linha 03 - Van 8',
      contato: '(19) 90000-0003',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Swiss',
    },
    {
      id: 4,
      nome: 'Motorista 4',
      cpf: '000.000.000-04',
      rg: '23.456.789-0',
      cnh: 'D',
      identificacaoTransporte: 'Linha 04 - Onibus 1',
      contato: '(19) 90000-0004',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Garcia',
    },
    {
      id: 5,
      nome: 'Motorista 5',
      cpf: '000.000.000-05',
      rg: '56.789.123-4',
      cnh: 'B',
      identificacaoTransporte: 'Linha 05 - Van 2',
      contato: '(19) 90000-0005',
      horarios: '06:30 - 7:20, 11:45 - 14:00',
      unidade: 'Unidade Mimosa',
    },
  ]

  const alternarMotorista = (id) => {
    setMotoristaAberto((atual) => (atual === id ? null : id))
  }

  return (
    <>
      <div className="ui-header">
        <div className="logo">
          <img src={logords} alt={logords} />
        </div>
        <div className="usuario">
          <img src={user} alt="Usuario" />
        </div>
        <div className="ui-header-extra"></div>
      </div>
      <div className="voltar"><a href="/app"><CornerDownLeft /> Voltar</a></div>
      <div className="adicionar">
        <button type="button" className="adicionar-botao">
          <CirclePlus />
          Adicionar
        </button>
      </div>
      


      {/* Lista dos Motoristas */}
      <div className="cadastros">
        <div className="filtro">
          <input type="text" placeholder="Pesquisar" className="filtro-input" />
          <ArrowDownNarrowWide className="icone-filtro" />
        </div>
        

        <div className="motoristas-grid">
          {motoristas.map((motorista) => (
            <div key={motorista.id} className="motorista-item">
              <div
                className={`motorista motorista${motorista.id} ${motoristaAberto === motorista.id ? 'aberto' : ''}`}
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
                <p className="setinha">{motoristaAberto === motorista.id ? 'v' : '>'}</p>
                <h1>{motorista.nome}</h1>
                <p className="pontinhos">&#8801;</p>
              </div>

              {motoristaAberto === motorista.id && (
                <div className="motorista-detalhes">
                  <div className="motorista-card-top">
                    <div className="motorista-foto" aria-hidden="true" />
                    <div className="motorista-info">
                      <p><strong>CPF:</strong> {motorista.cpf}</p>
                      <p><strong>RG:</strong> {motorista.rg}</p>
                      <p><strong>CNH:</strong> {motorista.cnh}</p>
                      <p><strong>Veiculo:</strong> {motorista.identificacaoTransporte}</p>
                    </div>
                  </div>
                  <div className="motorista-info-extra">
                    <p><strong>Contato:</strong> {motorista.contato}</p>
                    <p><strong>Horarios:</strong> {motorista.horarios}</p>
                    <p><strong>Unidade:</strong> {motorista.unidade}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default GerenciarMotoristas
