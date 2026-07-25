import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

// Same barcode symbologies as the live scanner (PDF417 + the 1D codes that carry
// an SA ID number). Used to decode a barcode out of a still uploaded image.
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.PDF_417,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

// Attempt to read a barcode from an image URL. Returns the decoded text, or null
// if no barcode is found (ZXing throws a NotFoundException in that case).
export async function decodeBarcodeFromImageUrl(url) {
    const reader = new BrowserMultiFormatReader(hints);
    try {
        const result = await reader.decodeFromImageUrl(url);
        return result ? result.getText() : null;
    } catch (err) {
        return null;
    }
}
