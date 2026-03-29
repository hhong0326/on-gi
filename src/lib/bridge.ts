const FALLBACK_POSITION = { lat: 37.5665, lng: 126.978 }; // Seoul

export async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return FALLBACK_POSITION;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(FALLBACK_POSITION);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
