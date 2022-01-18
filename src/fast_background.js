/**
 * @overview FastBackground https://github.com/showyweb/FastBackground
 * @version 7.0.5
 * @author  Novojilov Pavel Andreevich (The founder of the library)
 * @license MIT license. http://www.opensource.org/licenses/mit-license.php
 * @copyright (c) 2017 Pavel Novojilov
 */

(function () {
    if (window.location.host.indexOf('yandex.net') !== -1) //Отключить для Yandex Webvisor
        return;
    /**
     * @name fast_background
     * @namespace
     * @global
     * */
    var fb = {
        /**Авто обновление при изменении размера окна
         * @type boolean
         * @default true
         * @inner
         * */
        resize_event: true,

        /**Адрес php скрипта в котором будет вызываться fast_background::request_proc()
         * @type string
         * @default window.location.href
         * @inner
         * */
        ajax_url: window.location.href,

        /**Количество максимально одновременных ajax соединений
         * @type number
         * @default 8
         * @inner
         * */
        max_ajax_post_stream: 3,

        /**Количество оставшихся в очереди ajax вызовов, получающие информацию о изображениях
         * @type number
         * @readonly
         * @inner
         * */
        ajax_is_work: 0,

        /**true, если функция fast_background.update() в процессе выполнения
         * @type boolean
         * @readonly
         * @inner
         * */
        update_is_worked: false,

        /**Этап загрузчика
         * @type number
         * @readonly
         * @inner
         * */
        stage_loaded: -1,

        /**Тайм-аут для автоповтора fast_background.update, в том случае когда предыдущий запуск обновления ещё не завершился
         * @type number
         * @default 50
         * @inner
         * */
        timeout_size: 50,

        /**Объект cssobj(https://github.com/cssobj/cssobj). Можно указать свой объект cssobj
         * @type Object|null
         * @inner
         * */
        cssobj: null,
        is_debug_pws: false,

        /**Использовать localStorage для кэширования
         * @type boolean
         * @default true
         * @inner
         * */
        use_local_storage: true,

        /**Регулярное выражение или строка для очистки (replace(clear_urls_pattern, '')) ссылок указанных в data-url
         * @type string|RegExp
         * @inner
         * */
        clear_urls_pattern: '',

        /** Пользовательская функция для дополнительной обработки CSS селекторов, которые позже будут использоваться в cssobj для элементов fast_background
         * @param selector {string} CSS селектор
         * @return {string}
         * */
        prepare_selector_hook: function (selector) {
            return selector;
        },

        /**
         * Запускает загрузку или обновление изображений
         *
         *  У DOM элементов c картинками должен быть указан класс fast_background и атрибут data-url(ссылка на картинку) или data-urls (ссылки json в виде:
         *  "дочерний селектор":"ссылка на картинку", ...)
         *
         *  **В конец ссылок можно добавить модификаторы**:
         *  ```
         *   !important - работает также как в CSS, пробел перед знаком ! обязателен;
         *  :png,:jpg,:webp - переопределение конечного формата;
         * ```
         *
         *  **Также можно указать следующие классы для настройки**:
         *  ```
         *  fb_dynamic_url - указывает, что ссылка может меняться. С учетом этого, если вызвать fast_background.update(), то загрузчик это проверит;
         *  fb_ignore_io - не использовать intersectionObserver для элемента;
         *  fb_ev_img_load - Вызвать jQuery событие fb_ev_img_load при загрузке картинки для элемента ( img_obj.trigger('fb_ev_img_load', [url]) );
         *  fb_ev_img_cache_url - Вызвать jQuery событие fb_ev_img_cache_url при получении адреса картинки в кэше для элемента ( img_obj.trigger('fb_ev_img_cache_url', [cache_url]) );
         * ```
         * @param {Function|null} [update_callback=null] Обратная функция в случае успешного завершения
         * @param {function|null} [error_callback=null] Обратная функция в случае ошибки, возвращает сообщение.
         * @param {Boolean|null} [force_reload_image=false] По умолчанию изображения загружаются только если их нет в кэше браузера и загружено достаточно большое изображение, этот параметр позволяет игнорировать такие проверки.
         */
        update: function (update_callback, error_callback, force_reload_image) {
            if (browser === null)
                b_init();
            if ((fb.update_is_worked || (fb.stage_loaded !== -1 && !io_is_first_init) || browser.isWebpSupport === -1) && !uc_skip) {
                if (update_callback)
                    last_update_callbacks.push(update_callback);
                clearTimeout(timeout);
                timeout = setTimeout(arguments.callee.bind(this, null, error_callback), fb.timeout_size);
                return;
            }
            is_first_call_fb_update = false;
            uc_skip = false;
            fb.update_is_worked = true;

            switch (fb.stage_loaded) {
                case -1:
                    fb.stage_loaded = 0;
                    break;
                case 3:
                    fb.stage_loaded = 0;
                    break;
            }
            if (fb.is_debug_pws)
                console.warn('fb.stage_loaded ' + fb.stage_loaded);
            p_post_ajax_work_streams = 0;
            if (fb.is_debug_pws)
                console.log('pws set ' + p_post_ajax_work_streams);
            page_unloaded = false;

            if (fb.cssobj === null) {
                fb.cssobj = cssobj({});
            }

            ajax_work_minus = null;
            ajax_work_minus = function () {
                fb.ajax_is_work--;
                /*if (fb.ajax_is_work < 0)
                    debugger;*/
                if (fb.is_debug_pws)
                    console.log('ajax_is_work ' + fb.ajax_is_work);
                if (fb.ajax_is_work < 1) {
                    if (fb.stage_loaded < 2) {
                        if (fb.stage_loaded < 1) {
                            fb.cssobj.update();
                            fb.stage_loaded = 1;
                            if (!io) {
                                load_only_visible = false;
                                io_is_first_init = true;
                            }
                        } else
                            fb.stage_loaded = 2;
                        uc_skip = true;
                        fb.update(update_callback, error_callback, force_reload_image);
                    } else {
                        fb.stage_loaded = 3;
                        if (update_callback)
                            update_callback();
                        for (var j = 0; j < last_update_callbacks.length; j++)
                            last_update_callbacks[j]();
                        last_update_callbacks = [];
                        fb.update_is_worked = false;
                    }
                }
            };

            var imgs_for_load = [];

            var images = $('.fast_background:not(.fb_loaded)').toArray();
            var images_ = [];
            for (i = 0; i < images.length; i++) {
                images_.push($(images[i]));
            }
            images = images_;
            images_ = null;


            var img_obj, i;
            for (i = 0; i < images.length; i++) {
                img_obj = images[i];
                var fb_selector = get_l_id(img_obj);
                imgs_for_load.push(img_obj);
                if (!img_obj.data('is_fb_observed') || (img_obj.attr('data-url') && !img_obj.data('fb_sel'))) {
                    img_obj.data('is_fb_observed', true);
                    img_obj.data('fb_sel', fb_selector);
                    if (io)
                        io.observe(img_obj[0]);
                }

                if (!img_obj.is_fb_class && data_dyn_img_urls.all_exist(img_obj)) {
                    var urls = data_dyn_img_urls.get_all(img_obj);
                    for (var selector_prefix in urls) {
                        if (!urls.hasOwnProperty(selector_prefix)) continue;
                        var c_url = urls[selector_prefix];
                        fb_selector = get_l_id(img_obj, selector_prefix);
                        var c_img_objs = $(fb_selector.replace(":hover", "").replace(":active", "").replace(":focus", ""));
                        if (c_img_objs.length > 0) {
                            for (var c_img_obj_i = 0; c_img_obj_i < 1; c_img_obj_i++) {
                                var el = c_img_objs.eq(c_img_obj_i);
                                if (!el.data('is_fb_observed'))
                                    el.data('is_fb_observed', true);
                                if (io)
                                    io.observe(el[0]);
                                var fb_sels = null;
                                if (!el.data('fb_sels')) {
                                    fb_sels = {};
                                    el.data('fb_sels', fb_sels);
                                } else
                                    fb_sels = el.data('fb_sels');
                                fb_sels[fb_selector] = true;
                            }
                            var c_img_obj = c_img_objs.eq(0);
                        }

                        imgs_for_load.push({
                            is_fb_class: true,
                            first_elem: c_img_obj,
                            url: c_url,
                            fb_selector: fb_selector
                        });
                    }
                }
            }

            fb.ajax_is_work += imgs_for_load.length;

            if (fb.ajax_is_work < 1) {
                fb.update_is_worked = false;
                fb.stage_loaded = -1;
                if (update_callback)
                    update_callback();
                return;
            }

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
                        fb_selector = null;
                    } else {
                        is_fb_class = true;
                        fb_class = img_obj.first_elem;
                        url = img_obj_.url;
                        fb_selector = img_obj_.fb_selector;
                        fb_tmp_attr_p = fb_selector ? fb_selector.replace(/ |>|\*|\(|\)|\+|\@/gi, "_") : "";
                        img_obj_ = img_obj_.first_elem;
                        if (!img_obj_) {
                            ajax_work_minus();
                            return;
                        }
                    }

                    if (!is_valid_img_url(url)) {
                        ajax_work_minus();
                        return;
                    }

                    if (fb.clear_urls_pattern)
                        url = url.replace(fb.clear_urls_pattern, '');
                    var o_url = url.split(':');
                    url = o_url[0];
                    if (!o_url[1])
                        o_url[1] = null;
                    var end_f_type = img_types[o_url[1]] ? img_types[o_url[1]] : 0;
                    if (end_f_type === 0)
                        end_f_type = img_types.webp;
                    if (end_f_type === img_types.webp && !browser.isWebpSupport)
                        end_f_type = 0;
                    var type = img_obj_.is('img') ? b_types.img_src : b_types.b_url;

                    if (type === b_types.b_url) {
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

                    if (type === b_types.img_src && !img_obj_.attr('src'))
                        img_obj_.attr('src', img_1px);

                    var save_c_url = null;
                    var width, height, cached_key;

                    width = img_obj_.width();
                    height = img_obj_.height();
                    img_obj_.data('fb_img_type', end_f_type);

                    cached_key = get_cached_key(img_obj_, url + ':' + end_f_type, width, height);
                    if (fb.is_debug_pws) {
                        console.log('cached_key: ' + cached_key);
                    }

                    var i_compress_support = /\.(jpe?g|png|webp)$/i.test(url);
                    if (!i_compress_support)
                        cache.set(cached_key, url);

                    // if (url === "/img/b.jpg")
                    //     debugger;

                    if (!force_reload_image || !i_compress_support) {
                        save_c_url = cache.get(cached_key);
                        var in_fast_cache = false;
                        if (fb.stage_loaded < 1 && (!save_c_url || !i_compress_support) && load_only_visible && browser.isWebpSupport) {
                            var fc_key = url + ':' + end_f_type;
                            if (fb.fast_cache[fc_key] || !i_compress_support) {
                                if (i_compress_support)
                                    save_c_url = fb.fast_cache[fc_key];
                                in_fast_cache = true;
                                if (is_show(img_obj_, fb_selector)) {
                                    var current_url = get_f(img_obj_, fb_selector, true);
                                    if (!is_valid_img_url(current_url))
                                        set_f(save_c_url, img_obj_, fb_selector, true, true);
                                    else if (img_obj_.hasClass('fb_ev_img_load'))
                                        img_obj_.trigger('fb_ev_img_load', [current_url]);
                                }
                            }
                        }

                        if (save_c_url) {
                            if (fb.stage_loaded < 1 && !in_fast_cache) {
                                if (is_show(img_obj_, fb_selector)) {
                                    if (!is_valid_img_url(get_f(img_obj_, fb_selector, true)))
                                        set_f(save_c_url, img_obj_, fb_selector, true, false, true);
                                    else
                                        ajax_callback(url, save_c_url, img_obj_, fb_selector, fb_tmp_attr_p, cached_key, true);
                                } else
                                    ajax_work_minus();
                            } else
                                ajax_callback(url, save_c_url, img_obj_, fb_selector, fb_tmp_attr_p, cached_key, true);
                            return;
                        }
                    }

                    if (img_obj_.length === 0)
                        img_obj_ = $(fb_selector.replace(/(\:| ).*$/ig, ""));

                    var cover_size = false;
                    var auto_size_type = type === b_types.img_src ? "cover" : img_obj_.css('background-size');
                    if (is_fb_class && fb_class.length === 0)
                        auto_size_type = 'contain';
                    if (auto_size_type === "cover")
                        cover_size = true;
                    var c_obj = null;
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
                            c_obj = img_obj_;
                            if (math_res[3] && math_res[3].toLowerCase() !== 'auto') {
                                width = parseInt(math_res[2]);
                                if (math_res[3].toLowerCase() === '%') {
                                    if (width >= 100)
                                        cover_size = true;
                                    width = c_obj.width() / 100 * width;
                                    width += 10; //Chrome bug fux
                                }
                            } else
                                width_is_auto = true;

                            if (math_res.length === 7 && math_res[6] && math_res[6].toLowerCase() !== 'auto') {
                                height = parseInt(math_res[5]);
                                if (math_res[6].toLowerCase() === '%') {
                                    if (height >= 100)
                                        cover_size = true;
                                    height = c_obj.height() / 100 * height;
                                    height += 10; //Chrome bug fux
                                }
                            } else if (math_res.length === 7 || width_is_auto)
                                height_is_auto = true;
                        }

                        if (width_is_auto && height_is_auto) {
                            width = $(window).width();
                            height = $(window).height();
                        } else if (width_is_auto || height_is_auto)
                            cover_size = true;
                    } else if (type === b_types.img_src && ([width, height].indexOf(1) !== -1)) {
                        c_obj = img_obj_.parent();
                        while (true) {
                            if (width === 1)
                                width = c_obj.width();
                            if (height === 1)
                                height = c_obj.height();
                            if (width === 1 || height === 1) {
                                c_obj = c_obj.parent();
                            } else
                                break;
                        }
                    }
                    cover_size = cover_size ? 1 : 0;
                    var def_size = fb.stage_loaded >= 1 ? (fb.stage_loaded >= 2 ? 0 : 1) : 2;
                    // console.log('def_size ' + def_size);
                    if (browser.isRetinaDisplay) {
                        width *= 2;
                        height *= 2;
                    }

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

                        if (width <= tmp_width && height <= tmp_height && !img_obj_.hasClass('fb_dynamic_url')) {
                            save_c_url = get_f(img_obj_, fb_selector);
                            save_c_url = save_c_url.replace(" !important", "");
                            if (is_valid_img_url(save_c_url)) {
                                ajax_callback(url, save_c_url, img_obj_, fb_selector, fb_tmp_attr_p, cached_key, true);
                                return;
                            }
                        }

                        if (fb.stage_loaded >= 1) {
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
                    if (!width && !height) {
                        ajax_work_minus();
                        return;
                    }
                    var cont_size = width + "x" + height;
                    // if(cont_size==='1x1')
                    //     debugger;


                    if (is_fb_class && fb_class.length === 0)
                        img_obj_ = fb_class;

                    if (fb.stage_loaded < 2) {
                        postponed.push({
                            img_obj: img_obj_,
                            fb_selector: fb_selector,
                            fb_tmp_attr_p: fb_tmp_attr_p,
                            cached_key: cached_key,
                            web_url: url,
                            cover_size: cover_size,
                            cont_size: cont_size,
                            def_size: def_size,
                            end_type: end_f_type
                        });
                    } else
                        p_post_ajax({
                            fast_background: 'get_cached_url',
                            web_url: url,
                            cover_size: cover_size,
                            cont_size: cont_size,
                            def_size: def_size,
                            end_type: end_f_type
                        }, function (data) {
                            // if (fb_selector && fb_selector.indexOf(".video_thumb:active .is_active_") !== -1)
                            //     console.log('');
                            ajax_callback(url, data, img_obj_, fb_selector, fb_tmp_attr_p, cached_key);
                        }, error_callback);
                })(img_obj);
            }
            if (load_only_visible)
                fb.cssobj.update();

            if (fb.stage_loaded < 2 && postponed.length) {
                var send_d = {
                    web_url: '',
                    cover_size: '',
                    cont_size: '',
                    def_size: '',
                    end_type: ''
                };


                var for_f = function (j, key) {
                    send_d[key] += postponed[j][key] + ":";
                };
                for (var j = 0; j < postponed.length; j++) {
                    for (var key in send_d) {
                        if (!send_d.hasOwnProperty(key)) continue;
                        for_f(j, key);
                    }
                }
                send_d.fast_background = "get_cached_urls";
                p_post_ajax(send_d, function (data) {
                    if (data) {
                        data = data.split(':');
                        for (var j = 0; j < postponed.length; j++)
                            ajax_callback(postponed[j].url, data[j], postponed[j].img_obj, postponed[j].fb_selector, postponed[j].fb_tmp_attr_p, postponed[j].cached_key);
                    } else {
                        for (var j = 0; j < postponed.length; j++) {
                            ajax_work_minus();
                        }
                    }
                }, function () {
                    // error_callback();
                    for (var j = 0; j < postponed.length; j++)
                        (function (img_obj, url, cover_size, cont_size, def_size, end_f_type, fb_selector, fb_tmp_attr_p, cached_key) {
                            p_post_ajax({
                                fast_background: 'get_cached_url',
                                web_url: url,
                                cover_size: cover_size,
                                cont_size: cont_size,
                                def_size: def_size,
                                end_type: end_f_type
                            }, function (data) {
                                // if (fb_selector && fb_selector.indexOf(".video_thumb:active .is_active_") !== -1)
                                //     console.log('');
                                ajax_callback(url, data, img_obj, fb_selector, fb_tmp_attr_p, cached_key);
                            }, error_callback);
                        })(postponed[j].img_obj, postponed[j].web_url, postponed[j].cover_size, postponed[j].cont_size, postponed[j].def_size, postponed[j].end_f_type, postponed[j].fb_selector, postponed[j].fb_tmp_attr_p, postponed[j].cached_key);
                }, 1000);
            }
        }
    };
    var $ = jQuery;
    fb = $.extend(fast_background, fb);
    var browser = null,
        page_unloaded = false,
        timeout = null,
        p_post_ajax_work_streams = 0,
        img_load_work_streams = 0,
        last_update_callbacks = [],
        b_types = {b_url: 'background-image', img_src: 'src'},
        important_selectors = [],
        img_1px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=',
        prefixs = ['', '-webkit-', '-moz-', '-o-', '-ms-'],
        load_only_visible = true,
        window_h = $(window).height(),
        cache = {
            data: {},
            get: function (cached_key) {
                if (!this.data[cached_key] && browser.isLocalStorageSupported)
                    this.data[cached_key] = localStorage.getItem(cached_key);
                return this.data[cached_key];
            },
            set: function (cached_key, curl) {
                // console.log('cache set ' + cached_key + ' ' + curl);
                // if (cached_key.indexOf('r64_glyph8-min2') !== -1)
                //     debugger;
                this.data[cached_key] = curl;
                if (browser.isLocalStorageSupported && fb.use_local_storage)
                    localStorage.setItem(cached_key, curl);
            },
            del: function (cached_key) {
                if (!this.data[cached_key])
                    return;
                delete this.data[cached_key];
                if (browser.isLocalStorageSupported)
                    localStorage.removeItem(cached_key);
            }
        },
        uc_skip = false,
        img_types = {
            jpg: 2,
            png: 3,
            webp: 18
        },
        is_first_call_fb_update = true;

    $(function () {
        $(window).on('beforeunload.fast_background', function (e) {
            page_unloaded = true;
        });
        var save_w_width = $(window).width();
        $(window).resize(function () {
            if (!fb.resize_event)
                return true;
            var w_width = $(window).width();
            if (fb.stage_loaded < 2 || browser.isMobile.any && save_w_width === w_width)
                return;
            if (window.location.host.indexOf('yandex.net') !== -1)
                return;
            $(".fb_loaded").removeClass('fb_loaded');
            save_w_width = $(window).width();
            fb.update();
        });
        $(document).on('scroll mousemove touchstart', function (ev) {
            if (load_only_visible && fb.stage_loaded > 0) {
                load_only_visible = false;
                if (fb.is_debug_pws)
                    console.warn('load_only_visible set false');
                // debugger;
                fast_background.update();
            }
        });

        if (fb.cssobj === null) {
            fb.cssobj = cssobj({});
        }

        var sub_append_obj = {
            'from': {
                'outline-color': '#fff'
            },
            'to': {
                'outline-color': '#000'
            }
        };
        var append_obj = {
            '@keyframes nodeInserted': sub_append_obj,
            '@-moz-keyframes nodeInserted': sub_append_obj,
            '@-webkit-keyframes nodeInserted': sub_append_obj,
            '@-ms-keyframes nodeInserted': sub_append_obj,
            '@-o-keyframes nodeInserted': sub_append_obj,
            '.fast_background': {
                '&:after': {
                    content: '""',
                    visibility: 'hidden',
                    'animation-duration': '0.001s',
                    'animation-name': 'nodeInserted'
                }
            }
        };
        fb.cssobj.obj = $.extend(fb.cssobj.obj, append_obj);
        fb.cssobj.update();

        var insertListener_timeout = null;

        function insertListener(event) {
            if (event.animationName === "nodeInserted") {
                clearTimeout(insertListener_timeout);
                insertListener_timeout = setTimeout(nodeInserted_handle, 100);
            }
        }

        document.addEventListener("animationstart", insertListener, false);
        document.addEventListener("MSAnimationStart", insertListener, false);
        document.addEventListener("webkitAnimationStart", insertListener, false);

        function nodeInserted_handle() {
            // console.warn("nodeInserted!");
            if (!is_first_call_fb_update)
                fast_background.update();
        }

        //polyfill
        (function () {
            var fb_count = 0,
                display_not_none = 0,
                overflow_not_hidden = 0,
                _scrollWidth = 0;
            var polyfill_ni_interval = setInterval(function () {
                if (insertListener_timeout !== null) {
                    clearInterval(polyfill_ni_interval);
                    // console.warn('polyfill process exit');
                    return false;
                }

                // console.warn('polyfill process use');
                if (document.scrollingElement && document.scrollingElement.scrollWidth !== _scrollWidth) {
                    _scrollWidth = document.scrollingElement.scrollWidth;
                    nodeInserted_handle();
                    return true;
                }

                var new_fb_count = $(".fast-background").length;
                if (new_fb_count !== fb_count) {
                    fb_count = new_fb_count;
                    nodeInserted_handle();
                    return true;
                }

                var new_display_not_none = 0;
                var new_overflow_not_hidden = 0;

                $('*').each(function () {
                    var _this = $(this);
                    if (_this.css('display') !== 'none')
                        new_display_not_none++;
                    if (_this.css('overflow') !== 'hidden')
                        new_overflow_not_hidden++;
                });
                if (new_display_not_none !== display_not_none || new_overflow_not_hidden !== overflow_not_hidden) {
                    display_not_none = new_display_not_none;
                    overflow_not_hidden = new_overflow_not_hidden;
                    nodeInserted_handle();
                    return true;
                }
            }, 2000);
        })();

    });


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

    var ajax_work_minus = null;

    function b_init() {
        browser = {
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
            },
            isLocalStorageSupported: false,
            isSessionStorageSupported: false
        };
        try {
            browser.isLocalStorageSupported = typeof localStorage !== "undefined";
            browser.isSessionStorageSupported = typeof sessionStorage !== "undefined";
        } catch (e) {
            console.log(e.message);
        }
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
        browser.isRetinaDisplay = (function () {

            var is_retina = window.devicePixelRatio > 1;

            return is_retina;
        })();
        /*browser.isMaskImageSupport = (function () {
            var el = $("<div id='test_FB_BS'></div>");
            $("body").append(el);
            el.css('mask-image', "url(" + img_1px + ")");
            var r_val = el.css('mask-image');
            var is_support = !!(r_val && r_val.indexOf("url") === 0);
            el.remove();
            return is_support;
        })();*/
        browser.isWebpSupport = (function () {
            var canvas = typeof document === 'object' ?
                document.createElement('canvas') : {};
            canvas.width = canvas.height = 1;
            var is_support = canvas.toDataURL ? canvas.toDataURL('image/webp').indexOf('image/webp') === 5 : false;

            if (is_support)
                return is_support;
            var el = new Image();
            var res = function (ev) {
                browser.isWebpSupport = ev && ev.type === 'load' ? el.width === 1 : false;
            };
            el.onerror = res;
            el.onload = res;
            el.src = 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAABBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQADADQlpAADcAD++/1QAA==';
            return -1;

        })();

        // browser.isLocalStorageSupported = false;
    }

    function is_full_c_img(c_url) {
        return !/(\/(m_)?def_)/.test(c_url);
    }

    function p_post_ajax(query_object, callback_function, error_callback, timeout) {
        if (p_post_ajax_work_streams >= fb.max_ajax_post_stream || img_load_work_streams) {
            setTimeout(arguments.callee.bind(this, query_object, callback_function, error_callback, timeout), 100);
            return;
        }
        p_post_ajax_work_streams++;
        if (fb.is_debug_pws) {
            console.log('ajax begin');
            console.log('pws ' + p_post_ajax_work_streams);
        }
        var data = query_object;
        var url = fb.ajax_url.replace(window.location.hash, "");
        var ajax_r = {
            url: url,
            method: 'post',
            data: data,
            complete: function (jqXHR) {
                var data = jqXHR.responseText;
                if (jqXHR.status === 200) {
                    p_post_ajax_work_streams--;
                    if (fb.is_debug_pws) {
                        console.log('ajax end');
                        console.log('pws ' + p_post_ajax_work_streams);
                    }
                    if (page_unloaded)
                        return;

                    var check = "<->ajax_complete<->";
                    var check_result = data.substring(data.length - check.length);
                    if (check_result !== check) {
                        if (error_callback)
                            error_callback(data);
                        else
                            console.error("ERROR POST AJAX: " + data);
                        callback_function(null);
                        return;
                    }
                    data = data.substring(0, data.length - check.length);
                    if (callback_function)
                        callback_function(data);
                } else {
                    p_post_ajax_work_streams--;
                    if (fb.is_debug_pws) {
                        console.error('ajax fail');
                        console.log('pws ' + p_post_ajax_work_streams);
                    }
                    if (page_unloaded)
                        return;
                    if (error_callback)
                        error_callback("ERROR POST AJAX: <div style='white-space: pre-wrap; word-wrap:break-word;'>" + window.location.href + " " + ($.toJSON ? $.toJSON(query_object) : "") +
                            "</div><br>ERROR TEXT: " + jqXHR.statusText);
                    else
                        console.error("ERROR POST AJAX: " + jqXHR.statusText);
                    callback_function(null);
                }
            }
        };
        if (timeout)
            ajax_r.timeout = timeout;
        $.ajax(ajax_r);
    }


    var loader_stack = [];

    var loader_interval = null;

    function loader_img(url, callback, err_callback, is_not_set) {

        // console.log('p_post_ajax_work_streams '+p_post_ajax_work_streams);
        if (!is_not_set) {
            if (!url) {
                if (err_callback)
                    err_callback(url);
                return;
            }
            loader_stack.push([url, callback, err_callback]);
        }

        // var is_wait = img_load_work_streams >= fb.max_ajax_post_stream;
        var is_wait = false;
        if (is_wait && loader_interval === null)
            loader_interval = setInterval(arguments.callee.bind(this, null, null, null, true), 10);
        if (is_wait)
            return;

        if (!loader_stack.length)
            return;

        var v = loader_stack[0];
        url = v[0];
        callback = v[1];
        err_callback = v[2];

        loader_stack.splice(0, 1);

        if (!loader_stack.length) {
            clearInterval(loader_interval);
            loader_interval = null;
        }


        img_load_work_streams++;
        if (fb.is_debug_pws) {
            console.warn("load_img " + url);
            console.log('ilws ' + img_load_work_streams);
        }
        var img = new Image();
        img.onload = function () {
            img_load_work_streams--;
            if (fb.is_debug_pws) {
                console.log("loaded_img " + url);
                console.log('ilws ' + img_load_work_streams);
            }
            if (callback)
                callback(url);
        };
        img.onerror = function (e) {
            img_load_work_streams--;
            if (fb.is_debug_pws) {
                console.log('img on error ' + url);
                console.log('ilws ' + img_load_work_streams);
            }
            e.preventDefault();
            e.stopPropagation();
            if (err_callback)
                err_callback();
            return false;
        };
        // if (url.indexOf('!important') !== -1)
        //     debugger;
        img.src = url;
        if (loader_stack.length)
            arguments.callee.apply(this, null, null, null, true);
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

    function is_valid_img_url(url) {
        return /\.(jpe?g|png|webp|gif|svg)($|:| !|\?)/i.test(url);
    }

    function set_f(url, img_obj, fb_selector, is_update_off, ajax_work_not_minus, not_add_fb_loaded) {
        if (fb.is_debug_pws)
            console.log('set_f-' + url);
        // if (url === "/.fast_background/1/16/16c5c65c2deaaa0fd86fad3c6a062dc90ad30bc9_18_604.webp")
        //     debugger;
        if (is_valid_img_url(url)) {
            if (is_full_c_img(url)) {
                if (img_obj.hasClass('fb_loaded')) {
                    img_obj.removeClass('fb_loaded');
                    img_obj.addClass('fb_dynamic_url');
                }
                if (!img_obj.hasClass('fb_dynamic_url') && !ajax_work_not_minus && !not_add_fb_loaded)
                    img_obj.addClass('fb_loaded');
                img_obj.data('fb_last_load_url', url);
            }
            var type = img_obj && img_obj.is('img') ? b_types.img_src : b_types.b_url;
            try {

                switch (type) {
                    case b_types.b_url:
                        var selector = fb_selector;
                        if (selector)
                            $(selector).css(type, '');
                        else {
                            img_obj[0].style[type] = '';
                            selector = get_l_id(img_obj);
                        }

                        if (typeof fb.cssobj.obj[selector] === "undefined")
                            fb.cssobj.obj[selector] = {};


                        var is_already_important = !is_already_important && important_selectors.indexOf(selector) !== -1;
                        var css_url = 'url(' + url + ')' + (is_already_important ? " !important" : "");
                        var is_replace = false;
                        if (fb.cssobj.obj[selector][type] && fb.cssobj.obj[selector][type] !== css_url) {
                            is_replace = true;
                            fb.cssobj.obj[selector][type] = 'none';
                            fb.cssobj.obj[selector].backgroundImage = 'none';
                            if (!is_update_off)
                                fb.cssobj.update();
                        }
                        fb.cssobj.obj[selector][type] = css_url;
                        fb.cssobj.obj[selector].backgroundImage = css_url;
                        if (!is_update_off)
                            fb.cssobj.update();
                        /*if (is_replace && $(selector).css('background-image') !== css_url) {
                            fb.cssobj.obj[selector].backgroundImage = 'url(' + url + ')';
                            fb.cssobj.update();
                        }*/
                        // console.log(selector + " " + fb.cssobj.obj[selector][type]);
                        break;
                    case b_types.img_src:
                        // if (url && url.indexOf('def_21f184') !== -1)
                        //     console.log('x');
                        if (img_obj.attr(type) !== url)
                            img_obj.attr(type, url);
                        requestAnimFrame(function () {
                            var w_width_ = $(window).width();
                            var width_ = img_obj.width();
                            if ((w_width_ > 500 && width_ > w_width_) || (browser.isMobile.anyPhone && width_ < 10)) {
                                img_obj.css('width', '100%');
                            }
                        }, img_obj[0]);
                        break;
                }

                if (/*!ajax_work_not_minus &&*/ img_obj.hasClass('fb_ev_img_load')) {
                    if (fb.is_debug_pws)
                        console.warn('trigger fb_ev_img_load', url);
                    img_obj.trigger('fb_ev_img_load', [url]);
                }
            } catch (e) {
                console.warn(e.message);
            }
        }
        if (!ajax_work_not_minus)
            ajax_work_minus();
    }

    function remove_f(img_obj, fb_selector) {
        var type = img_obj.is('img') ? b_types.img_src : b_types.b_url;
        switch (type) {
            case b_types.b_url:
                var selector = fb_selector;
                if (!selector)
                    selector = get_l_id(img_obj);
                if (typeof fb.cssobj.obj[selector] !== "undefined")
                    fb.cssobj.obj[selector] = {};
                if (fb.stage_loaded >= 1)
                    fb.cssobj.update();
                break;
            case b_types.img_src:
                break;
        }
        ajax_work_minus();
    }

    function get_f(img_obj, fb_selector, is_use_computed_style) {
        var type = img_obj.is('img') ? b_types.img_src : b_types.b_url;
        switch (type) {
            case b_types.b_url:
                var r = '';
                if (!is_use_computed_style) {
                    var selector = fb_selector;
                    if (!selector)
                        selector = get_l_id(img_obj);
                    if (typeof fb.cssobj.obj[selector] === "undefined")
                        return "";
                    r = fb.cssobj.obj[selector][type];
                } else
                    r = img_obj.css(type);

                return r ? r.replace(/url\(['"]?|['"]?\)/g, "") : "";
                break;
            case b_types.img_src:
                var src = img_obj.attr(type);
                if (typeof src === "undefined")
                    src = "";
                return src;
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
        var d_key = '';
        try {
            var d = new Date();
            d_key = d.getDate() + d.getMonth() + d.getFullYear();
        } catch (e) {

        }
        var cached_key = 'fast_background_cached_url_' + width + 'x' + height + '_' + url + '_' + d_key;
        return cached_key;
    }

    function is_show(img_obj, fb_selector) {
        if (load_only_visible) {
            var rect = img_obj[0].getBoundingClientRect();
            return (rect.top < window_h && (rect.top || rect.height)) || img_obj.hasClass('fb_ignore_io');
        } else
            return (!io || to_load_fb_sels[fb_selector ? fb_selector : get_l_id(img_obj)] || img_obj.hasClass('fb_ignore_io'));
    }

    function ajax_callback(url, curl, img_obj, fb_selector, fb_tmp_attr_p, cached_key, is_cached, ajax_work_not_minus) {

        function err_c() {
            cache.del(cached_key);
            img_obj.removeClass('fb_loaded');
            img_obj.data('fb_before_error', true);
            ajax_work_minus();
        }

        if (!curl) {
            err_c();
            return;
        }
        if (!is_full_c_img(curl)) {
            var na_tmp_width = 'tmp_width' + (fb_selector ? "_c_" + fb_tmp_attr_p : "");
            var na_tmp_height = 'tmp_height' + (fb_selector ? "_c_" + fb_tmp_attr_p : "");
            img_obj.removeData(na_tmp_width);
            img_obj.removeData(na_tmp_height);
        } else if (curl && !is_cached)
            cache.set(cached_key, curl);


        if (is_show(img_obj, fb_selector)) {
            if (img_obj.hasClass('fb_ev_img_cache_url'))
                img_obj.trigger('fb_ev_img_cache_url', [curl]);
            if (img_obj.data('fb_before_error'))
                curl += '?is_retry=1';
            loader_img(curl, function () {
                set_f(curl, img_obj, fb_selector, false, ajax_work_not_minus);
            }, err_c);
        } else if (!ajax_work_not_minus)
            ajax_work_minus();
    }


    var data_dyn_img_urls = {
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

    var to_load_fb_sels = {};

    function to_load_fb_sels_p(sel) {
        if (to_load_fb_sels[sel])
            return false;
        to_load_fb_sels[sel] = true;
        return true;
    }

    function io_h_url_p(jq_el, url, sel) {

        // if (!url)
        //     debugger;
        url = url.replace(" !important", "");
        if (url && fb.clear_urls_pattern)
            url = url.replace(fb.clear_urls_pattern, '');
        url = url.split(':')[0];
        url += ':' + jq_el.data('fb_img_type');
        var c_key = get_cached_key(jq_el, url);
        var c_url = cache.get(c_key);
        if (c_url && (!jq_el.hasClass('fb_loaded') || jq_el.data('fb_last_load_url') !== c_url)) {
            fb.ajax_is_work++;
            if (jq_el.data('fb_before_error'))
                c_url += '?is_retry=1';
            loader_img(c_url, function () {
                if (io)
                    io.unobserve(jq_el[0]);
                set_f(c_url, jq_el, sel);
            }, function () {
                jq_el.removeClass('fb_loaded');
                jq_el.data('fb_before_error', true);
                cache.del(c_key);
                ajax_work_minus();
            });
        } else if (io)
            io.unobserve(jq_el[0]);
    }

    var io_handler_t = null;
    var io_is_first_init = false;


    function io_handler(entry) {
        if (load_only_visible) {
            setTimeout(arguments.callee.bind(this, entry), 300);
            return;
        }
        io_is_first_init = true;
        var is_new_sel_found = false;
        for (var key in entry) {
            // if (!entry.hasOwnProperty(key)) continue;
            var item = entry[key];
            if (!item.isIntersecting)
                continue;
            var jq_el = $(item.target);
            var sel = jq_el.data('fb_sel');
            var url = null;
            if (sel && to_load_fb_sels_p(sel)) {
                is_new_sel_found = true;
                url = jq_el.attr('data-url');
                if (url && is_valid_img_url(url))
                    io_h_url_p(jq_el, url);
            }
            var fb_sels = jq_el.data('fb_sels');
            if (fb_sels)
                for (sel in fb_sels) {
                    // if (!fb_sels.hasOwnProperty(sel)) continue;
                    if (to_load_fb_sels_p(sel)) {
                        is_new_sel_found = true;
                        var sel_a = sel.split(/(?=[: ])/g);
                        var s_id = sel_a[0];
                        sel_a[0] = '';
                        var sel_p = sel_a.join('');
                        if (sel_p.substr(0, 1) === ' ')
                            sel_p = sel_p.substr(1);
                        var p_el = jq_el.closest(s_id);
                        url = data_dyn_img_urls.get(p_el, sel_p);
                        if (is_valid_img_url(url))
                            io_h_url_p(jq_el, url, sel);
                    }
                }
        }
        if (!is_new_sel_found)
            return;

        /*console.log('------------------------------------');
         for (var _sel in to_load_fb_sels) {
             if (!to_load_fb_sels.hasOwnProperty(_sel)) continue;
             console.log(_sel);
         }*/
    }


    var io = 'IntersectionObserver' in window ? new IntersectionObserver(io_handler, {rootMargin: "0px 1000px " + (window_h + window_h / 2) + "px 1000px"}) : null;


})();
