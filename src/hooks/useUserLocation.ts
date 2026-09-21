"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { reverseGeocode } from "@/lib/api/mapbox";

export interface UserLocation {
  lat: number;
  lng: number;
  cityName: string;
}

export interface UseUserLocationReturn {
  location: UserLocation;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

const DEFAULT_FALLBACK_LOCATION: UserLocation = {
  lat: 23.8103,
  lng: 90.4125,
  cityName: "Dhaka, Bangladesh",
};

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_FALLBACK_LOCATION);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      if (isMountedRef.current) {
        setError("Geolocation is not supported by this browser.");
        setLoading(false);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        let resolvedCity = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
        try {
          const place = await reverseGeocode(lat, lng);
          if (place && place.trim().length > 0) {
            resolvedCity = place;
          }
        } catch {
          // Graceful fallback to formatted coordinate
        }

        if (isMountedRef.current) {
          setLocation({
            lat,
            lng,
            cityName: resolvedCity,
          });
          setError(null);
          setLoading(false);
        }
      },
      (geoError) => {
        let errorMsg = "Unable to retrieve precise GPS location.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Showing default stargazing site.";
        } else if (geoError.code === geoError.TIMEOUT) {
          errorMsg = "Geolocation request timed out. Showing default stargazing site.";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          errorMsg = "Location signal unavailable. Showing default stargazing site.";
        }

        if (isMountedRef.current) {
          setError(errorMsg);
          // Keep current/default location as graceful fallback so components can still function
          setLocation((current) => current ?? DEFAULT_FALLBACK_LOCATION);
          setLoading(false);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    requestLocation();

    return () => {
      isMountedRef.current = false;
    };
  }, [requestLocation]);

  return {
    location,
    loading,
    error,
    requestLocation,
  };
}
