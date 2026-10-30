/**
 * Standar Antropometri Anak 0-60 Bulan
 * Berdasarkan WHO Child Growth Standards (2006), PMK Kemenkes RI No. 2 Tahun 2020,
 * dan Pedoman Asuhan Nutrisi Pediatrik (ANP) Ikatan Dokter Anak Indonesia (IDAI).
 */

export interface AnthropometryEvaluation {
  ageMonths: number;
  ageFormatted: string;
  // Indeks 1: BB/U (Permenkes No. 2 Tahun 2020)
  weightCategory:
    | 'Berat Badan Sangat Kurang / Severely Underweight (< -3 SD)'
    | 'Berat Badan Kurang / Underweight (-3 SD s/d < -2 SD)'
    | 'Berat Badan Normal (-2 SD s/d +1 SD)'
    | 'Risiko Berat Badan Lebih (> +1 SD)';
  // Indeks 2: PB/U atau TB/U (Permenkes No. 2 Tahun 2020)
  heightCategory:
    | 'Sangat Pendek / Severely Stunted (< -3 SD)'
    | 'Pendek / Stunted (-3 SD s/d < -2 SD)'
    | 'Normal (-2 SD s/d +3 SD)'
    | 'Tinggi (> +3 SD)';
  // Indeks 3: BB/PB atau BB/TB (Status Gizi Akut / Wasting - Permenkes No. 2 Tahun 2020 & IDAI)
  wfhCategory:
    | 'Gizi Buruk / Severely Wasted (< -3 SD)'
    | 'Gizi Kurang / Wasted (-3 SD s/d < -2 SD)'
    | 'Gizi Baik / Normal (-2 SD s/d +1 SD)'
    | 'Berisiko Gizi Lebih (> +1 SD s/d +2 SD)'
    | 'Gizi Lebih / Obesitas (> +2 SD)';
  // Data Klinis ANP IDAI (Berat Badan Ideal & Estimasi Kalori)
  medianWeightForAge: number;
  medianHeightForAge: number;
  idealBodyWeightKg: number; // BBI sesuai panjang/tinggi badan aktual
  estimatedDailyCaloriesKcal: number; // BBI x RDA usia tinggi (ANP IDAI)
  bmiOrStatureNotes: string[];
  measurementRecencyNote: string;
  whoReference: string;
}

// Tabel WHO BB/U Laki-laki (0-60 bulan): min3 (-3SD), min2 (-2SD), median (0SD), plus1 (+1SD), plus2 (+2SD)
const WHO_BOYS_WEIGHT: Record<number, { min3: number; min2: number; median: number; plus1: number; plus2: number }> = {
  0: { min3: 2.1, min2: 2.5, median: 3.3, plus1: 3.9, plus2: 4.4 },
  1: { min3: 2.9, min2: 3.4, median: 4.5, plus1: 5.1, plus2: 5.8 },
  2: { min3: 3.8, min2: 4.3, median: 5.6, plus1: 6.3, plus2: 7.1 },
  3: { min3: 4.4, min2: 5.0, median: 6.4, plus1: 7.2, plus2: 8.0 },
  4: { min3: 4.9, min2: 5.6, median: 7.0, plus1: 7.8, plus2: 8.7 },
  5: { min3: 5.3, min2: 6.0, median: 7.5, plus1: 8.4, plus2: 9.3 },
  6: { min3: 5.7, min2: 6.4, median: 7.9, plus1: 8.8, plus2: 9.8 },
  7: { min3: 5.9, min2: 6.7, median: 8.3, plus1: 9.2, plus2: 10.3 },
  8: { min3: 6.2, min2: 6.9, median: 8.6, plus1: 9.6, plus2: 10.7 },
  9: { min3: 6.4, min2: 7.1, median: 8.9, plus1: 9.9, plus2: 11.0 },
  10: { min3: 6.6, min2: 7.4, median: 9.2, plus1: 10.2, plus2: 11.4 },
  11: { min3: 6.8, min2: 7.6, median: 9.4, plus1: 10.5, plus2: 11.7 },
  12: { min3: 6.9, min2: 7.7, median: 9.6, plus1: 10.8, plus2: 12.0 },
  15: { min3: 7.4, min2: 8.3, median: 10.3, plus1: 11.5, plus2: 12.8 },
  18: { min3: 7.9, min2: 8.8, median: 10.9, plus1: 12.2, plus2: 13.7 },
  21: { min3: 8.3, min2: 9.2, median: 11.5, plus1: 12.9, plus2: 14.5 },
  24: { min3: 8.6, min2: 9.7, median: 12.2, plus1: 13.6, plus2: 15.3 },
  30: { min3: 9.4, min2: 10.5, median: 13.3, plus1: 15.0, plus2: 16.9 },
  36: { min3: 10.0, min2: 11.3, median: 14.3, plus1: 16.2, plus2: 18.3 },
  42: { min3: 10.7, min2: 12.0, median: 15.3, plus1: 17.3, plus2: 19.7 },
  48: { min3: 11.3, min2: 12.7, median: 16.3, plus1: 18.6, plus2: 21.2 },
  54: { min3: 11.9, min2: 13.4, median: 17.3, plus1: 19.8, plus2: 22.7 },
  60: { min3: 12.4, min2: 14.1, median: 18.3, plus1: 21.0, plus2: 24.2 },
};

