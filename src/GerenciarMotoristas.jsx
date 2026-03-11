import { useState } from 'react'
import './GerenciarMotoristas.css'
import logords from './assets/logo-rds.png'
import user from './assets/place-user.png'
import { CornerDownLeft, CirclePlus } from 'lucide-react'
import { ArrowDownNarrowWide } from 'lucide-react'


function GerenciarMotoristas() {
  const [motoristaAberto, setMotoristaAberto] = useState(null)

  const motoristas = [
    { id: 1, nome: 'Motorista 1', veiculo: 'Van 12', cnh: 'B', telefone: '(19) 90000-0001' },
    { id: 2, nome: 'Motorista 2', veiculo: 'Onibus 3', cnh: 'D', telefone: '(19) 90000-0002' },
    { id: 3, nome: 'Motorista 3', veiculo: 'Van 8', cnh: 'B', telefone: '(19) 90000-0003' },
    { id: 4, nome: 'Motorista 4', veiculo: 'Onibus 1', cnh: 'D', telefone: '(19) 90000-0004' },
    { id: 5, nome: 'Motorista 5', veiculo: 'Van 2', cnh: 'B', telefone: '(19) 90000-0005' },
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
          {/* <h1>Usuario</h1> */}
          <img src={user} alt={user} />
        </div>
        <div className="ui-header-extra"></div>
      </div>
      <div className="voltar"><a href="/app"> <CornerDownLeft />   Voltar</a></div>
      <div className="adicionar">
        <button type="button" className="adicionar-botao">
          <CirclePlus />
          Adicionar
        </button>
      </div>
      


      {/* Lista dos Motoristas */}
      <div className="cadastros">
        <div className="filtro">
          <input type="text" placeholder="Pesquisar" />
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
                  <p><strong>Nome:</strong> {motorista.nome}</p>
                  <p><strong>Veiculo:</strong> {motorista.veiculo}</p>
                  <p><strong>CNH:</strong> {motorista.cnh}</p>
                  <p><strong>Telefone:</strong> {motorista.telefone}</p>
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
