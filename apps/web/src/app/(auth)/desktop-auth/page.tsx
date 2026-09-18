/**
 * The dead end of a desktop sign-in that this browser can no longer hand back to
 * the app (api/desktop-auth/complete sends it here when the hand-off cookie is
 * gone: an expired link, a second tab of the same flow, or an app that already
 * gave up). The browser is usually signed in at this point, so without this page
 * the tab would simply sit on a signed-in home page while the user waits for an
 * app that is waiting for them.
 */
export default function DesktopAuthReturnPage() {
  return (
    <div className="mx-auto flex min-h-screen flex-col items-center p-4">
      <div className="m-8 flex w-full max-w-lg flex-col items-center rounded-xl bg-[#0a0a0a]">
        <div className="flex flex-col items-center p-4 text-center">
          <h1 className="mb-4 text-2xl font-bold">Stream Share</h1>
          <h2 className="text-xl font-bold">Go back to the app</h2>
          <p className="text-muted-foreground mt-2 text-sm font-light">
            This browser is done with the sign-in, but it could not hand the result back to Stream
            Share — the link had already been used or it expired.
          </p>
          <p className="text-muted-foreground mt-2 text-sm font-light">
            Switch to the Stream Share app and sign in again; it takes a few seconds now that the
            browser knows your account. You can close this tab.
          </p>
        </div>
      </div>
    </div>
  );
}