// Tabel WHO BB/U Perempuan (0-60 bulan)
const WHO_GIRLS_WEIGHT: Record<number, { min3: number; min2: number; median: number; plus1: number; plus2: number }> = {
  0: { min3: 2.0, min2: 2.4, median: 3.2, plus1: 3.7, plus2: 4.2 },
  1: { min3: 2.7, min2: 3.2, median: 4.2, plus1: 4.8, plus2: 5.5 },
  2: { min3: 3.4, min2: 3.9, median: 5.1, plus1: 5.8, plus2: 6.6 },
  3: { min3: 4.0, min2: 4.5, median: 5.8, plus1: 6.6, plus2: 7.5 },
  4: { min3: 4.4, min2: 5.0, median: 6.4, plus1: 7.3, plus2: 8.2 },
  5: { min3: 4.8, min2: 5.4, median: 6.9, plus1: 7.8, plus2: 8.8 },
  6: { min3: 5.1, min2: 5.7, median: 7.3, plus1: 8.2, plus2: 9.3 },
  7: { min3: 5.3, min2: 6.0, median: 7.6, plus1: 8.6, plus2: 9.8 },
  8: { min3: 5.6, min2: 6.3, median: 7.9, plus1: 9.0, plus2: 10.2 },
  9: { min3: 5.8, min2: 6.5, median: 8.2, plus1: 9.3, plus2: 10.5 },
  10: { min3: 5.9, min2: 6.7, median: 8.5, plus1: 9.6, plus2: 10.9 },
  11: { min3: 6.1, min2: 6.9, median: 8.7, plus1: 9.9, plus2: 11.2 },
  12: { min3: 6.3, min2: 7.0, median: 8.9, plus1: 10.1, plus2: 11.5 },
  15: { min3: 6.7, min2: 7.6, median: 9.6, plus1: 10.9, plus2: 12.4 },
  18: { min3: 7.2, min2: 8.1, median: 10.2, plus1: 11.6, plus2: 13.2 },
  21: { min3: 7.6, min2: 8.6, median: 10.9, plus1: 12.4, plus2: 14.0 },
  24: { min3: 8.1, min2: 9.0, median: 11.5, plus1: 13.0, plus2: 14.8 },
  30: { min3: 8.9, min2: 10.0, median: 12.7, plus1: 14.4, plus2: 16.5 },
  36: { min3: 9.6, min2: 10.8, median: 13.9, plus1: 15.8, plus2: 18.1 },
  42: { min3: 10.2, min2: 11.6, median: 15.0, plus1: 17.1, plus2: 19.6 },
  48: { min3: 10.8, min2: 12.3, median: 16.1, plus1: 18.5, plus2: 21.2 },
  54: { min3: 11.4, min2: 13.0, median: 17.2, plus1: 19.9, plus2: 22.8 },
  60: { min3: 12.1, min2: 13.7, median: 18.2, plus1: 21.1, plus2: 24.4 },
};

// Tabel WHO PB/U & TB/U (cm) Laki-laki (0-60 bulan)
const WHO_BOYS_HEIGHT: Record<number, { min3: number; min2: number; median: number; plus3: number }> = {
  0: { min3: 44.2, min2: 46.1, median: 49.9, plus3: 55.6 },
  1: { min3: 48.9, min2: 50.8, median: 54.7, plus3: 60.6 },
  2: { min3: 52.4, min2: 54.4, median: 58.4, plus3: 64.4 },
  3: { min3: 55.3, min2: 57.3, median: 61.4, plus3: 67.6 },
  4: { min3: 57.6, min2: 59.7, median: 63.9, plus3: 70.1 },
  5: { min3: 59.6, min2: 61.7, median: 65.9, plus3: 72.2 },
  6: { min3: 61.2, min2: 63.3, median: 67.6, plus3: 74.0 },
  9: { min3: 65.2, min2: 67.5, median: 72.0, plus3: 78.7 },
  12: { min3: 68.6, min2: 71.0, median: 75.7, plus3: 82.9 },
  15: { min3: 71.6, min2: 74.1, median: 79.1, plus3: 86.7 },
  18: { min3: 74.2, min2: 76.9, median: 82.3, plus3: 90.4 },
  24: { min3: 78.7, min2: 81.7, median: 87.8, plus3: 97.0 },
  30: { min3: 82.4, min2: 85.7, median: 92.3, plus3: 102.3 },
  36: { min3: 85.0, min2: 88.7, median: 96.1, plus3: 107.2 },
  42: { min3: 88.1, min2: 92.0, median: 99.9, plus3: 111.7 },
  48: { min3: 90.7, min2: 94.9, median: 103.3, plus3: 115.9 },
  54: { min3: 93.4, min2: 97.8, median: 106.7, plus3: 120.0 },
  60: { min3: 96.1, min2: 100.7, median: 110.0, plus3: 123.9 },
};

// Tabel WHO PB/U & TB/U (cm) Perempuan (0-60 bulan)
const WHO_GIRLS_HEIGHT: Record<number, { min3: number; min2: number; median: number; plus3: number }> = {
  0: { min3: 43.6, min2: 45.4, median: 49.1, plus3: 54.7 },
  1: { min3: 47.8, min2: 49.8, median: 53.7, plus3: 59.5 },
  2: { min3: 51.0, min2: 53.0, median: 57.1, plus3: 63.2 },
  3: { min3: 53.5, min2: 55.6, median: 59.8, plus3: 66.1 },
  4: { min3: 55.6, min2: 57.8, median: 62.1, plus3: 68.6 },
  5: { min3: 57.4, min2: 59.6, median: 64.0, plus3: 70.7 },
  6: { min3: 58.9, min2: 61.2, median: 65.7, plus3: 72.5 },
  9: { min3: 62.9, min2: 65.3, median: 70.1, plus3: 77.4 },
  12: { min3: 66.3, min2: 68.9, median: 74.0, plus3: 81.7 },
  15: { min3: 69.3, min2: 72.0, median: 77.5, plus3: 85.7 },
  18: { min3: 72.0, min2: 74.9, median: 80.7, plus3: 89.4 },
  24: { min3: 76.7, min2: 80.0, median: 86.4, plus3: 96.1 },
  30: { min3: 80.3, min2: 83.8, median: 90.7, plus3: 101.3 },
  36: { min3: 83.6, min2: 87.4, median: 95.1, plus3: 106.5 },
  42: { min3: 86.7, min2: 90.9, median: 99.0, plus3: 111.3 },
  48: { min3: 89.8, min2: 94.1, median: 102.7, plus3: 115.7 },
  54: { min3: 92.6, min2: 97.1, median: 106.2, plus3: 119.9 },
  60: { min3: 95.2, min2: 99.9, median: 109.4, plus3: 123.7 },
};

