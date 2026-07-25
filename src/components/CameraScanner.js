import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

// Restrict decoding to the barcode types that realistically carry an SA ID
// number: PDF417 (smart-card / licence backs), and the 1D barcodes used on the
// older green ID book and on printed forms. Restricting formats is faster and
// more reliable than trying every symbology.
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.PDF_417,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

function describeError(err) {
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
        return 'Camera permission was blocked. Allow camera access in your browser and try again.';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
        return 'No camera was found on this device.';
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
        return 'The camera needs a secure connection (https, or localhost during development).';
    }
    return 'Could not start the camera: ' + (err && err.message ? err.message : 'unknown error');
}

// Full-screen camera overlay. Calls onResult(text) once with the first decoded
// barcode's text, then the parent is expected to close it (which stops the
// camera via cleanup).
function CameraScanner({ onResult, onClose, label, hint, closeLabel }) {
    const videoRef = useRef(null);
    const controlsRef = useRef(null);
    const doneRef = useRef(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('This browser does not support camera access.');
            return undefined;
        }

        const reader = new BrowserMultiFormatReader(hints);
        reader
            .decodeFromConstraints(
                { video: { facingMode: { ideal: 'environment' } } },
                videoRef.current,
                (result) => {
                    if (result && !doneRef.current) {
                        doneRef.current = true;
                        onResult(result.getText());
                    }
                }
            )
            .then((controls) => {
                controlsRef.current = controls;
                if (cancelled) controls.stop();
            })
            .catch((err) => {
                if (!cancelled) setError(describeError(err));
            });

        return () => {
            cancelled = true;
            if (controlsRef.current) {
                try {
                    controlsRef.current.stop();
                } catch (e) {
                    /* stream already stopped */
                }
            }
        };
    }, [onResult]);

    return (
        <div className="scanner" role="dialog" aria-modal="true" aria-label={label}>
            <div className="scanner__panel">
                <div className="scanner__header">
                    <span className="scanner__title">{label}</span>
                    <button type="button" className="scanner__close" onClick={onClose} aria-label={closeLabel}>
                        ✕
                    </button>
                </div>
                <div className="scanner__viewport">
                    <video ref={videoRef} className="scanner__video" muted autoPlay playsInline />
                    <div className="scanner__reticle" aria-hidden="true" />
                </div>
                {error ? (
                    <p className="scanner__error" role="alert">{error}</p>
                ) : (
                    <p className="scanner__hint">{hint}</p>
                )}
            </div>
        </div>
    );
}

export default CameraScanner;
