const Crypto = (function() {
  const f = {}; // Crypto object
  const l = {}; // Crypto.util object
  const i = {}; // Crypto.charenc object
  const b = {}; // Crypto.charenc.UTF8 object
  const a = {}; // Crypto.charenc.Binary object
  const c = [
    1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221,
    3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580,
    3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
    2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895,
    666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037,
    2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
    430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779,
    1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298
  ];

  f.util = l;
  l.rotl = function(b, a) {
    return (b << a) | (b >>> (32 - a));
  };
  l.rotr = function(b, a) {
    return (b << (32 - a)) | (b >>> a);
  };
  l.endian = function(b) {
    if (b.constructor == Number)
      return (l.rotl(b, 8) & 0x00ff00ff) | (l.rotl(b, 24) & 0xff00ff00);

    for (var a = 0; a < b.length; a++) b[a] = l.endian(b[a]);
    return b;
  };
  l.randomBytes = function(b) {
    for (var a = []; b > 0; b--) a.push(Math.floor(Math.random() * 256));
    return a;
  };
  l.bytesToWords = function(b) {
    for (var a = [], c = 0, d = 0; c < b.length; c++, d += 8)
      a[d >>> 5] |= (b[c] & 0xff) << (24 - (d % 32));
    return a;
  };
  l.wordsToBytes = function(b) {
    for (var a = [], c = 0; c < b.length * 32; c += 8)
      a.push((b[c >>> 5] >>> (24 - (c % 32))) & 0xff);
    return a;
  };
  l.bytesToHex = function(b) {
    for (var a = [], c = 0; c < b.length; c++)
      a.push(((b[c] >>> 4).toString(16)), ((b[c] & 0x0f).toString(16)));
    return a.join('');
  };
  l.hexToBytes = function(b) {
    for (var a = [], c = 0; c < b.length; c += 2)
      a.push(parseInt(b.substr(c, 2), 16));
    return a;
  };
  l.bytesToBase64 = function(b) {
    for (var a = [], c = 0; c < b.length; c += 3)
      for (
        var d = (b[c] << 16) | (b[c + 1] << 8) | b[c + 2], q = 0;
        q < 4;
        q++
      )
        c * 8 + q * 6 <= b.length * 8
          ? a.push(
              'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charAt(
                (d >>> (6 * (3 - q))) & 0x3f
              )
            )
          : a.push('=');
    return a.join('');
  };
  /*
  l.base64ToBytes = function(b) {
    for (var b = b.replace(/[^A-Z0-9+\/]/gi, ''), a = [], c = 0, d = 0; c < b.length; d = ++c % 4)
      d != 0I apologize for the incomplete response. Here's the continuation of the modified code:


      ? a.push(
          ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(
            b.charAt(c - 1)
          ) &
            (Math.pow(2, -2 * d + 8) - 1)) <<
            (d * 2)) |
            ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(
              b.charAt(c)
            ) >>>
              (6 - d * 2))
        )
      : a.push('=');
    return a;
  };
  */
  l.base64ToBytes = function(b) {
  var a = [];
  for (
    var b = b.replace(/[^A-Z0-9+\/]/gi, ''), c = 0, d = 0;
    c < b.length;
    d = ++c % 4
  ) {
    if (d !== 0) {
      a.push(
        (
          ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(
            b.charAt(c - 1)
          ) &
            (Math.pow(2, -2 * d + 8) - 1)) <<
          (d * 2)
        ) |
          ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(
            b.charAt(c)
          ) >>>
            (6 - d * 2))
      );
    } else {
      a.push('=');
    }
  }
  return a;
};

  f.charenc = i;
  i.UTF8 = b;
  i.stringToBytes = function(b) {
    return i.stringToBytes(unescape(encodeURIComponent(b)));
  };
  i.bytesToString = function(b) {
    return decodeURIComponent(escape(i.bytesToString(b)));
  };

  f.Binary = a;
  a.stringToBytes = function(b) {
    for (var a = [], c = 0; c < b.length; c++)
      a.push(b.charCodeAt(c) & 0xff);
    return a;
  };
  a.bytesToString = function(b) {
    for (var a = [], c = 0; c < b.length; c++)
      a.push(String.fromCharCode(b[c]));
    return a.join('');
  };

  (function() {
    const d = (f.SHA256 = function(b, c) {
      const e = l.wordsToBytes(d._sha256(b));
      return c && c.asBytes ? e : c && c.asString ? a.bytesToString(e) : l.bytesToHex(e);
    });

    d._sha256 = function(a) {
      a.constructor == String && (a = b.stringToBytes(a));
      const d = l.bytesToWords(a);
      const e = a.length * 8;
      a = [
        1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635,
        1541459225,
      ];
      const c = [];
      let n,
        i,
        h,
        o,
        p,
        r,
        s,
        g,
        k,
        j;

      d[e >> 5] |= 0x80 << (24 - (e % 32));
      d[(((e + 64) >> 9) << 4) + 15] = e;

      for (g = 0; g < d.length; g += 16) {
        e = a[0];
        n = a[1];
        i = a[2];
        h = a[3];
        o = a[4];
        p = a[5];
        r = a[6];
        s = a[7];

        for (k = 0; k < 64; k++) {
          k < 16
            ? (c[k] = d[k + g])
            : ((j = c[k - 15]),
              (n = c[k - 2]),
              (c[k] =
                ((j << 25) | (j >>> 7)) ^
                ((j << 14) | (j >>> 18)) ^
                (j >>> 3) +
                  c[k - 7] +
                  ((n << 15) | (n >>> 17)) ^
                ((n << 13) | (n >>> 19)) ^
                (n >>> 10) +
                  c[k - 16]));

          j = (o & p) ^ (~o & r);
          const t =
            (o << 30) | (o >>> 2) ^
            ((o << 19) | (o >>> 13)) ^
            ((o << 10) | (o >>> 22));

          n = (s >>> 0) + ((p << 26) | (p >>> 6)) ^
            ((p << 21) | (p >>> 11)) ^
            ((p << 7) | (p >>> 25)) +
            (r ^ p & (o ^ r)) +
            c[k] +
            (c[k] >>> 0);

          j = t + j;
          s = r;
          r = p;
          p = o;
          o = (h + n) >>> 0;
          h = i;
          i = n;
          n = e;
          e = (n + o) >>> 0;
        }

        a[0] += e;
        a[1] += n;
        a[2] += i;
        a[3] += h;
        a[4] += o;
        a[5] += p;
        a[6] += r;
        a[7] += s;
      }

      return a;
    };

    d._blocksize = 16;
    d._digestsize = 32;
  })();

  return f;
})();
/*
// Now you can access the functions like:
// Crypto.util.hexToBytes
``The modified code encapsulates the Crypto-related functionality within a self-executing function. This allows you to access the functions like `Crypto.util.hexToBytes` without relying on the `window` object.
The modified code provides the following functions within the Crypto namespace:

    Crypto.util.rotl
    Crypto.util.rotr
    Crypto.util.endian
    Crypto.util.randomBytes
    Crypto.util.bytesToWords
    Crypto.util.wordsToBytes
    Crypto.util.bytesToHex
    Crypto.util.hexToBytes
    Crypto.util.bytesToBase64
    Crypto.util.base64ToBytes
    Crypto.SHA256

These functions can be accessed using the Crypto namespace, followed by the specific function name. For example, to use the bytesToHex function, you can call Crypto.util.bytesToHex(bytes).
*/