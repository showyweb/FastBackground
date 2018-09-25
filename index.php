<?php
require_once "fast_background.php";
$fb = new fast_background("/.fast_background", $_SERVER["DOCUMENT_ROOT"]);
$fb->clear_cache(); //Не рекомендуется так делать, это упрощенный вариант. Лучше вынести этот вызов функции в отдельный файл и запускать через cron
$fb->request_proc();