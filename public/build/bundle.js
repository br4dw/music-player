
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (287:3) {#each files as file}
    function create_each_block(ctx) {
    	let div;
    	let p;
    	let t0_value = /*file*/ ctx[19] + "";
    	let t0;
    	let t1;
    	let img;
    	let img_id_value;
    	let img_src_value;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*file*/ ctx[19]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			attr_dev(p, "class", "file-name svelte-tfppfv");
    			add_location(p, file, 288, 5, 6843);
    			attr_dev(img, "id", img_id_value = /*file*/ ctx[19]);
    			attr_dev(img, "class", "icon svelte-tfppfv");
    			if (!src_url_equal(img.src, img_src_value = "../static/icons/play.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Play");
    			add_location(img, file, 289, 5, 6881);
    			attr_dev(div, "class", "file svelte-tfppfv");
    			add_location(div, file, 287, 4, 6818);
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
    			if (dirty & /*files*/ 1 && t0_value !== (t0_value = /*file*/ ctx[19] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*files*/ 1 && img_id_value !== (img_id_value = /*file*/ ctx[19])) {
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
    		source: "(287:3) {#each files as file}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let nav;
    	let div2;
    	let div1;
    	let t4;
    	let div4;
    	let div3;
    	let label;
    	let input0;
    	let t5;
    	let t6;
    	let div7;
    	let div6;
    	let h1;
    	let t8;
    	let h20;

    	let t9_value = (/*files*/ ctx[0].length < 1
    	? 'No suitable files have been found or no folder has been selected...'
    	: '') + "";

    	let t9;
    	let t10;
    	let div5;
    	let t11;
    	let footer;
    	let div8;
    	let img3;
    	let img3_src_value;
    	let t12;
    	let div18;
    	let h21;
    	let t14;
    	let div9;
    	let img4;
    	let img4_src_value;
    	let t15;
    	let img5;
    	let img5_src_value;
    	let t16;
    	let img6;
    	let img6_src_value;
    	let t17;
    	let img7;
    	let img7_src_value;
    	let t18;
    	let img8;
    	let img8_src_value;
    	let t19;
    	let div17;
    	let div12;
    	let div10;
    	let t20;
    	let input1;
    	let t21;
    	let div11;
    	let t22;
    	let div16;
    	let div13;
    	let t24;
    	let div14;
    	let t26;
    	let div15;
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
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			img1 = element("img");
    			t1 = space();
    			img2 = element("img");
    			t2 = space();
    			nav = element("nav");
    			div2 = element("div");
    			div1 = element("div");
    			div1.textContent = "Music Player";
    			t4 = space();
    			div4 = element("div");
    			div3 = element("div");
    			label = element("label");
    			input0 = element("input");
    			t5 = text("\r\n\t\t\t\tSelect music folder");
    			t6 = space();
    			div7 = element("div");
    			div6 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Music folder";
    			t8 = space();
    			h20 = element("h2");
    			t9 = text(t9_value);
    			t10 = space();
    			div5 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t11 = space();
    			footer = element("footer");
    			div8 = element("div");
    			img3 = element("img");
    			t12 = space();
    			div18 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Nothing is currently playing";
    			t14 = space();
    			div9 = element("div");
    			img4 = element("img");
    			t15 = space();
    			img5 = element("img");
    			t16 = space();
    			img6 = element("img");
    			t17 = space();
    			img7 = element("img");
    			t18 = space();
    			img8 = element("img");
    			t19 = space();
    			div17 = element("div");
    			div12 = element("div");
    			div10 = element("div");
    			t20 = space();
    			input1 = element("input");
    			t21 = space();
    			div11 = element("div");
    			t22 = space();
    			div16 = element("div");
    			div13 = element("div");
    			div13.textContent = "00:00";
    			t24 = space();
    			div14 = element("div");
    			div14.textContent = "/";
    			t26 = space();
    			div15 = element("div");
    			div15.textContent = "00:00";
    			attr_dev(img0, "class", "icon title-icon control-icon svelte-tfppfv");
    			if (!src_url_equal(img0.src, img0_src_value = "../static/icons/minimise.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "-");
    			add_location(img0, file, 259, 1, 5830);
    			attr_dev(img1, "class", "icon title-icon control-icon svelte-tfppfv");
    			if (!src_url_equal(img1.src, img1_src_value = "../static/icons/maximise.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "[]");
    			add_location(img1, file, 260, 1, 5938);
    			attr_dev(img2, "class", "icon title-icon control-icon svelte-tfppfv");
    			if (!src_url_equal(img2.src, img2_src_value = "../static/icons/close.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "x");
    			add_location(img2, file, 261, 1, 6047);
    			attr_dev(div0, "class", "title-container svelte-tfppfv");
    			add_location(div0, file, 258, 0, 5798);
    			attr_dev(div1, "class", "nav-item svelte-tfppfv");
    			add_location(div1, file, 267, 2, 6224);
    			attr_dev(div2, "class", "left svelte-tfppfv");
    			add_location(div2, file, 266, 1, 6202);
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "webkitdirectory", "true");
    			attr_dev(input0, "directory", "");
    			attr_dev(input0, "class", "svelte-tfppfv");
    			add_location(input0, file, 273, 4, 6386);
    			attr_dev(label, "class", "main-button svelte-tfppfv");
    			add_location(label, file, 272, 3, 6353);
    			attr_dev(div3, "class", "nav-item svelte-tfppfv");
    			add_location(div3, file, 270, 2, 6299);
    			attr_dev(div4, "class", "right svelte-tfppfv");
    			add_location(div4, file, 269, 1, 6276);
    			attr_dev(nav, "class", "topnav svelte-tfppfv");
    			add_location(nav, file, 265, 0, 6179);
    			attr_dev(h1, "class", "title svelte-tfppfv");
    			add_location(h1, file, 282, 2, 6585);
    			attr_dev(h20, "class", "subtitle svelte-tfppfv");
    			add_location(h20, file, 283, 2, 6624);
    			attr_dev(div5, "class", "files svelte-tfppfv");
    			add_location(div5, file, 285, 2, 6767);
    			attr_dev(div6, "class", "spacer");
    			add_location(div6, file, 281, 1, 6561);
    			attr_dev(div7, "class", "centered");
    			add_location(div7, file, 280, 0, 6536);
    			attr_dev(img3, "id", "thumbnail");
    			attr_dev(img3, "class", "thumbnail svelte-tfppfv");
    			if (!src_url_equal(img3.src, img3_src_value = /*thumbnail*/ ctx[1])) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Thumbnail");
    			add_location(img3, file, 299, 2, 7118);
    			attr_dev(div8, "class", "thumbnail svelte-tfppfv");
    			add_location(div8, file, 298, 1, 7091);
    			attr_dev(h21, "id", "title");
    			attr_dev(h21, "class", "subtitle player-title svelte-tfppfv");
    			add_location(h21, file, 302, 2, 7234);
    			attr_dev(img4, "id", "previous");
    			attr_dev(img4, "class", "icon control-icon svelte-tfppfv");
    			if (!src_url_equal(img4.src, img4_src_value = "../static/icons/previous.svg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "Previous");
    			add_location(img4, file, 304, 3, 7350);
    			attr_dev(img5, "id", "pause");
    			attr_dev(img5, "class", "icon control-icon svelte-tfppfv");
    			if (!src_url_equal(img5.src, img5_src_value = "../static/icons/play.svg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "Pause");
    			add_location(img5, file, 305, 3, 7485);
    			attr_dev(img6, "id", "stop");
    			attr_dev(img6, "class", "icon control-icon svelte-tfppfv");
    			if (!src_url_equal(img6.src, img6_src_value = "../static/icons/stop.svg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "Stop");
    			add_location(img6, file, 306, 3, 7614);
    			attr_dev(img7, "id", "next");
    			attr_dev(img7, "class", "icon control-icon svelte-tfppfv");
    			if (!src_url_equal(img7.src, img7_src_value = "../static/icons/next.svg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "Next");
    			add_location(img7, file, 307, 3, 7744);
    			attr_dev(img8, "id", "loop");
    			attr_dev(img8, "class", "icon control-icon svelte-tfppfv");
    			if (!src_url_equal(img8.src, img8_src_value = "../static/icons/loop.svg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "Loop");
    			add_location(img8, file, 308, 3, 7871);
    			attr_dev(div9, "class", "player-controls svelte-tfppfv");
    			add_location(div9, file, 303, 2, 7316);
    			attr_dev(div10, "id", "base-bar");
    			attr_dev(div10, "class", "bar svelte-tfppfv");
    			add_location(div10, file, 312, 4, 8086);
    			attr_dev(input1, "class", "slider svelte-tfppfv");
    			attr_dev(input1, "id", "slider");
    			attr_dev(input1, "type", "range");
    			input1.value = "0";
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "step", ".1");
    			add_location(input1, file, 313, 4, 8129);
    			attr_dev(div11, "id", "progress-bar");
    			attr_dev(div11, "class", "overlay-bar svelte-tfppfv");
    			add_location(div11, file, 314, 4, 8291);
    			attr_dev(div12, "class", "progress-container svelte-tfppfv");
    			add_location(div12, file, 311, 3, 8048);
    			attr_dev(div13, "id", "ct");
    			attr_dev(div13, "class", "current-time svelte-tfppfv");
    			add_location(div13, file, 317, 4, 8390);
    			attr_dev(div14, "class", "svelte-tfppfv");
    			add_location(div14, file, 318, 4, 8441);
    			attr_dev(div15, "id", "sl");
    			attr_dev(div15, "class", "song-length svelte-tfppfv");
    			add_location(div15, file, 319, 4, 8461);
    			attr_dev(div16, "class", "time-container svelte-tfppfv");
    			add_location(div16, file, 316, 3, 8356);
    			attr_dev(div17, "class", "duration-container svelte-tfppfv");
    			add_location(div17, file, 310, 2, 8011);
    			attr_dev(div18, "class", "player-container svelte-tfppfv");
    			add_location(div18, file, 301, 1, 7200);
    			attr_dev(footer, "class", "player svelte-tfppfv");
    			add_location(footer, file, 297, 0, 7065);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img0);
    			append_dev(div0, t0);
    			append_dev(div0, img1);
    			append_dev(div0, t1);
    			append_dev(div0, img2);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div2);
    			append_dev(div2, div1);
    			append_dev(nav, t4);
    			append_dev(nav, div4);
    			append_dev(div4, div3);
    			append_dev(div3, label);
    			append_dev(label, input0);
    			append_dev(label, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, h1);
    			append_dev(div6, t8);
    			append_dev(div6, h20);
    			append_dev(h20, t9);
    			append_dev(div6, t10);
    			append_dev(div6, div5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div5, null);
    			}

    			insert_dev(target, t11, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div8);
    			append_dev(div8, img3);
    			append_dev(footer, t12);
    			append_dev(footer, div18);
    			append_dev(div18, h21);
    			append_dev(div18, t14);
    			append_dev(div18, div9);
    			append_dev(div9, img4);
    			append_dev(div9, t15);
    			append_dev(div9, img5);
    			append_dev(div9, t16);
    			append_dev(div9, img6);
    			append_dev(div9, t17);
    			append_dev(div9, img7);
    			append_dev(div9, t18);
    			append_dev(div9, img8);
    			append_dev(div18, t19);
    			append_dev(div18, div17);
    			append_dev(div17, div12);
    			append_dev(div12, div10);
    			append_dev(div12, t20);
    			append_dev(div12, input1);
    			append_dev(div12, t21);
    			append_dev(div12, div11);
    			append_dev(div17, t22);
    			append_dev(div17, div16);
    			append_dev(div16, div13);
    			append_dev(div16, t24);
    			append_dev(div16, div14);
    			append_dev(div16, t26);
    			append_dev(div16, div15);

    			if (!mounted) {
    				dispose = [
    					listen_dev(img0, "click", /*minimise*/ ctx[3], false, false, false),
    					listen_dev(img1, "click", /*maximise*/ ctx[4], false, false, false),
    					listen_dev(img2, "click", /*close*/ ctx[5], false, false, false),
    					listen_dev(input0, "change", /*changeDirectory*/ ctx[2], false, false, false),
    					listen_dev(img4, "click", /*click_handler_1*/ ctx[9], false, false, false),
    					listen_dev(img5, "click", /*click_handler_2*/ ctx[10], false, false, false),
    					listen_dev(img6, "click", /*click_handler_3*/ ctx[11], false, false, false),
    					listen_dev(img7, "click", /*click_handler_4*/ ctx[12], false, false, false),
    					listen_dev(img8, "click", /*click_handler_5*/ ctx[13], false, false, false),
    					listen_dev(input1, "change", /*change_handler*/ ctx[14], false, false, false),
    					listen_dev(input1, "input", /*input_handler*/ ctx[15], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*files*/ 1 && t9_value !== (t9_value = (/*files*/ ctx[0].length < 1
    			? 'No suitable files have been found or no folder has been selected...'
    			: '') + "")) set_data_dev(t9, t9_value);

    			if (dirty & /*files, player*/ 65) {
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
    						each_blocks[i].m(div5, null);
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
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div7);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t11);
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
    	const { remote } = require('electron');
    	const Player = require('../lib/Player');
    	let thumbnail = '../static/img/placeholder.png';

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
    		$$invalidate(7, config.path = folderPath, config);

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

    	function minimise() {
    		remote.BrowserWindow.getFocusedWindow().minimize();
    	}

    	function maximise() {
    		remote.BrowserWindow.getFocusedWindow().setFullScreen(!remote.BrowserWindow.getFocusedWindow().isFullScreen());
    	}

    	function close() {
    		remote.BrowserWindow.getFocusedWindow().close();
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
    	const click_handler_5 = () => player.loopSong();
    	const change_handler = e => player.stopSeek(e);
    	const input_handler = e => player.seek(e);

    	$$self.$$set = $$props => {
    		if ('config' in $$props) $$invalidate(7, config = $$props.config);
    	};

    	$$self.$capture_state = () => ({
    		config,
    		fs,
    		files,
    		remote,
    		Player,
    		thumbnail,
    		changeDirectory,
    		minimise,
    		maximise,
    		close,
    		player
    	});

    	$$self.$inject_state = $$props => {
    		if ('config' in $$props) $$invalidate(7, config = $$props.config);
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
    		minimise,
    		maximise,
    		close,
    		player,
    		config,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		change_handler,
    		input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { config: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*config*/ ctx[7] === undefined && !('config' in props)) {
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
