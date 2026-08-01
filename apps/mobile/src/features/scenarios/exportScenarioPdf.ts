import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { fetchBinary } from '@/lib/api';

/**
 * Fetches the server-rendered one-page scenario summary (authoritative
 * recompute) and hands it to the platform: native → share sheet, so a
 * realtor can text/email it to a client in two taps; web → download.
 */
export async function exportScenarioPdf(id: string, name: string): Promise<void> {
  const response = await fetchBinary(`/api/v1/scenarios/${id}/pdf`);
  if (!response.ok) {
    throw new Error(`PDF export failed (${response.status})`);
  }

  const safeName = name.replace(/[^\w\- ]/g, '').trim().replace(/\s+/g, '-') || 'scenario';

  if (Platform.OS === 'web') {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeName}.pdf`;
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

  const fileUri = `${FileSystem.cacheDirectory}${safeName}.pdf`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Send scenario to a client',
  });
}
