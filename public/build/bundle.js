
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
    function empty() {
        return text('');
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
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (123:3) {:else}
    function create_else_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*files*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*files, player, thumbnail*/ 532) {
    				each_value = /*files*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(123:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (114:3) {#if directoryChanging}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let if_block = /*currentFile*/ ctx[1] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Loading files.. Please wait";
    			t1 = space();
    			if (if_block) if_block.c();
    			add_location(h2, file, 116, 6, 3496);
    			attr_dev(div0, "class", "loading-files");
    			add_location(div0, file, 115, 5, 3461);
    			attr_dev(div1, "class", "file svelte-ktsfqg");
    			add_location(div1, file, 114, 4, 3436);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div1, t1);
    			if (if_block) if_block.m(div1, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*currentFile*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(114:3) {#if directoryChanging}",
    		ctx
    	});

    	return block;
    }

    // (124:4) {#each files as file}
    function create_each_block(ctx) {
    	let div1;
    	let div0;
    	let span;
    	let t0_value = /*file*/ ctx[23].filtered + "";
    	let t0;
    	let t1;
    	let img0;
    	let img0_id_value;
    	let img0_src_value;
    	let t2;
    	let img1;
    	let img1_id_value;
    	let img1_src_value;
    	let t3;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[12](/*file*/ ctx[23]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			img0 = element("img");
    			t2 = space();
    			img1 = element("img");
    			t3 = space();
    			attr_dev(span, "class", "file-name svelte-ktsfqg");
    			add_location(span, file, 126, 7, 3777);
    			attr_dev(div0, "class", "file-header svelte-ktsfqg");
    			add_location(div0, file, 125, 6, 3743);
    			attr_dev(img0, "id", img0_id_value = /*file*/ ctx[23].raw + "-art");
    			attr_dev(img0, "class", "album-art thumbnail svelte-ktsfqg");

    			if (!src_url_equal(img0.src, img0_src_value = /*file*/ ctx[23].thumb
    			? /*file*/ ctx[23].thumb
    			: /*thumbnail*/ ctx[4])) attr_dev(img0, "src", img0_src_value);

    			attr_dev(img0, "alt", "Art");
    			add_location(img0, file, 128, 6, 3845);
    			attr_dev(img1, "id", img1_id_value = /*file*/ ctx[23].raw);
    			attr_dev(img1, "class", "icon file-play svelte-ktsfqg");
    			if (!src_url_equal(img1.src, img1_src_value = "../static/icons/play.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Play");
    			add_location(img1, file, 129, 6, 3962);
    			attr_dev(div1, "class", "file svelte-ktsfqg");
    			add_location(div1, file, 124, 5, 3717);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(div1, t1);
    			append_dev(div1, img0);
    			append_dev(div1, t2);
    			append_dev(div1, img1);
    			append_dev(div1, t3);

    			if (!mounted) {
    				dispose = listen_dev(img1, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*files*/ 4 && t0_value !== (t0_value = /*file*/ ctx[23].filtered + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*files*/ 4 && img0_id_value !== (img0_id_value = /*file*/ ctx[23].raw + "-art")) {
    				attr_dev(img0, "id", img0_id_value);
    			}

    			if (dirty & /*files*/ 4 && !src_url_equal(img0.src, img0_src_value = /*file*/ ctx[23].thumb
    			? /*file*/ ctx[23].thumb
    			: /*thumbnail*/ ctx[4])) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*files*/ 4 && img1_id_value !== (img1_id_value = /*file*/ ctx[23].raw)) {
    				attr_dev(img1, "id", img1_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(124:4) {#each files as file}",
    		ctx
    	});

    	return block;
    }

    // (119:5) {#if currentFile}
    function create_if_block_1(ctx) {
    	let div;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Loading Metadata for ");
    			t1 = text(/*currentFile*/ ctx[1]);
    			attr_dev(div, "class", "loaded-file-meta svelte-ktsfqg");
    			add_location(div, file, 119, 6, 3577);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentFile*/ 2) set_data_dev(t1, /*currentFile*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(119:5) {#if currentFile}",
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

    	let t9_value = (/*files*/ ctx[2].length < 1
    	? "No suitable files have been found or no folder has been selected..."
    	: "") + "";

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

    	function select_block_type(ctx, dirty) {
    		if (/*directoryChanging*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

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
    			div1.textContent = "Mystic";
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
    			if_block.c();
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
    			attr_dev(img0, "class", "icon title-icon control-icon svelte-ktsfqg");
    			if (!src_url_equal(img0.src, img0_src_value = "../static/icons/minimise.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "-");
    			add_location(img0, file, 85, 1, 2438);
    			attr_dev(img1, "class", "icon title-icon control-icon svelte-ktsfqg");
    			if (!src_url_equal(img1.src, img1_src_value = "../static/icons/maximise.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "[]");
    			add_location(img1, file, 86, 1, 2547);
    			attr_dev(img2, "class", "icon title-icon control-icon svelte-ktsfqg");
    			if (!src_url_equal(img2.src, img2_src_value = "../static/icons/close.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "x");
    			add_location(img2, file, 87, 1, 2657);
    			attr_dev(div0, "class", "title-container svelte-ktsfqg");
    			add_location(div0, file, 84, 0, 2406);
    			attr_dev(div1, "class", "nav-item accent svelte-ktsfqg");
    			add_location(div1, file, 93, 2, 2835);
    			attr_dev(div2, "class", "left svelte-ktsfqg");
    			add_location(div2, file, 92, 1, 2813);
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "webkitdirectory", "true");
    			attr_dev(input0, "directory", "");
    			attr_dev(input0, "class", "svelte-ktsfqg");
    			add_location(input0, file, 99, 4, 2998);
    			attr_dev(label, "class", "main-button svelte-ktsfqg");
    			add_location(label, file, 98, 3, 2965);
    			attr_dev(div3, "class", "nav-item svelte-ktsfqg");
    			add_location(div3, file, 96, 2, 2911);
    			attr_dev(div4, "class", "right svelte-ktsfqg");
    			add_location(div4, file, 95, 1, 2888);
    			attr_dev(nav, "class", "topnav svelte-ktsfqg");
    			add_location(nav, file, 91, 0, 2790);
    			attr_dev(h1, "class", "title svelte-ktsfqg");
    			add_location(h1, file, 108, 2, 3197);
    			attr_dev(h20, "class", "subtitle svelte-ktsfqg");
    			add_location(h20, file, 109, 2, 3236);
    			attr_dev(div5, "class", "files svelte-ktsfqg");
    			add_location(div5, file, 112, 2, 3383);
    			attr_dev(div6, "class", "spacer");
    			add_location(div6, file, 107, 1, 3173);
    			attr_dev(div7, "class", "centered");
    			add_location(div7, file, 106, 0, 3148);
    			attr_dev(img3, "id", "thumbnail");
    			attr_dev(img3, "class", "thumbnail svelte-ktsfqg");

    			if (!src_url_equal(img3.src, img3_src_value = /*Player*/ ctx[3].nowPlaying
    			? /*Player*/ ctx[3].nowPlaying.thumbnail
    			: /*thumbnail*/ ctx[4])) attr_dev(img3, "src", img3_src_value);

    			attr_dev(img3, "alt", "Thumbnail");
    			add_location(img3, file, 140, 2, 4242);
    			attr_dev(div8, "class", "thumbnail svelte-ktsfqg");
    			add_location(div8, file, 139, 1, 4215);
    			attr_dev(h21, "id", "title");
    			attr_dev(h21, "class", "subtitle player-title svelte-ktsfqg");
    			add_location(h21, file, 143, 2, 4409);
    			attr_dev(img4, "id", "previous");
    			attr_dev(img4, "class", "icon control-icon svelte-ktsfqg");
    			if (!src_url_equal(img4.src, img4_src_value = "../static/icons/previous.svg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "Previous");
    			add_location(img4, file, 145, 3, 4525);
    			attr_dev(img5, "id", "pause");
    			attr_dev(img5, "class", "icon control-icon svelte-ktsfqg");
    			if (!src_url_equal(img5.src, img5_src_value = "../static/icons/play.svg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "Pause");
    			add_location(img5, file, 146, 3, 4661);
    			attr_dev(img6, "id", "stop");
    			attr_dev(img6, "class", "icon control-icon svelte-ktsfqg");
    			if (!src_url_equal(img6.src, img6_src_value = "../static/icons/stop.svg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "Stop");
    			add_location(img6, file, 147, 3, 4784);
    			attr_dev(img7, "id", "next");
    			attr_dev(img7, "class", "icon control-icon svelte-ktsfqg");
    			if (!src_url_equal(img7.src, img7_src_value = "../static/icons/next.svg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "Next");
    			add_location(img7, file, 148, 3, 4907);
    			attr_dev(img8, "id", "loop");
    			attr_dev(img8, "class", "icon control-icon svelte-ktsfqg");
    			if (!src_url_equal(img8.src, img8_src_value = "../static/icons/loop.svg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "Loop");
    			add_location(img8, file, 149, 3, 5027);
    			attr_dev(div9, "class", "player-controls svelte-ktsfqg");
    			add_location(div9, file, 144, 2, 4491);
    			attr_dev(div10, "id", "base-bar");
    			attr_dev(div10, "class", "bar svelte-ktsfqg");
    			add_location(div10, file, 153, 4, 5235);
    			attr_dev(input1, "class", "slider svelte-ktsfqg");
    			attr_dev(input1, "id", "slider");
    			attr_dev(input1, "type", "range");
    			input1.value = "0";
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "step", ".1");
    			add_location(input1, file, 154, 4, 5274);
    			attr_dev(div11, "id", "progress-bar");
    			attr_dev(div11, "class", "overlay-bar svelte-ktsfqg");
    			add_location(div11, file, 159, 4, 5461);
    			attr_dev(div12, "class", "progress-container svelte-ktsfqg");
    			add_location(div12, file, 152, 3, 5197);
    			attr_dev(div13, "id", "ct");
    			attr_dev(div13, "class", "current-time svelte-ktsfqg");
    			add_location(div13, file, 162, 4, 5556);
    			attr_dev(div14, "class", "svelte-ktsfqg");
    			add_location(div14, file, 163, 4, 5607);
    			attr_dev(div15, "id", "sl");
    			attr_dev(div15, "class", "song-length svelte-ktsfqg");
    			add_location(div15, file, 164, 4, 5625);
    			attr_dev(div16, "class", "time-container svelte-ktsfqg");
    			add_location(div16, file, 161, 3, 5522);
    			attr_dev(div17, "class", "duration-container svelte-ktsfqg");
    			add_location(div17, file, 151, 2, 5160);
    			attr_dev(div18, "class", "player-container svelte-ktsfqg");
    			add_location(div18, file, 142, 1, 4375);
    			attr_dev(footer, "class", "player svelte-ktsfqg");
    			add_location(footer, file, 138, 0, 4189);
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
    			if_block.m(div5, null);
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
    					listen_dev(img0, "click", /*minimise*/ ctx[6], false, false, false),
    					listen_dev(img1, "click", /*maximise*/ ctx[7], false, false, false),
    					listen_dev(img2, "click", /*close*/ ctx[8], false, false, false),
    					listen_dev(input0, "change", /*changeDirectory*/ ctx[5], false, false, false),
    					listen_dev(img4, "click", /*click_handler_1*/ ctx[13], false, false, false),
    					listen_dev(img5, "click", /*click_handler_2*/ ctx[14], false, false, false),
    					listen_dev(img6, "click", /*click_handler_3*/ ctx[15], false, false, false),
    					listen_dev(img7, "click", /*click_handler_4*/ ctx[16], false, false, false),
    					listen_dev(img8, "click", /*click_handler_5*/ ctx[17], false, false, false),
    					listen_dev(input1, "change", /*change_handler*/ ctx[18], false, false, false),
    					listen_dev(input1, "input", /*input_handler*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*files*/ 4 && t9_value !== (t9_value = (/*files*/ ctx[2].length < 1
    			? "No suitable files have been found or no folder has been selected..."
    			: "") + "")) set_data_dev(t9, t9_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div5, null);
    				}
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
    			if_block.d();
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
    	let { spotifyHost } = $$props;
    	const fs = require("fs");
    	let directoryChanging = false;
    	let currentFile;
    	let files = config.files || [];
    	const { remote } = require("electron");
    	const Player = require("../lib/Player");
    	const { getSpotifyData } = require("../lib/Player");
    	let thumbnail = "../static/img/placeholder.png";

    	function changeDirectory() {
    		$$invalidate(0, directoryChanging = true);
    		let types = [".mp3", ".wav", ".flac"];
    		let firstFile = [...this.files].filter(f => f.type.includes("audio"));
    		if ([...this.files].length < 1) return alert("No files found");
    		if (!firstFile[0]) return;

    		// Get path to the music folder
    		let filePath = firstFile[0].path;

    		let lastIndex = filePath.lastIndexOf("\\");
    		let folderPath = filePath.slice(0, lastIndex + 1);

    		// Update path in config;
    		$$invalidate(10, config.path = folderPath, config);

    		fs.readdir(config.path, async (error, data) => {
    			if (error) return console.error(error);
    			let filtered = data.filter(f => types.some(type => f.endsWith(type)));

    			const spotifyLoop = async array => {
    				const asyncResults = [];

    				for (const f of array) {
    					$$invalidate(1, currentFile = f);
    					let trun = f.replace(".mp3", "").replace(".wav", "").replace(".flac", "");
    					let entry = { raw: f, filtered: trun, thumb: null };

    					try {
    						let sData = await getSpotifyData(trun, spotifyHost);

    						if (sData && sData.image) {
    							entry.thumb = sData.image;
    						} else {
    							entry.thumb = null;
    						}
    					} catch(e) {
    						console.log("Something went wrong when attempting to load spotify data", e);
    					}

    					asyncResults.push(entry);
    				}

    				$$invalidate(1, currentFile = undefined);
    				return asyncResults;
    			};

    			$$invalidate(2, files = await spotifyLoop(filtered));

    			fs.writeFile(process.cwd() + "\\src\\config.json", JSON.stringify({ path: folderPath, files }), writeError => {
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
    	const writable_props = ['config', 'spotifyHost'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = file => player.play(file.raw, file.thumb);
    	const click_handler_1 = () => player.previous();
    	const click_handler_2 = () => player.pause();
    	const click_handler_3 = () => player.destroy();
    	const click_handler_4 = () => player.skip();
    	const click_handler_5 = () => player.loopSong();
    	const change_handler = e => player.stopSeek(e);
    	const input_handler = e => player.seek(e);

    	$$self.$$set = $$props => {
    		if ('config' in $$props) $$invalidate(10, config = $$props.config);
    		if ('spotifyHost' in $$props) $$invalidate(11, spotifyHost = $$props.spotifyHost);
    	};

    	$$self.$capture_state = () => ({
    		config,
    		spotifyHost,
    		fs,
    		directoryChanging,
    		currentFile,
    		files,
    		remote,
    		Player,
    		getSpotifyData,
    		thumbnail,
    		changeDirectory,
    		minimise,
    		maximise,
    		close,
    		player
    	});

    	$$self.$inject_state = $$props => {
    		if ('config' in $$props) $$invalidate(10, config = $$props.config);
    		if ('spotifyHost' in $$props) $$invalidate(11, spotifyHost = $$props.spotifyHost);
    		if ('directoryChanging' in $$props) $$invalidate(0, directoryChanging = $$props.directoryChanging);
    		if ('currentFile' in $$props) $$invalidate(1, currentFile = $$props.currentFile);
    		if ('files' in $$props) $$invalidate(2, files = $$props.files);
    		if ('thumbnail' in $$props) $$invalidate(4, thumbnail = $$props.thumbnail);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		directoryChanging,
    		currentFile,
    		files,
    		Player,
    		thumbnail,
    		changeDirectory,
    		minimise,
    		maximise,
    		close,
    		player,
    		config,
    		spotifyHost,
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
    		init(this, options, instance, create_fragment, safe_not_equal, { config: 10, spotifyHost: 11 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*config*/ ctx[10] === undefined && !('config' in props)) {
    			console_1.warn("<App> was created without expected prop 'config'");
    		}

    		if (/*spotifyHost*/ ctx[11] === undefined && !('spotifyHost' in props)) {
    			console_1.warn("<App> was created without expected prop 'spotifyHost'");
    		}
    	}

    	get config() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set config(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spotifyHost() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spotifyHost(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const fs = window.require('fs');
    window.require('dotenv').config();

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
    	props: {
    		config: window.require(process.cwd() + '\\src\\config.json'),
    		spotifyHost: process.env.SPOTIFY_HOST
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
