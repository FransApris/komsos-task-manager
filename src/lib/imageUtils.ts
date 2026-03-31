/**
 * Mengompresi file gambar menggunakan Canvas API
 * @param file File gambar asli
 * @param maxWidth Lebar maksimal
 * @param maxHeight Tinggi maksimal
 * @param quality Kualitas JPEG (0.0 - 1.0)
 * @returns Promise berisi Blob hasil kompresi
 */
export const compressImage = async (
  file: File, 
  maxWidth: number = 800, 
  maxHeight: number = 800, 
  quality: number = 0.7
): Promise<Blob> => {
  try {
    // Gunakan createImageBitmap untuk performa yang lebih baik di browser modern
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    let width = bitmap.width;
    let height = bitmap.height;

    // Hitung rasio aspek
    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false }); // Matikan alpha untuk JPEG
    if (!ctx) {
      throw new Error('Gagal mendapatkan konteks canvas 2D');
    }

    // Gunakan imageSmoothingQuality tinggi untuk hasil terbaik pada ukuran kecil
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Bersihkan memori bitmap
    bitmap.close();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Gagal mengonversi canvas ke Blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });
  } catch (error) {
    // Fallback ke metode lama jika createImageBitmap gagal
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Gagal mendapatkan konteks canvas 2D'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Gagal mengonversi canvas ke Blob'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  }
};

/**
 * Mengonversi Blob ke File
 */
export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() });
};
