import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

import { api, fetchBinary } from '@/lib/api';

export function useDocuments(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['documents', applicationId],
    enabled: applicationId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/applications/{id}/documents', {
        params: { path: { id: applicationId ?? '' } },
      });
      if (error !== undefined || data === undefined) {
        throw new Error('Could not load documents');
      }
      return data;
    },
  });
}

/** Opens the system picker, then uploads the chosen file as multipart form data. */
export function useUploadDocument(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (applicationId === undefined) throw new Error('no application');

      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) return null;
      const asset = picked.assets[0];
      if (asset === undefined) return null;

      const form = new FormData();
      if (asset.file !== undefined) {
        // Web: the picker hands us a real File object.
        form.append('file', asset.file, asset.name);
      } else {
        // Native: React Native FormData takes a { uri, name, type } descriptor.
        form.append('file', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
      }

      const response = await fetchBinary(`/api/v1/applications/${applicationId}/documents`, {
        method: 'POST',
        body: form,
      });
      if (!response.ok) {
        throw new Error(
          response.status === 400
            ? 'That file type or size isn’t accepted (PDF/images up to 15 MB).'
            : 'Upload failed — check your connection and try again.',
        );
      }
      return (await response.json()) as unknown;
    },
    onSuccess: (result) => {
      if (result !== null) {
        void queryClient.invalidateQueries({ queryKey: ['documents', applicationId] });
      }
    },
  });
}
