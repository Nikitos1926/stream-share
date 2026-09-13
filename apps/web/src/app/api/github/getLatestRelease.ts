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
    assets: { content_type: string; browser_download_url: string }[];
  };
  return {
    [Os.Windows]: data.assets.find((a) => a.content_type === 'application/x-msdos-program')
      ?.browser_download_url,
    [Os.Linux]: data.assets.find((a) => a.content_type === 'application/octet-stream')
      ?.browser_download_url,
    [Os.Mac]: data.assets.find((a) => a.content_type === 'application/x-apple-diskimage')
      ?.browser_download_url,
    [Os.Android]: undefined,
    [Os.I]: undefined,
    [Os.Unknown]: undefined,
  };
}
