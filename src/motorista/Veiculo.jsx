import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import styles from './css/Veiculo.module.css'
import { ArrowLeft } from 'lucide-react'
import UserMenu from './components/UserMenu.jsx'

function Veiculo() {
  const [veiculo, setVeiculo] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    const carregarVeiculo = async () => {
      setCarregando(true)
      setErro('')

      try {
        const data = await apiRequest('/api/vehicles')
        if (!ativo) return

        const veiculoAtual = Array.isArray(data) ? data[0] || null : data
        setVeiculo(veiculoAtual)
      } catch (error) {
        if (ativo) {
          setErro(error?.message || 'Erro ao carregar dados do veículo.')
        }
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarVeiculo()

    return () => {
      ativo = false
    }
  }, [])

  return (
    <main className={styles['motorista-veiculo-page']}>
      <div className="ui-header">
        <div className={styles['logo']} />
        <UserMenu />
        <div className="ui-header-extra">
          <a className="ui-back" href="/inicial" aria-label="Voltar para o painel do motorista">
            <ArrowLeft />
          </a>
          <div className="ui-header-extra-title">
            <span>Veículo</span>
          </div>
        </div>
      </div>

      <section className={styles['conteudo']}>
        {carregando ? (
          <div className={styles['status']}>Carregando dados do veículo...</div>
        ) : erro ? (
          <div className={styles['status']}>{erro}</div>
        ) : veiculo ? (
          <>
            <div className={styles['form-group']}>
              <label>Identificação do veículo:</label>
              <div className={styles['field']}>{veiculo.identification || veiculo.model || veiculo.license_plate || 'Não informado'}</div>
            </div>
            <div className={styles['form-group']}>
              <label>Placa:</label>
              <div className={styles['field']}>{veiculo.license_plate || 'Não informada'}</div>
            </div>
            <div className={styles['form-group']}>
              <label>Capacidade total:</label>
              <div className={styles['field']}>{veiculo.capacity ?? ''}</div>
            </div>
            <div className={styles['form-group']}>
              <label>Número de passageiros atual:</label>
              <div className={styles['field']}>{veiculo.current_passengers ?? ''}</div>
            </div>
            <div className={styles['form-group']}>
              <label>Unidade:</label>
              <div className={styles['field']}>{veiculo.unit || ''}</div>
            </div>
            <div className={styles['form-group']}>
              <label>Última revisão:</label>
              <div className={styles['field']}>{veiculo.ultimaRevisao || veiculo.updated_at || ''}</div>
            </div>
            <div className={styles['form-group']}>
              <label>Observação da revisão:</label>
              <div className={styles['field']}>{veiculo.observacao || ''}</div>
            </div>
          </>
        ) : (
          <div className={styles['status']}>Nenhum veículo encontrado.</div>
        )}
      </section>
    </main>
  )
}

export default Veiculo

// 