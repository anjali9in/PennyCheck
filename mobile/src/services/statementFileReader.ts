import { File } from 'expo-file-system';
import { apiPostForm } from '@/services/api';

type PickedStatementFile = {
  fileName: string;
  mimeType: string;
  content: string;
};

type PickerAsset = {
  name: string;
  uri: string;
  mimeType?: string;
  file?: globalThis.File;
};

const supportedTypes = [
  'text/csv',
  'text/plain',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/octet-stream',
];

export async function pickStatementFile(accessToken?: string | null): Promise<PickedStatementFile | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: supportedTypes,
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return readPickedStatementFile(result.assets[0], accessToken);
}

async function readPickedStatementFile(asset: PickerAsset, accessToken?: string | null): Promise<PickedStatementFile> {
  const fileName = asset.name;
  const mimeType = asset.mimeType ?? mimeTypeFromName(fileName);
  if (isPdf(fileName, mimeType)) {
    return {
      fileName,
      mimeType,
      content: await extractPdfText(asset, accessToken),
    };
  }

  return {
    fileName,
    mimeType,
    content: await readTextAsset(asset),
  };
}

async function readTextAsset(asset: PickerAsset) {
  if (asset.file) {
    return asset.file.text();
  }
  return new File(asset.uri).text();
}

async function extractPdfText(asset: PickerAsset, accessToken?: string | null) {
  if (!accessToken) {
    throw new Error('Login is required to import PDF statements.');
  }

  const formData = new FormData();
  if (asset.file) {
    formData.append('file', asset.file, asset.name);
  } else {
    formData.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/pdf',
    } as unknown as Blob);
  }

  const response = await apiPostForm<{ text: string }>('/imports/extract-text', formData, accessToken);
  if (!response.text.trim()) {
    throw new Error('No readable text found in this PDF.');
  }
  return response.text;
}

function isPdf(fileName: string, mimeType: string) {
  return mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
}

function mimeTypeFromName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (lower.endsWith('.csv')) {
    return 'text/csv';
  }
  return 'text/plain';
}
