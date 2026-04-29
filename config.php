<?php
return [
    'max_file_size_mb'    => 20,
    'default_threshold'   => 10,   // HSL saturation percent (0–100)
    'render_scale'        => 0.5,  // canvas render scale for thumbnails and analysis
    'max_concurrent_pages' => 4,   // pages rendered in parallel; imageData (~1 MB each) is cached per page for slider responsiveness
];
