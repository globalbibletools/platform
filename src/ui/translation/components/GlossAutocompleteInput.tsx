import { Icon } from "@/components/Icon";
import { fontMap } from "@/fonts";
import {
  GlossApprovalMethodRaw,
  GlossStateRaw,
} from "@/modules/translation/types";
import { useTextWidth } from "@/utils/text-width";
import {
  ComponentProps,
  CSSProperties,
  KeyboardEvent,
  useEffect,
  useId,
  useReducer,
  useRef,
} from "react";

export default function GlossAutocompleteInput({
  className = "",
  style,
  right,
  dir,
  font = fontMap["Noto Sans"],

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
  font?: string;

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
  const cssId = useId();

  const [state, dispatch] = useAutocompleteState({
    suggestions,
    modelGlosses,
    value,
    onChange,
  });

  const { initial, filteredOptions, selectedOption, optionsVisible } = state;

  return (
    <div
      className={`relative ${className}`}
      style={style}
      dir={dir}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) {
          return;
        }

        dispatch({ type: "blur" });
      }}
    >
      <Input
        {...props}
        aria-describedby={`word-help-${cssId}`}
        state={state}
        dispatch={dispatch}
        right={right}
        font={font}
        saving={saving}
      />
      {optionsVisible && filteredOptions.length > 0 && (
        <ol
          className={`
            z-10 absolute min-w-full min-h-[24px] max-h-80 bg-white overflow-auto mt-1 rounded border border-gray-400 shadow
            dark:bg-gray-800 dark:border-gray-700
            ${right ? "right-0 text-right" : "left-0 text-left"}
          `}
        >
          {filteredOptions.map((option, i, options) => {
            const prevOption = options[i - 1];

            const separator =
              option.source === GlossApprovalMethodRaw.MachineSuggestion &&
              prevOption &&
              prevOption.source !== GlossApprovalMethodRaw.MachineSuggestion;

            return (
              <AutocompleteOption
                key={`${option.text}-${option.source}`}
                option={option}
                selected={option === selectedOption}
                separator={separator}
                dispatch={dispatch}
              />
            );
          })}
        </ol>
      )}
      <GlossDescription
        id={`word-help-${cssId}`}
        className="row-start-4"
        right={right}
        glossState={initial.state}
        saving={saving}
      />
    </div>
  );
}

function AutocompleteOption({
  option,
  selected,
  dispatch,
  separator = false,
}: {
  option: AutocompleteOption;
  selected: boolean;
  dispatch: AutocompleteDispatch;
  separator?: boolean;
}) {
  return (
    <li
      tabIndex={-1}
      ref={
        selected ?
          (el) => {
            el?.scrollIntoView({
              block: "nearest",
            });
          }
        : undefined
      }
      className={`
        px-3 py-1 whitespace-nowrap cursor-pointer flex items-center gap-2 relative
        ${selected ? "bg-green-200 dark:bg-green-400 dark:text-gray-900" : ""}
      `}
      onClick={() => {
        dispatch({ type: "confirm", option });
      }}
    >
      {separator && (
        <div className="absolute top-0 w-[calc(100%-1rem)] border-t border-gray-300 -mx-1" />
      )}
      {(
        option.source === GlossApprovalMethodRaw.GoogleSuggestion ||
        option.source === GlossApprovalMethodRaw.LLMSuggestion
      ) ?
        <Icon icon="robot" size="xs" />
      : undefined}
      <span className="flex-1">{option.text}</span>
    </li>
  );
}

