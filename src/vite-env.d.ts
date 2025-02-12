/// <reference types="vite/client" />

interface ParcelAttributes {
  OBJECTID: number;
  MAP_PAR_ID: string;
  LOC_ID: string;
  POLY_TYPE: string;
  MAP_NO: string;
  SOURCE: string;
  PLAN_ID: string | null;
  LAST_EDIT: number;
  BND_CHK: string | null;
  NO_MATCH: string;
  TOWN_ID: number;
  PROP_ID: string;
  BLDG_VAL: number;
  LAND_VAL: number;
  OTHER_VAL: number;
  TOTAL_VAL: number;
  FY: number;
  LOT_SIZE: number;
  LS_DATE: string;
  LS_PRICE: number;
  USE_CODE: string;
  SITE_ADDR: string;
  ADDR_NUM: string | null;
  FULL_STR: string;
  LOCATION: string | null;
  CITY: string;
  ZIP: string | null;
  OWNER1: string;
  OWN_ADDR: string;
  OWN_CITY: string;
  OWN_STATE: string;
  OWN_ZIP: string | null;
  OWN_CO: string | null;
  LS_BOOK: string | null;
  LS_PAGE: string | null;
  REG_ID: string | null;
  ZONING: string | null;
  YEAR_BUILT: number | null;
  BLD_AREA: number | null;
  UNITS: number | null;
  RES_AREA: number | null;
  STYLE: string | null;
  NUM_ROOMS: number | null;
  LOT_UNITS: string;
  STORIES: string | null;
  GlobalID: string;
  Shape__Area: number;
  Shape__Length: number;
}

interface ParcelGeometry {
  rings: number[][][];
}

type Parcel = {
  attributes: ParcelAttributes;
  geometry: ParcelGeometry;
  center?: [number, number];
};

type Tip =
  | {
      description: string;
      parcel: Parcel;
    }
  | undefined;

interface GeocodeResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  boundingbox: [string, string, string, string];
}

interface MapProps {
  sidePanelOpen: boolean;
  setSidePanelOpen: Dispatch<SetStateAction<boolean>>;
  parcels: Parcel[];
  setParcels: Dispatch<SetStateAction<Parcel[]>>;
  mapRef: RefObject<L.Map | null>;
  pin: [number, number] | null;
  setPin: Dispatch<SetStateAction<[number, number] | null>>;
  layer: "topographic" | "satellite";
}
