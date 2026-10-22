import Link from 'next/link';

export const metadata = {title: 'Restart your Google connection', robots: {index: false, follow: false}};

export default function GoogleConnectionRecoveryPage() {
 return <main className="min-h-screen bg-soft py-12"><section className="tr-container-narrow tr-card space-y-5 p-6">
  <h1 className="text-3xl font-semibold">Restart your Google connection</h1>
  <p>Tap Rater could not match this Google return to your signed-in session. This can happen if the connection expired, you changed Chrome profiles, or browser cookies were cleared. This attempt did not finish connecting your account.</p>
  <ol className="list-decimal space-y-3 pl-5"><li>In the Chrome profile you want to use, sign in to your customer account at Tap Rater.</li><li>Open Reviews and select Connect Google to start a fresh connection.</li><li>Stay in that same Chrome profile. In Google’s account chooser, select your business Google account or choose Use another account.</li></ol>
  <p>You do not need a Tap Rater admin login. Do not copy the Google sign-in or callback URL to another browser profile.</p>
  <Link className="tr-button-primary" href="/account/reviews">Return to my reviews</Link>
  <p className="text-sm">Replies remain drafts. Restarting the connection does not publish anything.</p>
  <p className="text-sm">Tap Rater staff: <Link className="underline" href="/admin/google-reviews">restart an admin connection</Link>.</p>
 </section></main>;
}