// Tabel WHO BB/PB & BB/TB (Weight-for-Length/Height, 45 cm s/d 120 cm)
// Digunakan untuk menentukan Status Gizi Akut (Gizi Buruk, Gizi Kurang, Gizi Baik, Risiko Gizi Lebih, Obesitas) & BBI
const WHO_WFH_BOYS: Record<number, { min3: number; min2: number; median: number; plus1: number; plus2: number }> = {
  45: { min3: 1.9, min2: 2.0, median: 2.4, plus1: 2.7, plus2: 3.0 },
  50: { min3: 2.6, min2: 2.8, median: 3.4, plus1: 3.7, plus2: 4.0 },
  55: { min3: 3.6, min2: 3.8, median: 4.5, plus1: 5.0, plus2: 5.4 },
  60: { min3: 4.7, min2: 5.1, median: 6.0, plus1: 6.5, plus2: 7.1 },
  65: { min3: 5.9, min2: 6.3, median: 7.4, plus1: 8.1, plus2: 8.8 },
  70: { min3: 6.8, min2: 7.3, median: 8.6, plus1: 9.3, plus2: 10.2 },
  75: { min3: 7.6, min2: 8.2, median: 9.6, plus1: 10.5, plus2: 11.4 },
  80: { min3: 8.3, min2: 9.0, median: 10.4, plus1: 11.4, plus2: 12.4 },
  85: { min3: 9.2, min2: 10.0, median: 11.7, plus1: 12.7, plus2: 13.8 },
  90: { min3: 10.2, min2: 11.0, median: 12.9, plus1: 14.0, plus2: 15.2 },
  95: { min3: 11.1, min2: 12.0, median: 14.1, plus1: 15.3, plus2: 16.6 },
  100: { min3: 12.1, min2: 13.1, median: 15.4, plus1: 16.7, plus2: 18.2 },
  105: { min3: 13.2, min2: 14.3, median: 16.8, plus1: 18.4, plus2: 20.1 },
  110: { min3: 14.4, min2: 15.6, median: 18.5, plus1: 20.2, plus2: 22.2 },
  115: { min3: 15.7, min2: 17.1, median: 20.4, plus1: 22.4, plus2: 24.6 },
  120: { min3: 17.1, min2: 18.6, median: 22.4, plus1: 24.6, plus2: 27.2 },
};

const WHO_WFH_GIRLS: Record<number, { min3: number; min2: number; median: number; plus1: number; plus2: number }> = {
  45: { min3: 1.9, min2: 2.1, median: 2.5, plus1: 2.7, plus2: 3.0 },
  50: { min3: 2.6, min2: 2.8, median: 3.4, plus1: 3.7, plus2: 4.0 },
  55: { min3: 3.5, min2: 3.8, median: 4.5, plus1: 4.9, plus2: 5.4 },
  60: { min3: 4.5, min2: 4.9, median: 5.8, plus1: 6.4, plus2: 7.0 },
  65: { min3: 5.5, min2: 6.0, median: 7.1, plus1: 7.8, plus2: 8.6 },
  70: { min3: 6.4, min2: 6.9, median: 8.2, plus1: 9.0, plus2: 9.9 },
  75: { min3: 7.1, min2: 7.7, median: 9.1, plus1: 10.0, plus2: 11.0 },
  80: { min3: 7.8, min2: 8.5, median: 10.0, plus1: 10.9, plus2: 12.0 },
  85: { min3: 8.8, min2: 9.5, median: 11.2, plus1: 12.3, plus2: 13.5 },
  90: { min3: 9.8, min2: 10.6, median: 12.5, plus1: 13.7, plus2: 15.0 },
  95: { min3: 10.8, min2: 11.7, median: 13.8, plus1: 15.1, plus2: 16.6 },
  100: { min3: 11.9, min2: 12.8, median: 15.2, plus1: 16.6, plus2: 18.3 },
  105: { min3: 13.0, min2: 14.1, median: 16.8, plus1: 18.4, plus2: 20.4 },
  110: { min3: 14.3, min2: 15.5, median: 18.6, plus1: 20.5, plus2: 22.8 },
  115: { min3: 15.7, min2: 17.0, median: 20.6, plus1: 22.8, plus2: 25.5 },
  120: { min3: 17.3, min2: 18.8, median: 22.8, plus1: 25.3, plus2: 28.4 },
};

// Interpolasi linier nilai acuan WHO agar presisi di setiap bulan/sentimeter
function interpolateNorm<T extends Record<string, number>>(
  dict: Record<number, T>,
  targetKey: number
): T {
  const keys = Object.keys(dict)
    .map(Number)
    .sort((a, b) => a - b);
  if (targetKey <= keys[0]) return dict[keys[0]];
  if (targetKey >= keys[keys.length - 1]) return dict[keys[keys.length - 1]];

  let lowerKey = keys[0];
  let upperKey = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (targetKey >= keys[i] && targetKey <= keys[i + 1]) {
      lowerKey = keys[i];
      upperKey = keys[i + 1];
      break;
    }
  }

  if (lowerKey === upperKey) return dict[lowerKey];
  const ratio = (targetKey - lowerKey) / (upperKey - lowerKey);
  const lowerVal = dict[lowerKey];
  const upperVal = dict[upperKey];
  const result: Record<string, number> = {};
  for (const prop of Object.keys(lowerVal)) {
    result[prop] = Number((lowerVal[prop] + (upperVal[prop] - lowerVal[prop]) * ratio).toFixed(2));
  }
  return result as T;
}

