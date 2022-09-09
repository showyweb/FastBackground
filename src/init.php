<?php

namespace showyweb\fast_background;
return (function (): fb {
    $config = include 'config.php';
    require_once ($config['root_path'] ?? ($_SERVER["DOCUMENT_ROOT"] ?: getcwd())) . '/' . ($config['vendor_path'] ?? 'vendor') . '/autoload.php';
    return new fb($config);
})();