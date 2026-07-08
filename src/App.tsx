import Map from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

function App() {
  return (
    <div className="h-screen w-screen">
      <Map
        initialViewState={{
          latitude: 40.4168,
          longitude: -3.7038,
          zoom: 6,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
      />
    </div>
  )
}

export default App
