import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { loadGoogleMaps } from '../../lib/googleMapsLoader.js'

function formatarDuracao(segundos) {
  const minutos = Math.round(segundos / 60)
  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60

  if (horas === 0) return `${minutos} min`
  if (minutosRestantes === 0) return `${horas} h`
  return `${horas} h ${minutosRestantes} min`
}

function RouteDuration({ enderecoOrigem, paradas }) {
  const [estado, setEstado] = useState({ carregando: true, segundos: null, erro: '' })

  useEffect(() => {
    let ativo = true
    const paradasComCoordenadas = paradas.filter((parada) =>
      parada.latitude != null && parada.longitude != null
      && Number.isFinite(Number(parada.latitude)) && Number.isFinite(Number(parada.longitude)))

    if (!enderecoOrigem || paradasComCoordenadas.length === 0) {
      setEstado({ carregando: false, segundos: null, erro: 'Indisponível: confira o endereço da unidade e as coordenadas das paradas.' })
      return () => { ativo = false }
    }

    setEstado({ carregando: true, segundos: null, erro: '' })

    loadGoogleMaps()
      .then((maps) => {
        if (!ativo) return

        const servico = new maps.DirectionsService()
        servico.route(
          {
            origin: enderecoOrigem,
            destination: enderecoOrigem,
            waypoints: paradasComCoordenadas.map((parada) => ({
              location: { lat: Number(parada.latitude), lng: Number(parada.longitude) },
              stopover: true,
            })),
            optimizeWaypoints: false,
            travelMode: maps.TravelMode.DRIVING,
          },
          (resultado, status) => {
            if (!ativo) return
            if (status !== 'OK' || !resultado) {
              setEstado({ carregando: false, segundos: null, erro: 'Não foi possível calcular o tempo desta rota.' })
              return
            }

            const segundos = resultado.routes[0]?.legs?.reduce((total, trecho) => total + (trecho.duration?.value || 0), 0) || 0
            setEstado({ carregando: false, segundos, erro: '' })
          },
        )
      })
      .catch((error) => {
        console.error('Erro ao calcular duração da rota:', error)
        if (ativo) setEstado({ carregando: false, segundos: null, erro: 'Não foi possível calcular o tempo desta rota.' })
      })

    return () => { ativo = false }
  }, [enderecoOrigem, JSON.stringify(paradas)])

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <Clock3 size={17} aria-hidden="true" />
      {estado.carregando
        ? 'Calculando...'
        : estado.segundos != null
          ? `Aproximadamente ${formatarDuracao(estado.segundos)}`
          : estado.erro}
    </span>
  )
}

export default RouteDuration
