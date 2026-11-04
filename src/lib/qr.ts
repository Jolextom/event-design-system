/**
 * Hosted QR image URL encoding the given data. Works as a plain <img src> in web
 * pages and email clients (data: URIs get stripped by many clients). Uses
 * api.qrserver.com, a free service; the data (an attendee check-in code like
 * "EF-MAIN-CHARACTER-FEST-A1B2C3D4") is not personally identifying.
 */
export function buildQrCodeUrl(data: string, size: number = 240): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
