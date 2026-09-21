import QRCode from 'qrcode'

/**
 * Generates a QR code data URL for the given gallery URL.
 * Returns a PNG data URL suitable for use in an <img> tag.
 */
export async function generateQRCode(galleryUrl: string): Promise<string> {
  return QRCode.toDataURL(galleryUrl, {
    errorCorrectionLevel: 'M', // 15% damage recovery — good balance
    margin: 2,
    width: 300,
    color: {
      dark: '#0f0f23',  // Deep navy — UXplosion brand dark
      light: '#ffffff',
    },
  })
}
