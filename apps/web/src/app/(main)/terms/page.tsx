export default function Terms() {
  return (
    <div className="mx-auto max-w-180 px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold">Terms of use</h1>
      <p className="mb-10 text-sm text-stroke-muted">Last updated: July 2026</p>

      <div className="space-y-10">
        <section>
          <p className="leading-relaxed text-stroke-muted">
            stream-share is a personal, self-hosted screen-sharing project, provided as-is and
            maintained in spare time. By using it, you agree to the terms below. If you&apos;re
            running your own instance, adapt this page to match.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">What the service is</h2>
          <p className="leading-relaxed text-stroke-muted">
            stream-share lets you share your screen with other people over WebRTC. It&apos;s a hobby
            project, not a commercial product — there&apos;s no uptime guarantee, no SLA, and no
            dedicated support team behind it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Acceptable use</h2>
          <ul className="list-inside list-disc space-y-2 leading-relaxed text-stroke-muted">
            <li>Don&apos;t broadcast illegal content.</li>
            <li>Don&apos;t use the platform to harass, threaten, or impersonate other people.</li>
            <li>Don&apos;t try to disrupt the service for other users.</li>
          </ul>
          <p className="mt-3 leading-relaxed text-stroke-muted">
            Admins can stop an active stream or block an account that breaks these rules, using the
            moderation tools built into the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Your account</h2>
          <p className="leading-relaxed text-stroke-muted">
            You&apos;re responsible for what happens under your account. Keep your credentials to
            yourself, and let an admin know if you think your account has been compromised.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">No warranty</h2>
          <p className="leading-relaxed text-stroke-muted">
            The service is provided &quot;as is,&quot; without warranties of any kind. It may go
            down, lose data, or change without notice — this is a personal project, not a paid
            service with guarantees.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Limitation of liability</h2>
          <p className="leading-relaxed text-stroke-muted">
            To the extent allowed by law, the maintainer isn&apos;t liable for any damages arising
            from your use of the service — this is offered for free, in good faith, with no
            commercial relationship behind it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Changes</h2>
          <p className="leading-relaxed text-stroke-muted">
            These terms may change as the project evolves. Meaningful changes will update the date
            at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Contact</h2>
          <p className="leading-relaxed text-stroke-muted">
            Questions or issues — open a thread on the project&apos;s GitHub repository.
          </p>
        </section>
      </div>
    </div>
  );
}
