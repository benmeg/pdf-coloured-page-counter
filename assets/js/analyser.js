function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return 0;
    const l = (max + min) / 2;
    const d = max - min;
    return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

function rgbToLuminance(r, g, b) {
    return (Math.max(r, g, b) + Math.min(r, g, b)) / (2 * 255);
}

function isPixelColoured(r, g, b, a, threshold) {
    if (a < 10) return false;
    const l = rgbToLuminance(r, g, b);
    if (l < 0.08 || l > 0.92) return false;
    return rgbToHsl(r, g, b) * 100 > threshold;
}

function analysePagePixels(imageData, threshold) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
        if (isPixelColoured(d[i], d[i + 1], d[i + 2], d[i + 3], threshold)) return true;
    }
    return false;
}

if (typeof module !== 'undefined') {
    module.exports = { rgbToHsl, rgbToLuminance, isPixelColoured, analysePagePixels };
}
