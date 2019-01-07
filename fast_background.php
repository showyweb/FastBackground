<?php

require_once "fast_background_tools.php";

class fast_background extends fast_background_tools
{
    /**
     * @param null|string $relative_path_for_cache [optional] Относительный путь до директории кэша изображений, файлы в директории должны иметь публичный доступ для скачивания.
     * @param null|string $public_work_path [optional] Публичный корневой каталог сайта.
     * @param null|string $root_path [optional] Корневой каталог сайта.
     */
    function __construct($relative_path_for_cache = ".fast_background", $public_work_path = null, $root_path = null)
    {
        //                echo(print_r($_SERVER));
        //        ini_set('display_errors', 1);
        $this->work_path = is_null($public_work_path) ? getcwd() : $public_work_path;

        if(substr($this->work_path, 2, 1) === "\\")
            $this->work_path = str_replace("\\", "/", $this->work_path);

        /*$wp = dirname($_SERVER['PHP_SELF']);
        if($wp !== "/")
            $this->work_path = str_replace($wp, "", $this->work_path);*/
//        exit($this->work_path);

        $this->cache_relative_path = $relative_path_for_cache;
        $path_cache = $this->work_path . "/" . $this->cache_relative_path;
        $path_cache = $this->clear_slashes($path_cache);
        /*var_export($path_cache);
        exit();*/
        if(!is_dir($path_cache))
            mkdir($path_cache);
        $root_path = !is_null($root_path) ? $root_path : $_SERVER["DOCUMENT_ROOT"];
        $this->web_relative_path = str_replace($root_path, "", $this->work_path);
        if(!empty($this->web_relative_path))
            $this->web_relative_path .= "/";
        $this->web_relative_path = $this->clear_slashes($this->web_relative_path);
        /* var_export($this->work_path);
         echo "<br>";
         var_export($this->relative_path);
         exit();*/

        parent::__construct();
    }

    private function prepare_vars(&$web_url, &$cover_size, &$cont_size, &$def_size, &$end_type)
    {
        $url = $web_url;
        $url = preg_replace("/https?\:\/\/" . $this->xss_filter($_SERVER['HTTP_HOST']) . "/u", "", $url);
        $web_url = str_replace("..", "", $url);
        $cover_size = $this->to_boolean($cover_size);
        $cont_size = explode("x", $cont_size);
        $cont_size[0] = intval($cont_size[0]);
        $cont_size[1] = intval($cont_size[1]);
        $def_size = intval($def_size);
        $end_type = intval($end_type);
    }


    /**
     * Проверяет наличие запросов POST и формирует кэш изображений на стороне сервера.
     */
    function request_proc()
    {
        $r = $this->get_request('fast_background');
        if(is_null($r))
            return;

        switch ($r) {
            case 'get_cached_url':
                session_write_close();
                $url = $this->get_request('web_url', false);
                $cover_size = $this->get_request('cover_size');
                $cont_size = $this->get_request('cont_size');
                $def_size = $this->get_request('def_size');
                $end_type = $this->get_request('end_type');
                $this->prepare_vars($url, $cover_size, $cont_size, $def_size, $end_type);
                $cached_url = $this->get_url($url, $cover_size, $cont_size[0], $cont_size[1], $def_size, $end_type);
                exit($cached_url . '<->ajax_complete<->');
                break;
            case 'get_cached_urls':
                session_write_close();
                $urls = $this->get_request('web_url', false);
                $cover_sizes = $this->get_request('cover_size', false);
                $cont_sizes = $this->get_request('cont_size', false);
                $def_sizes = $this->get_request('def_size', false);
                $end_types = $this->get_request('end_type', false);
                $cached_urls = "";
                $urls = explode(":", $urls);
                $cover_sizes = explode(":", $cover_sizes);
                $cont_sizes = explode(":", $cont_sizes);
                $def_sizes = explode(":", $def_sizes);
                $end_types = explode(":", $end_types);
                $len = count($urls) - 1;
                for ($i = 0; $i < $len; $i++) {
                    $url = $urls[$i];
                    $cover_size = $cover_sizes[$i];
                    $cont_size = $cont_sizes[$i];
                    $def_size = $def_sizes[$i];
                    $end_type = $end_types[$i];
                    $this->prepare_vars($url, $cover_size, $cont_size, $def_size, $end_type);

                    try {
                        $cached_url = $this->get_url($url, $cover_size, $cont_size[0], $cont_size[1], $def_size, $end_type);
                    } catch (Throwable $e) {
                        error_log($e->getMessage() . " in " . $e->getLine() . ":" . $e->getFile());
                        $cached_url = "";
                    } catch (Exception $e) {
                        error_log($e->getMessage() . " in " . $e->getLine() . ":" . $e->getFile());
                        $cached_url = "";
                    }
                    $cached_urls .= $cached_url . ":";
                    unset($url, $cover_size, $cont_size, $def_size);
                }
                exit($cached_urls . '<->ajax_complete<->');
                break;
        }
    }

