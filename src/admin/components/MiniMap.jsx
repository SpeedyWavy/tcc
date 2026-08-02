import { useEffect, useRef } from 'react'
import { loadGoogleMaps } from '../../lib/googleMapsLoader.js'

/**
 * Exibe um mapa pequeno com um marcador na posição (latitude, longitude).
 * Mostra uma mensagem de aviso se as coordenadas ainda não foram cadastradas.
 */
function MiniMap({ latitude, longitude, height = 180 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return undefined
    }

    let ativo = true

    loadGoogleMaps()
      .then((maps) => {
        if (!ativo || !containerRef.current) {
          return
        }

        const posicao = { lat: latitude, lng: longitude }

        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: posicao,
            zoom: 16,
            disableDefaultUI: true,
            zoomControl: true,
          })
        } else {
          mapRef.current.setCenter(posicao)
        }

        if (!markerRef.current) {
          markerRef.current = new maps.Marker({ position: posicao, map: mapRef.current })
        } else {
          markerRef.current.setPosition(posicao)
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar Google Maps:', error)
      })

    return () => {
      ativo = false
    }
  }, [latitude, longitude])

  if (latitude == null || longitude == null) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f2f2f2',
          borderRadius: 8,
          color: '#999',
          fontSize: 13,
          textAlign: 'center',
          padding: '0 12px',
        }}
      >
        Endereço sem coordenadas cadastradas
      </div>
    )
  }

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 8 }} />
}

export default MiniMap