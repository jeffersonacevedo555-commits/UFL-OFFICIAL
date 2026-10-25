import { Shield } from 'lucide-react'

export function mediaUrl(key: string) {
  return `/api/media?key=${encodeURIComponent(key)}`
}

export function Crest({ name, image, small = false }: { name: string; image?: string | null; small?: boolean }) {
  return (
    <span className={`crest ${small ? 'small' : ''}`}>
      {image ? (
        <img src={mediaUrl(image)} alt="" loading="lazy" />
      ) : (
        <>
          <Shield size={small ? 17 : 23} />
          <b>{name.slice(0, 2).toUpperCase()}</b>
        </>
      )}
    </span>
  )
}

export function PlayerAvatar({ name, image, small = false }: { name: string; image?: string | null; small?: boolean }) {
  return (
    <span className={`player-avatar ${small ? 'small' : ''}`}>
      {image ? (
        <img src={mediaUrl(image)} alt="" loading="lazy" />
      ) : (
        <b>{name.slice(0, 2).toUpperCase()}</b>
      )}
    </span>
  )
}
