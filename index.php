<?php
$config = require __DIR__ . '/config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Coloured Page Counter</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <script>window.CONFIG = <?= json_encode($config, JSON_HEX_TAG) ?>;</script>

    <div id="app">
        <h1>PDF Coloured Page Counter</h1>
        <p>Counts the number of coloured pages in a PDF - 100% private, runs completely in your browser.<br />

        If you're printing your dissertation or thesis, the print facility might want these numbers, and this tool is probably quicker than counting manually.<br />

        Experiment with the 'Colour sensitivity' slider to change categorisation thresholds.<br />

        N.B. Use at your own risk - we are not responsible for additional printing costs incurred due to miscategorisation!<br />

        Source code: <a style="color: orange;" target="_blank" href="https://github.com/benmeg/pdf-coloured-page-counter">github.com/benmeg/pdf-coloured-page-counter</a></p>
        <div id="upload-area">
            <input type="file" id="file-input" accept=".pdf" aria-label="Select PDF file">
            <label for="file-input">
                <span class="upload-icon">&#8679;</span>
                <span>Drop a PDF here or <strong>browse</strong></span>
                <span class="size-hint">Maximum file size: <?= htmlspecialchars((string)$config['max_file_size_mb'], ENT_QUOTES, 'UTF-8') ?>MB</span>
            </label>
        </div>

        <div id="error-message" class="hidden" role="alert"></div>

        <div id="controls" class="hidden">
            <label for="threshold-slider">
                Colour sensitivity: <strong><span id="threshold-value"><?= htmlspecialchars((string)$config['default_threshold'], ENT_QUOTES, 'UTF-8') ?>%</span></strong>
            </label>
            <input type="range" id="threshold-slider" min="0" max="100"
                   value="<?= htmlspecialchars((string)$config['default_threshold'], ENT_QUOTES, 'UTF-8') ?>" aria-label="Colour sensitivity threshold">
        </div>

        <div id="progress" class="hidden" aria-live="polite">
            <div class="progress-track"><div id="progress-bar"></div></div>
            <span id="progress-text">Processing...</span>
        </div>

        <div id="results" class="hidden">
            <div id="panels">
                <section class="panel" aria-labelledby="bw-heading">
                    <h2 id="bw-heading">B/W Pages (<span id="bw-count">0</span>)</h2>
                    <div class="thumbnail-grid" id="bw-grid"></div>
                </section>
                <section class="panel" aria-labelledby="colour-heading">
                    <h2 id="colour-heading">Colour Pages (<span id="colour-count">0</span>)</h2>
                    <div class="thumbnail-grid" id="colour-grid"></div>
                </section>
            </div>
            <div id="colour-list">
                <strong>Colour pages:</strong>
                <span id="colour-pages-text"></span>
            </div>
        </div>
    </div>

    <div id="lightbox" class="hidden" role="dialog" aria-modal="true" aria-label="Page preview">
        <div id="lightbox-backdrop"></div>
        <div id="lightbox-inner">
            <button id="lightbox-close" aria-label="Close preview">&times;</button>
            <canvas id="lightbox-canvas"></canvas>
        </div>
    </div>

    <script src="assets/pdfjs/pdf.min.js"></script>
    <script src="assets/js/analyser.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
