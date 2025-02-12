import { useState, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  Polyline,
  Marker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const customIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const massachusettsBounds: [[number, number], [number, number]] = [
  [40, -78], // Southwest Corner (near Connecticut)
  [44.5, -65.5], // Northeast Corner (near New Hampshire/Maine border)
];

const FEATURE_SERVER_URL =
  "https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/L3_TAXPAR_POLY_ASSESS_gdb/FeatureServer/0/query";

export default function Map({
  setSidePanelOpen,
  parcels,
  setParcels,
  mapRef,
  pin,
  layer,
}: MapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(8);
  const abortControllerRef = useRef<AbortController | null>(null);

  function ClickHandler() {
    useMapEvents({
      async click(e) {
        if (zoomLevel < 15) {
          return;
        }

        // Abort the previous fetch if it exists
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create a new AbortController instance
        abortControllerRef.current = new AbortController();

        const { signal } = abortControllerRef.current;

        const { lat, lng } = e.latlng;

        const queryUrl = `${FEATURE_SERVER_URL}?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=json&resultType=tile`;

        const response = await fetch(queryUrl, { signal });
        const data = (await response.json()) as {
          features: {
            attributes: ParcelAttributes;
            geometry: ParcelGeometry;
          }[];
        };
        if (data.features.length > 0) {
          if (
            data.features[0].attributes.ADDR_NUM === undefined ||
            data.features[0].attributes.ADDR_NUM === null ||
            data.features[0].attributes.ADDR_NUM === `${0}` ||
            data.features[0].attributes.STYLE === "SCHOOL" ||
            (data.features[0].attributes.STYLE?.split(", ") || []).some(
              (style) => ["CHURCH", "SYNAGOGUE"].includes(style.toUpperCase())
            ) ||
            data.features[0].attributes.FULL_STR === null
          ) {
            return;
          }
          setParcels(
            data.features.sort((a, b) => {
              const locA = a.attributes.LOCATION
                ? parseInt(a.attributes.LOCATION, 10)
                : 0;
              const locB = b.attributes.LOCATION
                ? parseInt(b.attributes.LOCATION, 10)
                : 0;
              return locA - locB;
            })
          );
          setSidePanelOpen(true);
        } else {
          console.log("No parcel found at this location.");
        }
      },
      zoomend(e) {
        setZoomLevel(e.target.getZoom());
      },
    });
    return null;
  }

  return (
    <>
      <MapContainer
        center={[42.1, -71.5]}
        zoom={8}
        className={`flex-1 z-10`}
        minZoom={8}
        maxBounds={massachusettsBounds}
        maxBoundsViscosity={1.0}
        ref={mapRef}
      >
        {layer === "topographic" ? (
          <>
            <TileLayer
              url="https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Topographic_Features_for_Basemap/MapServer/tile/{z}/{y}/{x}"
              // attribution="&copy; MassGIS"
            />
            <TileLayer
              url="https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Structures/MapServer/tile/{z}/{y}/{x}"
              // attribution="&copy; MassGIS"
            />
            <TileLayer
              url="https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Basemap_Detailed_Features/MapServer/tile/{z}/{y}/{x}"
              // attribution="&copy; MassGIS"
            />
            <TileLayer
              url="https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Level3_Parcels/MapServer/tile/{z}/{y}/{x}"
              // attribution="&copy; MassGIS"
            />
          </>
        ) : (
          <>
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              // attribution="&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
            />
            {zoomLevel >= 18 ? (
              <TileLayer
                url="https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Level3_Parcels/MapServer/tile/{z}/{y}/{x}"
                // attribution="&copy; MassGIS"
              />
            ) : (
              <></>
            )}
          </>
        )}
        {parcels.length > 0 && zoomLevel >= 12 && (
          <Polyline
            positions={parcels[0].geometry.rings[0].map((ring) => [
              ring[1],
              ring[0],
            ])}
            color="#4055d0"
            fillOpacity={0.5}
            fillColor="#4055d0"
            fill={true}
            weight={2}
          />
        )}
        {pin && <Marker position={pin} icon={customIcon}></Marker>} */
        {/* Click Event Handler */}
        <ClickHandler />
      </MapContainer>
    </>
  );
}
