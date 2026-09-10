import { useState } from 'react'
import { avatarGradient, initial } from '../lib/color'

/** 人物头像：有真实图片用图片（懒加载），加载失败或无图回退到首字母渐变 */
export default function Avatar({
  name, src, size = 40, className = ''
}: {
  name: string
  src?: string
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size, fontSize: size * 0.42 }
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-xl object-cover ${className}`}
        style={style}
      />
    )
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-semibold text-white ${className}`}
      style={{ ...style, background: avatarGradient(name), boxShadow: '0 4px 14px -4px rgba(0,0,0,.6)' }}
    >
      {initial(name)}
    </span>
  )
}
