import type { WordExample } from '@/utils/wordExample'

const LICENSE_URLS: Record<string, string> = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'CC BY-NC-ND 3.0': 'https://creativecommons.org/licenses/by-nc-nd/3.0/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
}

export default function ExampleAudioAttribution({ audio }: { audio: WordExample['audio'] }) {
  if (!audio) return null

  return (
    <p className="mt-1 text-[10px] leading-4 text-[var(--muted)] opacity-70">
      录音：
      <a className="hover:text-[var(--primary)]" href={audio.attributionUrl} target="_blank" rel="noreferrer">
        {audio.author}
      </a>
      {' · '}
      {LICENSE_URLS[audio.license] ? (
        <a className="hover:text-[var(--primary)]" href={LICENSE_URLS[audio.license]} target="_blank" rel="noreferrer">
          {audio.license}
        </a>
      ) : (
        audio.license
      )}
    </p>
  )
}
