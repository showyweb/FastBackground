# FastBackground
Fast Background - это интеллектуальный JavaScript загрузчик изображений для веб проектов, который позволит вам сильно ускорить загрузку фоновых изображений для блочных элементов, а также элементов с тегом img. Вам больше не нужно будет делать несколько версий для разных экранов, к примеру, 1X, 2X и т. д. Fast Background в процессе загрузки страницы автоматически рассчитает оптимальный размер изображения на основе размера контейнера, плотности пикселей и CSS свойства background-size и создаст версию в кэше на вашем сервере, в котором старые изображения в зависимости от настроек периодически будут удаляться. Также для предотвращения задержки используется двухуровневое кэширование на стороне веб-браузера, если оптимальный размер изображения уже был раннее загружен.
# Необходимое  ПО
 - [PHP => 5.5](http://php.net/) 
 - [jQuery => 2.X](https://jquery.com/)
 - [CSSOBJ  => 1.1.2](https://github.com/cssobj/cssobj#cssobj-)
 
# Использование
```html
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
    <title>Новая страница</title>
    <script type="text/javascript" src="lib/jquery-3.1.1.min.js"></script>
    <script type="text/javascript" src="lib/cssobj.min.js"></script>
    <script type="text/javascript" src="lib/FastBackground/fast_background.min.js"></script>
  </head>
  <body class="fast_background" data-urls="{'.class_block1':'img/class_block1.jpg'}">
    <div class="class_block1 fast_background"></div>
    <div class="class_block1 fast_background" data-url="img/block2.jpg !important"></div>
    <div class="fast_background" data-url="img/block3.jpg"></div>
    <script>
     fast_background.ajax_url = "/FastBackground/index.php";
     fast_background.update();
    </script>
  </body>
</html>
```

#Документация
В разработке, частично доступна в исходных файлах.
