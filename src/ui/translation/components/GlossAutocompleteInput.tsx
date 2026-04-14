import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import { GlossStateRaw } from "@/modules/translation/types";
import { mergeRefs } from "@/utils/merge-refs";
import {
  ComponentProps,
  CSSProperties,
  KeyboardEvent,
  useEffect,
  useReducer,
  useRef,
} from "react";

export default function GlossAutocompleteInput({
  options,
  value,
  saving,
  onChange,

  className = "",
  style,
  state: initialState,
  right,
  hebrew,
  dir,

  ...props
}: {
  options: Array<AutocompleteOption>;
  value: string;
  state: GlossStateRaw;
  saving: boolean;
  onChange(change: {
    text: string;
    state: GlossStateRaw;
    action?: "move-next" | "move-prev";
  }): void;

  className?: string;
  style?: CSSProperties;
  hebrew?: boolean;
  right?: boolean;
  dir?: string;
} & Omit<ComponentProps<"input">, "onChange" | "value">) {
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    draft,
    initial,
    filteredOptions,
    selectedOption,
    optionsVisible,
    dispatch,
  } = useAutocompleteState({
    options,
    text: value,
    state: initialState ?? GlossStateRaw.Unapproved,
    onChange,
  });

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown": {
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;

        dispatch({ type: "incrementOption", direction: 1 });
        break;
      }
      case "ArrowUp": {
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;

        dispatch({ type: "incrementOption", direction: -1 });
        break;
      }
      case "Escape": {
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;

        if (optionsVisible) {
          dispatch({ type: "toggleOptions", visible: false });
        } else {
          dispatch({ type: "revoke" });
        }
        break;
      }
      case "Enter": {
        if (e.altKey || e.ctrlKey || e.metaKey) return;

        dispatch({ type: "confirm" });
        break;
      }
      default:
        return;
    }

    e.preventDefault();
  }

  return (
    <div
      className={`
        ${className}
        flex gap-2 items-center
        ${hebrew ? "flex-row" : "flex-row-reverse"}
      `}
      style={style}
      dir={dir}
    >
      <div className="group-focus-within/word:block hidden">
        {initial.state === GlossStateRaw.Unapproved ?
          <Button
            className="bg-green-600! w-9"
            tabIndex={-1}
            title="Approve"
            disabled={saving}
            onClick={() => {
              dispatch({ type: "confirm" });
              inputRef.current?.focus();
            }}
          >
            <Icon icon="check" />
          </Button>
        : <Button
            className="bg-red-600! w-9"
            tabIndex={-1}
            title="Revoke"
            disabled={saving}
            onClick={() => {
              dispatch({ type: "revoke" });
              inputRef.current?.focus();
            }}
          >
            <Icon icon="arrow-rotate-left" />
          </Button>
        }
      </div>
      <div className="relative grow">
        <input
          {...props}
          ref={props.ref ? mergeRefs(props.ref, inputRef) : inputRef}
          className={`
            border rounded shadow-inner focus-visible:outline-2 outline-green-300
            w-full px-3 h-9 bg-white
            dark:shadow-none dark:bg-gray-900
            ${hebrew ? "text-right" : "text-left"}
            ${
              initial.state === GlossStateRaw.Approved ?
                "border-green-600 dark:border-green-500"
              : "border-gray-400 dark:border-gray-700"
            }
          `}
          value={draft.text}
          autoComplete="off"
          onChange={(e) => {
            dispatch({ type: "inputChange", text: e.target.value });
          }}
          onBlur={(e) => {
            dispatch({ type: "blur" });
            props.onBlur?.(e);
          }}
          onKeyDown={(e) => {
            onKeyDown(e);
            props.onKeyDown?.(e);
          }}
        />
        {hasMachineSuggestion && (
          <Icon
            className={`
              absolute top-1/2 -translate-y-1/2
              ${hebrew ? "left-3" : "right-3"}
            `}
            icon="robot"
            size="xs"
          />
        )}
        {optionsVisible && filteredOptions.length > 0 && (
          <ol
            className={`
            z-10 absolute min-w-full min-h-[24px] max-h-80 bg-white overflow-auto mt-1 rounded border border-gray-400 shadow
            dark:bg-gray-800 dark:border-gray-700
            ${right ? "right-0" : "left-0"}
            ${hebrew ? "text-right" : "text-left"}
          `}
          >
            {filteredOptions.map((option) => (
              <li
                key={`${option.text}-${option.source}`}
                tabIndex={-1}
                ref={
                  option === selectedOption ?
                    (el) => {
                      el?.scrollIntoView({
                        block: "nearest",
                      });
                    }
                  : undefined
                }
                className={`
                px-3 py-1 whitespace-nowrap cursor-pointer flex items-center gap-2
                ${
                  option === selectedOption ?
                    "bg-green-200 dark:bg-green-400 dark:text-gray-900"
                  : ""
                }
              `}
                onClick={() => dispatch({ type: "confirm", option })}
              >
                <span className="flex-1">{option.text}</span>
                {option.source === "model" ?
                  <Icon icon="robot" size="xs" />
                : undefined}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

interface AutocompleteOption {
  text: string;
  source?: "model";
}

interface AutcompleteState {
  initial: { text: string; state: GlossStateRaw };
  draft: { text: string; state: GlossStateRaw };
  options: Array<AutocompleteOption>;
  filteredOptions: Array<AutocompleteOption>;
  selectedOption?: AutocompleteOption;
  optionsVisible: boolean;
  flushTimestamp?: number;
}

type AutocompleteAction =
  | {
      type: "reset";
      text: string;
      state: GlossStateRaw;
      options: Array<AutocompleteOption>;
    }
  | { type: "inputChange"; text: string }
  | { type: "toggleOptions"; visible?: boolean }
  | { type: "incrementOption"; direction: number }
  | { type: "confirm"; option?: AutocompleteOption }
  | { type: "revoke" }
  | { type: "blur" };

function useAutocompleteState({
  text: initialValue,
  state: initialState,
  options,
  onChange,
}: {
  text: string;
  state: GlossStateRaw;
  options: Array<AutocompleteOption>;
  onChange(gloss: {
    text: string;
    state: GlossStateRaw;
    action?: "move-next" | "move-prev";
  }): void;
}) {
  const [state, dispatch] = useReducer(
    (state: AutcompleteState, action: AutocompleteAction): AutcompleteState => {
      switch (action.type) {
        case "reset": {
          const text =
            state.initial.text === state.draft.text ?
              action.text
            : state.draft.text;
          return {
            ...state,
            options: action.options,
            filteredOptions: filterOptions(text, action.options),
            initial: {
              state: action.state,
              text: action.text,
            },
            draft: {
              state:
                state.initial.state === state.draft.state ?
                  action.state
                : state.draft.state,
              text,
            },
          };
        }
        case "inputChange": {
          return {
            ...state,
            draft: {
              text: action.text,
              state: state.draft.state,
            },
            filteredOptions: filterOptions(action.text, state.options),
          };
        }
        case "toggleOptions": {
          return {
            ...state,
            optionsVisible:
              typeof action.visible === "boolean" ?
                action.visible
              : !state.optionsVisible,
          };
        }
        case "incrementOption": {
          if (!state.optionsVisible) {
            return {
              ...state,
              optionsVisible: true,
            };
          }

          let newIndex: number;
          if (state.selectedOption) {
            const currentIndex = state.filteredOptions.findIndex(
              (option) => option === state.selectedOption,
            );
            newIndex =
              currentIndex + action.direction / Math.abs(action.direction);
          } else if (action.direction > 0) {
            newIndex = 0;
          } else {
            newIndex = state.filteredOptions.length - 1;
          }

          if (newIndex < 0) {
            return { ...state, selectedOption: undefined };
          } else if (newIndex >= state.filteredOptions.length) {
            return { ...state, selectedOption: undefined };
          } else {
            return {
              ...state,
              selectedOption: state.filteredOptions[newIndex],
            };
          }
        }
        case "blur": {
          return {
            ...state,
            optionsVisible: false,
            selectedOption: undefined,
            flushTimestamp: Date.now(),
          };
        }
        case "revoke": {
          if (state.draft.state === GlossStateRaw.Unapproved) {
            return state;
          }

          return {
            ...state,
            draft: {
              text: state.draft.text,
              state: GlossStateRaw.Unapproved,
            },
            flushTimestamp: Date.now(),
          };
        }
        case "confirm": {
          const selectedOption = action.option ?? state.selectedOption;

          if (!selectedOption) {
            return {
              ...state,
              draft: {
                text: state.draft.text,
                state: GlossStateRaw.Approved,
              },
              optionsVisible: false,
              selectedOption: undefined,
              flushTimestamp: Date.now(),
            };
          }
          return {
            ...state,
            draft: {
              text: selectedOption.text,
              state: GlossStateRaw.Approved,
            },
            optionsVisible: false,
            selectedOption: undefined,
            filteredOptions: filterOptions(selectedOption.text, state.options),
            flushTimestamp: Date.now(),
          };
        }
        default: {
          return state;
        }
      }
    },
    {
      initial: {
        text: initialValue,
        state: initialState,
      },
      draft: {
        text: initialValue,
        state: initialState,
      },
      options,
      filteredOptions: filterOptions(initialValue, options),
      optionsVisible: false,
    },
  );

  useEffect(() => {
    dispatch({
      type: "reset",
      text: initialValue,
      state: initialState,
      options,
    });
  }, [initialValue, initialState, options]);

  const flushRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const shouldFlush = flushRef.current !== state.flushTimestamp;
    const hasChanges =
      state.initial.state !== state.draft.state ||
      state.initial.text !== state.draft.text;

    if (shouldFlush && hasChanges) {
      onChange(state.draft);
    }

    flushRef.current = state.flushTimestamp;
  }, [state.flushTimestamp, state.initial, state.draft, onChange]);

  return { ...state, dispatch };
}

function normalize(word: string) {
  // From https://stackoverflow.com/a/37511463
  return word.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function filterOptions(input: string, options: Array<AutocompleteOption>) {
  const normalizedInput = normalize(input);
  return input ?
      options.filter((option) =>
        normalize(option.text).includes(normalizedInput),
      )
    : options;
}
