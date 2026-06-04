import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './MotoristaSelect.module.css'

function MotoristaSelect({ motoristas, valor, onChange, placeholder = 'Selecione um motorista' }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [destaqueIndice, setDestaqueIndice] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const motoristasFiltrados = motoristas.filter((motorista) =>
    motorista.full_name.toLowerCase().includes(busca.toLowerCase())
  )

  const motoristasSelecionado = motoristas.find((m) => m.full_name === valor)

  useEffect(() => {
    const handleClickFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false)
        setBusca('')
      }
    }

    if (aberto) {
      document.addEventListener('mousedown', handleClickFora)
      return () => {
        document.removeEventListener('mousedown', handleClickFora)
      }
    }
  }, [aberto])

  const handleAbrirFechar = () => {
    setAberto(!aberto)
    if (!aberto) {
      setBusca('')
      setDestaqueIndice(-1)
    }
  }

  const handleSelecionarMotorista = (motorista) => {
    onChange({ target: { value: motorista.full_name } })
    setAberto(false)
    setBusca('')
    setDestaqueIndice(-1)
  }

  const handleKeyDown = (e) => {
    if (!aberto) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setAberto(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setDestaqueIndice((prev) => (prev < motoristasFiltrados.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setDestaqueIndice((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (destaqueIndice >= 0) {
          handleSelecionarMotorista(motoristasFiltrados[destaqueIndice])
        }
        break
      case 'Escape':
        e.preventDefault()
        setAberto(false)
        setBusca('')
        setDestaqueIndice(-1)
        break
      default:
        break
    }
  }

  return (
    <div className={styles['motorista-select-container']} ref={containerRef}>
      <div className={styles['motorista-select-trigger']} onClick={handleAbrirFechar}>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={aberto ? busca : motoristasSelecionado?.full_name || ''}
          onChange={(e) => {
            setBusca(e.target.value)
            setDestaqueIndice(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setAberto(true)}
          className={styles['motorista-select-input']}
        />
        <ChevronDown className={`${styles['motorista-select-icon']} ${aberto ? styles.aberto : ''}`} size={20} />
      </div>

      {aberto && (
        <div className={styles['motorista-select-dropdown']}>
          {motoristasFiltrados.length > 0 ? (
            <ul className={styles['motorista-select-list']}>
              {motoristasFiltrados.map((motorista, indice) => (
                <li
                  key={motorista.id}
                  className={`${styles['motorista-select-item']} ${
                    destaqueIndice === indice ? styles.destaque : ''
                  } ${valor === motorista.full_name ? styles.selecionado : ''}`}
                  onClick={() => handleSelecionarMotorista(motorista)}
                  onMouseEnter={() => setDestaqueIndice(indice)}
                >
                  {motorista.full_name}
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles['motorista-select-vazio']}>
              {busca ? 'Nenhum motorista encontrado' : 'Nenhum motorista disponível'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MotoristaSelect
