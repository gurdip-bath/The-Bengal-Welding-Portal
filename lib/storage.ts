/**
 * Supabase Storage helpers for site survey media uploads.
 */

import { supabase } from './supabase';

export const SITE_SURVEY_BUCKET = 'site-survey-media';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export interface MediaItem {
  type: 'image' | 'video';
  path: string;
  name?: string;
}

function generatePath(surveyId: string, type: 'image' | 'video', fileName: string): string {
  const ext = fileName.split('.').pop() || 'bin';
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${surveyId}/${type}s/${slug}.${ext}`;
}

export async function uploadSiteSurveyMedia(
  surveyId: string,
  file: File
): Promise<{ path: string; type: 'image' | 'video'; name: string }> {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error(`File type ${file.type} not allowed. Use images (jpg, png, webp, gif) or videos (mp4, mov, webm).`);
  }

  const type: 'image' | 'video' = isImage ? 'image' : 'video';
  const maxSize = isImage ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
  if (file.size > maxSize) {
    const limitMB = maxSize / (1024 * 1024);
    throw new Error(`File too large. Max ${limitMB}MB for ${type}s.`);
  }

  const path = generatePath(surveyId, type, file.name);

  const { data, error } = await supabase.storage
    .from(SITE_SURVEY_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || 'Upload failed');
  }

  return { path: data.path, type, name: file.name };
}

/** Get a signed URL for viewing private bucket objects. Expires in 1 hour. */
export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(SITE_SURVEY_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? '';
}

export async function deleteSiteSurveyMedia(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(SITE_SURVEY_BUCKET)
    .remove([path]);
  if (error) throw new Error(error.message);
}
