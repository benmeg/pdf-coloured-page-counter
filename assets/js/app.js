pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.js';

const LIGHTBOX_SCALE = 1.5;

// State
let pdfDoc           = null;
let pages            = [];  // [{ pageNum, canvas, imageData, isColour, wrapper, failed? }]
let currentThreshold = CONFIG.default_threshold;
let processing       = false;
let sliderRafId      = null;

// DOM refs
const fileInput        = document.getElementById('file-input');
const uploadArea       = document.getElementById('upload-area');
const errorMsg         = document.getElementById('error-message');
const controls         = document.getElementById('controls');
const thresholdSlider  = document.getElementById('threshold-slider');
const thresholdValue   = document.getElementById('threshold-value');
const progressEl       = document.getElementById('progress');
const progressBar      = document.getElementById('progress-bar');
const progressText     = document.getElementById('progress-text');
const resultsEl        = document.getElementById('results');
const bwCount          = document.getElementById('bw-count');
const colourCount      = document.getElementById('colour-count');
const bwGrid           = document.getElementById('bw-grid');
const colourGrid       = document.getElementById('colour-grid');
const colourPagesText  = document.getElementById('colour-pages-text');
const lightbox         = document.getElementById('lightbox');
const lightboxBackdrop = document.getElementById('lightbox-backdrop');
const lightboxClose    = document.getElementById('lightbox-close');
const lightboxCanvas   = document.getElementById('lightbox-canvas');

// --- Validation ---
function validateFile(file) {
    if (!file || file.type !== 'application/pdf') return 'Please select a valid PDF file.';
    if (file.size > CONFIG.max_file_size_mb * 1024 * 1024)
        return `File size exceeds the ${CONFIG.max_file_size_mb}MB limit.`;
    return null;
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}
function hideError() { errorMsg.classList.add('hidden'); }

// --- Progress ---
function setProgress(current, total) {
    progressBar.style.width = Math.round((current / total) * 100) + '%';
    progressText.textContent = `Analysing page ${current} of ${total}…`;
}

// --- Rendering ---
async function renderPage(page, scale) {
    const viewport = page.getViewport({ scale });
    const canvas   = document.createElement('canvas');
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return canvas;
}

// --- Thumbnail wrapper ---
function buildThumbWrapper(canvas, pageNum) {
    const wrap = document.createElement('div');
    wrap.className = 'thumb-wrap';
    wrap.appendChild(canvas);

    const badge = document.createElement('span');
    badge.className   = 'page-badge';
    badge.textContent = pageNum;
    wrap.appendChild(badge);

    wrap.addEventListener('click', () => openLightbox(pageNum));
    return wrap;
}

// --- Counts and list (called after each chunk and after slider re-classification) ---
function updateCounts() {
    const colourPageNums = pages.filter(p => p && p.isColour).map(p => p.pageNum);
    bwCount.textContent         = pages.filter(p => p && !p.isColour).length;
    colourCount.textContent     = colourPageNums.length;
    colourPagesText.textContent = colourPageNums.length ? colourPageNums.join(', ') : 'None';
}

// --- Append a completed chunk to the correct grids (streaming during load) ---
function appendChunkToGrids(pageNums) {
    pageNums.forEach(i => {
        const p = pages[i - 1];
        if (!p) return;
        if (p.isColour) colourGrid.appendChild(p.wrapper);
        else             bwGrid.appendChild(p.wrapper);
    });
    updateCounts();
}

// --- Full grid rebuild (used by slider when pages switch panels) ---
function displayResults() {
    bwGrid.innerHTML     = '';
    colourGrid.innerHTML = '';

    pages.forEach(p => {
        if (!p) return;
        if (p.isColour) colourGrid.appendChild(p.wrapper);
        else             bwGrid.appendChild(p.wrapper);
    });

    updateCounts();
    resultsEl.classList.remove('hidden');
}

// --- Main processing ---
async function processPdf(file) {
    if (processing) return;
    processing = true;
    pdfDoc = null;
    pages  = [];

    hideError();
    resultsEl.classList.add('hidden');
    controls.classList.add('hidden');
    bwGrid.innerHTML     = '';
    colourGrid.innerHTML = '';
    progressEl.classList.remove('hidden');
    progressBar.style.width = '0%';

    let pdf;
    try {
        const data = new Uint8Array(await file.arrayBuffer());
        pdf = await pdfjsLib.getDocument({ data }).promise;
    } catch (err) {
        progressEl.classList.add('hidden');
        processing = false;
        showError(err.name === 'PasswordException'
            ? 'This PDF is password-protected and cannot be processed.'
            : 'Failed to load PDF: ' + (err.message || 'Unknown error.'));
        return;
    }

    pdfDoc = pdf;
    const total       = pdf.numPages;
    const concurrency = CONFIG.max_concurrent_pages || 4;
    let   completed   = 0;

    pages = new Array(total).fill(null);

    async function processPage(i) {
        try {
            const page      = await pdf.getPage(i);
            const canvas    = await renderPage(page, CONFIG.render_scale);
            const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
            const isColour  = analysePagePixels(imageData, currentThreshold);
            const wrapper   = buildThumbWrapper(canvas, i);
            pages[i - 1]    = { pageNum: i, canvas, imageData, isColour, wrapper };
        } catch {
            const errWrap       = document.createElement('div');
            errWrap.className   = 'thumb-error';
            errWrap.textContent = `Page ${i} could not be rendered`;
            pages[i - 1]        = { pageNum: i, canvas: null, imageData: null, isColour: false, wrapper: errWrap, failed: true };
        }
        completed++;
        setProgress(completed, total);
    }

    resultsEl.classList.remove('hidden');
    for (let start = 0; start < total; start += concurrency) {
        const chunk = [];
        for (let i = start + 1; i <= Math.min(start + concurrency, total); i++) chunk.push(i);
        await Promise.all(chunk.map(processPage));
        appendChunkToGrids(chunk);
    }

    progressEl.classList.add('hidden');
    controls.classList.remove('hidden');
    processing = false;
}

// --- Threshold slider ---
thresholdSlider.addEventListener('input', () => {
    currentThreshold = Number(thresholdSlider.value);
    thresholdValue.textContent = currentThreshold + '%';
    if (sliderRafId) cancelAnimationFrame(sliderRafId);
    sliderRafId = requestAnimationFrame(() => {
        pages.forEach(p => {
            if (p && !p.failed) p.isColour = analysePagePixels(p.imageData, currentThreshold);
        });
        displayResults();
        sliderRafId = null;
    });
});

// --- Lightbox ---
async function openLightbox(pageNum) {
    lightbox.classList.remove('hidden');
    lightboxCanvas.width = lightboxCanvas.height = 1;

    try {
        const page  = await pdfDoc.getPage(pageNum);
        const hiRes = await renderPage(page, LIGHTBOX_SCALE);
        lightboxCanvas.width  = hiRes.width;
        lightboxCanvas.height = hiRes.height;
        lightboxCanvas.getContext('2d').drawImage(hiRes, 0, 0);
    } catch {
        closeLightbox();
    }
}

function closeLightbox() {
    lightbox.classList.add('hidden');
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxBackdrop.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// --- File events ---
fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    hideError();
    const err = validateFile(file);
    if (err) { showError(err); return; }
    processPdf(file);
});

uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    hideError();
    const err = validateFile(file);
    if (err) { showError(err); return; }
    processPdf(file);
});
