import { useState, useEffect, useRef } from "react";

import Map from "./components/Map";

import L from "leaflet";

const useDebounce = (value: string, delay: number = 1000) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value) return setDebouncedValue(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsSearching(true);

    timeoutRef.current = setTimeout(() => {
      setIsSearching(false);
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, delay]);

  return { debouncedValue, isSearching };
};

export default function App() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const closingAnimationRef = useRef<NodeJS.Timeout>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map>(null);

  const [miniSearchMenu, setMiniSearchMenu] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [propertiesPage, setPropertiesPage] = useState(0);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [tip, setTip] = useState<Tip>(undefined);
  const [isClosed, setIsClosed] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const { debouncedValue, isSearching } = useDebounce(searchInput, 1000);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [selectedPanelMenu, setSelectedPanelMenu] = useState<
    "properties" | "tip"
  >("properties");
  const [layer, setLayer] = useState<"topographic" | "satellite">(
    "topographic"
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prevIndex) =>
        prevIndex < searchResults.length - 1 ? prevIndex + 1 : prevIndex
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : prevIndex
      );
    }

    if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      if (mapRef.current) {
        mapRef.current.setView(
          [
            Number(searchResults[highlightIndex].lat),
            Number(searchResults[highlightIndex].lon),
          ],
          16,
          { animate: true }
        );
        setPin([
          Number(searchResults[highlightIndex].lat),
          Number(searchResults[highlightIndex].lon),
        ]);
        setSearchFocused(false);
        setMiniSearchMenu(false);
      }
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  async function fetchData(query: string) {
    if (!query) return;

    // Abort the previous fetch if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new AbortController instance
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&viewbox=-73.5081,42.8868,-69.9285,41.2379&bounded=1`,
        { signal } // Pass the abort signal to fetch
      );

      const data = await response.json();

      // Further filter results to ensure they contain 'Massachusetts'
      const filteredResults = data.filter((result: any) =>
        result.display_name.includes("Massachusetts")
      );

      setSearchResults(filteredResults);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Fetch request was aborted.");
      } else {
        console.error("Error fetching data:", error);
      }
    }
  }

  useEffect(() => {
    setHighlightIndex(-1);
  }, [searchResults]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [searchInput, searchFocused]);

  useEffect(() => {
    if (debouncedValue) {
      setSearchResults([]);
      fetchData(debouncedValue);
    }
  }, [debouncedValue]);

  useEffect(() => {
    if (closingAnimationRef.current) {
      clearTimeout(closingAnimationRef.current);
    }
    if (!sidePanelOpen) {
      closingAnimationRef.current = setTimeout(() => {
        setIsClosed(true);
      }, 200);
    } else {
      setIsClosed(false);
    }
  }, [sidePanelOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isSmallScreen) {
      setSidePanelOpen(false);
      if (searchFocused) {
        setMiniSearchMenu(true);
        inputRef.current?.focus();
      }
    }
  }, [isSmallScreen, searchFocused]);

  useEffect(() => {
    if (miniSearchMenu) {
      setSearchFocused(true);
      inputRef.current?.focus();
    }
  }, [miniSearchMenu]);

  useEffect(() => {
    if (parcels.length === 0) return;
    setSelectedPanelMenu("properties");
    setPropertiesPage(0);
    setPin(null);
  }, [parcels]);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [highlightIndex]);

  return (
    <div className="/container w-full h-svh flex flex-col overflow-hidden min-h-[27rem] antialiased">
      {/* Navbar */}
      <div
        className="h-16 max-h-[16vw] bg-blue-900 border-b border-black flex items-center justify-between text-white"
        onClick={() => {
          setMiniSearchMenu(false);
          setSearchFocused(false);
        }}
      >
        <div className="flex items-center select-none">
          <div className="hidden sm:flex ml-5 sm:ml-4 w-9 h-9">
            <img
              src="/Seal_of_Massachusetts.svg.png"
              alt="Logo"
              width={200}
              height={200}
              className="aspect-square"
            />
          </div>
          <p className="ml-4 /hidden sm:block md:hidden text-sm sm:text-base line-clamp-1">
            Code Violations Reporter - MA
          </p>
          <p className="ml-4 hidden md:block">
            Massachusetts Code Violations Reporter
          </p>
        </div>
        <div className="flex ">
          <div className="px-5 sm:px-8 h-full text-white flex justify-center items-center sm:border-l sm:border-white/25 select-none">
            <p className="hidden sm:block cursor-pointer">
              Administrative Login
            </p>
            <div className="sm:hidden">
              <i
                className="fa-solid fa-magnifying-glass mr-7 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setMiniSearchMenu((prev) => !prev);
                  setSidePanelOpen(false);
                }}
              ></i>
            </div>
            <div className="sm:hidden">
              <i className="fa-solid fa-user cursor-pointer"></i>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 w-full h-full relative bg-white">
        {/* Layers Toggle */}
        <div
          className="border h-14 w-14 absolute left-3 bottom-3 z-50 rounded-lg overflow-hidden border-black/25 shadow cursor-pointer group"
          onClick={() =>
            setLayer((prev) =>
              prev === "topographic" ? "satellite" : "topographic"
            )
          }
        >
          <div className="h-full w-full overflow-hidden">
            {layer === "satellite" ? (
              <img
                src="/topographic.png"
                alt="Layers"
                width={200}
                height={200}
                className="aspect-square transition-transform group-hover:scale-110 group-hover:duration-200 group-hover:ease-in duration-200 ease-in"
              />
            ) : (
              <img
                src="/satellite.png"
                alt="Layers"
                width={200}
                height={200}
                className="aspect-square transition-transform group-hover:scale-110 group-hover:duration-200 group-hover:ease-in duration-200 ease-in"
              />
            )}
          </div>
        </div>

        {/* parcel data */}
        <div
          className={`${
            parcels.length === 0 && tip === undefined
              ? "opacity-0 translate-x-[19.5rem] pointer-events-none duration-0"
              : sidePanelOpen
              ? "translate-x-0 duration-500 ease-out bg-white/75"
              : `${
                  isClosed ? "hover:bg-black/50" : ""
                } bg-black/25 translate-x-[19.5rem] duration-200 ease-in`
          } overflow-hidden w-80 max-w-[85vw] px-4 absolute right-3 top-3 z-50 h-80 rounded-lg shadow border border-black/25 backdrop-blur-lg`}
          onClick={() => setSearchFocused(false)}
        >
          <div
            className={`${
              sidePanelOpen
                ? "duration-500 ease-out opacity-100"
                : "duration-200 ease-in opacity-0"
            } absolute transition-opacity top-0 left-0 w-full h-full flex flex-col`}
          >
            {/* Header */}
            <div className="h-7 w-full flex justify-between text-sm select-none text-white">
              <div
                className={`${
                  selectedPanelMenu === "properties"
                    ? "duration-0 bg-blue-600"
                    : "duration-75 ease-in bg-blue-900 hover:bg-blue-600 hover:ease-out cursor-pointer"
                } border-white/25 hover:duration-100 flex-1 text-center flex justify-center items-center border-r`}
                onClick={() => setSelectedPanelMenu("properties")}
              >
                Properties
              </div>
              <div
                className={`${
                  selectedPanelMenu === "tip"
                    ? "duration-0 bg-blue-600"
                    : "duration-75 ease-in bg-blue-900 hover:bg-blue-600 hover:ease-out cursor-pointer"
                } border-white/25 hover:duration-100 flex-1 text-center flex justify-center items-center border-r`}
                onClick={() => setSelectedPanelMenu("tip")}
              >
                Active Tip
              </div>
              <div
                className={`h-full w-8 flex justify-center items-center bg-blue-900 transition-colors duration-75 ease-in hover:bg-red-700 hover:duration-100 hover:ease-out cursor-pointer`}
                onClick={() => setSidePanelOpen(false)}
              >
                <i className="fa-solid fa-times cursor-pointer"></i>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto flex flex-col p-4 text-black text-xs">
              {selectedPanelMenu === "properties" && parcels.length > 0 && (
                <>
                  {/* Pagination Controls */}
                  {parcels.length > 1 && (
                    <div className="flex items-center mb-2">
                      <i
                        className="text-lg text-black/60 fa-solid fa-caret-left hover:text-black cursor-pointer"
                        onClick={() => {
                          setPropertiesPage((prev) =>
                            prev === 0 ? parcels.length - 1 : prev - 1
                          );
                        }}
                      />
                      <p className="text-sm px-2 select-none">
                        ({propertiesPage + 1} of {parcels.length})
                      </p>
                      <i
                        className="text-lg text-black/60 fa-solid fa-caret-right hover:text-black cursor-pointer"
                        onClick={() => {
                          setPropertiesPage((prev) =>
                            prev === parcels.length - 1 ? 0 : prev + 1
                          );
                        }}
                      />
                    </div>
                  )}

                  {/* Property Details */}
                  <div className="pb-2 mb-2 border-b border-black/50">
                    <p className="font-bold">
                      {parcels[propertiesPage]?.attributes?.ADDR_NUM?.split(
                        " "
                      ).join("-") || "N/A"}{" "}
                      {parcels[propertiesPage]?.attributes?.FULL_STR || "N/A"}{" "}
                      {parcels[propertiesPage]?.attributes?.LOCATION
                        ? `#${parcels[propertiesPage].attributes.LOCATION}`
                        : ""}
                    </p>
                    <p className="font-bold">
                      {parcels[propertiesPage]?.attributes?.CITY || "N/A"}{" "}
                      {parcels[propertiesPage]?.attributes?.OWN_ZIP || ""}
                    </p>
                  </div>

                  {/* More Property Info */}
                  <div className="mb-4">
                    <p>
                      Owner:{" "}
                      <span className="text-blue-800">
                        {parcels[propertiesPage]?.attributes?.OWNER1 || "N/A"}
                      </span>
                    </p>
                    {parcels[propertiesPage]?.attributes?.NUM_ROOMS ? (
                      <p>
                        Rooms:{" "}
                        <span className="text-blue-800">
                          {parcels[propertiesPage].attributes.NUM_ROOMS}
                        </span>
                      </p>
                    ) : (
                      <></>
                    )}
                    {parcels[propertiesPage]?.attributes?.UNITS ? (
                      <p>
                        Units:{" "}
                        <span className="text-blue-800">
                          {parcels[propertiesPage].attributes.UNITS}
                        </span>
                      </p>
                    ) : (
                      <></>
                    )}
                    {parcels[propertiesPage]?.attributes?.YEAR_BUILT ? (
                      <p>
                        Year Built:{" "}
                        <span className="text-blue-800">
                          {parcels[propertiesPage].attributes.YEAR_BUILT}
                        </span>
                      </p>
                    ) : (
                      <></>
                    )}
                    <p>
                      Building Value:{" "}
                      <span className="text-green-700">
                        ${parcels[propertiesPage]?.attributes?.BLDG_VAL || 0}
                      </span>
                    </p>
                    <p>
                      Land Value:{" "}
                      <span className="text-green-700">
                        ${parcels[propertiesPage]?.attributes?.LAND_VAL || 0}
                      </span>
                    </p>
                    <p>
                      Other Value:{" "}
                      <span className="text-green-700">
                        ${parcels[propertiesPage]?.attributes?.OTHER_VAL || 0}
                      </span>
                    </p>
                    <p>
                      Total Value:{" "}
                      <span className="text-green-700">
                        ${parcels[propertiesPage]?.attributes?.TOTAL_VAL || 0}
                      </span>
                    </p>
                  </div>

                  {/* Report Button */}
                  <div className="flex-1 h-full flex items-end w-full">
                    <button
                      className={`${
                        tip &&
                        parcels[propertiesPage].attributes.GlobalID ===
                          tip.parcel.attributes.GlobalID
                          ? "bg-gray-500 cursor-not-allowed text-white/75"
                          : "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                      } h-7 w-full transition-colors duration-75 ease-in hover:duration-100 hover:ease-out cursor-pointer py-1 px-2 rounded-lg flex justify-center items-center`}
                      disabled={
                        tip &&
                        parcels[propertiesPage].attributes.GlobalID ===
                          tip.parcel.attributes.GlobalID
                      }
                      onClick={() => {
                        setTip({
                          description: "",
                          parcel: parcels[propertiesPage],
                        });
                        setSelectedPanelMenu("tip");
                        setTimeout(() => {
                          descriptionRef.current?.focus();
                        }, 100);
                      }}
                    >
                      Select Property
                    </button>
                  </div>
                </>
              )}
              {selectedPanelMenu === "tip" && (
                <>
                  {/* Report Button */}
                  <div className="flex-1 h-full flex flex-col w-full">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        alert("Tip Submitted!");
                        setTip(undefined);
                        setSidePanelOpen(false);
                        setTimeout(() => {
                          setParcels([]);
                        }, 200);
                      }}
                      className="flex flex-col flex-1"
                    >
                      {tip === undefined ? (
                        <div className="flex-1">
                          <p className="">
                            Please select a property to report a tip.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Property Details */}
                          <div className="pb-2 mb-2 border-b border-black/50">
                            <p className="font-bold">
                              {tip.parcel?.attributes?.ADDR_NUM?.split(
                                " "
                              ).join("-") || "N/A"}{" "}
                              {tip.parcel?.attributes?.FULL_STR || "N/A"}{" "}
                              {tip.parcel?.attributes?.LOCATION
                                ? `#${tip.parcel.attributes.LOCATION}`
                                : ""}
                            </p>
                            <p className="font-bold">
                              {tip.parcel?.attributes?.CITY || "N/A"}{" "}
                              {tip.parcel?.attributes?.OWN_ZIP || ""}
                            </p>
                          </div>
                          <div className="mb-4">
                            <p>
                              Owner:{" "}
                              <span className="text-blue-800">
                                {tip.parcel?.attributes?.OWNER1 || "N/A"}
                              </span>
                            </p>
                          </div>
                          <div className="flex-1 h-full w-full flex mb-4 border border-black/25 shadow overflow-hidden rounded-lg">
                            <textarea
                              className="flex-1 h-full w-full p-2 resize-none outline-none bg-white"
                              placeholder="Enter a description..."
                              ref={descriptionRef}
                              value={tip?.description}
                              onChange={(e) =>
                                setTip((prev) => {
                                  if (prev === undefined) return prev;
                                  return {
                                    ...prev,
                                    description: e.target.value,
                                  };
                                })
                              }
                            />
                          </div>
                        </>
                      )}
                      <input
                        type="submit"
                        className={`${
                          tip === undefined || tip.description === ""
                            ? "bg-gray-500 cursor-not-allowed text-white/75"
                            : "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                        } h-7 w-full transition-colors duration-75 ease-in hover:duration-100 hover:ease-out py-1 px-2 rounded-lg flex justify-center items-center`}
                        value="Submit Tip"
                      />
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Open Button */}
          <div
            className={`${
              sidePanelOpen
                ? "opacity-0 pointer-events-none duration-100"
                : "opacity-100 pointer-events-auto duration-200 ease-in cursor-pointer"
            } absolute top-0 left-0 w-5 h-full text-white transition-all flex items-center justify-center`}
            onClick={() => {
              setSidePanelOpen(true);
            }}
          >
            <i className="fa-solid fa-angle-left"></i>
          </div>
        </div>
        {/* Search */}
        <div
          className={`${
            miniSearchMenu && isSmallScreen
              ? "bg-black/25 z-50 backdrop-blur-lg px-[5vw] py-3"
              : "hidden sm:block"
          } absolute top-0 left-0 w-full h-full`}
          onClick={() => {
            setSearchFocused(false);
            setMiniSearchMenu(false);
          }}
        >
          {/* Search Input */}
          <input
            className={`${
              searchFocused
                ? miniSearchMenu && isSmallScreen
                  ? "bg-white/90 text-black"
                  : "bg-white/75 text-black placeholder:text-black/60 caret-black border shadow border-black/25"
                : "bg-black/25 text-white/70 placeholder:text-white/75 border-white/25"
            } ${
              miniSearchMenu && isSmallScreen
                ? "w-full"
                : "w-80 max-w-[35vw] z-50 absolute top-3 left-14 backdrop-blur-lg focus-within:bg-white/75 focus-within:text-black"
            } border h-10 px-4 rounded-full transition-colors duration-500 ease-out outline-none text-sm md:text-base`}
            placeholder="Search Address"
            type="text"
            onFocus={() => setSearchFocused(true)}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown} // Handle key events
            ref={inputRef}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Search Results */}
          <div
            className={`${
              searchFocused && !isSearching && searchResults.length > 0
                ? miniSearchMenu && isSmallScreen
                  ? "shadow border border-black/25 opacity-100 duration-500 ease-out bg-white/90"
                  : "shadow border border-black/25 opacity-100 duration-500 ease-out bg-white/75"
                : "pointer-events-none opacity-0 duration-0 ease-in bg-black/25"
            } ${
              miniSearchMenu && isSmallScreen
                ? "w-full mt-4 text-black"
                : "w-[19rem] max-w-[35vw] absolute left-14 top-16 z-50 backdrop-blur-lg text-black/75"
            } max-h-[62.5vh] transition-all rounded-lg font-mono text-xs flex flex-col overflow-hidden`}
          >
            <div className="overflow-y-auto h-max select-none divide-y divide-black/30">
              {searchResults.map((result, index) => (
                <div
                  key={result.place_id}
                  ref={index === highlightIndex ? resultRef : null} // Attach ref to highlighted item
                  className={`px-4 py-2.5 cursor-pointer ${
                    index === highlightIndex
                      ? "bg-blue-400/75"
                      : miniSearchMenu && isSmallScreen
                      ? "hover:bg-blue-300/75"
                      : "hover:bg-blue-300/60"
                  }`}
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setView(
                        [Number(result.lat), Number(result.lon)],
                        16,
                        { animate: true }
                      );
                      setPin([Number(result.lat), Number(result.lon)]);
                      setSearchFocused(false);
                      setMiniSearchMenu(false);
                    }
                  }}
                >
                  {result.display_name}
                </div>
              ))}
            </div>
          </div>
          {/* Loading Indicator */}
          <div
            className={`${
              searchFocused && isSearching && searchInput
                ? "shadow border border-black/25 opacity-100 bg-black/25"
                : "pointer-events-none opacity-0"
            } ${
              miniSearchMenu && isSmallScreen ? "right-[calc(5vw)]" : "left-14"
            } w-max text-white absolute top-16 z-50 backdrop-blur-lg transition-all rounded font-mono text-xs`}
          >
            {isSearching && <p className="py-2 px-4">loading...</p>}
          </div>
        </div>

        <div
          className={`
                flex-1 z-10 flex`}
          onClick={() => {
            setSearchFocused(false);
          }}
        >
          <div
            className={`${
              searchFocused ? "/pointer-events-none" : "/pointer-events-auto"
            } flex-1 flex`}
          >
            <Map
              sidePanelOpen={sidePanelOpen}
              setSidePanelOpen={setSidePanelOpen}
              parcels={parcels}
              setParcels={setParcels}
              mapRef={mapRef}
              pin={pin}
              setPin={setPin}
              layer={layer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
