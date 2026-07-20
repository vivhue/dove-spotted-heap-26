export type UploadImageInput = {
  file: Blob | File;
  fileName: string;
  contentType?: string;
};

type R2UploadResponse = {
  url?: string;
};

const uploadEndpoint = process.env.EXPO_PUBLIC_R2_UPLOAD_ENDPOINT ?? '';

function hasUploadEndpoint() {
  return uploadEndpoint.trim().length > 0;
}

export async function uploadItemImage(input: UploadImageInput): Promise<string | null> {
  if (!hasUploadEndpoint()) {
    return null;
  }

  const formData = new FormData();
  formData.append('file', input.file, input.fileName);
  formData.append('fileName', input.fileName);
  if (input.contentType) {
    formData.append('contentType', input.contentType);
  }

  const response = await fetch(uploadEndpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed with ${response.status}`);
  }

  const data = (await response.json()) as R2UploadResponse;

  if (!data.url) {
    throw new Error('R2 upload response did not include a file URL');
  }

  return data.url;
}