// Batas Tanggal Lahir untuk Anak Usia 0–5 Tahun (Maksimal 60 Bulan)
export function getDobBounds(): { minDate: string; maxDate: string } {
  const now = new Date();
  const maxYear = now.getFullYear();
  const maxMonth = String(now.getMonth() + 1).padStart(2, '0');
  const maxDay = String(now.getDate()).padStart(2, '0');
  const maxDate = `${maxYear}-${maxMonth}-${maxDay}`;

  const minYear = maxYear - 5;
  const minDate = `${minYear}-${maxMonth}-${maxDay}`;
  return { minDate, maxDate };
}

export function parseMetricNumber(raw: string): number {
  if (!raw) return NaN;
  const trimmed = raw.trim();
  // Hanya izinkan angka desimal (titik/koma maksimal 2 angka di belakang koma) dengan satuan opsional kg/cm
  if (!/^(\d{1,3}([.,]\d{1,2})?)(\s*(kg|cm))?$/i.test(trimmed)) {
    return NaN;
  }
  const normalized = trimmed.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!normalized) return NaN;
  return parseFloat(normalized);
}

export interface AgeAnthropometryBounds {
  minWeightKg: number;
  maxWeightKg: number;
  medianWeightKg: number;
  minHeightCm: number;
  maxHeightCm: number;
  medianHeightCm: number;
}

export function getAgeSpecificAnthropometryBounds(
  dobString: string | undefined,
  gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki'
): AgeAnthropometryBounds | null {
  const age = calculateAgeFromDob(dobString || '');
  if (!age.isValidAgeRange) return null;

  const weightNorm =
    gender === 'Laki-laki'
      ? interpolateNorm(WHO_BOYS_WEIGHT, age.totalMonths)
      : interpolateNorm(WHO_GIRLS_WEIGHT, age.totalMonths);

  const heightNorm =
    gender === 'Laki-laki'
      ? interpolateNorm(WHO_BOYS_HEIGHT, age.totalMonths)
      : interpolateNorm(WHO_GIRLS_HEIGHT, age.totalMonths);

  const minWeightKg = Number(Math.max(2.0, weightNorm.min3 * 0.85).toFixed(1));
  const maxWeightKg = Number((weightNorm.plus2 * 1.17).toFixed(1));
  const minHeightCm = Math.max(44, Math.round(heightNorm.min3 * 0.92));
  const maxHeightCm = Math.min(128, Math.round(heightNorm.plus3 * 1.04));

  return {
    minWeightKg,
    maxWeightKg,
    medianWeightKg: weightNorm.median,
    minHeightCm,
    maxHeightCm,
    medianHeightCm: heightNorm.median,
  };
}


