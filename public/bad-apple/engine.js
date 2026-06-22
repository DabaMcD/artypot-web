/* bad-apple engine v2 — the video plays ON a true monospace grid of the site's
   own text: each character brightens/dims by the silhouette's coverage at its
   cell, so individual glyphs appear and disappear to draw the dancing figure.
   The text is a real column-aligned block that scrolls smoothly; the figure is
   drawn from the SAME characters (no separate mask shape, no marketing text).

   Exposes window.BadApple.create(container, opts) -> controller.
   opts: { loop:bool=true, autostart:bool=false, onEnd:fn, debug:bool }
   Used by both the standalone /bad-apple route and the in-app takeover overlay. */
(function () {
  'use strict';

  var CFG = {
    fps: 30,
    duration: 219.08,
    // de-marketed palette: the figure drifts through these with the music; no
    // labels, no lifecycle, no copy. Just colour breathing through the shadow.
    palette: [[255, 217, 102], [71, 223, 211], [77, 106, 202], [111, 214, 166]],
    // energy peaks in this master (from its loudness envelope) — colour blooms.
    blooms: [13, 37, 49, 63, 85, 103, 124, 143, 159, 170, 185, 194, 206],
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function create(container, opts) {
    opts = opts || {};
    var MW = 160, MH = 120, MFS = MW * MH;
    var loop = opts.loop !== false;
    var debug = !!opts.debug;

    // ── canvas ──────────────────────────────────────────────────────────
    var cv = document.createElement('canvas');
    cv.style.display = 'block'; cv.style.width = '100%'; cv.style.height = '100%';
    container.appendChild(cv);
    var ctx = cv.getContext('2d', { alpha: true });

    // offscreens
    var textCv = document.createElement('canvas'), tctx = textCv.getContext('2d');
    var figCv = document.createElement('canvas'), fctx = figCv.getContext('2d');
    var maskScrCv = document.createElement('canvas'), msctx; // per-cell coverage, screen-space
    var maskImg;                                             // decoded 1-bit figure mask (reused)
    var maskBits = new Uint8Array(MFS);                     // 1 = figure ("ink")

    // ── data ────────────────────────────────────────────────────────────
    var frames = null, nframes = 0, corpus = null, model = null; // model: array of equal-length strings
    var ready = false, gotF = false, gotC = false;

    // ── geometry ────────────────────────────────────────────────────────
    var DW = 0, DH = 0, dpr = 1, cellW = 10, cellH = 18, cols = 0, rows = 0, blockRows = 0;
    var figX0 = 0, figY0 = 0, figW = 0, figH = 0;
    var colMaskX = null; // per-col [mx0,mx1] into mask space (figure band)

    // ── playback state ──────────────────────────────────────────────────
    var started = false, paused = false, destroyed = false, ended = false;
    var raf = 0, scroll = 0, lastFi = -1;
    var clock = { t: 0, base: 0, playing: false }; // wall-clock fallback if audio stalls

    var audio = new Audio('/bad-apple/audio.mp3');
    audio.loop = loop; audio.preload = 'auto';
    var audioCtx = null, analyser = null, freqData = null, rms = 0;

    // ── layout ──────────────────────────────────────────────────────────
    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var cw = container.clientWidth || window.innerWidth;
      var ch = container.clientHeight || window.innerHeight;
      DW = Math.round(cw * dpr); DH = Math.round(ch * dpr);
      cv.width = DW; cv.height = DH;
      figCv.width = DW; figCv.height = DH;

      // cell sizing from height → ~52 rows of readable text
      var fs = Math.max(13 * dpr, Math.round(DH / 52));
      tctx.font = '500 ' + fs + 'px "DM Mono", ui-monospace, Menlo, monospace';
      cellW = Math.max(6, Math.ceil(tctx.measureText('M').width));
      cellH = Math.round(fs * 1.18);
      cols = Math.floor(DW / cellW);
      rows = Math.ceil(DH / cellH) + 1;

      // figure = a centred 4:3 letterbox, mapped onto the grid
      figH = Math.min(DH, DW * 3 / 4);
      figW = figH * 4 / 3;
      figX0 = (DW - figW) / 2; figY0 = (DH - figH) / 2;
      colMaskX = new Int16Array(cols * 2);
      for (var c = 0; c < cols; c++) {
        var x0 = c * cellW, x1 = x0 + cellW;
        var u0 = (x0 - figX0) / figW, u1 = (x1 - figX0) / figW;
        var mx0 = Math.floor(u0 * MW), mx1 = Math.ceil(u1 * MW);
        if (mx0 < 0) mx0 = 0; if (mx1 > MW) mx1 = MW; if (mx1 <= mx0) mx1 = mx0 + 1;
        colMaskX[c * 2] = mx0; colMaskX[c * 2 + 1] = mx1;
      }

      maskScrCv.width = cols; maskScrCv.height = rows + 2;
      msctx = maskScrCv.getContext('2d');
      maskImg = (function () { var c2 = document.createElement('canvas'); c2.width = MW; c2.height = MH; return c2.getContext('2d').createImageData(MW, MH); })();

      buildModel();
      lastFi = -1;
    }

    // ── the text block: a true column-aligned monospace grid, tall enough to
    //    cover the whole song with no wrap (rendered once, scrolled smoothly) ──
    function buildModel() {
      if (!corpus) return;
      // flatten + clean corpus to a single token stream (all 4 locales mixed)
      var toks = [];
      var locs = corpus.locales ? Object.keys(corpus.locales) : [];
      for (var i = 0; i < locs.length; i++) {
        var arr = corpus.locales[locs[i]] || [];
        for (var j = 0; j < arr.length; j++) {
          var s = (arr[j] || '').replace(/\s+/g, ' ').trim();
          if (s) toks.push(s);
        }
      }
      if (!toks.length) toks = ['artypot', 'bad apple', 'shadow', 'no cap'];
      shuffle(toks);

      // Split into grapheme clusters so an emoji (surrogate pair / ZWJ / VS16
      // sequence) occupies exactly ONE monospace cell and is never sliced in
      // half at a column boundary.
      var seg = (typeof Intl !== 'undefined' && Intl.Segmenter)
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
      function graphemes(str) {
        if (!seg) return Array.from(str);
        var o = []; for (var part of seg.segment(str)) o.push(part.segment); return o;
      }

      // lay tokens into a flat grapheme stream, then cut into rows of `cols`.
      // Phrase separator: ' œ ' — a single tight glyph. (œ is U+0153 = 339,
      // a quiet nod to the song's 3:39 runtime / the $3.39 backing trigger.)
      var needRows = rows + Math.ceil(CFG.duration * 60 * (0.5 * dpr) / cellH) + 8;
      blockRows = needRows;
      var stream = [], ti = 0, want = blockRows * cols;
      while (stream.length < want) {
        var g = graphemes(toks[ti++ % toks.length] + '  œ  ');
        for (var k = 0; k < g.length; k++) stream.push(g[k]);
      }
      model = new Array(blockRows);
      for (var r = 0; r < blockRows; r++) model[r] = stream.slice(r * cols, r * cols + cols);

      // render the block to textCv (bright white), once
      textCv.width = cols * cellW;
      textCv.height = blockRows * cellH;
      tctx.font = '500 ' + Math.max(13 * dpr, Math.round(DH / 52)) + 'px "DM Mono", ui-monospace, Menlo, monospace';
      tctx.textBaseline = 'top';
      tctx.fillStyle = '#ffffff';
      tctx.clearRect(0, 0, textCv.width, textCv.height);
      for (var rr = 0; rr < blockRows; rr++) {
        // draw cell-by-cell for exact column alignment; maxWidth=cellW squeezes
        // any wide glyph (emoji) into its single cell so the grid never drifts.
        var line = model[rr], y = rr * cellH;
        for (var cc = 0; cc < cols; cc++) {
          var chr = line[cc];
          if (chr && chr !== ' ') tctx.fillText(chr, cc * cellW, y, cellW);
        }
      }
    }

    // ── decode one RLE frame -> maskBits (1 = LIT character) ─────────────
    // Fixed polarity, true to the source: LIGHT (white) pixels become lit
    // characters, DARK (black) pixels stay the dim page. We do NOT auto-flip to
    // keep the bright region in the minority — the original's own black/white
    // inversions show through exactly as animated (figure is sometimes the lit
    // words, sometimes the dark shadow), instead of switching every frame.
    function decode(fi) {
      var runs = frames[fi]; if (!runs) return;
      // runs alternate starting with DARK (c=0), then LIGHT (c=1), ...
      var pos = 0, c = 0, len, k;
      for (var r = 0; r < runs.length; r++) {
        len = runs[r];
        for (k = 0; k < len; k++) maskBits[pos + k] = c; // c: 0 dark, 1 light
        pos += len; c ^= 1;
      }
    }

    // ── per-frame: build the screen-space per-cell coverage mask ─────────
    // Aligned to the SAME sub-cell offset as the scrolled text, so glyphs stay
    // whole while scrolling and brighten/dim as a unit (per-character reveal).
    function buildMaskScreen() {
      var sub = scroll % cellH;            // sub-cell scroll offset (px)
      var d = maskScrCv.width, h = maskScrCv.height;
      var img = msctx.createImageData(d, h);
      var data = img.data;
      for (var j = 0; j < h; j++) {
        // screen-centre y of this text row
        var cy = j * cellH - sub + cellH * 0.5;
        var v = (cy - figY0) / figH;
        var inBandY = v >= 0 && v < 1;
        var my0 = 0, my1 = 1;
        if (inBandY) { my0 = Math.floor(v * MH); my1 = my0 + Math.max(1, Math.round(MH / rows)); if (my1 > MH) my1 = MH; }
        for (var c = 0; c < d; c++) {
          var cov = 0;
          if (inBandY) {
            var mx0 = colMaskX[c * 2], mx1 = colMaskX[c * 2 + 1];
            if (mx1 > mx0 && figX0 <= c * cellW + cellW && (c * cellW) <= figX0 + figW) {
              var sum = 0, n = 0;
              for (var my = my0; my < my1; my++) { var rowoff = my * MW; for (var mx = mx0; mx < mx1; mx++) { sum += maskBits[rowoff + mx]; n++; } }
              cov = n ? sum / n : 0;
            }
          }
          // contrast curve so characters pop; floor 0 => pure substrate
          var av = Math.pow(cov, 0.75) * 255; if (av > 255) av = 255;
          data[(j * d + c) * 4 + 3] = av; // alpha only; rgb irrelevant for destination-in
        }
      }
      msctx.putImageData(img, 0, 0);
    }

    // ── colour: drift through the palette + bloom on energy peaks ────────
    function figColor(t) {
      var p = CFG.palette, seg = t / CFG.duration * (p.length); // wrap through palette over the song
      var i = Math.floor(seg) % p.length, n = (i + 1) % p.length, f = seg - Math.floor(seg);
      return [Math.round(lerp(p[i][0], p[n][0], f)), Math.round(lerp(p[i][1], p[n][1], f)), Math.round(lerp(p[i][2], p[n][2], f))];
    }
    function bloomK(t) {
      var k = 0.04;
      for (var i = 0; i < CFG.blooms.length; i++) { var tb = CFG.blooms[i]; if (t >= tb) k += 0.7 * Math.exp(-(t - tb) / 1.3); }
      if (t > 211) k *= Math.max(0, 1 - (t - 211) / 7);
      return Math.min(0.85, k + rms * 0.12);
    }

    // ── main loop ───────────────────────────────────────────────────────
    function frame() {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      if (!started || !ready) return;

      var t = audio.currentTime;
      // outro cue: in takeover (non-loop) mode begin the exit during the song's
      // final decay, so the block leaves "as the music ends", not after silence.
      if (!loop && !ended && t >= CFG.duration - 3.4) onEnded();
      var fi = Math.floor(t * CFG.fps); if (fi >= nframes) fi = nframes - 1; if (fi < 0) fi = 0;
      if (fi !== lastFi) { decode(fi); lastFi = fi; }

      if (!paused) scroll += 0.5 * dpr;
      if (analyser) { analyser.getByteFrequencyData(freqData); var s = 0; for (var i = 0; i < freqData.length; i++) s += freqData[i]; rms = (s / freqData.length) / 255; }

      buildMaskScreen();
      var col = figColor(t), k = bloomK(t);
      var sub = scroll % cellH;

      // 1) dim substrate: the readable scrolling monospace block
      ctx.clearRect(0, 0, DW, DH);
      ctx.globalAlpha = 0.085;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(textCv, 0, scroll, DW, DH, 0, 0, DW, DH);
      ctx.globalAlpha = 1;

      // 2) the figure: bright text revealed per-character by the coverage mask
      fctx.globalCompositeOperation = 'source-over';
      fctx.clearRect(0, 0, DW, DH);
      fctx.imageSmoothingEnabled = true;
      fctx.drawImage(textCv, 0, scroll, DW, DH, 0, 0, DW, DH);       // bright text window
      fctx.globalCompositeOperation = 'destination-in';
      fctx.imageSmoothingEnabled = false;                            // crisp per-cell blocks
      fctx.drawImage(maskScrCv, 0, 0, cols, rows + 2, 0, -sub, cols * cellW, (rows + 2) * cellH);
      fctx.globalCompositeOperation = 'source-atop';                 // colour wash
      fctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + k + ')';
      fctx.fillRect(0, 0, DW, DH);
      fctx.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.shadowColor = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.5)';
      ctx.shadowBlur = 6 * dpr;
      ctx.drawImage(figCv, 0, 0);
      ctx.restore();

      if (scroll > (blockRows - rows - 4) * cellH) scroll = 0; // rare wrap (block usually outlasts the song)

      if (debug && dbg) dbg.textContent = 'fps~' + Math.round(1000 / 16) + ' t ' + t.toFixed(1) + '/' + CFG.duration + '  fi ' + fi + '  cols ' + cols + ' rows ' + rows + '  k ' + k.toFixed(2) + '  rms ' + rms.toFixed(2);
    }

    // ── audio analyser (bounded use) ────────────────────────────────────
    function setupAnalyser() {
      if (audioCtx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        audioCtx = new AC();
        var src = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser(); analyser.fftSize = 256;
        freqData = new Uint8Array(analyser.frequencyBinCount);
        src.connect(analyser); analyser.connect(audioCtx.destination);
      } catch (e) { analyser = null; }
    }

    function onEnded() { ended = true; if (opts.onEnd) try { opts.onEnd(); } catch (e) {} }
    audio.addEventListener('ended', onEnded);

    // ── assets ──────────────────────────────────────────────────────────
    function load() {
      function done() { if (gotF && gotC) { ready = true; if (opts.onReady) try { opts.onReady(); } catch (e) {} if (opts.autostart) start(); } }
      fetch('/bad-apple/corpus.json').then(function (r) { return r.json(); }).then(function (j) { corpus = j; buildModel(); gotC = true; done(); }).catch(function () { corpus = { locales: {} }; buildModel(); gotC = true; done(); });
      fetch('/bad-apple/frames.json').then(function (r) { return r.json(); }).then(function (j) { frames = j.frames; nframes = j.nframes || frames.length; if (j.fps) CFG.fps = j.fps; gotF = true; done(); }).catch(function () { gotF = true; done(); });
    }

    // ── controller ──────────────────────────────────────────────────────
    function start() {
      if (started || !ready) return;
      started = true; ended = false;
      audio.muted = false;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {
        // autoplay-with-sound blocked (gesture lapsed during async backing) →
        // play MUTED so the video never freezes; surface a tap-for-sound affordance.
        audio.muted = true; var p2 = audio.play(); if (p2 && p2.catch) p2.catch(function () {});
        if (opts.onMuted) try { opts.onMuted(); } catch (e) {}
      });
      setupAnalyser(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }
    function unmute() { audio.muted = false; var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
    function stop() { paused = true; audio.pause(); }
    function resume() { paused = false; audio.play(); }
    function destroy() {
      destroyed = true; cancelAnimationFrame(raf);
      try { audio.pause(); audio.src = ''; } catch (e) {}
      try { if (audioCtx) audioCtx.close(); } catch (e) {}
      if (cv.parentNode) cv.parentNode.removeChild(cv);
      if (dbg && dbg.parentNode) dbg.parentNode.removeChild(dbg);
      window.removeEventListener('resize', onResize);
    }

    var rt = null;
    function onResize() { clearTimeout(rt); rt = setTimeout(layout, 150); }
    window.addEventListener('resize', onResize);

    var dbg = null;
    if (debug) { dbg = document.createElement('div'); dbg.style.cssText = 'position:fixed;top:8px;left:8px;z-index:60;font:11px "DM Mono",monospace;color:#6fd6a6;background:rgba(0,0,0,.6);padding:6px 9px;border:1px solid #332F2B;border-radius:5px;pointer-events:none'; document.body.appendChild(dbg); }

    layout();
    load();
    raf = requestAnimationFrame(frame);

    var controller = {
      start: start, stop: stop, resume: resume, destroy: destroy, unmute: unmute,
      get ready() { return ready; },
      get ended() { return ended; },
      get audio() { return audio; },
      seek: function (t) { try { audio.currentTime = t; } catch (e) {} },
      get state() { return { ready: ready, started: started, t: audio.currentTime, fi: lastFi, cols: cols, rows: rows, blockRows: blockRows }; },
    };
    if (debug) window.__BAE__ = controller;
    return controller;
  }

  window.BadApple = { create: create };
})();
