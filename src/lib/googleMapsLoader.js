let loadPromise = null

/**
 * Carrega o script da Google Maps JavaScript API (com a lib "places") uma única vez
 * e reutiliza a mesma Promise em chamadas subsequentes.
 * Requer a variável de ambiente VITE_GOOGLE_MAPS_API_KEY definida no .env.
 */
export function loadGoogleMaps() {
  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve(window.google.maps)
      return
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY não definida no arquivo .env'))
      return
    }

    const scriptExistente = document.querySelector('script[data-google-maps-loader]')
    if (scriptExistente) {
      scriptExistente.addEventListener('load', () => resolve(window.google.maps))
      scriptExistente.addEventListener('error', () => reject(new Error('Falha ao carregar Google Maps')))
      return
    }

    window.__initGoogleMaps = () => {
      resolve(window.google.maps)
      delete window.__initGoogleMaps
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__initGoogleMaps`
    script.async = true
    script.defer = true
    script.dataset.googleMapsLoader = 'true'
    script.addEventListener('error', () => reject(new Error('Falha ao carregar Google Maps')))

    document.head.appendChild(script)
  })

  return loadPromise
}
// 