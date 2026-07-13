import { signInWithProvider } from './actions';
import { PROVIDERS_CONFIG } from '@/lib/enums/providersConfig';
import Image from 'next/image';

export default function LoginPage() {
  const providers = Object.values(PROVIDERS_CONFIG);
  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <div className="flex flex-col items-center w-full max-w-lg bg-[#0a0a0a] rounded-xl m-8">
        <div className="flex flex-col items-center p-4">
          <h1 className="text-2xl font-bold mb-4">Stream Share</h1>
          <h2 className="text-xl font-bold">Welcome back!</h2>
          <p className="mt-1 text-sm font-light text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        <div className="flex flex-col w-full max-w-sm rounded-xl bg-[#2a2a2a] p-5 mb-3 gap-3 ">
          {providers.map(({ name, icon }) => (
            <button
              key={name}
              onClick={signInWithProvider.bind(null, name)}
              className="flex w-full items-center gap-3 rounded-lg border border-[#65645F] hover:bg-[#534AB7] bg-inherit px-4 py-3 text-sm font-medium text-foreground  cursor-pointer"
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
