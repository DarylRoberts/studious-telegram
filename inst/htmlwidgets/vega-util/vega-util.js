(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.vega = {}));
}(this, (function (exports) { 'use strict';

  function accessor (fn, fields, name) {
    fn.fields = fields || [];
    fn.fname = name;
    return fn;
  }
  function accessorName(fn) {
    return fn == null ? null : fn.fname;
  }
  function accessorFields(fn) {
    return fn == null ? null : fn.fields;
  }

  function getter (path) {
    return path.length === 1 ? get1(path[0]) : getN(path);
  }

  const get1 = field => function (obj) {
    return obj[field];
  };

  const getN = path => {
    const len = path.length;
    return function (obj) {
      for (let i = 0; i < len; ++i) {
        obj = obj[path[i]];
      }

      return obj;
    };
  };

  function error (message) {
    throw Error(message);
  }

  function splitAccessPath (p) {
    const path = [],
          n = p.length;
    let q = null,
        b = 0,
        s = '',
        i,
        j,
        c;
    p = p + '';

    function push() {
      path.push(s + p.substring(i, j));
      s = '';
      i = j + 1;
    }

    for (i = j = 0; j < n; ++j) {
      c = p[j];

      if (c === '\\') {
        s += p.substring(i, j);
        s += p.substring(++j, ++j);
        i = j;
      } else if (c === q) {
        push();
        q = null;
        b = -1;
      } else if (q) {
        continue;
      } else if (i === b && c === '"') {
        i = j + 1;
        q = c;
      } else if (i === b && c === "'") {
        i = j + 1;
        q = c;
      } else if (c === '.' && !b) {
        if (j > i) {
          push();
        } else {
          i = j + 1;
        }
      } else if (c === '[') {
        if (j > i) push();
        b = i = j + 1;
      } else if (c === ']') {
        if (!b) error('Access path missing open bracket: ' + p);
        if (b > 0) push();
        b = 0;
        i = j + 1;
      }
    }

    if (b) error('Access path missing closing bracket: ' + p);
    if (q) error('Access path missing closing quote: ' + p);

    if (j > i) {
      j++;
      push();
    }

    return path;
  }

  function field (field, name, opt) {
    const path = splitAccessPath(field);
    field = path.length === 1 ? path[0] : field;
    return accessor((opt && opt.get || getter)(path), [field], name || field);
  }

  const id = field('id');
  const identity = accessor(_ => _, [], 'identity');
  const zero = accessor(() => 0, [], 'zero');
  const one = accessor(() => 1, [], 'one');
  const truthy = accessor(() => true, [], 'true');
  const falsy = accessor(() => false, [], 'false');

  function log$1(method, level, input) {
    const args = [level].concat([].slice.call(input));
    console[method].apply(console, args); // eslint-disable-line no-console
  }

  const None = 0;
  const Error$1 = 1;
  const Warn = 2;
  const Info = 3;
  const Debug = 4;
  function logger (_, method, handler = log$1) {
    let level = _ || None;
    return {
      level(_) {
        if (arguments.length) {
          level = +_;
          return this;
        } else {
          return level;
        }
      },

      error() {
        if (level >= Error$1) handler(method || 'error', 'ERROR', arguments);
        return this;
      },

      warn() {
        if (level >= Warn) handler(method || 'warn', 'WARN', arguments);
        return this;
      },

      info() {
        if (level >= Info) handler(method || 'log', 'INFO', arguments);
        return this;
      },

      debug() {
        if (level >= Debug) handler(method || 'log', 'DEBUG', arguments);
        return this;
      }

    };
  }

  var isArray = Array.isArray;

  function isObject (_) {
    return _ === Object(_);
  }

  const isLegalKey = key => key !== '__proto__';

  function mergeConfig(...configs) {
    return configs.reduce((out, source) => {
      for (const key in source) {
        if (key === 'signals') {
          // for signals, we merge the signals arrays
          // source signals take precedence over
          // existing signals with the same name
          out.signals = mergeNamed(out.signals, source.signals);
        } else {
          // otherwise, merge objects subject to recursion constraints
          // for legend block, recurse for the layout entry only
          // for style block, recurse for all properties
          // otherwise, no recursion: objects overwrite, no merging
          const r = key === 'legend' ? {
            layout: 1
          } : key === 'style' ? true : null;
          writeConfig(out, key, source[key], r);
        }
      }

      return out;
    }, {});
  }
  function writeConfig(output, key, value, recurse) {
    if (!isLegalKey(key)) return;
    let k, o;

    if (isObject(value) && !isArray(value)) {
      o = isObject(output[key]) ? output[key] : output[key] = {};

      for (k in value) {
        if (recurse && (recurse === true || recurse[k])) {
          writeConfig(o, k, value[k]);
        } else if (isLegalKey(k)) {
          o[k] = value[k];
        }
      }
    } else {
      output[key] = value;
    }
  }

  function mergeNamed(a, b) {
    if (a == null) return b;
    const map = {},
          out = [];

    function add(_) {
      if (!map[_.name]) {
        map[_.name] = 1;
        out.push(_);
      }
    }

    b.forEach(add);
    a.forEach(add);
    return out;
  }

  function peek (array) {
    return array[array.length - 1];
  }

  function toNumber (_) {
    return _ == null || _ === '' ? null : +_;
  }

  const exp = sign => x => sign * Math.exp(x);

  const log = sign => x => Math.log(sign * x);

  const symlog = c => x => Math.sign(x) * Math.log1p(Math.abs(x / c));

  const symexp = c => x => Math.sign(x) * Math.expm1(Math.abs(x)) * c;

  const pow = exponent => x => x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);

  function pan(domain, delta, lift, ground) {
    const d0 = lift(domain[0]),
          d1 = lift(peek(domain)),
          dd = (d1 - d0) * delta;
    return [ground(d0 - dd), ground(d1 - dd)];
  }

  function panLinear(domain, delta) {
    return pan(domain, delta, toNumber, identity);
  }
  function panLog(domain, delta) {
    var sign = Math.sign(domain[0]);
    return pan(domain, delta, log(sign), exp(sign));
  }
  function panPow(domain, delta, exponent) {
    return pan(domain, delta, pow(exponent), pow(1 / exponent));
  }
  function panSymlog(domain, delta, constant) {
    return pan(domain, delta, symlog(constant), symexp(constant));
  }

  function zoom(domain, anchor, scale, lift, ground) {
    const d0 = lift(domain[0]),
          d1 = lift(peek(domain)),
          da = anchor != null ? lift(anchor) : (d0 + d1) / 2;
    return [ground(da + (d0 - da) * scale), ground(da + (d1 - da) * scale)];
  }

  function zoomLinear(domain, anchor, scale) {
    return zoom(domain, anchor, scale, toNumber, identity);
  }
  function zoomLog(domain, anchor, scale) {
    const sign = Math.sign(domain[0]);
    return zoom(domain, anchor, scale, log(sign), exp(sign));
  }
  function zoomPow(domain, anchor, scale, exponent) {
    return zoom(domain, anchor, scale, pow(exponent), pow(1 / exponent));
  }
  function zoomSymlog(domain, anchor, scale, constant) {
    return zoom(domain, anchor, scale, symlog(constant), symexp(constant));
  }

  function quarter(date) {
    return 1 + ~~(new Date(date).getMonth() / 3);
  }
  function utcquarter(date) {
    return 1 + ~~(new Date(date).getUTCMonth() / 3);
  }

  function array (_) {
    return _ != null ? isArray(_) ? _ : [_] : [];
  }

  /**
   * Span-preserving range clamp. If the span of the input range is less
   * than (max - min) and an endpoint exceeds either the min or max value,
   * the range is translated such that the span is preserved and one
   * endpoint touches the boundary of the min/max range.
   * If the span exceeds (max - min), the range [min, max] is returned.
   */
  function clampRange (range, min, max) {
    let lo = range[0],
        hi = range[1],
        span;

    if (hi < lo) {
      span = hi;
      hi = lo;
      lo = span;
    }

    span = hi - lo;
    return span >= max - min ? [min, max] : [lo = Math.min(Math.max(lo, min), max - span), lo + span];
  }

  function isFunction (_) {
    return typeof _ === 'function';
  }

  const DESCENDING = 'descending';
  function compare (fields, orders, opt) {
    opt = opt || {};
    orders = array(orders) || [];
    const ord = [],
          get = [],
          fmap = {},
          gen = opt.comparator || comparator;
    array(fields).forEach((f, i) => {
      if (f == null) return;
      ord.push(orders[i] === DESCENDING ? -1 : 1);
      get.push(f = isFunction(f) ? f : field(f, null, opt));
      (accessorFields(f) || []).forEach(_ => fmap[_] = 1);
    });
    return get.length === 0 ? null : accessor(gen(get, ord), Object.keys(fmap));
  }
  const ascending = (u, v) => (u < v || u == null) && v != null ? -1 : (u > v || v == null) && u != null ? 1 : (v = v instanceof Date ? +v : v, u = u instanceof Date ? +u : u) !== u && v === v ? -1 : v !== v && u === u ? 1 : 0;

  const comparator = (fields, orders) => fields.length === 1 ? compare1(fields[0], orders[0]) : compareN(fields, orders, fields.length);

  const compare1 = (field, order) => function (a, b) {
    return ascending(field(a), field(b)) * order;
  };

  const compareN = (fields, orders, n) => {
    orders.push(0); // pad zero for convenient lookup

    return function (a, b) {
      let f,
          c = 0,
          i = -1;

      while (c === 0 && ++i < n) {
        f = fields[i];
        c = ascending(f(a), f(b));
      }

      return c * orders[i];
    };
  };

  function constant (_) {
    return isFunction(_) ? _ : () => _;
  }

  function debounce (delay, handler) {
    let tid;
    return e => {
      if (tid) clearTimeout(tid);
      tid = setTimeout(() => (handler(e), tid = null), delay);
    };
  }

  function extend (_) {
    for (let x, k, i = 1, len = arguments.length; i < len; ++i) {
      x = arguments[i];

      for (k in x) {
        _[k] = x[k];
      }
    }

    return _;
  }

  /**
   * Return an array with minimum and maximum values, in the
   * form [min, max]. Ignores null, undefined, and NaN values.
   */
  function extent (array, f) {
    let i = 0,
        n,
        v,
        min,
        max;

    if (array && (n = array.length)) {
      if (f == null) {
        // find first valid value
        for (v = array[i]; i < n && (v == null || v !== v); v = array[++i]);

        min = max = v; // visit all other values

        for (; i < n; ++i) {
          v = array[i]; // skip null/undefined; NaN will fail all comparisons

          if (v != null) {
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }
      } else {
        // find first valid value
        for (v = f(array[i]); i < n && (v == null || v !== v); v = f(array[++i]));

        min = max = v; // visit all other values

        for (; i < n; ++i) {
          v = f(array[i]); // skip null/undefined; NaN will fail all comparisons

          if (v != null) {
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }
      }
    }

    return [min, max];
  }

  function extentIndex (array, f) {
    const n = array.length;
    let i = -1,
        a,
        b,
        c,
        u,
        v;

    if (f == null) {
      while (++i < n) {
        b = array[i];

        if (b != null && b >= b) {
          a = c = b;
          break;
        }
      }

      if (i === n) return [-1, -1];
      u = v = i;

      while (++i < n) {
        b = array[i];

        if (b != null) {
          if (a > b) {
            a = b;
            u = i;
          }

          if (c < b) {
            c = b;
            v = i;
          }
        }
      }
    } else {
      while (++i < n) {
        b = f(array[i], i, array);

        if (b != null && b >= b) {
          a = c = b;
          break;
        }
      }

      if (i === n) return [-1, -1];
      u = v = i;

      while (++i < n) {
        b = f(array[i], i, array);

        if (b != null) {
          if (a > b) {
            a = b;
            u = i;
          }

          if (c < b) {
            c = b;
            v = i;
          }
        }
      }
    }

    return [u, v];
  }

  const hop = Object.prototype.hasOwnProperty;
  function has (object, property) {
    return hop.call(object, property);
  }

  const NULL = {};
  function fastmap (input) {
    let obj = {},
        test;

    function has$1(key) {
      return has(obj, key) && obj[key] !== NULL;
    }

    const map = {
      size: 0,
      empty: 0,
      object: obj,
      has: has$1,

      get(key) {
        return has$1(key) ? obj[key] : undefined;
      },

      set(key, value) {
        if (!has$1(key)) {
          ++map.size;
          if (obj[key] === NULL) --map.empty;
        }

        obj[key] = value;
        return this;
      },

      delete(key) {
        if (has$1(key)) {
          --map.size;
          ++map.empty;
          obj[key] = NULL;
        }

        return this;
      },

      clear() {
        map.size = map.empty = 0;
        map.object = obj = {};
      },

      test(_) {
        if (arguments.length) {
          test = _;
          return map;
        } else {
          return test;
        }
      },

      clean() {
        const next = {};
        let size = 0;

        for (const key in obj) {
          const value = obj[key];

          if (value !== NULL && (!test || !test(value))) {
            next[key] = value;
            ++size;
          }
        }

        map.size = size;
        map.empty = 0;
        map.object = obj = next;
      }

    };
    if (input) Object.keys(input).forEach(key => {
      map.set(key, input[key]);
    });
    return map;
  }

  function flush (range, value, threshold, left, right, center) {
    if (!threshold && threshold !== 0) return center;
    const t = +threshold;
    let a = range[0],
        b = peek(range),
        l; // swap endpoints if range is reversed

    if (b < a) {
      l = a;
      a = b;
      b = l;
    } // compare value to endpoints


    l = Math.abs(value - a);
    const r = Math.abs(b - value); // adjust if value is within threshold distance of endpoint

    return l < r && l <= t ? left : r <= t ? right : center;
  }

  function inherits (child, parent, members) {
    const proto = child.prototype = Object.create(parent.prototype);
    Object.defineProperty(proto, 'constructor', {
      value: child,
      writable: true,
      enumerable: true,
      configurable: true
    });
    return extend(proto, members);
  }

  /**
   * Predicate that returns true if the value lies within the span
   * of the given range. The left and right flags control the use
   * of inclusive (true) or exclusive (false) comparisons.
   */
  function inrange (value, range, left, right) {
    let r0 = range[0],
        r1 = range[range.length - 1],
        t;

    if (r0 > r1) {
      t = r0;
      r0 = r1;
      r1 = t;
    }

    left = left === undefined || left;
    right = right === undefined || right;
    return (left ? r0 <= value : r0 < value) && (right ? value <= r1 : value < r1);
  }

  function isBoolean (_) {
    return typeof _ === 'boolean';
  }

  function isDate (_) {
    return Object.prototype.toString.call(_) === '[object Date]';
  }

  function isIterable (_) {
    return _ && isFunction(_[Symbol.iterator]);
  }

  function isNumber (_) {
    return typeof _ === 'number';
  }

  function isRegExp (_) {
    return Object.prototype.toString.call(_) === '[object RegExp]';
  }

  function isString (_) {
    return typeof _ === 'string';
  }

  function key (fields, flat, opt) {
    if (fields) {
      fields = flat ? array(fields).map(f => f.replace(/\\(.)/g, '$1')) : array(fields);
    }

    const len = fields && fields.length,
          gen = opt && opt.get || getter,
          map = f => gen(flat ? [f] : splitAccessPath(f));

    let fn;

    if (!len) {
      fn = function () {
        return '';
      };
    } else if (len === 1) {
      const get = map(fields[0]);

      fn = function (_) {
        return '' + get(_);
      };
    } else {
      const get = fields.map(map);

      fn = function (_) {
        let s = '' + get[0](_),
            i = 0;

        while (++i < len) s += '|' + get[i](_);

        return s;
      };
    }

    return accessor(fn, fields, 'key');
  }

  function lerp (array, frac) {
    const lo = array[0],
          hi = peek(array),
          f = +frac;
    return !f ? lo : f === 1 ? hi : lo + f * (hi - lo);
  }

  const DEFAULT_MAX_SIZE = 10000; // adapted from https://github.com/dominictarr/hashlru/ (MIT License)

  function lruCache (maxsize) {
    maxsize = +maxsize || DEFAULT_MAX_SIZE;
    let curr, prev, size;

    const clear = () => {
      curr = {};
      prev = {};
      size = 0;
    };

    const update = (key, value) => {
      if (++size > maxsize) {
        prev = curr;
        curr = {};
        size = 1;
      }

      return curr[key] = value;
    };

    clear();
    return {
      clear,
      has: key => has(curr, key) || has(prev, key),
      get: key => has(curr, key) ? curr[key] : has(prev, key) ? update(key, prev[key]) : undefined,
      set: (key, value) => has(curr, key) ? curr[key] = value : update(key, value)
    };
  }

  function merge (compare, array0, array1, output) {
    const n0 = array0.length,
          n1 = array1.length;
    if (!n1) return array0;
    if (!n0) return array1;
    const merged = output || new array0.constructor(n0 + n1);
    let i0 = 0,
        i1 = 0,
        i = 0;

    for (; i0 < n0 && i1 < n1; ++i) {
      merged[i] = compare(array0[i0], array1[i1]) > 0 ? array1[i1++] : array0[i0++];
    }

    for (; i0 < n0; ++i0, ++i) {
      merged[i] = array0[i0];
    }

    for (; i1 < n1; ++i1, ++i) {
      merged[i] = array1[i1];
    }

    return merged;
  }

  function repeat (str, reps) {
    let s = '';

    while (--reps >= 0) s += str;

    return s;
  }

  function pad (str, length, padchar, align) {
    const c = padchar || ' ',
          s = str + '',
          n = length - s.length;
    return n <= 0 ? s : align === 'left' ? repeat(c, n) + s : align === 'center' ? repeat(c, ~~(n / 2)) + s + repeat(c, Math.ceil(n / 2)) : s + repeat(c, n);
  }

  /**
   * Return the numerical span of an array: the difference between
   * the last and first values.
   */

  function span (array) {
    return array && peek(array) - array[0] || 0;
  }

  function $(x) {
    return isArray(x) ? '[' + x.map($) + ']' : isObject(x) || isString(x) ? // Output valid JSON and JS source strings.
    // See http://timelessrepo.com/json-isnt-a-javascript-subset
    JSON.stringify(x).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029') : x;
  }

  function toBoolean (_) {
    return _ == null || _ === '' ? null : !_ || _ === 'false' || _ === '0' ? false : !!_;
  }

  const defaultParser = _ => isNumber(_) ? _ : isDate(_) ? _ : Date.parse(_);

  function toDate (_, parser) {
    parser = parser || defaultParser;
    return _ == null || _ === '' ? null : parser(_);
  }

  function toString (_) {
    return _ == null || _ === '' ? null : _ + '';
  }

  function toSet (_) {
    const s = {},
          n = _.length;

    for (let i = 0; i < n; ++i) s[_[i]] = true;

    return s;
  }

  function truncate (str, length, align, ellipsis) {
    const e = ellipsis != null ? ellipsis : '\u2026',
          s = str + '',
          n = s.length,
          l = Math.max(0, length - e.length);
    return n <= length ? s : align === 'left' ? e + s.slice(n - l) : align === 'center' ? s.slice(0, Math.ceil(l / 2)) + e + s.slice(n - ~~(l / 2)) : s.slice(0, l) + e;
  }

  function visitArray (array, filter, visitor) {
    if (array) {
      if (filter) {
        const n = array.length;

        for (let i = 0; i < n; ++i) {
          const t = filter(array[i]);
          if (t) visitor(t, i, array);
        }
      } else {
        array.forEach(visitor);
      }
    }
  }

  exports.Debug = Debug;
  exports.Error = Error$1;
  exports.Info = Info;
  exports.None = None;
  exports.Warn = Warn;
  exports.accessor = accessor;
  exports.accessorFields = accessorFields;
  exports.accessorName = accessorName;
  exports.array = array;
  exports.ascending = ascending;
  exports.clampRange = clampRange;
  exports.compare = compare;
  exports.constant = constant;
  exports.debounce = debounce;
  exports.error = error;
  exports.extend = extend;
  exports.extent = extent;
  exports.extentIndex = extentIndex;
  exports.falsy = falsy;
  exports.fastmap = fastmap;
  exports.field = field;
  exports.flush = flush;
  exports.hasOwnProperty = has;
  exports.id = id;
  exports.identity = identity;
  exports.inherits = inherits;
  exports.inrange = inrange;
  exports.isArray = isArray;
  exports.isBoolean = isBoolean;
  exports.isDate = isDate;
  exports.isFunction = isFunction;
  exports.isIterable = isIterable;
  exports.isNumber = isNumber;
  exports.isObject = isObject;
  exports.isRegExp = isRegExp;
  exports.isString = isString;
  exports.key = key;
  exports.lerp = lerp;
  exports.logger = logger;
  exports.lruCache = lruCache;
  exports.merge = merge;
  exports.mergeConfig = mergeConfig;
  exports.one = one;
  exports.pad = pad;
  exports.panLinear = panLinear;
  exports.panLog = panLog;
  exports.panPow = panPow;
  exports.panSymlog = panSymlog;
  exports.peek = peek;
  exports.quarter = quarter;
  exports.repeat = repeat;
  exports.span = span;
  exports.splitAccessPath = splitAccessPath;
  exports.stringValue = $;
  exports.toBoolean = toBoolean;
  exports.toDate = toDate;
  exports.toNumber = toNumber;
  exports.toSet = toSet;
  exports.toString = toString;
  exports.truncate = truncate;
  exports.truthy = truthy;
  exports.utcquarter = utcquarter;
  exports.visitArray = visitArray;
  exports.writeConfig = writeConfig;
  exports.zero = zero;
  exports.zoomLinear = zoomLinear;
  exports.zoomLog = zoomLog;
  exports.zoomPow = zoomPow;
  exports.zoomSymlog = zoomSymlog;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
