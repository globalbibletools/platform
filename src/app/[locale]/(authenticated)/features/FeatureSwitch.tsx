"use client"

import { SwitchInput } from "@/components/SwitchInput"
import { type Feature, isFeatureEnabled, setFeatureFlag } from "@/feature-flags"
import { useEffect, useState } from "react"

export interface FeatureSwitchProps {
    feature: Feature
    label: string
}

export default function FeatureSwitch({ feature, label }: FeatureSwitchProps) {
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        setEnabled(isFeatureEnabled(feature))
    }, [feature])

    function onChange(checked: boolean) {
        console.log('toggle', checked)
        setEnabled(checked)
        setFeatureFlag(feature, checked)
    }

    return <SwitchInput name={feature} checked={enabled} onChange={onChange}>
        {label}
    </SwitchInput>
}
