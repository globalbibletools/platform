"use client";

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import Button from './Button';
import ComboboxInput from './ComboboxInput';
interface SortableMultiselectInputProps {
  className?: string;
  name: string;
  items: ItemType[];
  defaultValue?: string[];
  placeholder?: string;
  autosubmit?: boolean
}

type ItemType = { label: string; value: string };

const SortableMultiselectInput = forwardRef<
  HTMLInputElement,
  SortableMultiselectInputProps
>(({ className = '', name, defaultValue, placeholder, items, autosubmit = false }, ref) => {
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? [])

    const input = useRef<HTMLInputElement>(null)
    const lastValue = useRef((defaultValue ?? []).join(','))
    useEffect(() => {
        const newValue = internalValue.join(',') 
        if (autosubmit && newValue !== lastValue.current) {
            input.current?.form?.requestSubmit()
        }
        lastValue.current = newValue
    }, [internalValue, autosubmit])

  const [newItemValue, setNewItemValue] = useState('');
  const addItem = () => {
    if (newItemValue) {
      setInternalValue([...internalValue, newItemValue])
      setNewItemValue('');
    }
  };
  const moveItem = (from: number, to: number) => {
    const newValue = [...internalValue];
    newValue.splice(to, 0, newValue.splice(from, 1)[0])
    setInternalValue(newValue)
  };
  const removeItem = (index: number) => {
    const newValue = [...internalValue];
    newValue.splice(index, 1);
    setInternalValue(newValue)
  };
  const availableNewItems = items.filter(
    (item) => !internalValue.includes(item.value)
  );

  return (
    <div
      className={`${className} group/multiselect relative flex flex-col gap-1`}
    >
      <input name={name} ref={input} type="hidden" value={internalValue} />
      <div className="border rounded flex-col shadow-inner flex border-gray-400 min-h-20">
        {internalValue
          .map((v) => items.find((i) => i.value === v))
          .filter((item?: ItemType): item is ItemType => !!item)
          .map((item, i, value) => {
            const isFirst = i === 0;
            const isLast = i === value.length - 1;
            return (
              <div className="py-2 px-1 flex items-center" key={item.value}>
                <span className="grow mx-1">{item.label}</span>
                <button
                  className="flex-shrink-0 w-8 h-8 pb-[2px] rounded-md text-blue-800 dark:text-green-400 focus-visible:outline outline-2 outline-green-300 disabled:opacity-25"
                  type="button"
                  disabled={isFirst}
                  onClick={() => moveItem(i, i - 1)}
                >
                  <Icon icon="chevron-up" />
                  {/* <span className="sr-only">{t('common:direction.up')}</span> */}
                </button>
                <button
                  className="flex-shrink-0 w-8 h-8 pb-[2px] rounded-md text-blue-800 dark:text-green-400 focus-visible:outline outline-2 outline-green-300 disabled:opacity-25"
                  type="button"
                  disabled={isLast}
                  onClick={() => moveItem(i, i + 1)}
                >
                  <Icon icon="chevron-down" />
                  {/* <span className="sr-only">{t('common:direction.down')}</span> */}
                </button>
                <button
                  className="flex-shrink-0 w-8 h-8 rounded-md text-red-800 dark:text-red-700 focus-visible:outline outline-2 outline-red-700"
                  type="button"
                  onClick={() => removeItem(i)}
                >
                  <Icon icon="close" />
                  {/* <span className="sr-only">{t('common:close')}</span> */}
                </button>
              </div>
            );
          })}
      </div>
      <div className="flex gap-1">
        <ComboboxInput
          ref={ref}
          className="grow block"
          placeholder={placeholder}
          value={newItemValue}
          onChange={setNewItemValue}
          items={availableNewItems}
          disabled={availableNewItems.length === 0}
          autoComplete="off"
        />
        <Button onClick={addItem}>
          <Icon icon="add" />
          {/* <span className="sr-only">{t('common:add')}</span> */}
        </Button>
      </div>
    </div>
  );
});
SortableMultiselectInput.displayName = 'SortableMultiselectInput'
export default SortableMultiselectInput;

