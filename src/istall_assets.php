<?php

function copy_dir($src, $dst)
{
    $dir = opendir($src);
    if (!is_dir($dst))
        @mkdir($dst);
    while (($file = readdir($dir))) {
        if (($file != '.') && ($file != '..')) {
            if (is_dir($src . '/' . $file))
                copy_dir($src . '/' . $file, $dst . '/' . $file);
            else
                copy($src . '/' . $file, $dst . '/' . $file);
        }
    }
    closedir($dir);
}

$destination_folder = $argv[1];
if (empty($destination_folder))
    throw new \Exception("Please specify a destination folder");
if (!is_dir($destination_folder))
    throw new \Exception("destination folder $destination_folder not found");

$destination_folder .= '/FastBackground';
if (!is_dir($destination_folder))
    mkdir($destination_folder);

$src_dir = __DIR__;

foreach (
    [
        'config.php',
        'clear_cache_job.php',
        'fast_background.js',
        'fast_background.min.js',
        'get_img_without_js.php',
        'index.php',
        'init.php'
    ] as $f_name) {
    if (in_array($f_name, ['config.php']) and file_exists($destination_folder . '/' . $f_name)) {
        echo "$f_name skipping. File already exist\n";
        continue;
    }
    copy($src_dir . '/' . $f_name, $destination_folder . '/' . $f_name);
}
if (!file_exists($destination_folder . '/.gitignore'))
    copy($src_dir . '/gitignore', $destination_folder . '/.gitignore');
else
    echo ".gitignore skipping. File already exist\n";
copy_dir($src_dir . '/third_party_libs', $destination_folder . '/third_party_libs');