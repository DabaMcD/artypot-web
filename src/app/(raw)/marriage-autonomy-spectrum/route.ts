export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>What's Your Number? A Marriage Spectrum</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --cream: #F7F3EC;
    --ink: #1C1C2E;
    --muted: #6B6880;
    --rule: #D4CCBB;
    --quote-bg: #EFEBE3;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--cream);
    color: var(--ink);
    font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 13px;
    line-height: 1.6;
    padding: 48px 56px;
    max-width: 960px;
    margin: 0 auto;
  }

  header {
    text-align: center;
    padding-bottom: 28px;
    border-bottom: 2px solid var(--ink);
    margin-bottom: 8px;
  }

  .kicker {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }

  h1 {
    font-family: 'Playfair Display', serif;
    font-size: 58px;
    font-weight: 900;
    line-height: 1.0;
    letter-spacing: -0.02em;
    margin-bottom: 12px;
  }

  .subtitle {
    font-family: 'Libre Baskerville', serif;
    font-style: italic;
    font-size: 14px;
    color: var(--muted);
    max-width: 580px;
    margin: 0 auto 16px;
  }

  .axis-label {
    display: flex;
    justify-content: center;
    gap: 12px;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.08em;
  }
  .axis-label span { font-style: italic; }
  .axis-label .sep { color: var(--rule); }

  .spectrum-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin: 16px 0 6px;
  }
  .spectrum-bar div { flex: 1; }

  .bar-labels {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }

  .col-headers {
    display: grid;
    grid-template-columns: 52px 1fr 1fr;
    gap: 0;
    border-bottom: 1px solid var(--ink);
    padding: 8px 0;
    margin-bottom: 4px;
  }
  .col-headers span {
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink);
    font-family: 'Playfair Display', serif;
    font-style: italic;
  }
  .col-headers span:nth-child(3) { padding-left: 16px; }

  .level {
    display: grid;
    grid-template-columns: 52px 1fr 1fr;
    gap: 0;
    border-bottom: 1px solid var(--rule);
    padding: 14px 0;
    align-items: start;
    animation: fadeIn 0.4s ease both;
  }
  .level:last-of-type { border-bottom: none; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .level:nth-child(1)  { animation-delay: 0.03s }
  .level:nth-child(2)  { animation-delay: 0.07s }
  .level:nth-child(3)  { animation-delay: 0.11s }
  .level:nth-child(4)  { animation-delay: 0.15s }
  .level:nth-child(5)  { animation-delay: 0.19s }
  .level:nth-child(6)  { animation-delay: 0.23s }
  .level:nth-child(7)  { animation-delay: 0.27s }
  .level:nth-child(8)  { animation-delay: 0.31s }
  .level:nth-child(9)  { animation-delay: 0.35s }
  .level:nth-child(10) { animation-delay: 0.39s }
  .level:nth-child(11) { animation-delay: 0.43s }

  .num-badge {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    font-size: 20px;
    color: white;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .level-left {
    padding-right: 20px;
  }

  .level-title {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: 15px;
    line-height: 1.2;
    margin-bottom: 4px;
  }

  .tag {
    display: inline-block;
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: white;
    padding: 1px 7px;
    border-radius: 2px;
    margin-bottom: 6px;
    vertical-align: middle;
    margin-left: 6px;
    position: relative;
    top: -1px;
  }

  .level-body {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.55;
  }

  

  .level-right {
    padding-left: 16px;
    border-left: 2px solid var(--rule);
  }

  .quote {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 13px;
    color: var(--ink);
    line-height: 1.5;
    background: var(--quote-bg);
    padding: 8px 12px;
    border-radius: 2px;
  }

  footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 2px solid var(--ink);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.55;
  }
  footer strong {
    display: block;
    font-family: 'Playfair Display', serif;
    font-size: 10px;
    font-style: italic;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink);
    margin-bottom: 4px;
  }

  @media print {
    body { padding: 24px 32px; }
    .level { break-inside: avoid; }
  }
</style>
</head>
<body>

<header>
  <div class="kicker">A Completely Unofficial Typology</div>
  <h1>What's Your Number?</h1>
  <p class="subtitle">A spectrum of marriage models from radical autonomy to total hierarchy. Read through. Find yourself. Try not to be defensive about it.</p>
  <div class="axis-label">
    <span>10 — Egalitarian &amp; Autonomous</span>
    <div class="sep">←————————————————→</div>
    <span>Traditional &amp; Hierarchical — 0</span>
  </div>
