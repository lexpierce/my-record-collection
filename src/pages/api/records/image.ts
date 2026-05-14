import { errorResponse, getErrorMessage } from "../_helpers";

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;
const IMAGE_SIZE_PATTERN = /^\d+$/;
const DEFAULT_IMAGE_SIZE = 324;
const MIN_IMAGE_SIZE = 1;
const MAX_IMAGE_SIZE = 1200;
const ALLOWED_IMAGE_HOST_SUFFIX = ".discogs.com";

type ImageResizeOptions = {
  fit: "inside";
  withoutEnlargement: boolean;
};

type ImageProcessor = {
  resize(width: number, height: number, options: ImageResizeOptions): ImageProcessor;
  webp(options: { quality: number }): ImageProcessor;
  blob(): Promise<Blob>;
};

type BunImageConstructor = new (input: Blob) => ImageProcessor;

type BunImageGlobal = typeof globalThis & {
  Bun: {
    Image: BunImageConstructor;
  };
};

function parseImageSize(sizeParam: string | null): number {
  if (!sizeParam || !IMAGE_SIZE_PATTERN.test(sizeParam)) return DEFAULT_IMAGE_SIZE;
  const requestedSize = Number(sizeParam);
  if (!Number.isSafeInteger(requestedSize)) return DEFAULT_IMAGE_SIZE;
  return Math.min(MAX_IMAGE_SIZE, Math.max(MIN_IMAGE_SIZE, requestedSize));
}

function parseImageSource(sourceParam: string | null): URL | null {
  if (!sourceParam) return null;

  try {
    const sourceURL = new URL(sourceParam);
    const hostname = sourceURL.hostname.toLowerCase();
    if (sourceURL.protocol !== "https:" && sourceURL.protocol !== "http:") return null;
    if (hostname !== "discogs.com" && !hostname.endsWith(ALLOWED_IMAGE_HOST_SUFFIX)) return null;
    return sourceURL;
  } catch {
    return null;
  }
}

export async function GET({ request }: { request: Request }): Promise<Response> {
  try {
    const searchParams = new URL(request.url).searchParams;
    const sourceURL = parseImageSource(searchParams.get("src"));
    if (!sourceURL) {
      return errorResponse("Invalid image source", "src must be an absolute Discogs http or https URL", 400);
    }

    const imageSize = parseImageSize(searchParams.get("size"));
    const sourceResponse = await fetch(sourceURL, {
      headers: { "User-Agent": process.env.DISCOGS_USER_AGENT || "MyRecordCollection/1.0" },
    });
    if (!sourceResponse.ok) {
      return errorResponse("Failed to fetch image", `Upstream image returned ${sourceResponse.status}`, 502);
    }

    const sourceBlob = await sourceResponse.blob();
    const { Image } = (globalThis as BunImageGlobal).Bun;
    const imageBlob = await new Image(sourceBlob)
      .resize(imageSize, imageSize, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .blob();

    return new Response(imageBlob, {
      headers: {
        "Cache-Control": `public, max-age=${ONE_WEEK_SECONDS}, immutable`,
        "Content-Type": "image/webp",
      },
    });
  } catch (error) {
    console.error("Error processing image:", error);
    return errorResponse("Failed to process image", getErrorMessage(error), 502);
  }
}
