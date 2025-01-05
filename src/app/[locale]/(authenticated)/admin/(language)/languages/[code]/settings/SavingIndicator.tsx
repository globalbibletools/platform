"use client";

import { Icon } from '@/components/Icon'
import { useFormStatus } from 'react-dom'

export interface SavingIndicatorProps {
    labels: {
        saving: string
        saved: string
    }
}

export default function SavingIndicator({ labels }: SavingIndicatorProps) {
    const formStatus = useFormStatus()

    return <div className="ms-6 text-gray-700 dark:text-gray-400">
      {formStatus.pending ? (
        <>
          <Icon icon="arrows-rotate" className="me-1" />
          {labels.saving}
        </>
      ) : (
        <>
          <Icon icon="check" className="me-1" />
          {labels.saved}
        </>
      )}
    </div>
}
