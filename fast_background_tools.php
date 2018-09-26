<?php

abstract class fast_background_JPEG_QUALITY
{
    const HIGHEST = 100;
    const HIGH = 85;
    const MEDIUM = 50;
    const LOW = 0;
}

class fast_background_tools
{
    protected $root_path = null;

    protected $path_cache_ = null;

    protected function error($mes)
    {
        throw new exception($mes);
    }

    private function utf8_str_split($str)
    {
        $split = 1;
        $array = array();
        for ($i = 0; $i < strlen($str);) {
            $value = ord($str[$i]);
            if($value > 127) {
                if($value >= 192 && $value <= 223)
                    $split = 2;
                elseif($value >= 224 && $value <= 239)
                    $split = 3;
                elseif($value >= 240 && $value <= 247)
                    $split = 4;
            } else {
                $split = 1;
            }
            $key = NULL;
            for ($j = 0; $j < $split; $j++, $i++) {
                $key .= $str[$i];
            }
            array_push($array, $key);
        }
        return $array;
    }

    private function remove_nbsp($str)
    {
        return str_replace(array("&nbsp;", chr(194) . chr(160)), array(" ", " "), $str);
    }

    private $chr_to_escape = "()*°%:+";

    private function characters_escape($variable)
    {
        $chr_to_escape = $this->chr_to_escape;

        $chr_to_escape_arr = $this->utf8_str_split($chr_to_escape);
        $patterns_chr_to_escape = [];
        $code_escape_arr = [];
        foreach ($chr_to_escape_arr as $chr)
            $code_escape_arr[] = "&#" . ord($chr) . ";";

        $chr_to_escape_arr = preg_replace('/(\/|\.|\*|\?|\=|\(|\)|\[|\]|\'|"|\+)/Uui', '\\\$1', $chr_to_escape_arr);
        foreach ($chr_to_escape_arr as $chr) {
            $patterns_chr_to_escape[] = "/$chr/uim";
        }


        $variable = $this->remove_nbsp(htmlspecialchars($variable, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $variable = preg_replace($patterns_chr_to_escape, $code_escape_arr, $variable);
        return $variable;
    }

    private $xss_filtered_arr = [];

    /**
     * Не фильтрует атаки в css
     * @param string $variable
     * @param bool $max_level
     * @return array|null|string
     */
    protected function xss_filter($variable, $max_level = false)
    {
        $xss_filtered_arr = &$this->xss_filtered_arr;
        if($variable === "*")
            return $variable;

        if(in_array($variable, $xss_filtered_arr))
            return $variable;

        $new_variable_for_sql = null;
        if(is_null($variable))
            return null;
        if(is_array($variable)) {
            foreach ($variable as $key => $val) {
                $variable[$key] = $this->xss_filter($val);
            }

            return $variable;
        }
        if(!$max_level)
            $variable = $this->characters_escape($variable);
        $characters_allowed = "йцукеёнгшщзхъфывапролджэячсмитьбюqwertyuiopasdfghjklzxcvbnm";
        $characters_allowed .= mb_strtoupper($characters_allowed, 'UTF-8') . "1234567890-_" . ($max_level ? "" : ".,&#;@/=") . " ";
        $characters_allowed_arr = $this->utf8_str_split($characters_allowed);
        $variable_for_sql_arr = $this->utf8_str_split($variable);
        unset($characters_allowed, $variable_for_sql);
        $variable_for_sql_length = count($variable_for_sql_arr);
        $characters_allowed_length = count($characters_allowed_arr);
        for ($i = 0; $i < $variable_for_sql_length; $i++)
            for ($i2 = 0; $i2 < $characters_allowed_length; $i2++)
                if($variable_for_sql_arr[$i] == $characters_allowed_arr[$i2])
                    $new_variable_for_sql .= $characters_allowed_arr[$i2];
        $new_variable_for_sql = preg_replace('/http(s)?\/\//ui', 'http$1://', $new_variable_for_sql);
        $xss_filtered_arr[] = $new_variable_for_sql;
        return $new_variable_for_sql;
    }

    protected function get_request($request, $xss_filter = true)
    {
        return isset($_REQUEST[$request]) ? ($xss_filter ? $this->xss_filter($_REQUEST[$request]) : $_REQUEST[$request]) : null;
    }

    protected function to_boolean($val)
    {
        return filter_var($val, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    }

    protected function open_txt_file($path, $extn = 'txt')
    {
        $text = "";
        if($extn !== null)
            $path .= '.' . $extn;
        if(!file_exists($path))
            return null;
        $lines = file($path);
        foreach ($lines as $line) {
            if(isset($text))
                $text .= $line;
            else
                $text = $line;
        }
        unset($lines);
        return $text;
    }

    protected function save_to_text_file($path, $text, $extn = 'txt')
    {
        if($extn == null)
            $extn = '';
        else
            $extn = '.' . $extn;
        $file = fopen($path . ".tmp", "w");
        if(!$file) {
            return false;
        } else {
            fputs($file, $text);
        }
        fclose($file);
        if(!file_exists($path . ".tmp")) {
            unset($text);
            return false;
        }
        if(sha1($text) == sha1_file($path . ".tmp")) {
            if(file_exists($path . $extn))
                unlink($path . $extn);
            if(!file_exists($path . ".tmp")) {
                unset($text);
                return false;
            }
            rename($path . ".tmp", $path . $extn);
        } else {
            if(!file_exists($path . ".tmp")) {
                unset($text);
                return false;
            }
            unlink($path . ".tmp");
            unset($text);
            return false;
        }
        unset($text);
        return true;
    }

    protected function is_mobile_device()
    {
        $is_mobile = false;
        if(isset($_SESSION['is_mobile']))
            $is_mobile = $_SESSION['is_mobile'];
        else {
            $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : "";

            $Android = preg_match('/Android/ui', $user_agent) ? true : false;
            $BlackBerry = preg_match('/BlackBerry|BB/ui', $user_agent) ? true : false;
            $iOS = preg_match('/iPhone|iPad|iPod/ui', $user_agent) ? true : false;
            $Windows = preg_match('/IEMobile/ui', $user_agent) ? true : false;
            $opera_mini = preg_match('/Opera Mini|Opera Mobi/ui', $user_agent) ? true : false;

            $is_mobile = ($Android || $BlackBerry || $iOS || $opera_mini || $Windows);
            $is_tablet = $is_mobile ? ((preg_match('/ipad/ui', $user_agent) ? true : false) || ($Android && !(preg_match('/mobile/ui', $user_agent) ? true : false)) || ($BlackBerry && (preg_match('/tablet/ui', $user_agent) ? true : false))) : false;
            if($is_tablet)
                $is_mobile = false;
        }

        return $is_mobile;
    }

    private function is_os_windows()
    {
        return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    }

    /**
     * Возвращает размер изображения в виде объекта со свойствами width и height
     * @param string $web_url
     * @return object
     *
     */
    protected function get_size($web_url)
    {
        $filename = "/" . $web_url;
        $filename = $this->root_path . $filename;
        $filename = str_replace('//', '/', $filename);
        list($width, $height) = getimagesize($filename);
        return (object)array('width' => $width, 'height' => $height);
    }

    protected function get_img_type($web_url)
    {
        $filename = "/" . $web_url;
        $filename = $this->root_path . $filename;
        $filename = str_replace('//', '/', $filename);
        $imgInfo = getimagesize($filename);
        if($imgInfo[0] == 0 or $imgInfo[1] == 0)
            $this->error('Вы пытаетесь обработать не поддерживаемый формат файла, загрузить возможно только изображения в формате jpg, jpeg и png…');
        return $imgInfo[2];
    }


    /**
     * @param $size
     * @param $web_url
     * @param null $end_type
     * @param int $jpeg_quality
     * @param bool|false $revert_size_coefficient Высота или ширина будет не меньше $size
     * @return bool
     * @throws exception
     */
    function compressing_img($size, $web_url, $end_type = null, $jpeg_quality = fast_background_JPEG_QUALITY::HIGHEST, $revert_size_coefficient = false)
    {
        $path_cache = $this->root_path . "/" . $this->path_cache_;
        $lock_file = $path_cache . '/compressing_img_lock';
        while (file_exists($lock_file)) {
            if(date("i") != date("i", filemtime($lock_file))) {
                unlink($lock_file);
                break;
            } else {
                sleep(1);
            }
        }
        try {
            $this->save_to_text_file($lock_file, '', null);
        } catch (Throwable $e) {
            unlink($lock_file);
        } catch (Exception $e) {
            unlink($lock_file);
        }
        $filename = null;
        try {
            if(is_null($size)) $size = 3840;
            $filename = "/" . $web_url;
            $filename = $this->root_path . $filename;
            $filename = str_replace('//', '/', $filename);
            $imgInfo = getimagesize($filename);
            list($width, $height) = $imgInfo;
            $max_image_size = 10000;
            if($width > $max_image_size or $height > $max_image_size) {
                unlink($filename);
                $this->error('Невозможно обработать изображение, так как высота или ширина больше чем ' . $max_image_size . ' пикселей, слишком большие изображения нельзя обработать на сервере');
            }

            if($imgInfo[0] == 0 or $imgInfo[1] == 0)
                $this->error('Вы пытаетесь обработать не поддерживаемый формат файла, загрузить возможно только изображения в формате jpg, jpeg и png…');
            $max_php_image_size = 3840;
            if($width > $max_php_image_size or $height > $max_php_image_size) {
                $exec_command = ($this->is_os_windows() ? "magick " : "") . "convert -limit memory 10MB -limit map 10MB -limit area 10MB \"$filename\" -scale $max_php_image_size -quality $jpeg_quality \"$filename\"";
                exec($exec_command, $output, $return_var);
                if($return_var != 0)
                    $this->error("Ошибка сжатия файла $filename с помощью imagemagick");
                sleep(1);
                $imgInfo = getimagesize($filename);
                list($width, $height) = $imgInfo;
            }
            $exif = null;
            try {
                $exif = @read_exif_data($filename);
            } catch (Throwable  $ex) {

            } catch (Exception $ex) {

            }

            $coefficient = $size;
            if(($width > $coefficient or $height > $coefficient) and $coefficient != 0) {
                if($revert_size_coefficient) {
                    if($width < $height) {
                        $w_ = $width / $coefficient;
                        $w = $width / $w_;
                        $h = $height / $w_;
                    } else {
                        $h_ = $height / $coefficient;
                        $w = $width / $h_;
                        $h = $height / $h_;
                    };
                } else {
                    if($width >= $height) {
                        $w_ = $width / $coefficient;
                        $w = $width / $w_;
                        $h = $height / $w_;
                    } else {
                        $h_ = $height / $coefficient;
                        $w = $width / $h_;
                        $h = $height / $h_;
                    };
                }
                $newwidth_2 = $w;
                $newheight_2 = $h;
                $original_compressing = false;

                $img = imagecreatetruecolor($newwidth_2, $newheight_2);
            } else {
                $newwidth_2 = $imgInfo[0];
                $newheight_2 = $imgInfo[1];
                $original_compressing = true;
                $img = imagecreatetruecolor($imgInfo[0], $imgInfo[1]);
            };
            imagesetinterpolation($img, IMG_BICUBIC_FIXED);
            $source = null;
            switch ($imgInfo[2]) {
                case IMAGETYPE_JPEG:
                    if(!($source = imagecreatefromjpeg($filename)))
                        $this->error("Ошибка обработки изображения!");
                    break;

                case IMAGETYPE_PNG:
                    if(!($source = imagecreatefrompng($filename)))
                        $this->error("Ошибка обработки изображения!");
                    break;
                default:
                    $this->error("Ошибка обработки изображения!");
                    break;
            }
            imagesetinterpolation($source, IMG_BICUBIC_FIXED);
            $end_type = is_null($end_type) ? $imgInfo[2] : $end_type;

            switch ($end_type) {
                case IMAGETYPE_JPEG:
                    $is_rotate = false;
                    if(isset($exif['Orientation'])) {
                        if($exif['Orientation'] == 3) {
                            $is_rotate = true;
                            $source = imagerotate($source, 180, 0);
                        } elseif($exif['Orientation'] == 6)
                            $source = imagerotate($source, 270, 0);
                        elseif($exif['Orientation'] == 8)
                            $source = imagerotate($source, 90, 0);
                        if($exif['Orientation'] == 6 || $exif['Orientation'] == 8) {
                            $is_rotate = true;
                            $temp = $imgInfo[0];
                            $imgInfo[0] = $imgInfo[1];
                            $imgInfo[1] = $temp;

                            $tmp = $width;
                            $width = $height;
                            $height = $tmp;

                            $tmp = $newwidth_2;
                            $newwidth_2 = $newheight_2;
                            $newheight_2 = $tmp;
                        }
                        $img = imagecreatetruecolor($newwidth_2, $newheight_2);
                        imagesetinterpolation($img, IMG_BICUBIC_FIXED);
                    }
                    if($original_compressing && $end_type == $imgInfo[2] && !$is_rotate && $jpeg_quality == fast_background_JPEG_QUALITY::HIGHEST)
                        break;
                    if(!$original_compressing) {
                        $im_temp = $source;
                        if(!imagecopyresampled($img, $im_temp, 0, 0, 0, 0, $newwidth_2, $newheight_2, $width, $height)) error("Ошибка обработки изображения!");
                        imagejpeg($img, $filename, $jpeg_quality);

                    } else {
                        imagejpeg($source, $filename, $jpeg_quality);

                    }
                    break;

                case IMAGETYPE_PNG:
                    if($original_compressing && $end_type == $imgInfo[2] && $jpeg_quality == fast_background_JPEG_QUALITY::HIGHEST)
                        break;
                    imagealphablending($img, false);
                    imagesavealpha($img, true);
                    $transparent = imagecolorallocatealpha($img, 255, 255, 255, 127);
                    imagefilledrectangle($img, 0, 0, $imgInfo[0], $imgInfo[1], $transparent);
                    if(!$original_compressing) {
                        if(!imagecopyresampled($img, $source, 0, 0, 0, 0, $newwidth_2, $newheight_2, $imgInfo[0], $imgInfo[1])) $this->error("Ошибка обработки изображения!");
                    } else {
                        if(!imagecopyresampled($img, $source, 0, 0, 0, 0, $imgInfo[0], $imgInfo[1], $imgInfo[0], $imgInfo[1])) $this->error("Ошибка обработки изображения!");
                    }
                    $jpeg_quality /= 10;
                    $jpeg_quality = intval($jpeg_quality);
                    if($jpeg_quality > 9)
                        $jpeg_quality = 9;
                    imagepng($img, $filename, $jpeg_quality);
                    break;
            }
            if(isset($source))
                imagedestroy($source);
            if(isset($im))
                imagedestroy($im);
            if(isset($img))
                imagedestroy($img);
        } catch (Throwable  $e) {
            if(file_exists($filename))
                unlink($filename);
//            exit($e->getMessage());
            $this->error($e->getMessage());
        } catch (Exception $e) {
            if(file_exists($filename))
                unlink($filename);
//            exit($e->getMessage());
            $this->error($e->getMessage());
        } finally {
            if(file_exists($lock_file))
                unlink($lock_file);
        }
        return true;
    }
}