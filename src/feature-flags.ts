import { useLayoutEffect, useMemo, useState } from "react"

type Features = 'llm-prediction'

export function isFeatureEnabled(feature: Features) {
    const featureList = window.localStorage.getItem('features')?.split(',') ?? []
    return featureList.includes(feature)
}

export function useFeatureFlag(feature: Features) {
    // Can't use useMemo because window isn't available in SSR.
    const [isEnabled, setEnabled] = useState(false)
    useLayoutEffect(() => setEnabled(isFeatureEnabled(feature)), [feature])

    return isEnabled
}
