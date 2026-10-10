import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { getLocationSuggestions } from "../services/api";

function LocationAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  placeholder = "Search location...",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Stores the place selected by the user.
  // This prevents React from searching for the same value again.
  const selectedPlaceRef = useRef(null);

  // Used to ignore old API responses.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    const query = value?.trim() || "";

    // Nothing to search.
    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setShowSuggestions(false);
      return;
    }

    // VERY IMPORTANT:
    // User has already selected this exact place.
    // Do not call SerpApi again.
    if (selectedPlaceRef.current === value) {
      setLoading(false);
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);

    // Wait until the user pauses typing.
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;

      try {
        setLoading(true);

        console.log("Searching for:", query);

        const results = await getLocationSuggestions(query);

        // Ignore an older request if a newer one has already started.
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.log("Suggestions received:", results);

        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error(
          "Autocomplete request failed:",
          error
        );

        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 600);

    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleChange = (event) => {
    const newValue = event.target.value;

    // User is typing again, so it is no longer
    // the previously selected place.
    selectedPlaceRef.current = null;

    onChange(newValue);

    if (newValue.trim().length >= 2) {
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (place) => {
    console.log("Selected place:", place);

    // Remember that this exact value came from a selection.
    selectedPlaceRef.current = place.name;

    // Put only the place name in the input.
    onChange(place.name);

    if (onSelect) {
    onSelect(place);
  }

    // Immediately remove the dropdown.
    setSuggestions([]);
    setShowSuggestions(false);
    setLoading(false);
  };

  const handleClear = () => {
    selectedPlaceRef.current = null;

    onChange("");

    setSuggestions([]);
    setShowSuggestions(false);
    setLoading(false);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
    >
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">
        <MapPin
          size={20}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          autoComplete="off"
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2">
          {loading ? (
            <Loader2
              size={18}
              className="animate-spin text-blue-500"
            />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          ) : (
            <Search
              size={18}
              className="text-slate-400"
            />
          )}
        </div>
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          
          {loading && (
            <div className="px-4 py-4 text-sm text-slate-500">
              Searching locations...
            </div>
          )}

          {!loading &&
            suggestions.length > 0 &&
            suggestions.map((place, index) => (
              <button
                key={
                  place.dataId ||
                  `${place.name}-${place.latitude}-${index}`
                }
                type="button"
                onClick={() => handleSelect(place)}
                className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-blue-50"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin
                    size={17}
                    className="text-blue-600"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {place.name}
                  </p>

                  {place.address && (
                    <p className="mt-1 text-xs text-slate-500">
                      {place.address}
                    </p>
                  )}
                </div>
              </button>
            ))}

          {!loading &&
            suggestions.length === 0 &&
            value.trim().length >= 2 && (
              <div className="px-4 py-4 text-sm text-slate-500">
                No locations found.
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default LocationAutocomplete;