    /** Запускает очистку кэша на сервере, удаляя изображения старше значения $time_filter. (Очистка кэша может не запустится если в директории кэша
     * имеется файл блокировки который младше значения $time_filter)
     * @param int $time_filter [optional] Значение в секундах. По умолчанию 30 дней.
     */
    function clear_cache($time_filter = 30 * 24 * 60 * 60)
    {
        if($this->clear_cache_job($time_filter) !== -1)
            clearstatcache(true);
    }

    private function clear_cache_job($time_filter, $path = null)
    {
        $path_cache = $this->work_path . "/" . $this->cache_relative_path;

        $path_cache = $this->clear_slashes($path_cache);

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
     *
     * 0 - не использовать
     *
     * 1 - использовать, если в кэше нет нужного размера
     *
     * 2 - использовать в любом случае
     * @param int $size_limit Максимальный размер одной из сторон изображения для хранения в кэше.
     * @return null|string
     */
    function get_url($web_url, $cover_size, $cont_width = 0, $cont_height = 0, $def_size = false, $end_type = null, $size_limit = 3840/*2X Full HD*/)
    {
        //        if($web_url=="/uploads/mcm-29-20180827153950.png")
        //            echo "";

        //        $is_debug = !!$this->get_request('debug');
        if($web_url == "" || (($cont_width == 0 || $cont_width == null) && ($cont_height == 0 || $cont_height == null)))
            return null;
        $f_imagewebp_exist = function_exists('imagewebp');
        //        $f_imagewebp_exist = false;
        $webp_use = $end_type === IMAGETYPE_WEBP;
        $is_cwebp_use = $webp_use && !$f_imagewebp_exist;


        if(!$webp_use)
            $end_type = null;
        if($cont_width == 0 || $cont_width == null)
            $cont_width = $cont_height;
        if($cont_height == 0 || $cont_height == null)
            $cont_height = $cont_width;

        $filename = $web_url;
        $filename = $this->work_path . "/" . $filename;
        $filename = $this->clear_slashes($filename);

        //        header('dbg' . __LINE__ . ':+');

        if(!file_exists($filename))
            return null;

        //        header('dbg' . __LINE__ . ':+');

        $filemtime_filename = filemtime($filename);
        $cont_width = intval($cont_width);
        $cont_height = intval($cont_height);
        if($cont_width < 1)
            $cont_width = $cont_height;
        if($cont_height < 1)
            $cont_height = $cont_width;


        try {
            //            header('dbg' . __LINE__ . ':+');
            $size_vars = $this->get_size($web_url);
            //            header('dbg' . __LINE__ . ':+');
            $type = empty($end_type) ? $this->get_img_type($web_url) : $end_type;
            //            header('dbg' . __LINE__ . ':+');
        } catch (Throwable $e) {
            //            header('dbg' . __LINE__ . ':+');
            return $this->web_relative_path . $web_url;
        } catch (Exception $e) {
            //            header('dbg' . __LINE__ . ':+');
            return $this->web_relative_path . $web_url;
        }


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

        $text_type = ".";
        switch ($type) {
            case IMAGETYPE_JPEG:
                $text_type .= 'jpg';
                break;
            case IMAGETYPE_PNG:
                $text_type .= 'png';
                break;
            case IMAGETYPE_WEBP:
                $text_type .= 'webp';
                break;
            default:
                return $this->web_relative_path . $web_url;
                break;
        }

        $cache_img_name = sha1($web_url . $filemtime_filename) . "_{$type}_";
        $sub_dir = substr($cache_img_name, 0, 1);
        $sub_dir2 = substr($cache_img_name, 0, 2);


        $path_cache = $this->work_path . "/" . $this->cache_relative_path;

        $path_cache = $this->clear_slashes($path_cache);

        if(!is_dir($path_cache))
            mkdir($path_cache, 0770);
        $path_cache .= "/" . $sub_dir;
        if(!is_dir($path_cache))
            mkdir($path_cache, 0770);
        $path_cache .= "/" . $sub_dir2;
        if(!is_dir($path_cache))
            mkdir($path_cache, 0770);

        $web_path_cache = $this->cache_relative_path . "/" . $sub_dir . "/" . $sub_dir2;

        $cache_img_name_ = $cache_img_name;
        $cache_img_name .= ($size) . $text_type;
        $web_url_cache_img = $web_path_cache . '/' . $cache_img_name;
        $web_url_img_default_path = $web_path_cache . '/' . ($this->is_mobile_device() ? "m_" : '') . "def_" . $cache_img_name_ . $text_type;
        $img_default_path = $this->work_path . "/" . $web_url_img_default_path;
        $img_default_path = $this->clear_slashes($img_default_path);

        $cache_filename_ = $path_cache . '/' . $cache_img_name_;
        $cache_filename = $path_cache . '/' . $cache_img_name;

        $default_min_size = $this->is_mobile_device() ? 500 : 1000;

        $skip_zone_size = 10;
        $skip_zone_start = $size - ($size % $skip_zone_size);
        $link_start_file_name = $cache_filename_ . $skip_zone_start . '.txt';

        $is_cache_filename_reset = !file_exists($link_start_file_name) || !file_exists($this->work_path . "/" . $this->open_txt_file($link_start_file_name, null));
        /*  if($is_debug) {
              var_export($is_cache_filename_reset);
              echo "<br>";
              var_export(!file_exists($link_start_file_name) || !file_exists($this->root_path . "/" . $this->open_txt_file($link_start_file_name, null)));
              echo "<br>";
          }*/

        $def_size_limit = ($size < $default_min_size) ? $size : $default_min_size;
        if(!file_exists($img_default_path)) {
            copy($filename, $img_default_path);
            chmod($img_default_path, 0660);
            $quality = fast_background_JPEG_QUALITY::MEDIUM;
            $this->compressing_img($def_size_limit, $web_url_img_default_path, !$is_cwebp_use ? $type : null, !$is_cwebp_use ? $quality : fast_background_JPEG_QUALITY::HIGHEST);
            if($is_cwebp_use)
                $this->cwebp($web_url_img_default_path, $quality);
        }

        if((($def_size === 1 && $is_cache_filename_reset) || $def_size === 2) && file_exists($img_default_path))
            return $this->web_relative_path . $web_url_img_default_path;

        if($is_cache_filename_reset) {
            copy($filename, $cache_filename);
            chmod($cache_filename, 0660);

            $this->save_to_text_file($link_start_file_name, $web_url_cache_img, null);

            chmod($link_start_file_name, 0660);
            $quality = fast_background_JPEG_QUALITY::HIGH;

            $this->compressing_img($size, $web_url_cache_img, !$is_cwebp_use ? $type : null, !$is_cwebp_use ? $quality : fast_background_JPEG_QUALITY::HIGHEST);

            if($is_cwebp_use)
                $this->cwebp($web_url_cache_img, $quality);
        } else
            $web_url_cache_img = $this->open_txt_file($link_start_file_name, null);
        return $this->web_relative_path . $web_url_cache_img;
    }
}