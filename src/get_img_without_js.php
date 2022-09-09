<?php
if (!function_exists('fb_cache')) {
    /** Пример получения картинки минимального размера/качества из кэша для первичного отображения
     * @param $img_web_url string  Относительно от публичной директории путь до изображения
     * @param bool $force Вернуть даже если изображение ранее не было сформировано в кэше, иначе вернется пустая строка
     * @param int|null $max_size Максимальный размер в px одной из сторон
     * @return string Возвращает относительный путь до изображения в кэше
     * @throws exception
     */
    function fb_cache(string $img_web_url, bool $force = true, ?int $max_size = null): ?string
    {
        /** @var \showyweb\fast_background\fb $fast_background_obj */
        global $fast_background_obj;
        if (empty($fast_background_obj))
            $fast_background_obj = include 'init.php';

        return $fast_background_obj->get_url($img_web_url, false, $max_size ?: 0, $max_size ?: 0, $force ? 2 : 3, $fast_background_obj->is_webp_support_from_http_header() ? IMAGETYPE_WEBP : IMAGETYPE_JPEG);
    }
}
