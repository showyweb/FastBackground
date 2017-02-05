/**
 * Name:    FastBackground
 * Version: 0.3.3
 * Author:  Novojilov Pavel Andreevich
 * Support: http://SHOWYWEB.ru
 * License: MIT license. http://www.opensource.org/licenses/mit-license.php
 * Copyright (c) 2017 Pavel Novojilov
 */
var fast_background = {
    timeout: null,
    timeout_size: 0,
    cssobj: null,
    resize_event: true, // Авто обновление при изменении размера окна
    ajax_url: window.location.href,
    _page_unloaded: false,
    _fix_old_browsers: false,
    /**
     * Запускает загрузку или обновление изображений
     * @param {Function} [update_callback=null] Обратная функция в случае успешного завершения
     * @param {function(string)} [error_callback=null] Обратная функция в случае ошибки, возвращает сообщение.
     * @param {Boolean} [force_reload_image=false] По умолчанию изображения загружаются только если их нет в кэше браузера и загружено достаточно большое изображение, этот параметр позволяет игнорировать такие проверки.
     */
    update: function (update_callback, error_callback, force_reload_image) {
        if (window.location.host.indexOf('yandex.net') != -1) //Отключить для Yandex Webvisor
            return;

        clearTimeout(fast_background.timeout);
        fast_background.timeout = setTimeout(function (callback) {
            if (fast_background.timeout_size == 0)
                fast_background.timeout_size = 1000;
            if (fast_background.ajax_is_work > 0) {
                fast_background.timeout = setTimeout(arguments.callee.bind(this, update_callback), fast_background.timeout_size);
                return;
            }
            fast_background._page_unloaded = false;
            if (typeof SW_BS === "undefined") {
                //Используется портативная минимальная библиотека BROWSERS SCANNER JS (http://showyweb.ru/js/browsers_scanner.js), если основная не загружена
                SW_BS = {
                    browser: {
                        isLocalStorageSupported: typeof localStorage != "undefined",
                        isMobile: {
                            Android: (function () {
                                return navigator.userAgent.match(/Android/i) ? true : false;
                            })(),
                            BlackBerry: (function () {
                                return navigator.userAgent.match(/BlackBerry|BB/i) ? true : false;
                            })(),
                            iOS: (function () {
                                return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;
                            })(),
                            Windows: (function () {
                                return navigator.userAgent.match(/IEMobile/i) ? true : false;
                            })()
                        }
                    }
                };
                var browser = SW_BS.browser;
                browser.isSessionStorageSupported = typeof sessionStorage != "undefined";
                if (browser.isSessionStorageSupported) {
                    try {
                        sessionStorage.setItem('test_sessionStorage', 1);
                        sessionStorage.removeItem('test_sessionStorage');
                    } catch (e) {
                        browser.isLocalStorageSupported = false;
                        browser.isSessionStorageSupported = false;
                    }
                }
                browser.isMobile.any = (function () {
                    return (browser.isMobile.Android || browser.isMobile.BlackBerry || browser.isMobile.iOS || browser.opera_mini || browser.isMobile.Windows);
                })();
                browser.isMobile.anyPhone = (function () {
                    if (!browser.isMobile.any)
                        return false;
                    return (navigator.userAgent.match(/iphone|ipod/i) ? true : false) || (browser.isMobile.Android && (navigator.userAgent.match(/mobile/i) ? true : false)) || (browser.isMobile.BlackBerry && !(navigator.userAgent.match(/tablet/i) ? true : false)) || browser.isMobile.Windows;
                })();
                $('head').append('<style id="SW_BS" type="text/css"> .SW_BS_is_retina {display: none; opacity: 0; } @media only screen and (-Webkit-min-device-pixel-ratio: 1.5), only screen and (-moz-min-device-pixel-ratio: 1.5), only screen and (-o-min-device-pixel-ratio: 3 / 2), only screen and (min-device-pixel-ratio: 1.5), only screen and (-webkit-min-device-pixel-ratio: 3) {.SW_BS_is_retina {opacity: 1; }} ' + '</style>');
                browser.isRetinaDisplay = (function () {
                    if (typeof $ == "undefined")
                        return false;
                    if (browser.error_css || (browser.isMobile.Android && browser.fullVersion < 534) || (browser.isMobile.BlackBerry && browser.fullVersion < 537))
                        return false;
                    $("body").append("<div id='test_SW_BS' class='is_retina'></div>");
                    var is_retina = ($('#test_.SW_BS_is_retina').css('opacity') == '1') ? true : false;
                    $("#test_SW_BS").remove();
                    $("#SW_BS").remove();
                    return is_retina;
                })();
            }

            var p_post_ajax = function (query_object, callback_function, error_callback) {
                var obj = $.post(fast_background.ajax_url.replace(window.location.hash, ""), query_object,
                    function (data) {
                        if (fast_background._page_unloaded)
                            return;

                        var check = "<->ajax_complete<->";
                        var check_result = data.substring(data.length - check.length);
                        if (check_result != check) {
                            if (error_callback)
                                error_callback(data);
                            else
                                console.log("ERROR POST AJAX: " + data);
                            callback_function(null);
                            return;
                        }
                        data = data.substring(0, data.length - check.length);
                        if (callback_function)
                            callback_function(data);
                    })
                    .fail(function (xhr, status, error) {
                        if (fast_background._page_unloaded)
                            return;
                        if (error_callback)
                            error_callback("ERROR POST AJAX: <div style='white-space: pre-wrap; word-wrap:break-word;'>" + window.location.href + " " + ($.toJSON ? $.toJSON(query_object) : "") +
                                "</div><br>ERROR TEXT: " + error);
                        else
                            console.log("ERROR POST AJAX: " + error);
                        callback_function(null);
                    });
            };
            var p_data_dyn_img_urls = {
                get_all: function (this_obj) {
                    var data_ = this_obj.attr('data-urls');
                    if (typeof data_ == "undefined")
                        return {};
                    data_ = data_.replace(/'/ig, '"');
                    data_ = $.parseJSON(data_);
                    return data_;
                },
                get: function (this_obj, selector_prefix) {
                    var urls = this.get_all(this_obj);
                    return urls[selector_prefix];
                },
                set_all: function (this_obj, object) {
                    var data_ = $.toJSON(object);
                    data_ = data_.replace(/\"/ig, "'");
                    this_obj.attr('data-urls', data_);
                    if (isEmptyObject(object))
                        this.del_all(this_obj);
                },
                set: function (this_obj, selector_prefix, url) {
                    var urls = this.get_all(this_obj);
                    urls[selector_prefix] = url;
                    this.set_all(this_obj, urls);
                },
                del_all: function (this_obj) {
                    this_obj.removeAttr('data-urls');
                },
                del: function (this_obj, selector_prefix) {
                    var urls = this.get_all(this_obj);
                    delete urls[selector_prefix];
                    this.set_all(this_obj, urls);
                },
                all_exist: function (this_obj) {
                    var data_ = this_obj.attr('data-urls');
                    return typeof data_ !== "undefined";
                }
            };

            var loader_img = function (url, callback, err_callback) {
                // console.log("loader_img "+url);
                var img = new Image();
                img.onload = function () {
                    if (callback)
                        callback();
                };
                img.onerror = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (err_callback)
                        err_callback();
                    return false;
                };
                img.src = url;
            };

            var requestAnimFrame = (function () {
                return window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.oRequestAnimationFrame ||
                    window.msRequestAnimationFrame ||
                    function (/* function */ callback, /* DOMElement */ element) {
                        window.setTimeout(callback, 1000 / 60);
                    };
            })();
            if (fast_background.cssobj === null) {
                fast_background.cssobj = cssobj({});
            }
            var images = $('.fast_background').toArray();
            if (images.length < 1 && update_callback)
                update_callback();
            var get_l_id = function (img_obj) {
                var l_id = img_obj.attr('id');
                if (l_id)
                    l_id = "#" + l_id;
                else {
                    l_id = img_obj.is('body') ? 'fb_body' : 'fb_' + Math.random().toString(36).substr(2, 9);
                    img_obj.attr('id', l_id);
                    l_id = "#" + l_id;
                }
                return l_id;
            };
            var set_f = function (url, img_obj, fb_selector) {
                var type = img_obj.is('img') ? fast_background.types.img_src : fast_background.types.b_url;
                try {
                    switch (type) {
                        case fast_background.types.b_url:
                            var selector = fb_selector;
                            if (!selector)
                                selector = get_l_id(img_obj);
                            if (typeof fast_background.cssobj.obj[selector] == "undefined")
                                fast_background.cssobj.obj[selector] = {};
                            var is_already_important = fast_background.cssobj.obj[selector][type] && fast_background.cssobj.obj[selector][type].indexOf(" !important") !== -1;
                            fast_background.cssobj.obj[selector][type] = 'url(' + url + ')' + (is_already_important ? " !important" : "");
                            fast_background.cssobj.update();
                            if (!is_already_important) {
                                if (!fast_background._fix_old_browsers && $(selector).css('background-image') == 'none')
                                    fast_background._fix_old_browsers = true;
                                if (fast_background._fix_old_browsers) {
                                    fast_background.cssobj.obj[selector].backgroundImage = 'url(' + url + ')';
                                    fast_background.cssobj.update();
                                }
                            }
                            // console.log(selector + " " + fast_background.cssobj.obj[selector][type]);
                            break;
                        case fast_background.types.img_src:
                            img_obj.attr(type, url);
                            requestAnimFrame(function () {
                                var w_width_ = $(window).width();
                                var width_ = img_obj.width();
                                if (width_ > w_width_ || (SW_BS.browser.isMobile.anyPhone && width_ < 10)) {
                                    img_obj.css('width', '100%');
                                }
                            }, img_obj[0]);
                            break;
                    }
                }
                catch (e) {

                }
                fast_background.ajax_is_work--;
                if (fast_background.ajax_is_work < 1) {
                    if (!fast_background.is_init) {
                        fast_background.is_init = true;
                        fast_background.update(update_callback);
                    } else if (update_callback)
                        update_callback();
                }
            };

            var remove_f = function (img_obj, fb_selector) {
                var type = img_obj.is('img') ? fast_background.types.img_src : fast_background.types.b_url;
                switch (type) {
                    case fast_background.types.b_url:
                        var selector = (fb_selector ? fb_selector : "#" + img_obj.attr('id'));
                        if (typeof fast_background.cssobj.obj[selector] == "undefined")
                            fast_background.cssobj.obj[selector] = {};
                        var is_already_important = fast_background.cssobj.obj[selector][type] && fast_background.cssobj.obj[selector][type].indexOf(" !important") !== -1;
                        fast_background.cssobj.obj[selector][type] = 'none' + (is_already_important ? " !important" : "");
                        fast_background.cssobj.update();
                        break;
                    case fast_background.types.img_src:
                        img_obj.attr(type, '');
                        break;
                }
                fast_background.ajax_is_work--;
                if (fast_background.ajax_is_work < 1) {
                    if (!fast_background.is_init) {
                        fast_background.is_init = true;
                        fast_background.update(update_callback);
                    } else if (update_callback)
                        update_callback();
                }
            };

            var ajax_callback = function (url, curl, img_obj, fb_selector) {
                if (SW_BS.browser.isLocalStorageSupported && fast_background.is_init) {
                    var l_key = 'fast_background_cached_url_' + url;
                    localStorage.setItem(l_key, curl);
                }

                loader_img(curl, function () {

                    set_f(curl, img_obj, fb_selector);
                }, function () {
                    remove_f(img_obj, fb_selector);
                });
            };

            fast_background.ajax_is_work = images.length;

            for (var i = 0; i < images.length; i++) {
                var img_obj = !images[i].is_fb_class ? $(images[i]) : images[i];
                (function (img_obj_) {
                    var fb_selector = null;
                    if (!img_obj_.is_fb_class && p_data_dyn_img_urls.all_exist(img_obj_)) {
                        var urls = p_data_dyn_img_urls.get_all(img_obj_);
                        for (var selector_prefix in urls) {
                            if (!urls.hasOwnProperty(selector_prefix)) continue;
                            var c_url = urls[selector_prefix];
                            var l_id = get_l_id(img_obj_);
                            fb_selector = l_id + " " + selector_prefix;
                            var c_img_obj = $(fb_selector);
                            if (c_img_obj.length > 0)
                                c_img_obj = c_img_obj.eq(0);
                            images.push({
                                is_fb_class: true,
                                first_elem: c_img_obj,
                                url: c_url,
                                fb_selector: fb_selector
                            });
                            fast_background.ajax_is_work++;
                        }
                    }

                    var url = null;
                    var is_fb_class = false;
                    var fb_class = null;
                    if (!img_obj_.is_fb_class) {
                        url = img_obj_.attr('data-url');
                        if (!url) {
                            fast_background.ajax_is_work--;
                            return;
                        }
                        fb_selector = null;
                    } else {
                        is_fb_class = true;
                        fb_class = img_obj.first_elem;
                        url = img_obj_.url;
                        fb_selector = img_obj_.fb_selector;
                        img_obj_ = img_obj_.first_elem;
                    }

                    var type = img_obj_.is('img') ? fast_background.types.img_src : fast_background.types.b_url;


                    if (type == fast_background.types.b_url) {
                        var selector = fb_selector;
                        if (!selector)
                            selector = get_l_id(img_obj_);
                        if (typeof fast_background.cssobj.obj[selector] == "undefined" || typeof fast_background.cssobj.obj[selector][type] == "undefined") {
                            fast_background.cssobj.obj[selector] = {};
                            fast_background.cssobj.obj[selector][type] = {};
                            var is_already_important = url.indexOf(" !important") !== -1;
                            fast_background.cssobj.obj[selector][type] = 'none' + (is_already_important ? " !important" : "");
                        }
                        url = url.replace(" !important", "");
                    }

                    if (type == fast_background.types.img_src && !img_obj_.attr('src'))
                        img_obj_.attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=');

                    var save_c_url = null;
                    if (SW_BS.browser.isLocalStorageSupported && !fast_background.is_init) {
                        save_c_url = localStorage.getItem('fast_background_cached_url_' + url);
                        if (save_c_url) {
                            ajax_callback(url, save_c_url, img_obj_, fb_selector);
                            return;
                        }
                    }

                    if (img_obj_.length == 0)
                        img_obj_ = $(fb_selector.split(" ")[0]);

                    var cover_size = "false";
                    var auto_size_type = img_obj_.is('img') ? "contain" : img_obj_.css('background-size');
                    if (is_fb_class && fb_class.length == 0)
                        auto_size_type = 'contain';
                    if (auto_size_type == "cover")
                        cover_size = "true";

                    var width = img_obj_.width();
                    var height = img_obj_.height();
                    if (auto_size_type !== "cover" && auto_size_type !== "contain") {
                        var pat = /^(|(\d*)(px|%|auto)) (|(\d*)(px|%|auto))$/i;
                        var math_res = auto_size_type.match(pat);
                        if (math_res == null) {
                            pat = /^(|(\d*)(px|%|auto))$/i;
                            math_res = auto_size_type.match(pat);
                        }
                        var width_is_auto = false;
                        var height_is_auto = false;
                        if (math_res != null) {
                            var c_obj = img_obj_;
                            if (type == fast_background.types.img_src)
                                c_obj = img_obj_.parent();

                            if (math_res[3].toLowerCase() != 'auto') {
                                width = parseInt(math_res[2]);
                                if (math_res[3].toLowerCase() == '%') {
                                    if (width >= 100)
                                        cover_size = "true";
                                    width = c_obj.width() / 100 * width;
                                }
                            } else
                                width_is_auto = true;

                            if (math_res.length == 7 && math_res[6].toLowerCase() != 'auto') {
                                height = parseInt(math_res[5]);
                                if (math_res[6].toLowerCase() == '%') {
                                    if (height >= 100)
                                        cover_size = "true";
                                    height = c_obj.height() / 100 * height;
                                }
                            } else if (math_res.length == 7 || width_is_auto)
                                height_is_auto = true;
                        }

                        if (width_is_auto && height_is_auto) {
                            width = $(window).width();
                            height = $(window).height();
                        }
                    }


                    if (SW_BS.browser.isRetinaDisplay) {
                        width *= 2;
                        height *= 2;
                    }

                    width += 150;//
                    height += 150;// Для повышения четкости изображения при отображении в браузере

                    if (!force_reload_image) {
                        var tmp_width = parseInt(img_obj_.data('tmp_width'));
                        if (!tmp_width)
                            tmp_width = 0;
                        var tmp_height = parseInt(img_obj_.data('tmp_height'));
                        if (!tmp_height)
                            tmp_height = 0;
                        //console.log("cover "+cover_size+' tmp_size '+ tmp_size+' size '+size+' url '+img_obj.attr('data-url'));

                        if (width <= tmp_width && height <= tmp_height && SW_BS.browser.isLocalStorageSupported) {
                            save_c_url = localStorage.getItem('fast_background_cached_url_' + url);
                            if (is_fb_class && fb_class.length == 0)
                                img_obj_ = fb_class;
                            if (save_c_url) {
                                ajax_callback(url, save_c_url, img_obj_, fb_selector);
                                return;
                            }
                        }

                        if (width > tmp_width)
                            img_obj_.data('tmp_width', width);
                        else
                            width = tmp_width;

                        if (height > tmp_height)
                            img_obj_.data('tmp_height', height);
                        else
                            height = tmp_height;
                    }

                    var cont_size = width + "x" + height;

                    if (is_fb_class && fb_class.length == 0)
                        img_obj_ = fb_class;
                    p_post_ajax({'fast_background': 'get_cached_url', 'web_url': url, 'cover_size': cover_size, 'cont_size': cont_size, 'other_size': fast_background.is_init ? "false" : 'true'}, function (data) {
                        ajax_callback(url, data, img_obj_, fb_selector);
                    }, error_callback);
                })(img_obj);
            }
        }.bind(this, update_callback, error_callback, force_reload_image), fast_background.timeout_size);
    },
    types: {b_url: 'background-image', img_src: 'src'}, is_init: false, ajax_is_work: 0
};
$(function () {
    $(window).on('beforeunload.fast_background', function (e) {
        fast_background._page_unloaded = true;
    });
    var save_w_width = $(window).width();
    $(window).resize(function () {
        if (!fast_background.resize_event)
            return true;
        var w_width = $(window).width();
        if (SW_BS.browser.isMobile.any && save_w_width == w_width || !fast_background.is_init)
            return;
        if (window.location.host.indexOf('yandex.net') != -1)
            return;
        save_w_width = $(window).width();
        fast_background.update();
    });
});