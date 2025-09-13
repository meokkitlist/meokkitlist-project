import styled from '@emotion/styled'

type IconImgProps = {
  src: string
  alt?: string
  size?: number
  mr?: number
  ml?: number
  className?: string
  onClick?: React.MouseEventHandler<HTMLImageElement>
}

export function IconImg({
  src,
  alt = '',
  size = 18,
  mr = 0.3,
  ml = 0,
  className,
  onClick,
}: IconImgProps) {
  return (
    <Img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      $size={size}
      $mr={mr}
      $ml={ml}
    />
  )
}

export default IconImg

const Img = styled.img<{ $size: number; $mr: number; $ml: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  display: inline-block;
  object-fit: contain;
  vertical-align: middle;
  margin-right: ${({ $mr }) => $mr}rem;
  margin-left: ${({ $ml }) => $ml}rem;
`
