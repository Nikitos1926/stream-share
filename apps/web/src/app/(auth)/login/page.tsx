import { Typography } from '../../components/ui/Typography';
import { signInWithProvider } from './actions';
import { LoginProviders } from './LoginProviders';

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Typography tag="h1" className="text-2xl font-semibold">
          Welcome back
        </Typography>
        <Typography tag="p" tone="muted" size="sm">
          Sign in to start a stream or watch a private one.
        </Typography>
      </div>

      <LoginProviders signInWithProvider={signInWithProvider} />
    </div>
  );
}
