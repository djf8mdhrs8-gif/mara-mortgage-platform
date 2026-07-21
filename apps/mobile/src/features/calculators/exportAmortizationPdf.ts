import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { fetchBinary } from '@/lib/api';

interface ExportParams {
  principal: number;
  annualRatePct: number;
  termMonths: number;
  label?: string;
  extraMonthly?: number;
  extraAnnual?: number;
  oneTimeAmount?: number;
  oneTimeMonth?: number;
}

/**
 * Requests the server-rendered schedule PDF (authoritative recompute from the
 * shared engine) and hands it to the platform:
 * - native: save to cache and open the share sheet
 * - web (dev preview): trigger a browser download
 */
export async function exportAmortizationPdf(params: ExportParams): Promise<void> {
  const response = await fetchBinary('/api/v1/calculators/amortization/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`PDF export failed (${response.status})`);
  }

  if (Platform.OS === 'web') {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'amortization-schedule.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const base64 = btoa(binary);

  const fileUri = `${FileSystem.cacheDirectory}amortization-schedule.pdf`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share amortization schedule',
  });
}
