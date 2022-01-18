<?php
return [
    'root_path' => $_SERVER["DOCUMENT_ROOT"] ?: getcwd(), //Абсолютный путь до корневой директории сайта
    'vendor_path' => 'vendor', //Относительный путь от корневой директории сайта до директории vendor
    'public_work_path' => $_SERVER['DOCUMENT_ROOT'] ?: getcwd(), //Абсолютный путь до публичной директории сайта. Файлы в этой директории должны иметь публичный доступ по протоколу HTTP
    'relative_path_for_cache' => '.fast_background', //Относительный путь от public_work_path до директории кэша изображений. Файлы в этой директории должны иметь публичный доступ для скачивания по протоколу HTTP
    'use_lock_file' => false, // Использовать файл блокировки, чтобы запретить большое количество параллельных php процессов. Включите, если на вашем сервере мало оперативной памяти. В других случаях рекомендуется отключить, иначе могут возникать большие задержки при отсутствии картинок в кэше на сервере. Также для более тонкой настройки используйте fast_background.fast_background.max_ajax_post_stream в JavaScript
    'clear_cache_time_filter' => 30 * 24 * 60 * 60 //Значение в секундах. По умолчанию 30 дней. Запускает очистку кэша на сервере, удаляя изображения старше значения clear_cache_time_filter. Для работы этой функции необходимо запускать clear_cache_job.php с помощью Cron (Очистка кэша может не запустится, если в директории кэша имеется файл блокировки который младше значения clear_cache_time_filter)
];