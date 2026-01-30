/**
 * DebouncedColorInput component
 *
 * Color input that debounces onChange to prevent excessive updates
 * while showing immediate visual feedback.
 */

import { useState, useEffect, useRef, useCallback } from '@wordpress/element'

interface DebouncedColorInputProps {
  value: string
  onChange: (value: string) => void
  delay?: number
  className?: string
}

/**
 * Color input with debounced onChange callback
 *
 * Shows immediate visual feedback in the input while debouncing
 * the expensive onChange callback to parent.
 */
export function DebouncedColorInput({
  value,
  onChange,
  delay = 150,
  className,
}: DebouncedColorInputProps) {
  // Local state for immediate visual feedback
  const [localValue, setLocalValue] = useState(value)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const onChangeRef = useRef(onChange)

  // Keep callback ref updated
  onChangeRef.current = onChange

  // Sync local value when prop changes (e.g., from preset selection)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value

      // Update local state immediately for visual feedback
      setLocalValue(newValue)

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Debounce the expensive parent callback
      timeoutRef.current = setTimeout(() => {
        onChangeRef.current(newValue)
      }, delay)
    },
    [delay]
  )

  return (
    <input
      type="color"
      value={localValue}
      onChange={handleChange}
      className={className}
    />
  )
}
