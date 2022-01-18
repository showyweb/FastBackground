<?php

namespace showyweb\fast_background;
return (function (): fb {
    $config = include 'config.php';
    require_once $config['root_path'] . '/' . $config['vendor_path'] . '/autoload.php';
    return new fb($config);
})();