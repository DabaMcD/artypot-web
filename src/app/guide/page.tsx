export default function GuidePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">The Lingo</h1>
        <p className="text-muted">
          Artypot has its own vocabulary. Here&apos;s everything you need to know.
        </p>
      </div>

      <div className="space-y-4">

        {/* The Pot */}
        <div className="bg-surface border border-brand/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">🪴</span>
            <div>
              <h2 className="text-lg font-bold text-brand mb-1">The Bounty</h2>
              <p className="text-foreground text-sm leading-relaxed">
                A fan-created, crowdfunded request aimed at a specific Summoned One. Fans place pledges into a bounty to signal what they want The Summoned to make. If The Summoned completes the project, the bounty pays out.
              </p>
            </div>
          </div>
        </div>

        {/* The Summoned */}
        <div className="bg-surface border border-creator/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">🔮</span>
            <div>
              <h2 className="text-lg font-bold text-creator mb-1">The Summoned</h2>
              <p className="text-foreground text-sm leading-relaxed">
                A creator or entity who has claimed their Artypot profile. Once summoned, they can receive payouts from bounties dedicated to their work, communicate directly with fans, and confirm or reject completed projects.
              </p>
            </div>
          </div>
        </div>

        {/* The Votive */}
        <div className="bg-surface border border-brand/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">🕯️</span>
            <div>
              <h2 className="text-lg font-bold text-brand mb-1">The Pledge</h2>
              <p className="text-foreground text-sm leading-relaxed">
                A commitment of money placed into a bounty. Your pledge signals your belief in a project and your willingness to pay when it&apos;s completed. Pledges are only charged when a project is approved and paid out by The Council. You can cancel your pledge at any time before that.
              </p>
            </div>
          </div>
        </div>

        {/* The Council — verifies and approves bounties */}
        <div className="bg-surface border border-council/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">⚖️</span>
            <div>
              <h2 className="text-lg font-bold text-council mb-1">The Council</h2>
              <p className="text-foreground text-sm leading-relaxed">
                The moderators and administrators of Artypot. The Council verifies Summon identities, approves completed projects for payout, and keeps the platform running with integrity.
              </p>
            </div>
          </div>
        </div>

        {/* The Herald */}
        <div className="bg-surface border border-brand/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">📯</span>
            <div>
              <h2 className="text-lg font-bold text-brand mb-1">The Herald</h2>
              <p className="text-foreground text-sm leading-relaxed">
                When a Summon is yet unanswered, it is up to loyal fans to take on the role of Herald — the caretaker of that Summon&apos;s unclaimed presence on Artypot.
              </p>
            </div>
          </div>
        </div>

        {/* The Overlord */}
        <div className="bg-surface border border-black/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">👑</span>
            <div>
              <h2 className="text-lg font-bold text-black mb-1">The Overlord, Harry Baldwig himself</h2>
              <p className="text-foreground text-sm leading-relaxed">
                The founding super-administrator of Artypot. Above The Council, The Overlord holds ultimate authority over the platform — the architect of the system and keeper of its soul.
              </p>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-8 p-5 bg-surface border border-border rounded-xl text-center">
        <p className="text-muted text-sm">
          Still confused?{' '}
          <a href="mailto:baldwig@artypot.com" className="text-brand hover:underline">
            Drop us a line.
          </a>
        </p>
      </div>
    </div>
  );
}
