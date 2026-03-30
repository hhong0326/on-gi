export interface PrayerPoint {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
  isUser: boolean;
  isActive: boolean; // true: 기도 중, false: 잔상 (7일 후 사라짐)
}
