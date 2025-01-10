const KEY_SPLIT_REGEX = /\[|\]/;

export function parseForm(form: FormData) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    const keyParts = key.split(KEY_SPLIT_REGEX).filter((part) => part !== "");
    parseObject(data, keyParts[0], keyParts.slice(1), value);
  }
  return data;
}

function parseObject(
  obj: Record<string, any>,
  property: string,
  keyParts: string[],
  value: FormDataEntryValue,
) {
  if (keyParts.length === 0) {
    obj[property] = value;
    return;
  }

  const nextKey = keyParts[0];
  const index = parseInt(nextKey);
  if (isNaN(index)) {
    obj[property] ??= {};
    parseObject(obj[property], nextKey, keyParts.slice(1), value);
  } else {
    obj[property] ??= [];
    parseArray(obj[property], index, keyParts.slice(1), value);
  }
}

function parseArray(
  arr: any[],
  i: number,
  keyParts: string[],
  value: FormDataEntryValue,
) {
  if (keyParts.length === 0) {
    arr[i] = value;
    return;
  }

  const nextKey = keyParts[0];
  const index = parseInt(nextKey);
  if (isNaN(index)) {
    arr[i] ??= {};
    parseObject(arr[i], nextKey, keyParts.slice(1), value);
  } else {
    arr[i] ??= [];
    parseArray(arr[i], index, keyParts.slice(1), value);
  }
}
