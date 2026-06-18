import { File, Paths } from 'expo-file-system';

export async function shareTextFile(input: {
  fileName: string;
  mimeType: string;
  content: string;
}) {
  const file = new File(Paths.document, input.fileName);
  file.write(input.content);
  const Sharing = await import('expo-sharing').catch(() => null);
  if (Sharing && await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: input.mimeType,
      dialogTitle: input.fileName,
    });
  }
  return file.uri;
}
