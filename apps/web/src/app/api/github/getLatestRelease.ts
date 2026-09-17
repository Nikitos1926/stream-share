import { Os } from '@/lib/utils/os.util';

export async function getLatestRelease(
  owner: string,
  repo: string,
): Promise<Record<Os, string | undefined>> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    assets: { name: string; browser_download_url: string }[];
  };
  const urlFor = (ext: string) =>
    data.assets.find((a) => a.name.toLowerCase().endsWith(ext))?.browser_download_url;
  return {
    [Os.Windows]: urlFor('.exe'),
    [Os.Linux]: urlFor('.appimage'),
    [Os.Mac]: urlFor('.dmg'),
    [Os.Android]: undefined,
    [Os.I]: undefined,
    [Os.Unknown]: undefined,
  };
}
