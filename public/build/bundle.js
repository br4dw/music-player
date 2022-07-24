
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.49.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (220:3) {#each files as file}
    function create_each_block(ctx) {
    	let div;
    	let p;
    	let t0_value = /*file*/ ctx[12] + "";
    	let t0;
    	let t1;
    	let img;
    	let img_id_value;
    	let img_src_value;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[5](/*file*/ ctx[12]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			attr_dev(p, "class", "file-name svelte-suwl3u");
    			add_location(p, file, 221, 5, 5159);
    			attr_dev(img, "id", img_id_value = /*file*/ ctx[12]);
    			attr_dev(img, "class", "icon svelte-suwl3u");
    			if (!src_url_equal(img.src, img_src_value = "../static/icons/play.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Play");
    			add_location(img, file, 222, 5, 5197);
    			attr_dev(div, "class", "file svelte-suwl3u");
    			add_location(div, file, 220, 4, 5134);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(div, t1);
    			append_dev(div, img);
    			append_dev(div, t2);

    			if (!mounted) {
    				dispose = listen_dev(img, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*files*/ 1 && t0_value !== (t0_value = /*file*/ ctx[12] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*files*/ 1 && img_id_value !== (img_id_value = /*file*/ ctx[12])) {
    				attr_dev(img, "id", img_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(220:3) {#each files as file}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let nav;
    	let div1;
    	let div0;
    	let t1;
    	let div3;
    	let div2;
    	let label;
    	let input;
    	let t2;
    	let t3;
    	let div6;
    	let div5;
    	let h1;
    	let t5;
    	let h20;

    	let t6_value = (/*files*/ ctx[0].length < 1
    	? 'No suitable files have been found or no folder has been selected...'
    	: '') + "";

    	let t6;
    	let t7;
    	let div4;
    	let t8;
    	let footer;
    	let div7;
    	let img0;
    	let img0_src_value;
    	let t9;
    	let div17;
    	let h21;
    	let t11;
    	let div8;
    	let img1;
    	let img1_src_value;
    	let t12;
    	let img2;
    	let img2_src_value;
    	let t13;
    	let img3;
    	let img3_src_value;
    	let t14;
    	let img4;
    	let img4_src_value;
    	let t15;
    	let div16;
    	let div11;
    	let div9;
    	let t16;
    	let div10;
    	let t17;
    	let div15;
    	let div12;
    	let t19;
    	let div13;
    	let t21;
    	let div14;
    	let mounted;
    	let dispose;
    	let each_value = /*files*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Music Player";
    			t1 = space();
    			div3 = element("div");
    			div2 = element("div");
    			label = element("label");
    			input = element("input");
    			t2 = text("\r\n\t\t\t\tSelect music folder");
    			t3 = space();
    			div6 = element("div");
    			div5 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Music folder";
    			t5 = space();
    			h20 = element("h2");
    			t6 = text(t6_value);
    			t7 = space();
    			div4 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			footer = element("footer");
    			div7 = element("div");
    			img0 = element("img");
    			t9 = space();
    			div17 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Nothing is currently playing";
    			t11 = space();
    			div8 = element("div");
    			img1 = element("img");
    			t12 = space();
    			img2 = element("img");
    			t13 = space();
    			img3 = element("img");
    			t14 = space();
    			img4 = element("img");
    			t15 = space();
    			div16 = element("div");
    			div11 = element("div");
    			div9 = element("div");
    			t16 = space();
    			div10 = element("div");
    			t17 = space();
    			div15 = element("div");
    			div12 = element("div");
    			div12.textContent = "00:00";
    			t19 = space();
    			div13 = element("div");
    			div13.textContent = "/";
    			t21 = space();
    			div14 = element("div");
    			div14.textContent = "00:00";
    			attr_dev(div0, "class", "nav-item svelte-suwl3u");
    			add_location(div0, file, 200, 2, 4540);
    			attr_dev(div1, "class", "left svelte-suwl3u");
    			add_location(div1, file, 199, 1, 4518);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "webkitdirectory", "true");
    			attr_dev(input, "directory", "");
    			attr_dev(input, "class", "svelte-suwl3u");
    			add_location(input, file, 206, 4, 4702);
    			attr_dev(label, "class", "main-button svelte-suwl3u");
    			add_location(label, file, 205, 3, 4669);
    			attr_dev(div2, "class", "nav-item svelte-suwl3u");
    			add_location(div2, file, 203, 2, 4615);
    			attr_dev(div3, "class", "right svelte-suwl3u");
    			add_location(div3, file, 202, 1, 4592);
    			attr_dev(nav, "class", "topnav svelte-suwl3u");
    			add_location(nav, file, 198, 0, 4495);
    			attr_dev(h1, "class", "title svelte-suwl3u");
    			add_location(h1, file, 215, 2, 4901);
    			attr_dev(h20, "class", "subtitle svelte-suwl3u");
    			add_location(h20, file, 216, 2, 4940);
    			attr_dev(div4, "class", "files svelte-suwl3u");
    			add_location(div4, file, 218, 2, 5083);
    			attr_dev(div5, "class", "spacer");
    			add_location(div5, file, 214, 1, 4877);
    			attr_dev(div6, "class", "centered");
    			add_location(div6, file, 213, 0, 4852);
    			attr_dev(img0, "id", "thumbnail");
    			attr_dev(img0, "class", "thumbnail svelte-suwl3u");
    			if (!src_url_equal(img0.src, img0_src_value = /*thumbnail*/ ctx[1])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Thumbnail");
    			add_location(img0, file, 232, 2, 5434);
    			attr_dev(div7, "class", "thumbnail svelte-suwl3u");
    			add_location(div7, file, 231, 1, 5407);
    			attr_dev(h21, "id", "title");
    			attr_dev(h21, "class", "subtitle player-title svelte-suwl3u");
    			add_location(h21, file, 235, 2, 5550);
    			attr_dev(img1, "id", "previous");
    			attr_dev(img1, "class", "icon control-icon svelte-suwl3u");
    			if (!src_url_equal(img1.src, img1_src_value = "../static/icons/previous.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Previous");
    			add_location(img1, file, 237, 3, 5666);
    			attr_dev(img2, "id", "pause");
    			attr_dev(img2, "class", "icon control-icon svelte-suwl3u");
    			if (!src_url_equal(img2.src, img2_src_value = "../static/icons/play.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Pause");
    			add_location(img2, file, 238, 3, 5801);
    			attr_dev(img3, "id", "stop");
    			attr_dev(img3, "class", "icon control-icon svelte-suwl3u");
    			if (!src_url_equal(img3.src, img3_src_value = "../static/icons/stop.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Stop");
    			add_location(img3, file, 239, 3, 5930);
    			attr_dev(img4, "id", "next");
    			attr_dev(img4, "class", "icon control-icon svelte-suwl3u");
    			if (!src_url_equal(img4.src, img4_src_value = "../static/icons/next.svg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "Next");
    			add_location(img4, file, 240, 3, 6060);
    			attr_dev(div8, "class", "player-controls svelte-suwl3u");
    			add_location(div8, file, 236, 2, 5632);
    			attr_dev(div9, "class", "bar svelte-suwl3u");
    			add_location(div9, file, 244, 4, 6271);
    			attr_dev(div10, "id", "progress-bar");
    			attr_dev(div10, "class", "overlay-bar svelte-suwl3u");
    			add_location(div10, file, 245, 4, 6300);
    			attr_dev(div11, "class", "progress-container svelte-suwl3u");
    			add_location(div11, file, 243, 3, 6233);
    			attr_dev(div12, "id", "ct");
    			attr_dev(div12, "class", "current-time svelte-suwl3u");
    			add_location(div12, file, 248, 4, 6399);
    			attr_dev(div13, "class", "svelte-suwl3u");
    			add_location(div13, file, 249, 4, 6450);
    			attr_dev(div14, "id", "sl");
    			attr_dev(div14, "class", "song-length svelte-suwl3u");
    			add_location(div14, file, 250, 4, 6470);
    			attr_dev(div15, "class", "time-container svelte-suwl3u");
    			add_location(div15, file, 247, 3, 6365);
    			attr_dev(div16, "class", "duration-container svelte-suwl3u");
    			add_location(div16, file, 242, 2, 6196);
    			attr_dev(div17, "class", "player-container svelte-suwl3u");
    			add_location(div17, file, 234, 1, 5516);
    			attr_dev(footer, "class", "player svelte-suwl3u");
    			add_location(footer, file, 230, 0, 5381);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div1);
    			append_dev(div1, div0);
    			append_dev(nav, t1);
    			append_dev(nav, div3);
    			append_dev(div3, div2);
    			append_dev(div2, label);
    			append_dev(label, input);
    			append_dev(label, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, h1);
    			append_dev(div5, t5);
    			append_dev(div5, h20);
    			append_dev(h20, t6);
    			append_dev(div5, t7);
    			append_dev(div5, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			insert_dev(target, t8, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div7);
    			append_dev(div7, img0);
    			append_dev(footer, t9);
    			append_dev(footer, div17);
    			append_dev(div17, h21);
    			append_dev(div17, t11);
    			append_dev(div17, div8);
    			append_dev(div8, img1);
    			append_dev(div8, t12);
    			append_dev(div8, img2);
    			append_dev(div8, t13);
    			append_dev(div8, img3);
    			append_dev(div8, t14);
    			append_dev(div8, img4);
    			append_dev(div17, t15);
    			append_dev(div17, div16);
    			append_dev(div16, div11);
    			append_dev(div11, div9);
    			append_dev(div11, t16);
    			append_dev(div11, div10);
    			append_dev(div16, t17);
    			append_dev(div16, div15);
    			append_dev(div15, div12);
    			append_dev(div15, t19);
    			append_dev(div15, div13);
    			append_dev(div15, t21);
    			append_dev(div15, div14);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*changeDirectory*/ ctx[2], false, false, false),
    					listen_dev(img1, "click", /*click_handler_1*/ ctx[6], false, false, false),
    					listen_dev(img2, "click", /*click_handler_2*/ ctx[7], false, false, false),
    					listen_dev(img3, "click", /*click_handler_3*/ ctx[8], false, false, false),
    					listen_dev(img4, "click", /*click_handler_4*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*files*/ 1 && t6_value !== (t6_value = (/*files*/ ctx[0].length < 1
    			? 'No suitable files have been found or no folder has been selected...'
    			: '') + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*files, player*/ 9) {
    				each_value = /*files*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { config } = $$props;
    	const fs = require('fs');
    	let files = config.files || [];
    	const Player = require('../lib/Player');
    	let thumbnail = 'http://www.scottishculture.org/themes/scottishculture/images/music_placeholder.png';

    	function changeDirectory() {
    		let types = ['.mp3', '.wav', '.flac'];
    		let firstFile = [...this.files].filter(f => f.type.includes('audio'));
    		if ([...this.files].length < 1) return alert('No files found');
    		if (!firstFile[0]) return;

    		// Get path to the music folder
    		let filePath = firstFile[0].path;

    		let lastIndex = filePath.lastIndexOf('\\');
    		let folderPath = filePath.slice(0, lastIndex + 1);

    		// Update path in config;
    		$$invalidate(4, config.path = folderPath, config);

    		fs.readdir(config.path, (error, data) => {
    			if (error) return console.error(error);
    			$$invalidate(0, files = data.filter(f => types.some(type => f.endsWith(type))));

    			fs.writeFile(process.cwd() + '\\src\\config.json', JSON.stringify({ path: folderPath, files }), writeError => {
    				if (writeError) {
    					return console.error(writeError);
    				}
    			});
    		});
    	}

    	const player = new Player(config, files);
    	const writable_props = ['config'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = file => player.play(file);
    	const click_handler_1 = () => player.previous();
    	const click_handler_2 = () => player.pause();
    	const click_handler_3 = () => player.destroy();
    	const click_handler_4 = () => player.skip();

    	$$self.$$set = $$props => {
    		if ('config' in $$props) $$invalidate(4, config = $$props.config);
    	};

    	$$self.$capture_state = () => ({
    		config,
    		fs,
    		files,
    		Player,
    		thumbnail,
    		changeDirectory,
    		player
    	});

    	$$self.$inject_state = $$props => {
    		if ('config' in $$props) $$invalidate(4, config = $$props.config);
    		if ('files' in $$props) $$invalidate(0, files = $$props.files);
    		if ('thumbnail' in $$props) $$invalidate(1, thumbnail = $$props.thumbnail);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		files,
    		thumbnail,
    		changeDirectory,
    		player,
    		config,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { config: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*config*/ ctx[4] === undefined && !('config' in props)) {
    			console_1.warn("<App> was created without expected prop 'config'");
    		}
    	}

    	get config() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set config(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const fs = window.require('fs');

    const configPath = './src/config.json';
    const defaultConfig = {
    	path: null,
    	files: []
    };

    fs.access(configPath, fs.F_OK, (accessError) => {
    	if (accessError) {
    		console.log('No config file found... Creating one');
    		return fs.writeFile(configPath, JSON.stringify(defaultConfig), (writeError) => {
    			if (writeError) {
    				return console.error(writeError)
    			}
    		});
    	}
    });

    // let config = fs.readFile(configPath, (error, data) => {
    // 	if (error) {
    // 		console.error(error)
    // 		return defaultConfig;
    // 	}
    // 	return JSON.parse(data);
    // })

    const app = new App({
    	target: document.body,
    	props: { config: window.require(process.cwd() + '\\src\\config.json') }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
