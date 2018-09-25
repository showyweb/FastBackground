<?php

require_once "fast_background_tools.php";

class fast_background extends fast_background_tools
{
    /**
     * fast_background constructor проверяет наличие запросов POST и формирует кэш изображений на стороне сервера.
     * Этот запрос отчистит кэш на сервере удалив изображения старше 1 часа. (Очистка кэша может не запустится если в директории кэша
     * имеется файл блокировки который младше значения time_filter)
     * @param string $relative_path_for_cache [optional] Относительный путь до директории кэша изображений, файлы в директории должны иметь публичный доступ для скачивания.
     * @param null $root_path [optional] Корневой каталог сайта.
     * @param bool $disable_request_commands [optional] Не проверять наличие GET и POST запросов.
     */
    function __construct($relative_path_for_cache = ".fast_background", $root_path = null)
    {
        $this->root_path = is_null($root_path) ? getcwd() : $root_path;
        $this->path_cache_ = $relative_path_for_cache;
        $path_cache = $this->root_path . "/" . $this->path_cache_;
        if(!is_dir($path_cache))
            mkdir($path_cache);
    }

    /** Запускает очистку кэша на сервере, удаляя изображения старше значения $time_filter. (Очистка кэша может не запустится если в директории кэша
     * имеется файл блокировки который младше значения $time_filter)
     * @param int $time_filter [optional] Значение в секундах.
     */

    function request_proc()
    {
        switch ($this->get_request('fast_background')) {
            case 'get_cached_url':
                session_write_close();
                $url = $this->get_request('web_url', false);
                $url = preg_replace("/https?\:\/\/" . $this->xss_filter($_SERVER['HTTP_HOST']) . "/u", "", $url);
                $url = $this->xss_filter($url);
                $cover_size = $this->to_boolean($this->get_request('cover_size'));
                $cont_size = $this->get_request('cont_size');
                $cont_size = explode("x", $cont_size);
                $other_size = $this->to_boolean($this->get_request('other_size'));
                $cached_url = $this->get_url($url, $cover_size, $cont_size[0], $cont_size[1], $other_size);
                exit($cached_url . '<->ajax_complete<->');
                break;
            case 'get_cached_urls':
                session_write_close();
                $urls = $this->get_request('web_url', false);
                $cover_sizes = $this->get_request('cover_size');
                $cont_sizes = $this->get_request('cont_size');
                $other_sizes = $this->get_request('other_size');
                $cached_urls = "";
                $urls = explode("\n", $urls);
                $cover_sizes = explode("\n", $cover_sizes);
                $cont_sizes = explode("\n", $cont_sizes);
                $other_sizes = explode("\n", $other_sizes);
                $len = count($urls);
                for ($i = 0; $i < $len; $i++) {
                    $url = $urls[$i];
                    $cover_size = $cover_sizes[$i];
                    $cont_size = $cont_sizes[$i];
                    $other_size = $other_sizes[$i];
                    $url = preg_replace("/https?\:\/\/" . $this->xss_filter($_SERVER['HTTP_HOST']) . "/u", "", $url);
                    $url = $this->xss_filter($url);
                    $cover_size = $this->to_boolean($cover_size);
                    $cont_size = explode("x", $cont_size);
                    $other_size = $this->to_boolean($other_size);
                    $cached_url = $this->get_url($url, $cover_size, $cont_size[0], $cont_size[1], $other_size);
                    $cached_urls .= $cached_url . "\n";
                }
                exit($cached_urls . '<->ajax_complete<->');
                break;
        }
    }

    /** Запускает очистку кэша на сервере, удаляя изображения старше значения $time_filter. (Очистка кэша может не запустится если в директории кэша
     * имеется файл блокировки который младше значения $time_filter)
     * @param int $time_filter [optional] Значение в секундах.
     */
    function clear_cache($time_filter = 24 * 60 * 60)
    {
        if($this->clear_cache_job($time_filter) !== -1)
            clearstatcache(true);
    }

    private function clear_cache_job($time_filter, $path = null)
    {
        $path_cache = $path_cache = $this->root_path . "/" . $this->path_cache_;
        $cur_time = time();
        if(is_null($path)) {
            ini_set('max_execution_time', 0);
            $time_lock_path = $path_cache . '/time_lock';
            if(file_exists($time_lock_path) && bcsub($cur_time, filemtime($time_lock_path)) < $time_filter)
                return -1;
            $this->save_to_text_file($time_lock_path, '', null);
        }

        if(is_null($path))
            $path = $path_cache . '/';
        $directory = opendir($path);
        $files_count = 0;
        while (false !== ($file = readdir($directory))) {
            if($file != "." && $file != "..") {
                $files_count++;
                if(is_dir($path . $file))
                    $files_count = $this->clear_cache_job($time_filter, $path . $file . "/");
                else {
                    if(bcsub($cur_time, filemtime($path . $file)) > $time_filter) {
                        $files_count--;
                        unlink($path . $file);
                    }
                }

            }
        }
        closedir($directory);
        if($files_count < 1)
            try {
                rmdir($path);
            } catch (Throwable  $e) {
            } catch (Exception $e) {
            }
        return $files_count;
    }