function Input({
  right,
  font,
  saving,
  state,
  dispatch,
  ...props
}: {
  right?: boolean;
  font: string;
  saving: boolean;
  state: AutcompleteState;
  dispatch: AutocompleteDispatch;
} & ComponentProps<"input">) {
  const { initial, draft } = state;

  const inputRef = useRef<HTMLInputElement>(null);

  const hasModelGloss =
    draft.source &&
    draft.source !== GlossApprovalMethodRaw.UserInput &&
    initial.state === GlossStateRaw.Unapproved;

  const width = useTextWidth({
    text: draft.text,
    fontFamily: font,
    fontSize: "1rem",
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

        if (state.optionsVisible) {
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
          w-fit flex rounded focus-within:outline-2 outline-green-300
        `}
    >
      <div className="relative">
        <input
          {...props}
          ref={inputRef}
          className={`
            border shadow-inner outline-0
            px-3 h-[26px] bg-white
            dark:shadow-none dark:bg-gray-900
            box-content min-w-12
            ${
              hasModelGloss ?
                right ? "pl-8"
                : "pr-8"
              : ""
            }
            ${right ? "text-right rounded-r border-l-0" : "text-left rounded-l border-r-0"}
            ${
              initial.state === GlossStateRaw.Approved ?
                "border-green-600 dark:border-green-500"
              : "border-gray-400 dark:border-gray-700"
            }
          `}
          style={{ width: `${width}px`, fontFamily: font }}
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
              ${right ? "left-2" : "right-2"}
            `}
            icon="robot"
            size="xs"
          />
        )}
      </div>
      <button
        className={`
            h-7 w-7 inline-flex justify-center items-center outline-0 border bg-white
            disabled:opacity-50 dark:bg-gray-800
            ${right ? "rounded-l" : "rounded-r"}
            ${
              initial.state === GlossStateRaw.Unapproved ?
                "text-blue-800 dark:text-green-400 border-blue-800 dark:border-green-800"
              : "text-red-800 border-red-800"
            }
          `}
        tabIndex={-1}
        title={
          initial.state === GlossStateRaw.Unapproved ? "Approve" : "Revoke"
        }
        disabled={saving}
        onClick={() => {
          if (initial.state === GlossStateRaw.Unapproved) {
            dispatch({ type: "confirm" });
          } else {
            dispatch({ type: "revoke" });
          }
          inputRef.current?.focus();
        }}
      >
        <Icon
          icon={
            initial.state === GlossStateRaw.Unapproved ?
              "check"
            : "arrow-rotate-left"
          }
          fixedWidth
        />
      </button>
    </div>
  );
}

function GlossDescription({
  id,
  className = "",
  glossState,
  saving,
}: {
  id: string;
  className?: string;
  glossState: GlossStateRaw;
  right?: boolean;
  saving: boolean;
}) {
  return (
    <div
      id={id}
      className={`
        ${className}
        text-xs px-3 text-start
        ${glossState === GlossStateRaw.Approved ? "text-green-600" : "text-slate-500"}
      `}
    >
      {(() => {
        if (saving) {
          return (
            <>
              <Icon icon="arrows-rotate" className="me-1" />
              <span dir="ltr">Saving</span>
            </>
          );
        } else if (glossState === GlossStateRaw.Approved) {
          return (
            <>
              <Icon icon="check" className="me-1" />
              <span dir="ltr">Approved</span>
            </>
          );
        } else {
          return null;
        }
      })()}
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
  modelOptions: Array<AutocompleteOption>;
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

type AutocompleteDispatch = (action: AutocompleteAction) => void;

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

  return [state, dispatch] as const;
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
  const modelOptions = createModelOptions(modelGlosses);
  const options = createOptions(suggestions);
  const defaultOption =
    modelOptions.find(
      (option) => option.source === GlossApprovalMethodRaw.LLMSuggestion,
    ) ??
    options[0] ??
    modelOptions.find(
      (option) => option.source === GlossApprovalMethodRaw.GoogleSuggestion,
    );
  const draft =
    value?.text ?
      {
        ...value,
        source: GlossApprovalMethodRaw.UserInput,
      }
    : {
        text: defaultOption?.text ?? "",
        source: defaultOption?.source,
        state: GlossStateRaw.Unapproved,
      };

  return {
    initial: value ?? { text: "", state: GlossStateRaw.Unapproved },
    draft,
    modelOptions,
    options,
    filteredOptions: filterOptions(draft.text, options, modelOptions),
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

      const modelOptions = createModelOptions(action.modelGlosses);
      const options = createOptions(action.suggestions);
      const text =
        state.initial.text === state.draft.text ? newText : state.draft.text;
      return {
        ...state,
        modelOptions,
        options,
        filteredOptions: filterOptions(text, options, modelOptions),
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
        filteredOptions: filterOptions(
          action.text,
          state.options,
          state.modelOptions,
        ),
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

function createModelOptions(
  modelGlosses: Partial<Record<"llm_import" | "google", string>>,
): Array<AutocompleteOption> {
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

  return options;
}

function createOptions(suggestions: Array<string>): Array<AutocompleteOption> {
  return suggestions.map((text) => ({
    text,
    source: GlossApprovalMethodRaw.MachineSuggestion,
  }));
}

function filterOptions(
  input: string,
  options: Array<AutocompleteOption>,
  modelOptions: Array<AutocompleteOption>,
) {
  const normalizedInput = normalize(input);
  const filteredOptions =
    input ?
      options.filter((option) =>
        normalize(option.text).includes(normalizedInput),
      )
    : options;

  return [...modelOptions, ...filteredOptions];
}
