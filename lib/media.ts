// Media storage abstraction.
//
// Recipe photos are stored with an external provider; the app only keeps the
// public URL and the provider id needed to delete the asset. Today the only
// backend is Cloudinary (signed REST API, no SDK dependency). The MediaStore
// interface is intentionally small so a local-filesystem backend can be added
// later and selected via MEDIA_PROVIDER without touching the call sites.
//
// Server-only: relies on CLOUDINARY_* secrets, never import from client code.

import crypto from "node:crypto";

export type UploadedMedia = { url: string; publicId: string };

export interface MediaStore {
  /** True when the backend has the credentials it needs to upload. */
  readonly configured: boolean;
  /** Uploads an image file and returns its public URL + provider id. */
  upload(file: File): Promise<UploadedMedia>;
  /** Best-effort deletion of a previously uploaded asset. */
  remove(publicId: string): Promise<void>;
}

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER ?? "recipe-manager";

/**
 * Cloudinary signature: the params (minus file/api_key/resource_type) sorted
 * alphabetically as `key=value` joined by `&`, suffixed with the API secret,
 * hashed with SHA-1.
 */
function sign(params: Record<string, string | number>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + secret).digest("hex");
}

class CloudinaryStore implements MediaStore {
  readonly configured = true;

  constructor(
    private readonly cloud: string,
    private readonly key: string,
    private readonly secret: string,
  ) {}

  async upload(file: File): Promise<UploadedMedia> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ folder: FOLDER, timestamp }, this.secret);

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", this.key);
    form.append("timestamp", String(timestamp));
    form.append("folder", FOLDER);
    form.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloud}/image/upload`,
      { method: "POST", body: form },
    );
    if (!res.ok) {
      throw new Error(`Échec de l'upload Cloudinary (${res.status})`);
    }
    const json = (await res.json()) as { secure_url: string; public_id: string };
    return { url: json.secure_url, publicId: json.public_id };
  }

  async remove(publicId: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: publicId, timestamp }, this.secret);

    const form = new FormData();
    form.append("public_id", publicId);
    form.append("api_key", this.key);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    // Best-effort: a failed deletion must not break the recipe write.
    await fetch(`https://api.cloudinary.com/v1_1/${this.cloud}/image/destroy`, {
      method: "POST",
      body: form,
    }).catch(() => undefined);
  }
}

/** Fallback when no provider is configured: uploads throw, deletions no-op. */
class NullStore implements MediaStore {
  readonly configured = false;
  async upload(): Promise<UploadedMedia> {
    throw new Error(
      "Aucun service média configuré. Renseignez CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.",
    );
  }
  async remove(): Promise<void> {}
}

let store: MediaStore | null = null;

/** Returns the active media store (singleton), Cloudinary if configured. */
export function getMediaStore(): MediaStore {
  if (!store) {
    store =
      CLOUD && KEY && SECRET
        ? new CloudinaryStore(CLOUD, KEY, SECRET)
        : new NullStore();
  }
  return store;
}