// Hitung usia dalam bulan dan validasi ketat rentang 0-5 Tahun (0-60 Bulan)
export function calculateAgeFromDob(dobString: string): {
  totalMonths: number;
  years: number;
  months: number;
  days: number;
  formatted: string;
  isFuture: boolean;
  isOverFiveYears: boolean;
  isValidAgeRange: boolean;
  errorMessage: string | null;
} {
  if (!dobString) {
    return {
      totalMonths: 0,
      years: 0,
      months: 0,
      days: 0,
      formatted: '-',
      isFuture: false,
      isOverFiveYears: false,
      isValidAgeRange: false,
      errorMessage: 'Tanggal lahir anak wajib diisi.',
    };
  }

  const birth = new Date(`${dobString}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (isNaN(birth.getTime())) {
    return {
      totalMonths: 0,
      years: 0,
      months: 0,
      days: 0,
      formatted: '-',
      isFuture: false,
      isOverFiveYears: false,
      isValidAgeRange: false,
      errorMessage: 'Format tanggal lahir tidak valid.',
    };
  }

  if (birth > today) {
    return {
      totalMonths: 0,
      years: 0,
      months: 0,
      days: 0,
      formatted: 'Tanggal tidak valid (Masa Depan)',
      isFuture: true,
      isOverFiveYears: false,
      isValidAgeRange: false,
      errorMessage: 'Tanggal lahir tidak boleh melebihi tanggal hari ini.',
    };
  }

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;
  let formatted = '';
  if (totalMonths === 0) {
    formatted = `${Math.max(1, days)} Hari (0 Bulan)`;
  } else if (years === 0) {
    formatted = `${totalMonths} Bulan`;
  } else if (months === 0) {
    formatted = `${years} Tahun (${totalMonths} Bulan)`;
  } else {
    formatted = `${years} Tahun ${months} Bulan (${totalMonths} Bulan)`;
  }

  // Batas ketat: Maksimal 5 Tahun (60 Bulan). Jika > 60 bulan (atau 5 tahun lewat hari/bulan) -> Tidak valid!
  const isOverFiveYears = totalMonths > 60 || (totalMonths === 60 && days > 0);
  if (isOverFiveYears) {
    return {
      totalMonths,
      years,
      months,
      days,
      formatted,
      isFuture: false,
      isOverFiveYears: true,
      isValidAgeRange: false,
      errorMessage: `Usia anak terhitung ${formatted}. Skrining ini khusus untuk anak usia 0–5 tahun (maksimal 60 bulan). Mohon periksa kembali Tanggal Lahir anak.`,
    };
  }

  return {
    totalMonths,
    years,
    months,
    days,
    formatted,
    isFuture: false,
    isOverFiveYears: false,
    isValidAgeRange: true,
    errorMessage: null,
  };
}

// Validasi Nama Anak / Orang Tua (Tidak boleh angka saja, simbol, atau 1 huruf)
export function validatePersonName(rawName: string | undefined, fieldLabel: string): string | null {
  const trimmed = (rawName || '').trim();
  if (!trimmed) {
    return `Mohon isi ${fieldLabel} terlebih dahulu.`;
  }
  if (trimmed.length < 2) {
    return `${fieldLabel} terlalu pendek (minimal 2 huruf).`;
  }
  // Hanya boleh huruf, spasi, titik, apostrof, tanda hubung
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
    return `${fieldLabel} hanya boleh berisi huruf (tidak boleh menggunakan angka atau simbol).`;
  }
  // Cek jika huruf yang sama diulang terus (misal "aaaa" atau "xxxx")
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (lettersOnly.length < 2 || /^([a-z])\1+$/.test(lettersOnly)) {
    return `Mohon masukkan ${fieldLabel} yang sebenarnya.`;
  }
  return null;
}

// Validasi Nomor WhatsApp Indonesia (08xx / 628xx / +628xx)
export function validateWhatsAppNumber(rawPhone: string | undefined): string | null {
  const cleaned = (rawPhone || '').trim().replace(/[\s-]/g, '');
  if (!cleaned) {
    return 'Mohon isi Nomor WhatsApp Bunda terlebih dahulu.';
  }
  if (!/^(\+628|628|08)[0-9]{7,12}$/.test(cleaned)) {
    return 'Nomor WhatsApp tidak valid. Gunakan format nomor HP aktif Indonesia (contoh: 081234567890, 10–14 digit angka).';
  }
  // Cek angka berulang tidak wajar (misal 081111111111 atau 081234567890 berurutan boleh, tapi 08000000000 tolak)
  const subscriberDigits = cleaned.replace(/^(\+628|628|08)/, '');
  if (/^(\d)\1{6,}$/.test(subscriberDigits)) {
    return 'Nomor WhatsApp tidak valid. Mohon masukkan nomor WhatsApp aktif yang sebenarnya.';
  }
  return null;
}

// Validasi Berat Badan (BB) & Tinggi Badan (TB) Anak Usia 0–5 Tahun Sesuai Fisiologis WHO Spesifik Usia & Proporsi BB/TB
export function validateChildWeightAndHeight(
  dobString: string | undefined,
  weightRaw: string | undefined,
  heightRaw: string | undefined,
  gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki'
): string | null {
  const age = calculateAgeFromDob(dobString || '');
  if (!age.isValidAgeRange) {
    return age.errorMessage || 'Tanggal lahir anak harus berada pada rentang usia 0–5 tahun.';
  }

  const trimmedWeight = (weightRaw || '').trim();
  const trimmedHeight = (heightRaw || '').trim();

  const bounds = getAgeSpecificAnthropometryBounds(dobString, gender);
  const exampleWeight = bounds ? bounds.medianWeightKg : 9.5;
  const exampleHeight = bounds ? Math.round(bounds.medianHeightCm) : 78;

  if (!trimmedWeight) {
    return `Mohon isi Berat Badan (BB) anak terlebih dahulu (contoh untuk usia ${age.formatted}: ${exampleWeight} kg).`;
  }
  if (!trimmedHeight) {
    return `Mohon isi Tinggi / Panjang Badan (TB/PB) anak terlebih dahulu (contoh untuk usia ${age.formatted}: ${exampleHeight} cm).`;
  }

  // Deteksi jika user salah ketik dalam satuan gram (misal 8500 atau 10200)
  const rawDigitsOnly = Number(trimmedWeight.replace(',', '.').replace(/[^0-9.]/g, ''));
  if (!isNaN(rawDigitsOnly) && rawDigitsOnly >= 100) {
    return `Berat Badan tidak boleh diisi dalam satuan gram (${trimmedWeight}). Masukkan dalam satuan kilogram (kg), contoh: ${exampleWeight}.`;
  }

  const weightNum = parseMetricNumber(trimmedWeight);
  const heightNum = parseMetricNumber(trimmedHeight);

  if (isNaN(weightNum) || weightNum <= 0) {
    return `Format Berat Badan (BB) tidak valid. Masukkan angka yang benar dalam kilogram (contoh: ${exampleWeight}).`;
  }
  if (isNaN(heightNum) || heightNum <= 0) {
    return `Format Tinggi Badan (TB) tidak valid. Masukkan angka yang benar dalam sentimeter (contoh: ${exampleHeight}).`;
  }

  if (bounds) {
    // 1. Validasi Ketat BB berdasarkan Usia Spesifik Bulan (WHO BB/U)
    if (weightNum < bounds.minWeightKg || weightNum > bounds.maxWeightKg) {
      return `Data Berat Badan ${weightNum} kg tidak wajar untuk anak ${gender.toLowerCase()} usia ${age.formatted}. Berdasarkan standar medis WHO usia ${age.formatted}, rentang BB yang valid adalah ${bounds.minWeightKg} kg – ${bounds.maxWeightKg} kg (rata-rata normal: ~${bounds.medianWeightKg} kg). Mohon masukkan data BB yang sebenarnya.`;
    }

    // 2. Validasi Ketat TB/PB berdasarkan Usia Spesifik Bulan (WHO PB/U & TB/U)
    if (heightNum < bounds.minHeightCm || heightNum > bounds.maxHeightCm) {
      return `Data Tinggi/Panjang Badan ${heightNum} cm tidak wajar untuk anak ${gender.toLowerCase()} usia ${age.formatted}. Berdasarkan standar medis WHO usia ${age.formatted}, rentang TB/PB yang valid adalah ${bounds.minHeightCm} cm – ${bounds.maxHeightCm} cm (rata-rata normal: ~${Math.round(bounds.medianHeightCm)} cm). Mohon masukkan data TB yang sebenarnya.`;
    }
  }

  // 3. Validasi Proporsi BB terhadap TB (WHO Weight-for-Height / BB/TB) agar tidak bisa isi BB & TB yang bertolak belakang
  const wfhNorm =
    gender === 'Laki-laki'
      ? interpolateNorm(WHO_WFH_BOYS, heightNum)
      : interpolateNorm(WHO_WFH_GIRLS, heightNum);

  if (wfhNorm) {
    const minWfhKg = Number(Math.max(1.9, wfhNorm.min3 * 0.82).toFixed(1));
    const maxWfhKg = Number((wfhNorm.plus2 * 1.22).toFixed(1));
    if (weightNum < minWfhKg || weightNum > maxWfhKg) {
      return `Proporsi Berat Badan (${weightNum} kg) dan Tinggi Badan (${heightNum} cm) tidak sesuai secara klinis. Untuk tinggi badan ${heightNum} cm, rentang berat badan fisiologis WHO adalah ${minWfhKg} kg – ${maxWfhKg} kg (BB ideal: ~${wfhNorm.median} kg). Mohon periksa kembali angka BB dan TB yang dimasukkan.`;
    }
  }

  return null;
}

// Validasi Berat Badan Lahir & Usia Gestasi (pada Screening Lengkap)
export function validateBirthWeightAndGestation(
  bbLahirRaw: string | undefined,
  usiaGestasiRaw: string | undefined,
  currentWeightRaw: string | undefined,
  ageMonths: number
): string | null {
  const trimmedBBLahir = (bbLahirRaw || '').trim();
  if (trimmedBBLahir) {
    const bbLahirNum = parseMetricNumber(trimmedBBLahir);
    if (isNaN(bbLahirNum)) {
      return 'Format BB Lahir tidak valid. Masukkan angka dalam kilogram (contoh: 3.1).';
    }
    if (bbLahirNum < 0.8 || bbLahirNum > 5.2) {
      return `BB Lahir ${bbLahirNum} kg tidak wajar. Masukkan BB Lahir dalam satuan kilogram antara 0.8 kg – 5.2 kg (contoh: 3.1).`;
    }
    const currWeight = parseMetricNumber(currentWeightRaw || '');
    if (!isNaN(currWeight) && ageMonths >= 2 && bbLahirNum > currWeight) {
      return `BB Lahir (${bbLahirNum} kg) tidak mungkin lebih besar daripada BB Sekarang (${currWeight} kg) pada usia ${ageMonths} bulan. Mohon periksa kembali.`;
    }
  }

  const trimmedGestasi = (usiaGestasiRaw || '').trim();
  if (trimmedGestasi) {
    const cleanedGest = trimmedGestasi.replace(/minggu|mgg|weeks|week|bln|bulan/gi, '').trim();
    const gestNum = Number(cleanedGest);
    if (isNaN(gestNum) || gestNum < 24 || gestNum > 43) {
      return 'Usia Gestasi saat lahir tidak wajar. Masukkan dalam satuan minggu antara 24 – 43 minggu (contoh: 38).';
    }
  }

  return null;
}

// Validasi Ketat Riwayat Berat Badan 3 Bulan Terakhir & Target BB (Bagian 9 Screening Lengkap)
export function validateWeightHistory(
  dobString: string | undefined,
  gender: 'Laki-laki' | 'Perempuan',
  currentWeightRaw: string | undefined,
  riwayatBB: {
    bb3BulanLalu: string;
    bb2BulanLalu: string;
    bb1BulanLalu: string;
    bbSekarang: string;
    targetBB: string;
  }
): string | null {
  const age = calculateAgeFromDob(dobString || '');
  if (!age.isValidAgeRange) {
    return age.errorMessage || 'Tanggal lahir anak tidak valid.';
  }

  const bounds = getAgeSpecificAnthropometryBounds(dobString, gender);
  const minAllowed = bounds ? Number(Math.max(1.8, bounds.minWeightKg - 1.5).toFixed(1)) : 1.8;
  const maxAllowed = bounds ? Number((bounds.maxWeightKg + 1.5).toFixed(1)) : 32;

  const currWeightStep2 = parseMetricNumber(currentWeightRaw || '');
  const currWeightStep9 = parseMetricNumber(riwayatBB.bbSekarang || currentWeightRaw || '');

  if (isNaN(currWeightStep9) || currWeightStep9 < minAllowed || currWeightStep9 > maxAllowed) {
    return `BB Sekarang (${riwayatBB.bbSekarang || '-'}) tidak valid untuk usia ${age.formatted}. Rentang wajar WHO adalah ${minAllowed} – ${maxAllowed} kg.`;
  }

  if (!isNaN(currWeightStep2) && Math.abs(currWeightStep9 - currWeightStep2) > 0.5) {
    return `BB Sekarang di Bagian 9 (${currWeightStep9} kg) berbeda dengan BB Sekarang yang diisi pada Bagian 2 (${currWeightStep2} kg). Mohon samakan data BB Sekarang.`;
  }

  const checkHistoricalField = (
    rawVal: string,
    label: string,
    monthsAgo: number,
    nextMonthWeight: number
  ): { num: number; err: string | null } => {
    const trimmed = (rawVal || '').trim();
    if (!trimmed) {
      return {
        num: NaN,
        err: `Mohon isi ${label} dalam kilogram (contoh: ${Math.max(2.0, Number((currWeightStep9 - 0.2 * monthsAgo).toFixed(1)))}) agar grafik tren BB dapat dievaluasi dokter.`,
      };
    }
    const num = parseMetricNumber(trimmed);
    if (isNaN(num)) {
      return {
        num: NaN,
        err: `${label} ("${trimmed}") harus berupa angka dalam kilogram (contoh: ${currWeightStep9}).`,
      };
    }
    const pastAgeMonths = Math.max(0, age.totalMonths - monthsAgo);
    const pastNorm =
      gender === 'Laki-laki'
        ? interpolateNorm(WHO_BOYS_WEIGHT, pastAgeMonths)
        : interpolateNorm(WHO_GIRLS_WEIGHT, pastAgeMonths);
    const pastMin = Number(Math.max(1.8, pastNorm.min3 * 0.8).toFixed(1));
    const pastMax = Number((pastNorm.plus2 * 1.2).toFixed(1));

    if (num < pastMin || num > pastMax) {
      return {
        num,
        err: `${label} (${num} kg) tidak sesuai standar fisiologis untuk usia saat itu (${pastAgeMonths} bulan; rentang wajar: ${pastMin} – ${pastMax} kg). Mohon isi angka BB yang benar.`,
      };
    }

    // Cek lonjakan / penurunan ekstrem tidak masuk akal (> 2.5 kg dalam 1 bulan)
    if (!isNaN(nextMonthWeight) && Math.abs(nextMonthWeight - num) > 2.5) {
      return {
        num,
        err: `Selisih antara ${label} (${num} kg) dan bulan berikutnya (${nextMonthWeight} kg) terlalu ekstrem (> 2.5 kg dalam 1 bulan). Mohon periksa kembali riwayat BB anak.`,
      };
    }

    return { num, err: null };
  };

  const b1 = checkHistoricalField(riwayatBB.bb1BulanLalu, 'BB 1 Bulan Lalu', 1, currWeightStep9);
  if (b1.err) return b1.err;

  const b2 = checkHistoricalField(riwayatBB.bb2BulanLalu, 'BB 2 Bulan Lalu', 2, b1.num);
  if (b2.err) return b2.err;

  const b3 = checkHistoricalField(riwayatBB.bb3BulanLalu, 'BB 3 Bulan Lalu', 3, b2.num);
  if (b3.err) return b3.err;

  const trimmedTarget = (riwayatBB.targetBB || '').trim();
  if (trimmedTarget) {
    const targetNum = parseMetricNumber(trimmedTarget);
    if (isNaN(targetNum)) {
      return `Target Kenaikan BB ("${trimmedTarget}") harus berupa angka dalam kilogram (contoh: ${Number((currWeightStep9 + 1.0).toFixed(1))}).`;
    }
    const maxTarget = Number((maxAllowed + 2.5).toFixed(1));
    if (targetNum < currWeightStep9 || targetNum > maxTarget) {
      return `Target Kenaikan BB (${targetNum} kg) tidak wajar. Target BB harus berada di antara BB saat ini (${currWeightStep9} kg) hingga ${maxTarget} kg.`;
    }
  }

  return null;
}

// Evaluasi Antropometri 3 Indeks Sesuai Permenkes RI No. 2 Tahun 2020, WHO 2006, & ANP IDAI
export function evaluateAnthropometry(
  dobString: string,
  gender: 'Laki-laki' | 'Perempuan',
  weightRaw: string,
  heightRaw: string,
  measurementDateRaw?: string
): AnthropometryEvaluation | null {
  const age = calculateAgeFromDob(dobString);
  if (age.totalMonths === 0 && !dobString) return null;

  // Parsing angka BB dan TB (mendukung koma maupun titik)
  const weightNum = parseMetricNumber(weightRaw);
  const heightNum = parseMetricNumber(heightRaw);

  const weightNorm =
    gender === 'Laki-laki'
      ? interpolateNorm(WHO_BOYS_WEIGHT, age.totalMonths)
      : interpolateNorm(WHO_GIRLS_WEIGHT, age.totalMonths);

  const heightNorm =
    gender === 'Laki-laki'
      ? interpolateNorm(WHO_BOYS_HEIGHT, age.totalMonths)
      : interpolateNorm(WHO_GIRLS_HEIGHT, age.totalMonths);

  let weightCategory: AnthropometryEvaluation['weightCategory'] =
    'Berat Badan Normal (-2 SD s/d +1 SD)';
  let heightCategory: AnthropometryEvaluation['heightCategory'] = 'Normal (-2 SD s/d +3 SD)';
  let wfhCategory: AnthropometryEvaluation['wfhCategory'] = 'Gizi Baik / Normal (-2 SD s/d +1 SD)';
  const notes: string[] = [];

  // 1. Evaluasi Indeks BB/U (Berat Badan menurut Umur - Permenkes No. 2 Tahun 2020)
  if (!isNaN(weightNum) && weightNorm) {
    if (weightNum < weightNorm.min3) {
      weightCategory = 'Berat Badan Sangat Kurang / Severely Underweight (< -3 SD)';
      notes.push(
        `Indeks BB/U: BB aktual (${weightNum} kg) berada di bawah -3 SD (Median WHO usia ${age.totalMonths} bln: ${weightNorm.median} kg).`
      );
    } else if (weightNum < weightNorm.min2) {
      weightCategory = 'Berat Badan Kurang / Underweight (-3 SD s/d < -2 SD)';
      notes.push(
        `Indeks BB/U: BB aktual (${weightNum} kg) berada di bawah -2 SD kurva WHO (batas minimal normal: ${weightNorm.min2} kg, median: ${weightNorm.median} kg).`
      );
    } else if (weightNum > weightNorm.plus1) {
      weightCategory = 'Risiko Berat Badan Lebih (> +1 SD)';
      notes.push(
        `Indeks BB/U: BB aktual (${weightNum} kg) berada di atas +1 SD (${weightNorm.plus1} kg); perlu konfirmasi proporsi melalui indeks BB/TB.`
      );
    } else {
      weightCategory = 'Berat Badan Normal (-2 SD s/d +1 SD)';
    }
  }

  // 2. Evaluasi Indeks PB/U atau TB/U (Panjang/Tinggi Badan menurut Umur - Deteksi Stunting)
  if (!isNaN(heightNum) && heightNorm) {
    if (heightNum < heightNorm.min3) {
      heightCategory = 'Sangat Pendek / Severely Stunted (< -3 SD)';
      notes.push(
        `Indeks PB/U atau TB/U: Tinggi/Panjang badan (${heightNum} cm) berada di bawah -3 SD (< ${heightNorm.min3} cm; Median WHO: ${heightNorm.median} cm). Indikasi gangguan pertumbuhan linier kronis.`
      );
    } else if (heightNum < heightNorm.min2) {
      heightCategory = 'Pendek / Stunted (-3 SD s/d < -2 SD)';
      notes.push(
        `Indeks PB/U atau TB/U: Tinggi/Panjang badan (${heightNum} cm) berada di bawah -2 SD (< ${heightNorm.min2} cm; Median WHO: ${heightNorm.median} cm).`
      );
    } else if (heightNum > heightNorm.plus3) {
      heightCategory = 'Tinggi (> +3 SD)';
    } else {
      heightCategory = 'Normal (-2 SD s/d +3 SD)';
    }
  }

  // 3. Evaluasi Indeks BB/PB atau BB/TB (Status Gizi Akut / Wasting & Berat Badan Ideal ANP IDAI)
  const effectiveHeight = !isNaN(heightNum) ? heightNum : heightNorm.median;
  const wfhNorm =
    gender === 'Laki-laki'
      ? interpolateNorm(WHO_WFH_BOYS, effectiveHeight)
      : interpolateNorm(WHO_WFH_GIRLS, effectiveHeight);

  const idealBodyWeightKg = Number((wfhNorm?.median || weightNorm.median).toFixed(1));

  if (!isNaN(weightNum) && !isNaN(heightNum) && wfhNorm) {
    if (weightNum < wfhNorm.min3) {
      wfhCategory = 'Gizi Buruk / Severely Wasted (< -3 SD)';
      notes.push(
        `Indeks BB/TB (Status Gizi Akut): Proporsi BB terhadap TB (${heightNum} cm) berada di bawah -3 SD (< ${wfhNorm.min3} kg). Berat Badan Ideal (BBI) untuk tinggi saat ini adalah ~${idealBodyWeightKg} kg.`
      );
    } else if (weightNum < wfhNorm.min2) {
      wfhCategory = 'Gizi Kurang / Wasted (-3 SD s/d < -2 SD)';
      notes.push(
        `Indeks BB/TB (Status Gizi Akut): Proporsi BB terhadap TB (${heightNum} cm) berada di bawah -2 SD (< ${wfhNorm.min2} kg). Berat Badan Ideal (BBI) untuk tinggi saat ini adalah ~${idealBodyWeightKg} kg.`
      );
    } else if (weightNum > wfhNorm.plus2) {
      wfhCategory = 'Gizi Lebih / Obesitas (> +2 SD)';
      notes.push(
        `Indeks BB/TB: Proporsi BB terhadap TB berada di atas +2 SD (> ${wfhNorm.plus2} kg).`
      );
    } else if (weightNum > wfhNorm.plus1) {
      wfhCategory = 'Berisiko Gizi Lebih (> +1 SD s/d +2 SD)';
    } else {
      wfhCategory = 'Gizi Baik / Normal (-2 SD s/d +1 SD)';
    }
  }

  // 4. Perhitungan Kebutuhan Kalori Harian Berdasarkan Asuhan Nutrisi Pediatrik (ANP) IDAI (RDA x BBI)
  // RDA Kalori menurut usia: 0-6 bln ~115 kkal/kgBBI, 6-12 bln ~105 kkal/kgBBI, 1-3 thn ~100 kkal/kgBBI, 4-5 thn ~90 kkal/kgBBI
  const rdaPerKg =
    age.totalMonths < 6
      ? 115
      : age.totalMonths < 12
      ? 105
      : age.totalMonths <= 36
      ? 100
      : 90;
  const estimatedDailyCaloriesKcal = Math.round(idealBodyWeightKg * rdaPerKg);

  // Evaluasi Usia saat Pengukuran
  let recencyNote = 'Pengukuran tercatat terkini.';
  if (measurementDateRaw) {
    const measDate = new Date(measurementDateRaw);
    if (!isNaN(measDate.getTime())) {
      const diffDays = Math.round((new Date().getTime() - measDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays > 45) {
        recencyNote = `⚠️ Data pengukuran diambil ${Math.round(diffDays / 30)} bulan yang lalu. Direkomendasikan melakukan penimbangan BB & pengukuran TB/PB ulang di Posyandu/Klinik untuk akurasi terkini.`;
      }
    } else if (
      measurementDateRaw.toLowerCase().includes('lalu') ||
      measurementDateRaw.toLowerCase().includes('bulan lalu') ||
      measurementDateRaw.toLowerCase().includes('dulu')
    ) {
      recencyNote = '⚠️ Data BB/TB adalah pengukuran lampau. Sangat disarankan menimbang ulang BB dan TB anak saat ini.';
    }
  }

  return {
    ageMonths: age.totalMonths,
    ageFormatted: age.formatted,
    weightCategory,
    heightCategory,
    wfhCategory,
    medianWeightForAge: weightNorm.median,
    medianHeightForAge: heightNorm.median,
    idealBodyWeightKg,
    estimatedDailyCaloriesKcal,
    bmiOrStatureNotes: notes,
    measurementRecencyNote: recencyNote,
    whoReference: 'Standar Antropometri WHO 2006, Permenkes RI No. 2 Tahun 2020 & ANP IDAI',
  };
}
