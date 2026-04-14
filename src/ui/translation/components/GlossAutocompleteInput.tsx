import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import {
  GlossApprovalMethodRaw,
  GlossStateRaw,
} from "@/modules/translation/types";
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
  className = "",
  style,
  right,
  dir,

  suggestions,
  modelGlosses,
  value,
  saving,
  onChange,

  ...props
}: {
  className?: string;
  style?: CSSProperties;
  right?: boolean;
  dir?: string;

  suggestions: Array<string>;
  modelGlosses: Partial<Record<"google" | "llm_import", string>>;
  value?: { text: string; state: GlossStateRaw };
  saving: boolean;
  onChange(change: {
    text: string;
    state: GlossStateRaw;
    source?: GlossApprovalMethodRaw;
  }): void;
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
    suggestions,
    modelGlosses,
    value,
    onChange,
  });

  const hasModelGloss =
    (draft.source === GlossApprovalMethodRaw.GoogleSuggestion ||
      draft.source === GlossApprovalMethodRaw.LLMSuggestion) &&
    initial.state === GlossStateRaw.Unapproved;

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
      case "Tab": {
        if (e.altKey || e.ctrlKey || e.metaKey) return;

        dispatch({ type: "selectOption" });

        // Don't prevent default for tab to not break tab controls.
        return;
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
        ${right ? "flex-row" : "flex-row-reverse"}
      `}
      style={style}
      dir={dir}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) {
          return;
        }

        dispatch({ type: "blur" });
      }}
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
            ${right ? "text-right" : "text-left"}
            ${
              initial.state === GlossStateRaw.Approved ?
                "border-green-600 dark:border-green-500"
              : "border-gray-400 dark:border-gray-700"
            }
          `}
          value={draft.text}
          autoComplete="off"
          data-method={draft.source}
          onChange={(e) => {
            dispatch({ type: "inputChange", text: e.target.value });
          }}
          onKeyDown={(e) => {
            onKeyDown(e);
            props.onKeyDown?.(e);
          }}
        />
        {hasModelGloss && (
          <Icon
            className={`
              absolute top-1/2 -translate-y-1/2
              ${right ? "left-3" : "right-3"}
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
            ${right ? "right-0 text-right" : "left-0 text-left"}
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
                onClick={() => {
                  dispatch({ type: "confirm", option });
                }}
              >
                <span className="flex-1">{option.text}</span>
                {(
                  option.source === GlossApprovalMethodRaw.GoogleSuggestion ||
                  option.source === GlossApprovalMethodRaw.LLMSuggestion
                ) ?
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
  source: GlossApprovalMethodRaw;
}

interface AutcompleteState {
  initial: { text: string; state: GlossStateRaw };
  draft: {
    text: string;
    state: GlossStateRaw;
    source?: GlossApprovalMethodRaw;
  };
  options: Array<AutocompleteOption>;
  filteredOptions: Array<AutocompleteOption>;
  selectedOption?: AutocompleteOption;
  optionsVisible: boolean;
  flushTimestamp?: number;
}

type AutocompleteAction =
  | {
      type: "reset";
      value?: { text: string; state: GlossStateRaw };
      suggestions: Array<string>;
      modelGlosses: Partial<Record<"llm_import" | "google", string>>;
    }
  | { type: "inputChange"; text: string }
  | { type: "toggleOptions"; visible?: boolean }
  | { type: "incrementOption"; direction: number }
  | { type: "selectOption" }
  | { type: "confirm"; option?: AutocompleteOption }
  | { type: "revoke" }
  | { type: "blur" };

function useAutocompleteState({
  value,
  suggestions,
  modelGlosses,
  onChange,
}: {
  value?: { text: string; state: GlossStateRaw };
  suggestions: Array<string>;
  modelGlosses: Partial<Record<"llm_import" | "google", string>>;
  onChange(gloss: {
    text: string;
    state: GlossStateRaw;
    source?: GlossApprovalMethodRaw;
  }): void;
}) {
  const [state, dispatch] = useReducer(
    autocompleteReducer,
    {
      value,
      suggestions,
      modelGlosses,
    },
    autocompleteReducerInit,
  );

  useEffect(() => {
    dispatch({
      type: "reset",
      value,
      suggestions,
      modelGlosses,
    });
  }, [value, suggestions, modelGlosses]);

  const flushRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const shouldFlush = flushRef.current !== state.flushTimestamp;
    if (shouldFlush) {
      onChange(state.draft);
    }

    flushRef.current = state.flushTimestamp;
  }, [state.flushTimestamp, state.initial, state.draft, onChange]);

  return { ...state, dispatch };
}

function autocompleteReducerInit({
  value,
  suggestions,
  modelGlosses,
}: {
  value?: {
    text: string;
    state: GlossStateRaw;
  };
  suggestions: Array<string>;
  modelGlosses: Partial<Record<"llm_import" | "google", string>>;
}): AutcompleteState {
  const options = createOptions({ suggestions, modelGlosses });
  const draft =
    value?.text ?
      {
        ...value,
        source: GlossApprovalMethodRaw.UserInput,
      }
    : {
        text: options[0]?.text ?? "",
        source: options[0]?.source,
        state: GlossStateRaw.Unapproved,
      };

  return {
    initial: value ?? { text: "", state: GlossStateRaw.Unapproved },
    draft,
    options,
    filteredOptions: filterOptions(draft.text, options),
    optionsVisible: false,
  };
}

function autocompleteReducer(
  state: AutcompleteState,
  action: AutocompleteAction,
): AutcompleteState {
  switch (action.type) {
    case "reset": {
      const newText = action.value?.text ?? "";
      const newState = action.value?.state ?? GlossStateRaw.Unapproved;

      const hasChanges =
        state.initial.text !== newText || state.initial.state !== newState;
      if (!hasChanges) {
        return state;
      }

      const options = createOptions({
        suggestions: action.suggestions,
        modelGlosses: action.modelGlosses,
      });
      const text =
        state.initial.text === state.draft.text ? newText : state.draft.text;
      return {
        ...state,
        options,
        filteredOptions: filterOptions(text, options),
        initial: {
          text: newText,
          state: newState,
        },
        draft: {
          state:
            state.initial.state === state.draft.state ?
              newState
            : state.draft.state,
          text,
          source: GlossApprovalMethodRaw.UserInput,
        },
      };
    }
    case "inputChange": {
      return {
        ...state,
        draft: {
          text: action.text,
          state: state.draft.state,
          source: GlossApprovalMethodRaw.UserInput,
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
        newIndex = currentIndex + action.direction / Math.abs(action.direction);
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
      const hasChanges =
        state.initial.state !== state.draft.state ||
        state.initial.text !== state.draft.text;

      // We don't want to save unapproved glosses not from user input,
      // because the user hasn't actually done anything yet except to tab past the word.
      const hasUnapprovedAutoGloss =
        state.draft.source &&
        state.draft.source !== GlossApprovalMethodRaw.UserInput &&
        state.draft.state === GlossStateRaw.Unapproved;

      return {
        ...state,
        optionsVisible: false,
        selectedOption: undefined,
        flushTimestamp:
          hasChanges && !hasUnapprovedAutoGloss ?
            Date.now()
          : state.flushTimestamp,
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
    case "selectOption": {
      if (!state.selectedOption) {
        return state;
      }

      const draft = {
        text: state.selectedOption.text,
        source: state.selectedOption.source,
        state: state.draft.state,
      };

      const hasChanges =
        state.initial.state !== draft.state ||
        state.initial.text !== draft.text;

      return {
        ...state,
        draft,
        optionsVisible: false,
        selectedOption: undefined,
        flushTimestamp: hasChanges ? Date.now() : state.flushTimestamp,
      };
    }
    case "confirm": {
      const selectedOption = action.option ?? state.selectedOption;

      let draft;
      if (selectedOption) {
        draft = {
          text: selectedOption.text,
          source: selectedOption.source,
          state: GlossStateRaw.Approved,
        };
      } else {
        draft = {
          text: state.draft.text,
          state: GlossStateRaw.Approved,
          source: GlossApprovalMethodRaw.UserInput,
        };
      }

      const hasChanges =
        state.initial.state !== draft.state ||
        state.initial.text !== draft.text;

      return {
        ...state,
        draft,
        optionsVisible: false,
        selectedOption: undefined,
        flushTimestamp: hasChanges ? Date.now() : state.flushTimestamp,
      };
    }
    default: {
      return state;
    }
  }
}

function normalize(word: string) {
  // From https://stackoverflow.com/a/37511463
  return word.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function createOptions({
  suggestions,
  modelGlosses,
}: {
  suggestions: Array<string>;
  modelGlosses: Partial<Record<"llm_import" | "google", string>>;
}): Array<AutocompleteOption> {
  const options: Array<AutocompleteOption> = [];

  if (modelGlosses.llm_import) {
    options.push({
      text: modelGlosses.llm_import,
      source: GlossApprovalMethodRaw.LLMSuggestion,
    });
  }
  if (modelGlosses.google) {
    options.push({
      text: modelGlosses.google,
      source: GlossApprovalMethodRaw.GoogleSuggestion,
    });
  }

  options.push(
    ...suggestions.map((text) => ({
      text,
      source: GlossApprovalMethodRaw.MachineSuggestion,
    })),
  );

  return options;
}

function filterOptions(input: string, options: Array<AutocompleteOption>) {
  const normalizedInput = normalize(input);
  return input ?
      options.filter((option) =>
        normalize(option.text).includes(normalizedInput),
      )
    : options;
}
