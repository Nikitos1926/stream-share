import { signInWithProvider } from './actions';
import { PROVIDERS_CONFIG } from '@/lib/enums/providersConfig';
import Image from 'next/image';

export default function LoginPage() {
  const providers = Object.values(PROVIDERS_CONFIG);
  return (
    <div className="flex min-h-screen flex-col items-center p-4">
      <div className="m-8 flex w-full max-w-lg flex-col items-center rounded-xl bg-[#0a0a0a]">
        <div className="flex flex-col items-center p-4">
          <h1 className="mb-4 text-2xl font-bold">Stream Share</h1>
          <h2 className="text-xl font-bold">Welcome back!</h2>
          <p className="text-muted-foreground mt-1 text-sm font-light">
            Sign in to your account to continue
          </p>
        </div>
        <div className="mb-3 flex w-full max-w-sm flex-col gap-3 rounded-xl bg-[#2a2a2a] p-5">
          {providers.map(({ name, icon }) => (
            <button
              key={name}
              onClick={signInWithProvider.bind(null, name)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[#65645F] bg-inherit px-4 py-3 text-sm font-medium text-foreground hover:bg-[#534AB7]"
            >
              <Image src={icon} alt="" width={25} height={15} />
              <span>Continue with {name.charAt(0).toUpperCase() + name.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
