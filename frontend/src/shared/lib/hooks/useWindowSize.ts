/**
 * useWindowSize — returns live window { width, height }, updates on resize.
 *
 * Requirements: useWindowSize.requirements.md
 * Tests: useWindowSize.test.ts
 * Guideline: AI Guideline 14 §14.9 RULE 10
 */

import { useState, useEffect } from 'react'

export interface WindowSize {
    width: number
    height: number
}

export function useWindowSize(): WindowSize {
    const [size, setSize] = useState<WindowSize>({
        width: window.innerWidth,
        height: window.innerHeight,
    })

    useEffect(() => {
        function handleResize() {
            setSize({ width: window.innerWidth, height: window.innerHeight })
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return size
}
