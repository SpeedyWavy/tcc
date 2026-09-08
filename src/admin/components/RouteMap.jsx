import { useEffect, useRef } from 'react'
import { loadGoogleMaps } from '../../lib/googleMapsLoader.js'

/**
 * Desenha o trajeto completo (unidade -> paradas -> unidade) com a Directions API,
 * e marca cada parada - destacando a que esta selecionada (indiceAtual).
 *
 * paradas: [{ id, nome, endereco, latitude, longitude }], ja na ordem otimizada
 * (essa ordem vem pronta do back-end - esse componente NAO reotimiza, so desenha).
 */
function RouteMap({ enderecoOrigem, paradas, indiceAtual = 0, height = 320 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const rendererRef = useRef(null)
  const marcadoresRef = useRef([])

  useEffect(() => {
    let ativo = true

    loadGoogleMaps()
      .then((maps) => {
        if (!ativo || !containerRef.current) {
          return
        }

        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: { lat: -22.9099, lng: -47.0626 }, // Campinas, sera recentralizado ao carregar a rota
            zoom: 12,
            disableDefaultUI: true,
            zoomControl: true,
          })
        }

        if (!rendererRef.current) {
          rendererRef.current = new maps.DirectionsRenderer({
            map: mapRef.current,
            suppressMarkers: true, // usamos marcadores proprios pra poder destacar a parada atual
            preserveViewport: false,
            polylineOptions: {
              strokeColor: '#3355ff',
              strokeWeight: 4,
            },
          })
        }

        marcadoresRef.current.forEach((marcador) => marcador.setMap(null))
        marcadoresRef.current = []

        if (!enderecoOrigem || paradas.length === 0) {
          return
        }

        const paradasComCoordenadas = paradas.filter((p) => p.latitude != null && p.longitude != null)

        if (paradasComCoordenadas.length === 0) {
          return
        }

        const directionsService = new maps.DirectionsService()

        directionsService.route(
          {
            origin: enderecoOrigem,
            destination: enderecoOrigem,
            waypoints: paradasComCoordenadas.map((p) => ({
              location: { lat: p.latitude, lng: p.longitude },
              stopover: true,
            })),
            optimizeWaypoints: false, // a ordem ja vem otimizada do back-end
            travelMode: maps.TravelMode.DRIVING,
          },
          (resultado, status) => {
            if (!ativo) return

            if (status === 'OK' && resultado) {
              rendererRef.current.setDirections(resultado)
            } else {
              console.error('Erro ao tracar a rota:', status)
            }

            paradasComCoordenadas.forEach((parada, index) => {
              const ehAtual = paradas[indiceAtual]?.id === parada.id

              const marcador = new maps.Marker({
                position: { lat: parada.latitude, lng: parada.longitude },
                map: mapRef.current,
                label: {
                  text: String(index + 1),
                  color: '#fff',
                  fontWeight: 'bold',
                },
                icon: {
                  path: maps.SymbolPath.CIRCLE,
                  scale: ehAtual ? 14 : 10,
                  fillColor: ehAtual ? '#ff3366' : '#001355',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 2,
                },
                title: parada.nome,
                zIndex: ehAtual ? 999 : index,
              })

              marcadoresRef.current.push(marcador)
            })
          },
        )
      })
      .catch((error) => {
        console.error('Erro ao carregar Google Maps:', error)
      })

    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enderecoOrigem, JSON.stringify(paradas), indiceAtual])

  if (!enderecoOrigem || paradas.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f2f2f2',
          borderRadius: 12,
          color: '#999',
          fontSize: 13,
        }}
      >
        Sem paradas para mostrar no mapa
      </div>
    )
  }

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 12 }} />
}

export default RouteMap