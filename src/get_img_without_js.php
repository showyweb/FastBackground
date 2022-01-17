<?php
if (!function_exists('fb_cache')) {
    /** Пример получения картинки минимального размера/качества из кэша для первичного отображения
     * @param $img_web_url string  Относительно от публичной директории путь до изображения
     * @param string|null $relative_path_for_cache [optional] Относительный путь от корневой директории сайта до кэша изображений, файлы в директории должны иметь публичный доступ для скачивания.
     * @param string|null $public_work_path [optional] Публичный корневой каталог сайта.
     * @param string|null $root_path [optional] Корневой каталог сайта.
     * @return string Возвращает относительный путь до изображения в кэше, но вернется пустая строка, если изображение не было сформировано в кэше
     * @throws exception
     */
    function fb_cache(string $img_web_url, string $relative_path_for_cache = "/.fast_background", string $public_work_path = null, string $root_path = null): ?string
    {
        require_once 'fast_background.php';
        /** @var \showyweb\fast_background\fb $fast_background_obj */
        global $fast_background_obj;
        if (empty($fast_background_obj))
            $fast_background_obj = include 'init.php';
        return $fast_background_obj->get_url($img_web_url, false, 0, 0, 3, $fast_background_obj->is_webp_support_from_http_header() ? IMAGETYPE_WEBP : IMAGETYPE_JPEG);
    }
}
