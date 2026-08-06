export default function Privacy() {
  return (
    <div className="container p-4 text-stroke">
      <h1 className="mb-2 text-3xl font-semibold">Privacy policy</h1>
      <p className="mb-10 text-sm text-stroke-muted">Last updated: July 2026</p>

      <div className="space-y-10">
        <section>
          <p className="leading-relaxed text-stroke-muted">
            stream-share is a personal, self-hosted project — not a company. This page explains, in
            plain terms, what data the app collects and what happens to it. It isn&apos;t written by
            a lawyer, and if you&apos;re running your own instance of this project, you should adapt
            it to your own setup before relying on it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">What we collect</h2>
          <ul className="list-inside list-disc space-y-2 leading-relaxed text-stroke-muted">
            <li>Your email and username, when you create an account.</li>
            <li>
              Basic session metadata while you&apos;re streaming — connection quality, duration, and
              viewer count — used only to show you live diagnostics and to keep an audit log for
              moderation.
            </li>
            <li>A session cookie that keeps you signed in (see Cookies below).</li>
          </ul>
          <p className="mt-3 leading-relaxed text-stroke-muted">
            We don&apos;t use third-party analytics, ad trackers, or sell any data — there&apos;s no
            one to sell it to.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Cookies</h2>
          <p className="leading-relaxed text-stroke-muted">
            A single session cookie is used to keep you logged in between visits. It&apos;s required
            for the app to work — there&apos;s no way to opt out of it and still use your account.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Where your data lives</h2>
          <p className="leading-relaxed text-stroke-muted">
            Everything is stored on the instance&apos;s own database. Nothing is sent to third-party
            services. If you&apos;re using a public instance you don&apos;t control, the operator of
            that instance is the one who can actually see this data.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Admin access</h2>
          <p className="leading-relaxed text-stroke-muted">
            Platform admins can view active and past session metadata and the audit log to moderate
            the platform — for example, to stop a stream that violates the terms of use. Admins
            don&apos;t have a way to see your screen after a stream has ended.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Deleting your data</h2>
          <p className="leading-relaxed text-stroke-muted">
            This is a small project without a support team. To request account deletion, open an
            issue on the project&apos;s GitHub repository.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Changes to this policy</h2>
          <p className="leading-relaxed text-stroke-muted">
            If this policy changes in a meaningful way, the date at the top of this page will be
            updated.
          </p>
        </section>
      </div>
    </div>
  );
}
