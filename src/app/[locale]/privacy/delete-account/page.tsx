import { Link } from '@/i18n/routing';

export const metadata = {
  title: 'How to Delete Your Account',
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center font-mono text-sm text-muted font-semibold">
        {n}
      </div>
      <div className="pt-0.5 pb-8 border-b border-border w-full last:border-0 last:pb-0">
        <p className="font-semibold text-foreground mb-1.5">{title}</p>
        <div className="text-base text-muted leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-24">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-muted uppercase tracking-wider mb-3">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span className="mx-2 text-muted/40">/</span>
          Delete Account
        </p>

        {/* Header */}
        <h1 className="text-4xl font-display font-bold text-foreground mb-3">
          How to Delete Your Account
        </h1>
        <p className="text-base text-muted mb-10 leading-relaxed">
          You can permanently delete your Artypot account at any time — no hoops, no waiting period.
          Follow the steps below. The whole process takes under a minute.
        </p>

        {/* What happens box */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-12 space-y-3 text-sm text-muted leading-relaxed">
          <p className="font-semibold text-foreground text-base">What happens when you delete</p>
          <ul className="space-y-2">
            <li className="flex gap-2"><span className="text-bad shrink-0 mt-0.5">×</span><span>All your active commitments (backings) are cancelled immediately.</span></li>
            <li className="flex gap-2"><span className="text-bad shrink-0 mt-0.5">×</span><span>Your profile, display name, and personal data are removed from our active systems within 30 days.</span></li>
            <li className="flex gap-2"><span className="text-bad shrink-0 mt-0.5">×</span><span>You are logged out of all devices.</span></li>
            <li className="flex gap-2"><span className="text-bad shrink-0 mt-0.5">×</span><span>If you are a creator, your public profile and all associated handles are deactivated.</span></li>
            <li className="flex gap-2"><span className="text-muted/40 shrink-0 mt-0.5">○</span><span>Financial records (payment amounts, receipts) are kept for 7 years as required by US tax law — but they are anonymised and not linked to your name or email.</span></li>
            <li className="flex gap-2"><span className="text-muted/40 shrink-0 mt-0.5">○</span><span>Your email address can be reused to create a new account.</span></li>
          </ul>
          <p className="text-xs text-muted/60 pt-1">
            This action is permanent and cannot be undone. If you have an outstanding balance as a creator, please{' '}
            <Link href="/support" className="hover:text-foreground transition-colors underline">contact support</Link>{' '}
            before deleting.
          </p>
        </div>

        {/* Steps */}
        <div className="mb-12">
          <Step n={1} title="Log in to Artypot">
            <p>
              Go to{' '}
              <Link href="/login" className="text-fan hover:underline">artypot.com/login</Link>{' '}
              and sign in with your email and password, or the social account you used to register
              (Google, GitHub, Discord, etc.).
            </p>
          </Step>

          <Step n={2} title="Open Settings">
            <p>
              Once logged in, click <strong className="text-foreground">Settings</strong> in the left sidebar
              (look for the ⚙ icon). On mobile, tap the menu icon in the top-left corner to open the sidebar first.
            </p>
            <p>
              You can also go directly to:{' '}
              <Link href="/settings" className="text-fan hover:underline">artypot.com/settings</Link>.
            </p>
          </Step>

          <Step n={3} title='Scroll to "Danger Zone"'>
            <p>
              Scroll to the bottom of the Settings page until you reach the{' '}
              <span className="font-mono text-bad text-sm bg-bad/10 px-1.5 py-0.5 rounded">danger zone</span>{' '}
              section. It is the last section on the page.
            </p>
          </Step>

          <Step n={4} title='Click "Delete Account"'>
            <p>
              Find the <strong className="text-foreground">Delete My Account</strong> row and click the red{' '}
              <strong className="text-foreground">Delete Account</strong> button.
              A confirmation dialog will appear explaining what will be deleted.
            </p>
          </Step>

          <Step n={5} title="Confirm deletion">
            <p>
              Read the confirmation, then click{' '}
              <strong className="text-foreground">Yes, Delete My Account</strong>.
              Your account is deleted immediately and you will be logged out.
            </p>
          </Step>
        </div>

        {/* Can't log in? */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <p className="font-semibold text-foreground mb-2">Can&apos;t log in?</p>
          <p className="text-sm text-muted leading-relaxed">
            If you no longer have access to your account — for example, you&apos;ve lost your password and
            no longer have access to the email address on file — please{' '}
            <Link href="/support" className="text-fan hover:underline">contact us</Link>{' '}
            or email{' '}
            <a href="mailto:support@artypot.com" className="text-fan hover:underline">support@artypot.com</a>.
            Include the email address associated with your account so we can locate and delete it manually.
            We will respond within 5 business days.
          </p>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <Link href="/privacy" className="hover:text-foreground transition-colors">← Privacy Policy</Link>
          <Link href="/support" className="hover:text-foreground transition-colors">Contact Support</Link>
          <Link href="/tos" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>

      </div>
    </div>
  );
}