    /** Формирует необходимое изображение в кэше и возвращает относительный путь. В случае ошибки возвращает null.
     * @param string $web_url Относительный путь до изображения.
     * @param bool $cover_size Рассчитать минимальный размер изображения таким образом, чтобы оно заполнило контейнер, если false, то чтобы вместилось.
     * @param int $cont_width Ширина контейнера в пикселях.
     * @param int $cont_height Высота контейнера в пикселях.
     * @param bool $def_size Вернуть изображение по умолчанию для первоначальной быстрой загрузки, если нужного нет в кэше. Изображение по умолчанию формируется при полном отсутствии его в кэше. (Для ПК максимальный размер одной из сторон равен 1000 пикс., для мобильных устройств 500 пикс., частный размер может быть меньше если при формировании размеры контейнера меньше этих ограничений. При обновлении страницы в клиентском браузере, такое изображение уже не запрашивается, так как будет использоваться кэш браузера).
     * @param int $size_limit Максимальный размер одной из сторон изображения для хранения в кэше.
     * @return null|string
     */
    function get_url($web_url, $cover_size, $cont_width = 0, $cont_height = 0, $def_size = false, $size_limit = 3840/*2X Full HD*/)
    {
        if($web_url == "" || $cont_width == 0 || $cont_width == null || $cont_height == 0 || $cont_height == null)
            return null;
        $web_url = $this->xss_filter($web_url);
        $filename = $web_url;
        $filename = $this->root_path . "/" . $filename;
        if(!file_exists($filename))
            return null;
        $filemtime_filename = filemtime($filename);
        $cont_width = intval($cont_width);
        $cont_height = intval($cont_height);
        $cover_size = boolval($cover_size);
        $def_size = boolval($def_size);

        $size_vars = $this->get_size($web_url);
        $img_width = $size_vars->width;
        $img_height = $size_vars->height;

        $img_max = $img_width;
        if($img_height > $img_max)
            $img_max = $img_height;

        if($size_limit > $img_max)
            $size_limit = $img_max;
        if($cont_width > $size_limit)
            $cont_width = $size_limit;
        if($cont_height > $size_limit)
            $cont_height = $size_limit;

        $w_kof = $cont_width / $img_width;
        $h_kof = $cont_height / $img_height;
        $scale = $cover_size ? ($w_kof > $h_kof ? $w_kof : $h_kof) : ($w_kof < $h_kof ? $w_kof : $h_kof);
        $size = round($img_max * $scale);
        if($size > $size_limit)
            $size = $size_limit;
        $type = $this->get_img_type($web_url);
        $text_type = "";
        switch ($type) {
            case IMAGETYPE_JPEG:
                $text_type = '.jpg';
                break;
            case IMAGETYPE_PNG:
                $text_type = '.png';
                break;
            default:
                return null;
                break;
        }

        $cache_img_name = sha1($web_url . $filemtime_filename) . "_";
        $sub_dir = substr($cache_img_name, 0, 1);
        $sub_dir2 = substr($cache_img_name, 0, 2);
        $path_cache = $this->root_path . "/" . $this->path_cache_;
        if(!is_dir($path_cache))
            mkdir($path_cache, 0770);
        $path_cache = $this->root_path . "/" . $this->path_cache_ . "/" . $sub_dir;
        if(!is_dir($path_cache))
            mkdir($path_cache, 0770);
        $path_cache = $this->root_path . "/" . $this->path_cache_ . "/" . $sub_dir . "/" . $sub_dir2;
        if(!is_dir($path_cache))
            mkdir($path_cache, 0770);
        $cache_img_name_ = $cache_img_name;
        $cache_img_name .= ($size) . $text_type;
        $web_path_cache = $this->path_cache_ . "/" . $sub_dir . "/" . $sub_dir2;
        $web_url_cache_img = $web_path_cache . '/' . $cache_img_name;
        $web_url_img_default_path = $web_path_cache . '/' . ($this->is_mobile_device() ? "m_" : '') . "default_" . $cache_img_name_ . $text_type;
        $img_default_path = $this->root_path . "/" . $web_url_img_default_path;
        $cache_filename_ = $path_cache . '/' . $cache_img_name_;
        $cache_filename = $path_cache . '/' . $cache_img_name;


        $default_min_size = $this->is_mobile_device() ? 500 : 1000;

        $skip_zone_size = 10;
        $skip_zone_start = $size - ($size % $skip_zone_size);
        $link_start_file_name = $cache_filename_ . $skip_zone_start . '.txt';
        $is_cache_filename_reset = !file_exists($link_start_file_name) or !file_exists($this->root_path . "/" . $this->open_txt_file($link_start_file_name, null));


        if(!file_exists($img_default_path)) {
            copy($filename, $img_default_path);
            chmod($img_default_path, 0660);
            $this->compressing_img((($size < $default_min_size) ? $size : $default_min_size), $web_url_img_default_path, null, fast_background_JPEG_QUALITY::MEDIUM);
        }

        if($is_cache_filename_reset) {
            if($def_size and file_exists($img_default_path))
                return $web_url_img_default_path;
            copy($filename, $cache_filename);
            chmod($cache_filename, 0660);
            $this->save_to_text_file($link_start_file_name, $web_url_cache_img, null);
            chmod($link_start_file_name, 0660);
            $this->compressing_img($size, $web_url_cache_img, null, fast_background_JPEG_QUALITY::HIGH);
        } else
            $web_url_cache_img = $this->open_txt_file($link_start_file_name, null);
        /*$exist = file_exists($this->root_path . "/" . $web_url_cache_img);
        if($this->get_request('is_debug'))
            echo $exist ? "true" : 'false' . "<br>$link_start_file_name<br>";
        if(!$exist) {
           unlink($link_start_file_name);
            return $this->get_url($web_url, $cover_size, $cont_width, $cont_height, $def_size, $size_limit);
        }*/

        return $web_url_cache_img;
    }
}