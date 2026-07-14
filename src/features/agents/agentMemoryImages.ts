const MAX_IMAGES = 4;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type PendingAgentImage = {
  id: string;
  name: string;
  dataUrl: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export async function filesToPendingImages(files: FileList | File[]): Promise<PendingAgentImage[]> {
  const list = Array.from(files);
  const pending: PendingAgentImage[] = [];

  for (const file of list) {
    if (!ACCEPTED_TYPES.has(file.type)) {
      throw new Error(`Unsupported image type: ${file.name}`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`Image too large (max 2 MB): ${file.name}`);
    }
    if (pending.length >= MAX_IMAGES) {
      break;
    }
    const dataUrl = await readFileAsDataUrl(file);
    pending.push({
      id: `${file.name}-${file.lastModified}-${pending.length}`,
      name: file.name,
      dataUrl,
    });
  }

  return pending;
}

export function pendingImageDataUrls(images: PendingAgentImage[]): string[] {
  return images.map((image) => image.dataUrl);
}
