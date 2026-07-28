"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { updateCourseThumbnail } from "@/app/dashboard/actions";

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

export function AssetUploader({ userId, courseId, currentPath }: { userId: string; courseId: string; currentPath?: string }) {
  const client = createClient();
  const currentUrl = client && currentPath?.startsWith("public/") ? client.storage.from("course-thumbnails").getPublicUrl(currentPath).data.publicUrl : "";
  const [preview, setPreview] = useState(currentUrl);
  const [message, setMessage] = useState(currentPath && !currentUrl ? "Re-upload this thumbnail once to make it visible publicly." : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  async function upload(data: FormData) {
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) { setMessage("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > MAX_THUMBNAIL_BYTES) { setMessage("The thumbnail must be smaller than 5 MB."); return; }
    setBusy(true);
    setMessage("Uploading thumbnail…");
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const path = `public/${userId}/${courseId}/${crypto.randomUUID()}-${safe}`;
    const browserClient = createClient();
    if (!browserClient) { setMessage("Storage is not configured."); setBusy(false); return; }
    const { error: uploadError } = await browserClient.storage.from("course-thumbnails").upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) { setMessage(`Upload failed: ${uploadError.message}`); setBusy(false); return; }
    try {
      const saved = new FormData();
      saved.set("course_id", courseId);
      saved.set("path", path);
      await updateCourseThumbnail(saved);
      if (currentPath?.startsWith("public/") && currentPath !== path) await browserClient.storage.from("course-thumbnails").remove([currentPath]);
      setPreview(browserClient.storage.from("course-thumbnails").getPublicUrl(path).data.publicUrl);
      setMessage("Thumbnail uploaded and visible on the public course page.");
    } catch (error) {
      await browserClient.storage.from("course-thumbnails").remove([path]);
      setMessage(`Upload could not be saved: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally { setBusy(false); }
  }

  return <div className="thumbnail-uploader">{preview ? <img src={preview} alt="Course thumbnail preview" /> : <div className="thumbnail-placeholder">Thumbnail preview</div>}<form action={upload} className="thumbnail-upload-form"><label>Choose thumbnail<input type="file" name="file" accept="image/jpeg,image/png,image/webp" required /></label><button className="outline-button" disabled={busy}>{busy ? "Uploading…" : currentPath ? "Replace thumbnail" : "Upload thumbnail"}</button><small className={message.startsWith("Upload failed") || message.startsWith("Upload could") ? "form-error" : ""} role="status">{message || "JPG, PNG, or WebP · Maximum 5 MB"}</small></form></div>;
}
