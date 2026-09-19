import { signInWithProvider } from './actions';
import { LoginProviders } from './LoginProviders';

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen flex-col items-center p-4">
      <div className="m-8 flex w-full max-w-lg flex-col items-center rounded-xl bg-[#0a0a0a]">
        <div className="flex flex-col items-center p-4">
          <h1 className="mb-4 text-2xl font-bold">Stream Share</h1>
          <h2 className="text-xl font-bold">Welcome back!</h2>
          <p className="text-muted-foreground mt-1 text-sm font-light">
            Sign in to your account to continue
          </p>
        </div>
        <LoginProviders signInWithProvider={signInWithProvider} />
      </div>
    </div>
  );
}
