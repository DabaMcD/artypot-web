// ─────────────────────────────────────────────────────────────────────────────
// /bad-apple — the standalone dev/preview harness for the easter egg.
//
// The real Bad Apple!! shadow-art video plays rendered ON a true monospace grid
// of the site's own words: each character brightens/dims by the silhouette's
// coverage, so individual glyphs appear and disappear to draw the dancing
// figure. No marketing, no message — the site's text is purely the medium.
//
// The render engine lives in /public/bad-apple/engine.js and is shared with the
// in-app takeover overlay (which is the primary way to find this: backing a
// certain bounty triggers a full-site takeover). This route keeps the
// bounty-card gate so the page is playable directly (audio needs a gesture).
//
// Delivery mirrors the /marriage-autonomy-spectrum precedent: a (raw) GET route
// returning one self-contained HTML document. Excluded from src/proxy.ts.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>bad apple!! · artypot</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Kalam:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0F0E0D; --surface:#171614; --border:#332F2B; --fg:#F2EFE6; --muted:#BFB0A9;
    --fan:#ffd966; --creator:#47DFD3;
    --mono:'DM Mono',ui-monospace,Menlo,monospace; --disp:'Kalam',cursive; --sans:'DM Sans',system-ui,sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{background:var(--bg); color:var(--fg); font-family:var(--sans); overflow:hidden; position:fixed; inset:0;
    background-image:radial-gradient(circle at 50% 50%, rgba(255,255,255,.02), transparent 60%);}
  #stage{position:fixed; inset:0; z-index:1;}
  /* gate: an Artypot backing card */
  #gate{position:fixed; inset:0; z-index:20; display:flex; align-items:center; justify-content:center;
    background:radial-gradient(circle at 50% 40%, transparent, rgba(0,0,0,.45)); transition:opacity .6s ease; padding:20px;}
  #gate.gone{opacity:0; pointer-events:none;}
  .card{position:relative; width:min(440px,92vw); background:var(--surface); border:1px solid var(--border);
    border-radius:12px; box-shadow:3px 3px 0 #000; padding:26px; overflow:hidden;}
  .card::before{content:""; position:absolute; top:0; left:0; right:0; height:2px; background:var(--fan);}
  .kick{font-family:var(--mono); font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--muted);}
  .card h1{font-family:var(--disp); text-transform:lowercase; font-weight:700; font-size:30px; line-height:1.08; margin:8px 0 12px;}
  .row{display:flex; align-items:baseline; justify-content:space-between; margin-bottom:14px;}
  .handle{font-family:var(--mono); font-size:13px; color:var(--creator);}
  .amt{font-family:var(--mono); font-size:22px; color:var(--fan); font-weight:500;}
  .fine{font-size:12px; line-height:1.5; color:var(--muted); margin-bottom:18px;}
  .lock{width:100%; font-family:var(--sans); font-weight:700; font-size:16px; background:var(--fan); color:var(--bg);
    border:1px solid var(--fan); border-radius:8px; padding:12px; cursor:pointer; box-shadow:3px 3px 0 #000; transition:filter .15s;}
  .lock:hover{filter:brightness(1.08);} .lock:active{transform:translate(1px,1px); box-shadow:2px 2px 0 #000;}
  .lock:disabled{opacity:.6; cursor:default;}
  .hint{text-align:center; font-family:var(--mono); font-size:11px; color:var(--muted); opacity:.6; margin-top:12px; letter-spacing:.5px;}
</style>
</head>
<body>
  <div id="stage"></div>
  <div id="gate">
    <div class="card">
      <div class="kick">bounty #0000</div>
      <h1>render bad apple in shadows</h1>
      <div class="row"><span class="handle">@nomico</span><span class="amt">$3.39</span></div>
      <p class="fine">Free to cancel anytime before the bounty completes. Once completed, your backing is locked, charged on the next billing day, and final.</p>
      <button class="lock" id="lockBtn" disabled>loading…</button>
      <div class="hint">click to back the bounty · plays with sound</div>
    </div>
  </div>
  <script src="/bad-apple/engine.js"></script>
  <script>
    (function(){
      var debug = false; try { debug = new URLSearchParams(location.search).has('debug'); } catch(e){}
      var stage = document.getElementById('stage');
      var gate = document.getElementById('gate');
      var btn = document.getElementById('lockBtn');
      var ctrl = window.BadApple.create(stage, {
        loop: true, debug: debug,
        onReady: function(){ btn.disabled = false; btn.textContent = 'lock it in \\uD83D\\uDD12'; }
      });
      btn.onclick = function(){ ctrl.start(); gate.classList.add('gone'); };
    })();
  </script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
