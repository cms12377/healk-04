import { k3DiceImage } from '@/constants/k3Dice'
import { cn } from '@/lib/utils'

export function K3DiceFace({
  value,
  size = 'md',
  className,
}: {
  value: string | number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const src = k3DiceImage(value)
  const sizeClass =
    size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8 min-w-8'

  if (!src) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-[3px] border border-black bg-white text-sm font-bold text-[#333]',
          sizeClass,
          className,
        )}
      >
        {value}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={`ลูกเต๋า ${value}`}
      className={cn('rounded-[3px] border border-black object-contain', sizeClass, className)}
      draggable={false}
    />
  )
}

export function K3DiceRow({
  values,
  size = 'md',
  className,
}: {
  values: number[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {values.map((v, i) => (
        <K3DiceFace key={`${v}-${i}`} value={v} size={size} />
      ))}
    </div>
  )
}
