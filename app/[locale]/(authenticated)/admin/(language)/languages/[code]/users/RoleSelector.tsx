"use client";

import MultiselectInput from '@/app/components/MultiselectInput';
import { useFormState } from 'react-dom';
import { changeUserLanguageRole } from './actions';

export interface RoleSelectorProps {
    userId: string
    code: string
    options: { label: string, value: string }[],
    initialValue: string[]
    label: string
}

export default function RoleSelector({ userId, code, label, options, initialValue }: RoleSelectorProps) {
    const [{ roles }, action] = useFormState(changeUserLanguageRole, { roles: initialValue })

    return <MultiselectInput
      className="w-48"
      value={roles}
      aria-label={label}
      onChange={(systemRoles: string[]) => {
          const form = new FormData()
          form.set('code', code)
          form.set('user_id', userId)
          systemRoles.forEach((role, i) => {
              form.set(`roles[${i}]`, role)
          })
          action(form)
      }}
      items={options}
    />
}
