"use client";

import MultiselectInput from '@/app/components/MultiselectInput';
import { useFormState } from 'react-dom';
import { changeUserRole } from './actions';

export interface RoleSelectorProps {
    userId: string
    options: { label: string, value: string }[],
    initialValue: string[]
    label: string
}

export default function RoleSelector({ userId, label, options, initialValue }: RoleSelectorProps) {
    const [{ roles }, action] = useFormState(changeUserRole, { roles: initialValue })

    return <MultiselectInput
      className="w-28"
      value={roles}
      aria-label={label}
      onChange={(systemRoles: string[]) => {
          const form = new FormData()
          form.set('user_id', userId)
          form.set('roles', systemRoles.join(','))
          action(form)
      }}
      items={options}
    />
}