</header>

<div class="spectrum-bar">
  <div style="background:#1A1A4A"></div>
  <div style="background:#1A3E7A"></div>
  <div style="background:#1A6070"></div>
  <div style="background:#2E7A4A"></div>
  <div style="background:#7A8C20"></div>
  <div style="background:#C49020"></div>
  <div style="background:#B86030"></div>
  <div style="background:#9C3D2A"></div>
  <div style="background:#7B2D3A"></div>
  <div style="background:#5C1A2E"></div>
  <div style="background:#2A0A18"></div>
</div>
<div class="bar-labels">
  <span>10</span><span>9</span><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span><span>0</span>
</div>

<div class="col-headers">
  <span></span>
  <span>The Model</span>
  <span>How You Sound</span>
</div>

<div id="levels">

  <div class="level">
    <div class="num-badge" style="background:#1A1A4A">10</div>
    <div class="level-left">
      <div class="level-title">The Open Book</div>
      <div class="level-body">The marriage is real; the exclusivity isn't. Other partners are allowed, encouraged, and debriefed over dinner. They've replaced jealousy with a therapy term for it and consider this an upgrade. The sex is abundant and extensively processed. Either the most evolved arrangement on this list or a chaos engine with paperwork — often both, sometimes simultaneously.</div>
    </div>
    <div class="level-right">
      <div class="quote">"We don't believe love is a finite resource." (They will tell you this unprompted.)</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#1A3E7A">9</div>
    <div class="level-left">
      <div class="level-title">The Arrangement</div>
      <div class="level-body">They share a last name, a mortgage, and not much else. Different friends, different schedules, possibly different floors of the same house. Sex: infrequent, or outsourced, or a distant memory that neither person feels particularly urgent about retrieving. The most honest model on the list, because at least nobody's pretending.</div>
    </div>
    <div class="level-right">
      <div class="quote">"We're very independent people. Always have been." (The guest bedroom is permanent.)</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#1A6070">8</div>
    <div class="level-left">
      <div class="level-title">The Equal Partners</div>
      <div class="level-body">Nobody leads. Everything is negotiated. The chore chart is color-coded and so, if they're being honest, is the sex schedule. They will tell you this is healthy and they are mostly right. The real test is whether they can occasionally stop being fair to each other and just be feral about it — the ones who can are thriving; the ones who can't are in couples therapy discussing their "desire discrepancy."</div>
    </div>
    <div class="level-right">
      <div class="quote">"We literally have a spreadsheet. It started as a joke. It did not stay a joke."</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#2E7A4A">7</div>
    <div class="level-left">
      <div class="level-title">The Best Friends Who Also Fell in Love</div>
      <div class="level-body">They genuinely like each other. Not in the performative way — in the way where they'd actually choose to spend a Saturday together. In bed as everywhere else, it's warm and easy and theirs. The danger is that all this cozy mutual adoration slowly suffocates the spark; desire needs a little friction and these two have sanded everything smooth. The happy ones know this. The unhappy ones are confused about why they feel so comfortable and so bored at the same time.</div>
    </div>
    <div class="level-right">
      <div class="quote">"My partner is my best friend." (They mean it. That's the whole thing.)</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#7A8C20">6</div>
    <div class="level-left">
      <div class="level-title">The Classic Partnership</div>
      <div class="level-body">He earns. She runs the home with the quiet authority of someone who knows exactly where everything is and what everything costs and how long it would take him to figure that out without her. No grand ideology — just two people who divided the work and found it fits. The bedroom follows the same logic: settled, consistent, unpretentious. Turns out longevity research loves this model. Nobody at a dinner party wants to hear about it.</div>
    </div>
    <div class="level-right">
      <div class="quote">"It works. I don't need it to be more interesting than that."</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#C49020">5</div>
    <div class="level-left">
      <div class="level-title">The Mission &amp; His Co-Builder</div>
      <div class="level-body">They are building an empire and they will tell you about it. His vision, her execution, their combined output: terrifying. Two people running at 90% capacity in the same direction is genuinely erotic, and they know it — the mission and the marriage feed each other. Until the mission wins. When the hustle consumes everything, physical intimacy is quietly the first thing that gets rescheduled, then deprioritized, then avoided. The calendar has a date night. It keeps getting moved.</div>
    </div>
    <div class="level-right">
      <div class="quote">"We're partners in every sense of the word." (The emphasis is on business partners.)</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#B86030">4</div>
    <div class="level-left">
      <div class="level-title">The Servant-Leader &amp; His Willing Partner</div>
      <div class="level-body">He leads, she follows, and they both think this is beautiful. And sometimes it genuinely is. The theology gives the structure a vocabulary; the love gives it warmth. In bed, the authority dynamic doesn't disappear — it just goes unannounced. Satisfaction rates in this model are, per actual research, annoyingly high, which drives everyone outside it absolutely crazy. The failure mode is a man who confuses headship with laziness and a woman who's been told that discomfort is submission.</div>
    </div>
    <div class="level-right">
      <div class="quote">"He leads our family well. I trust him." (She is not a pushover. Do not make that mistake.)</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#9C3D2A">3</div>
    <div class="level-left">
      <div class="level-title">The Patriarch &amp; His Household</div>
      <div class="level-body">God ordained it; he enforces it; she accepts it — not because she has to, but because the entire worldview makes sense to her. He runs the external world, she runs the household with an iron hand he couldn't replicate in a thousand years. The polarity is real and, in the healthy version, genuinely charged: clear roles have a way of keeping desire alive long past the point where more "modern" arrangements have turned roommate. The unhealthy version is just a man who stopped trying because the structure lets him.</div>
    </div>
    <div class="level-right">
      <div class="quote">"My husband is the head of our home." (This is not up for discussion.)</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#7B2D3A">2</div>
    <div class="level-left">
      <div class="level-title">The Idol &amp; His Worshipper</div>
      <div class="level-body">She has built her entire inner life around him. His ambitions are her religion; his opinion is her weather. The sex has the intensity of a devotional act — she's not sleeping with a man, she's communing with her highest value. It works, until it doesn't, and it always eventually doesn't, because no human being can hold up under that weight forever. When he inevitably disappoints her — not catastrophically, just humanly — the whole architecture collapses. Ayn Rand invented this model and refused to acknowledge the ruins.</div>
    </div>
    <div class="level-right">
      <div class="quote">"He's just extraordinary. I've never met anyone like him." (Said in year two. Check back in year twelve.)</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#5C1A2E">1</div>
    <div class="level-left">
      <div class="level-title">The Sovereign &amp; His Devotee</div>
      <div class="level-body">One person holds all the power. The other person handed it over and hasn't asked for it back. This isn't an accident or a dysfunction — it's the entire point, chosen deliberately and maintained actively. The bedroom is where the dynamic is most explicit: protocols, rituals, hard limits negotiated and revisited. Counterintuitively, this is one of the more communicative arrangements on the list. Everything gets discussed. Nothing gets assumed. Most people find this incomprehensible; the people in it find most other models dishonest about who's actually in charge.</div>
    </div>
    <div class="level-right">
      <div class="quote">"Yes, Sir."</div>
    </div>
  </div>

  <div class="level">
    <div class="num-badge" style="background:#2A0A18">0</div>
    <div class="level-left">
      <div class="level-title">Total Power Exchange</div>
      <div class="level-body">He owns her. Not metaphorically — structurally. What she wears, eats, who she speaks to, when she sleeps: his call. This isn't a marriage with a power imbalance; it's a power imbalance that files taxes jointly. The consent question is technically answered and practically murky — people don't generally end up here in one clean decision, they drift, and the door gets harder to find. The ones who are fine are fine. The ones who aren't have usually forgotten they're allowed to say so.</div>
    </div>
    <div class="level-right">
      <div class="quote">"He takes care of everything. I don't really need to think about any of it."</div>
    </div>
  </div>

</div>

<footer>
  <div>
    <strong>On finding your number</strong>
    Most people sit between two adjacent levels. That's not indecision — that's nuance. The scale is a map, not a verdict.
  </div>
  <div>
    <strong>On your partner's number</strong>
    A two-point gap is a conversation. A five-point gap is a worldview conflict wearing a marriage license.
  </div>
  <div>
    <strong>On time</strong>
    New parents frequently slide toward 5 or 6 regardless of where they started. Life exerts pressure on the dial. Revisit your number occasionally.
  </div>
</footer>

</body>
</html>
`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
