import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../../lib/googleMapsLoader.js'

/**
 * Input de texto com autocomplete de enderecos via Places Autocomplete Data API
 * (google.maps.places.AutocompleteSuggestion), a API nova do Google — a antiga
 * google.maps.places.Autocomplete nao e mais disponibilizada para chaves criadas
 * a partir de marco/2025.
 *
 * Usa um <input> comum + uma lista de sugestoes propria (em vez do widget novo
 * <gmp-place-autocomplete>, que roda em Shadow DOM fechado e nao pode ser
 * estilizado com o CSS do projeto).
 *
 * Ao selecionar uma sugestao, chama onSelectPlace({ endereco, latitude, longitude }).
 * Digitacao livre (sem selecionar sugestao) so atualiza o texto via onChange —
 * o componente pai deve zerar lat/lng nesse caso.
 */
function AddressAutocompleteInput({ value, onChange, onSelectPlace, placeholder, required }) {
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const wrapperRef = useRef(null)
  const mapsRef = useRef(null)
  const sessionTokenRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    let ativo = true

    loadGoogleMaps()
      .then((maps) => {
        if (ativo) {
          mapsRef.current = maps
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar Google Maps:', error)
      })

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (!mostrarSugestoes) {
      return undefined
    }

    const fecharAoClicarFora = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setMostrarSugestoes(false)
      }
    }

    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => document.removeEventListener('mousedown', fecharAoClicarFora)
  }, [mostrarSugestoes])

  const buscarSugestoes = (texto) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!texto || texto.trim().length < 3 || !mapsRef.current) {
      setSugestoes([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } = mapsRef.current.places

        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken()
        }

        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: texto,
          includedRegionCodes: ['br'],
          sessionToken: sessionTokenRef.current,
        })

        setSugestoes(suggestions || [])
        setMostrarSugestoes(true)
      } catch (error) {
        console.error('Erro ao buscar sugestões de endereço:', error)
        setSugestoes([])
      }
    }, 300)
  }

  const handleInputChange = (e) => {
    onChange(e)
    buscarSugestoes(e.target.value)
  }

  const selecionarSugestao = async (suggestion) => {
    try {
      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({ fields: ['formattedAddress', 'location'] })

      onSelectPlace({
        endereco: place.formattedAddress || suggestion.placePrediction.text?.text || '',
        latitude: place.location ? place.location.lat() : null,
        longitude: place.location ? place.location.lng() : null,
      })
    } catch (error) {
      console.error('Erro ao obter detalhes do endereço:', error)
    } finally {
      setSugestoes([])
      setMostrarSugestoes(false)
      // sessao de billing encerrada apos a selecao; a proxima busca cria uma nova
      sessionTokenRef.current = null
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => sugestoes.length > 0 && setMostrarSugestoes(true)}
        required={required}
        autoComplete="off"
      />
      {mostrarSugestoes && sugestoes.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            margin: '4px 0 0',
            padding: 4,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {sugestoes.map((suggestion, index) => (
            <li
              key={suggestion.placePrediction?.placeId || index}
              onClick={() => selecionarSugestao(suggestion)}
              style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 14, borderRadius: 6, color: '#333' }}
            >
              {suggestion.placePrediction?.text?.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AddressAutocompleteInput

// 