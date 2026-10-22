import { base44 } from '@/api/base44Client';

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/**
 * Sube una foto de obra. En sesión de técnico pasa por la función proxy;
 * el resto de usuarios sube el archivo directamente.
 */
export async function subirFotoObra(file, { isSessionTech, effectiveEmail } = {}) {
  if (isSessionTech && effectiveEmail) {
    const file_base64 = await fileToBase64(file);
    const res = await base44.functions.invoke('uploadArchivo', {
      technician_email: effectiveEmail,
      filename: file.name,
      file_base64,
      content_type: file.type || 'application/octet-stream',
    });
    if (!res.data?.file_url) throw new Error('Error al subir archivo');
    return res.data.file_url;
  }
  const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
  return file_url;
}