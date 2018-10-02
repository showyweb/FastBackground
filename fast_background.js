/**
 * Name:    FastBackground
 * Version: 1.3.12
 * Author:  Novojilov Pavel Andreevich
 * Support: https://github.com/showyweb/FastBackground
 * License: MIT license. http://www.opensource.org/licenses/mit-license.php
 * Copyright (c) 2017 Pavel Novojilov
 */
var fast_background = {
    _timeout: null,
    timeout_size: 0,
    cssobj: null,
    prepare_selector_hook: function (selector) {
        return selector;
    },
    resize_event: true, // Авто обновление при изменении размера окна
    ajax_url: window.location.href,
    max_ajax_post_stream: 8,
    _page_unloaded: false,
    _fix_old_browsers: false,
    _ajax_is_work: 0,
    _p_post_ajax_work_streams: 0,
    _last_update_callbacks: [],
    _types: {b_url: 'background-image', img_src: 'src'},
    is_init: false,
    _only_w_loaded: false,

    /**
     * Запускает загрузку или обновление изображений
     * @param {Function} [update_callback=null] Обратная функция в случае успешного завершения
     * @param {function(string)} [error_callback=null] Обратная функция в случае ошибки, возвращает сообщение.
     * @param {Boolean} [force_reload_image=false] По умолчанию изображения загружаются только если их нет в кэше браузера и загружено достаточно большое изображение, этот параметр позволяет игнорировать такие проверки.
     */
    update: function (update_callback, error_callback, force_reload_image) {
        function p_post_ajax(query_object, callback_function, error_callback) {
            if (fb._p_post_ajax_work_streams >= fb.max_ajax_post_stream) {
                setTimeout(arguments.callee.bind(this, query_object, callback_function, error_callback), 100);
                return;
            }
            fb._p_post_ajax_work_streams++;
            var obj = $.post(fb.ajax_url.replace(window.location.hash, ""), query_object,
                function (data) {
                    fb._p_post_ajax_work_streams--;
                    if (fb._page_unloaded)
                        return;

                    var check = "<->ajax_complete<->";
                    var check_result = data.substring(data.length - check.length);
                    if (check_result !== check) {
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
                    fb._p_post_ajax_work_streams--;
                    if (fb._page_unloaded)
                        return;
                    if (error_callback)
                        error_callback("ERROR POST AJAX: <div style='white-space: pre-wrap; word-wrap:break-word;'>" + window.location.href + " " + ($.toJSON ? $.toJSON(query_object) : "") +
                            "</div><br>ERROR TEXT: " + error);
                    else
                        console.log("ERROR POST AJAX: " + error);
                    callback_function(null);
                });
        }

        function loader_img(url, callback, err_callback) {
            if (fb._p_post_ajax_work_streams >= fb.max_ajax_post_stream) {
                setTimeout(arguments.callee.bind(this, url, callback, err_callback), 100);
                return;
            }
            if (!url) {
                if (err_callback)
                    err_callback();
                return;
            }
            fb._p_post_ajax_work_streams++;
            // console.log("loader_img "+url);
            var img = new Image();
            img.onload = function () {
                fb._p_post_ajax_work_streams--;
                if (callback)
                    callback(img.naturalWidth, img.naturalHeight);
            };
            img.onerror = function (e) {
                fb._p_post_ajax_work_streams--;
                e.preventDefault();
                e.stopPropagation();
                if (err_callback)
                    err_callback();
                return false;
            };
            if (url.indexOf('!important') !== -1)
                debugger;
            img.src = url;
        }

        function get_l_id(img_obj, selector_prefix) {
            var l_id = img_obj.attr('id');
            if (l_id)
                l_id = "#" + l_id;

            if (!l_id) {
                l_id = img_obj.is('body') ? 'fb_body' : 'fb_' + Math.random().toString(36).substr(2, 9);
                img_obj.attr('id', l_id);
                l_id = "#" + l_id;
            }
            if (selector_prefix) {
                var is_pseudo = selector_prefix.indexOf(":") === 0;
                l_id = l_id + (is_pseudo ? "" : " ") + selector_prefix;
            }
            l_id = fb.prepare_selector_hook(l_id);
            return l_id;
        }

        function ajax_work_minus() {
            fb._ajax_is_work--;
            /*if (fb._ajax_is_work < 0)
                debugger;
            console.log(fb._ajax_is_work);*/
            if (fb._ajax_is_work < 1) {
                if (!fb.is_init) {
                    if (!fb._only_w_loaded) {
                        fb._only_w_loaded = true;
                        fb.cssobj.update();
                    }
                    else
                        fb.is_init = true;
                    fb.update(update_callback, error_callback, force_reload_image);
                } else if (update_callback || fb._last_update_callbacks.length) {
                    if (update_callback)
                        update_callback();
                    for (var j = 0; j < fb._last_update_callbacks.length; j++)
                        fb._last_update_callbacks[j]();
                    fb._last_update_callbacks = [];

                }
            }
        }

        function set_f(url, img_obj, fb_selector) {
            var type = img_obj.is('img') ? fb._types.img_src : fb._types.b_url;
            try {
                switch (type) {
                    case fb._types.b_url:
                        var selector = fb_selector;
                        if (!selector)
                            selector = get_l_id(img_obj);
                        if (typeof fb.cssobj.obj[selector] === "undefined")
                            fb.cssobj.obj[selector] = {};
                        var is_already_important = fb.cssobj.obj[selector][type] && fb.cssobj.obj[selector][type].indexOf(" !important") !== -1;
                        if (!is_already_important && important_selectors.indexOf(selector) !== -1)
                            is_already_important = true;
                        fb.cssobj.obj[selector][type] = 'url(' + url + ')' + (is_already_important ? " !important" : "");
                        if (fb._only_w_loaded)
                            fb.cssobj.update();
                        if (!is_already_important) {
                            if (!fb._fix_old_browsers && $(selector).css('background-image') === 'none')
                                fb._fix_old_browsers = true;
                            if (fb._fix_old_browsers) {
                                fb.cssobj.obj[selector].backgroundImage = 'url(' + url + ')';
                                fb.cssobj.update();
                            }
                        }
                        // console.log(selector + " " + fast_background.cssobj.obj[selector][type]);
                        break;
                    case fb._types.img_src:
                        img_obj.attr(type, url);
                        requestAnimFrame(function () {
                            var w_width_ = $(window).width();
                            var width_ = img_obj.width();
                            if ((w_width_ > 500 && width_ > w_width_) || (SW_BS.browser.isMobile.anyPhone && width_ < 10)) {
                                img_obj.css('width', '100%');
                            }
                        }, img_obj[0]);
                        break;
                }
            }
            catch (e) {

            }
            ajax_work_minus();
        }

        function remove_f(img_obj, fb_selector) {
            var type = img_obj.is('img') ? fb._types.img_src : fb._types.b_url;
            switch (type) {
                case fb._types.b_url:
                    var selector = fb_selector;
                    if (!selector)
                        selector = get_l_id(img_obj);
                    if (typeof fb.cssobj.obj[selector] === "undefined")
                        fb.cssobj.obj[selector] = {};
                    if (fb._only_w_loaded)
                        fb.cssobj.update();
                    break;
                case fb._types.img_src:
                    break;
            }
            ajax_work_minus();
        }

        function get_f(img_obj, fb_selector) {
            var type = img_obj.is('img') ? fb._types.img_src : fb._types.b_url;
            switch (type) {
                case fb._types.b_url:
                    var selector = fb_selector;
                    if (!selector)
                        selector = get_l_id(img_obj);
                    if (typeof fb.cssobj.obj[selector] === "undefined")
                        return "";
                    var r = fb.cssobj.obj[selector][type];
                    return r ? r.replace(/url\(['"]?|['"]?\)/g, "") : "";
                    break;
                case fb._types.img_src:
                    return img_obj.attr(type);
                    break;
            }
        }

        function get_cached_key(img_obj, url, width, height) {
            if (!width)
                width = img_obj.width();
            if (!height)
                height = img_obj.height();
            var skip_zone_size = 10;
            width = width - (width % skip_zone_size);
            height = height - (height % skip_zone_size);
            var cached_key = 'fast_background_cached_url_' + width + "x" + height + "_" + url;
            return cached_key;
        }

        function ajax_callback(url, curl, img_obj, fb_selector, fb_tmp_attr_p, cached_key) {
            loader_img(curl, function (i_w, i_h) {
                if (SW_BS.browser.isLocalStorageSupported) {
                    if (curl.indexOf("default_") === -1)
                        localStorage.setItem(cached_key, curl);
                    else {
                        var na_tmp_width = 'tmp_width' + (fb_selector ? "_c_" + fb_tmp_attr_p : "");
                        var na_tmp_height = 'tmp_height' + (fb_selector ? "_c_" + fb_tmp_attr_p : "");
                        img_obj.removeData(na_tmp_width);
                        img_obj.removeData(na_tmp_height);
                    }
                }
                set_f(curl, img_obj, fb_selector);
            }, function () {
                localStorage.removeItem(cached_key);
                remove_f(img_obj, fb_selector);
            });
        }

        function for_load_push(img_obj) {
            imgs_for_load.push(img_obj);
        }

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
        var p_data_dyn_img_urls = {
            get_all: function (this_obj) {
                var data_ = this_obj.attr('data-urls');
                if (typeof data_ === "undefined")
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
        var $ = jQuery,
            fb = fast_background,
            imgs_for_load = [],
            window_h = $(window).height(),
            window_s = $(window).scrollTop(),
            flp_start = window_s,
            flp_end = window_h + window_s;

        if (typeof SW_BS === "undefined") {
            //Используется портативная минимальная библиотека BROWSERS SCANNER JS (http://showyweb.ru/js/browsers_scanner.js), если основная не загружена
            SW_BS = {
                browser: {
                    isLocalStorageSupported: typeof localStorage !== "undefined",
                    isMobile: {
                        Android: (function () {
                            return !!navigator.userAgent.match(/Android/i);
                        })(),
                        BlackBerry: (function () {
                            return !!navigator.userAgent.match(/BlackBerry|BB/i);
                        })(),
                        iOS: (function () {
                            return !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
                        })(),
                        Windows: (function () {
                            return !!navigator.userAgent.match(/IEMobile/i);
                        })()
                    }
                }
            };
            var browser = SW_BS.browser;
            browser.isSessionStorageSupported = typeof sessionStorage !== "undefined";
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
                return !!navigator.userAgent.match(/iphone|ipod/i) || (browser.isMobile.Android && !!navigator.userAgent.match(/mobile/i)) || (browser.isMobile.BlackBerry && !navigator.userAgent.match(/tablet/i)) || browser.isMobile.Windows;
            })();

            $('head').append('<style id="SW_BS" type="text/css"> .SW_BS_is_retina {display: none; opacity: 0; } @media only screen and (-Webkit-min-device-pixel-ratio: 1.5), only screen and (-moz-min-device-pixel-ratio: 1.5), only screen and (-o-min-device-pixel-ratio: 3 / 2), only screen and (min-device-pixel-ratio: 1.5), only screen and (-webkit-min-device-pixel-ratio: 3) {.SW_BS_is_retina {opacity: 1; }} ' + '</style>');
            browser.isRetinaDisplay = (function () {
                if (typeof $ === "undefined")
                    return false;
                if (browser.is_error_version || (browser.isMobile.Android && browser.fullVersion < 534) || (browser.isMobile.BlackBerry && browser.fullVersion < 537))
                    return false;
                $("body").append("<div id='test_SW_BS' class='is_retina'></div>");
                var is_retina = ($('#test_.SW_BS_is_retina').css('opacity') == '1');
                $("#test_SW_BS").remove();
                $("#SW_BS").remove();
                return is_retina;
            })();
        }

        if (window.location.host.indexOf('yandex.net') !== -1) //Отключить для Yandex Webvisor
            return;
        var important_selectors = [];

        fb._p_post_ajax_work_streams = 0;
        if (fb.timeout_size === 0)
            fb.timeout_size = 1000;
        if (fb._ajax_is_work > 0) {
            if (update_callback)
                fb._last_update_callbacks.push(update_callback);
            clearTimeout(fb._timeout);
            fb._timeout = setTimeout(arguments.callee.bind(this, null, error_callback), fb.timeout_size);
            return;
        }
        fb._page_unloaded = false;

        if (fb.cssobj === null) {
            fb.cssobj = cssobj({});
        }
        var images = $('.fast_background').toArray();
        var images_ = [];
        for (i = 0; i < images.length; i++) {
            images_.push($(images[i]));
        }
        images = images_;
        images_ = null;
        if (images.length < 1 && update_callback)
            update_callback();

        var img_obj, i;
        for (i = 0; i < images.length; i++) {
            for_load_push(images[i]);
            img_obj = images[i];
            var fb_selector = null;
            if (!img_obj.is_fb_class && p_data_dyn_img_urls.all_exist(img_obj)) {
                var urls = p_data_dyn_img_urls.get_all(img_obj);
                for (var selector_prefix in urls) {
                    if (!urls.hasOwnProperty(selector_prefix)) continue;
                    var c_url = urls[selector_prefix];
                    fb_selector = get_l_id(img_obj, selector_prefix);
                    var c_img_obj = $(fb_selector.replace(":hover", "").replace(":active", "").replace(":focus", ""));
                    if (c_img_obj.length > 0)
                        c_img_obj = c_img_obj.eq(0);
                    for_load_push({
                        is_fb_class: true,
                        first_elem: c_img_obj,
                        url: c_url,
                        fb_selector: fb_selector
                    });
                }
            }
        }

        fb._ajax_is_work = imgs_for_load.length;

        var postponed = [];

        for (i = 0; i < imgs_for_load.length; i++) {
            img_obj = !imgs_for_load[i].is_fb_class ? $(imgs_for_load[i]) : imgs_for_load[i];
            (function (img_obj_) {
                var fb_selector = null;
                var fb_tmp_attr_p = null;
                var url = null;
                var is_fb_class = false;
                var fb_class = null;
                if (!img_obj_.is_fb_class) {
                    url = img_obj_.attr('data-url');
                    if (!url) {
                        fb._ajax_is_work--;
                        return;
                    }
                    fb_selector = null;
                } else {
                    is_fb_class = true;
                    fb_class = img_obj.first_elem;
                    url = img_obj_.url;
                    fb_selector = img_obj_.fb_selector;
                    fb_tmp_attr_p = fb_selector ? fb_selector.replace(/ |>|\*|\(|\)|\+|\@/gi, "_") : "";
                    img_obj_ = img_obj_.first_elem;
                }

                var type = img_obj_.is('img') ? fb._types.img_src : fb._types.b_url;

                if (type === fb._types.b_url) {
                    var selector = fb_selector;
                    if (!selector)
                        selector = get_l_id(img_obj_);
                    if (typeof fb.cssobj.obj[selector] === "undefined" || typeof fb.cssobj.obj[selector][type] === "undefined") {
                        fb.cssobj.obj[selector] = {};
                        var is_already_important = url.indexOf(" !important") !== -1;
                        if (is_already_important)
                            important_selectors.push(selector);
                    }
                    url = url.replace(" !important", "");
                }

                if (type === fb._types.img_src && !img_obj_.attr('src'))
                    img_obj_.attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=');

                var save_c_url = null;
                var width = img_obj_.width();
                var height = img_obj_.height();
                var cached_key = get_cached_key(img_obj_, url, width, height);
                if (SW_BS.browser.isLocalStorageSupported && !force_reload_image) {
                    save_c_url = localStorage.getItem(cached_key);
                    if (save_c_url) {
                        if (!fb._only_w_loaded) {
                            set_f(save_c_url, img_obj_, fb_selector);
                        }
                        else
                            ajax_callback(url, save_c_url, img_obj_, fb_selector, fb_tmp_attr_p, cached_key);
                        return;
                    }
                }

                if (img_obj_.length === 0)
                    img_obj_ = $(fb_selector.replace(/(\:| ).*$/ig, ""));

                var cover_size = "false";
                var auto_size_type = img_obj_.is('img') ? "cover" : img_obj_.css('background-size');
                if (is_fb_class && fb_class.length === 0)
                    auto_size_type = 'contain';
                if (auto_size_type === "cover")
                    cover_size = "true";

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
                        if (type === fb._types.img_src)
                            c_obj = img_obj_.parent();

                        if (math_res[3].toLowerCase() !== 'auto') {
                            width = parseInt(math_res[2]);
                            if (math_res[3].toLowerCase() === '%') {
                                if (width >= 100)
                                    cover_size = "true";
                                width = c_obj.width() / 100 * width;
                            }
                        } else
                            width_is_auto = true;

                        if (math_res.length === 7 && math_res[6].toLowerCase() !== 'auto') {
                            height = parseInt(math_res[5]);
                            if (math_res[6].toLowerCase() === '%') {
                                if (height >= 100)
                                    cover_size = "true";
                                height = c_obj.height() / 100 * height;
                            }
                        } else if (math_res.length === 7 || width_is_auto)
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

                /*width += 150;//
                height += 150;// Для повышения четкости изображения при отображении в браузере*/

                if (!force_reload_image) {
                    var na_tmp_width = 'tmp_width' + (is_fb_class ? "_c_" + fb_tmp_attr_p : "");
                    var na_tmp_height = 'tmp_height' + (is_fb_class ? "_c_" + fb_tmp_attr_p : "");
                    var tmp_width = parseInt(img_obj_.data(na_tmp_width));
                    if (!tmp_width)
                        tmp_width = 0;
                    var tmp_height = parseInt(img_obj_.data(na_tmp_height));
                    if (!tmp_height)
                        tmp_height = 0;
                    //console.log("cover "+cover_size+' tmp_size '+ tmp_size+' size '+size+' url '+img_obj.attr('data-url'));

                    if (width <= tmp_width && height <= tmp_height) {
                        save_c_url = get_f(img_obj_, fb_selector);
                        save_c_url = save_c_url.replace(" !important", "");
                        ajax_callback(url, save_c_url, img_obj_, fb_selector, fb_tmp_attr_p, cached_key);
                        return;
                    }

                    if (fb._only_w_loaded) {
                        if (width > tmp_width)
                            img_obj_.data(na_tmp_width, width);
                        else
                            width = tmp_width;

                        if (height > tmp_height)
                            img_obj_.data(na_tmp_height, height);
                        else
                            height = tmp_height;
                    }
                }
                var cont_size = width + "x" + height;

                if (is_fb_class && fb_class.length === 0)
                    img_obj_ = fb_class;
                if (!fb.is_init) {
                    postponed.push({
                        img_obj: img_obj_,
                        fb_selector: fb_selector,
                        fb_tmp_attr_p: fb_tmp_attr_p,
                        cached_key: cached_key,
                        web_url: url,
                        cover_size: cover_size,
                        cont_size: cont_size,
                        other_size: fb.is_init || type === fb._types.img_src ? "false" : 'true'
                    });
                }
                else
                    p_post_ajax({'fast_background': 'get_cached_url', 'web_url': url, 'cover_size': cover_size, 'cont_size': cont_size, 'other_size': fb.is_init || type === fb._types.img_src ? "false" : 'true'}, function (data) {
                        // if (fb_selector && fb_selector.indexOf(".video_thumb:active .is_active_") !== -1)
                        //     console.log('');
                        ajax_callback(url, data, img_obj_, fb_selector, fb_tmp_attr_p, cached_key);
                    }, error_callback);
            })(img_obj);
        }

        if (!fb.is_init) {
            var send_d = {
                web_url: '',
                cover_size: '',
                cont_size: '',
                other_size: ''
            }, postponed_ = [];

            if (!fb._only_w_loaded) {
                for (var j = 0; j < postponed.length; j++) {
                    img_obj = postponed[j].img_obj;
                    var jq_el = !img_obj.is_fb_class ? img_obj : img_obj.first_elem;
                    var offset = jq_el.offset();
                    if (!offset || offset.top < flp_start || offset.top > flp_end)
                        continue;
                    postponed_.push(postponed[j]);
                }
                var last_pp_len = postponed.length;
                postponed = postponed_;
                postponed_ = null;
                if (postponed.length === 0) {
                    for (var j = 0; j < last_pp_len; j++)
                        ajax_work_minus();
                    return;
                }
                fb._ajax_is_work = postponed.length;
            }
            var for_f = function (j, key) {
                send_d[key] += postponed[j][key] + "\n";
            };
            for (var j = 0; j < postponed.length; j++) {
                for (var key in send_d) {
                    if (!send_d.hasOwnProperty(key)) continue;
                    for_f(j, key);
                }
            }
            send_d.fast_background = "get_cached_urls";
            p_post_ajax(send_d, function (data) {
                data = data.split('\n');
                for (var j = 0; j < postponed.length; j++)
                    ajax_callback(postponed[j].url, data[j], postponed[j].img_obj, postponed[j].fb_selector, postponed[j].fb_tmp_attr_p, postponed[j].cached_key);
            }, error_callback);
        }
    }
};
(function () {
    var $ = jQuery;
    $(function () {
        $(window).on('beforeunload.fast_background', function (e) {
            fast_background._page_unloaded = true;
        });
        var save_w_width = $(window).width();
        $(window).resize(function () {
            if (!fast_background.resize_event)
                return true;
            var w_width = $(window).width();
            if (SW_BS.browser.isMobile.any && save_w_width === w_width || !fast_background.is_init)
                return;
            if (window.location.host.indexOf('yandex.net') !== -1)
                return;
            save_w_width = $(window).width();
            fast_background.update();
        });
    });
})();