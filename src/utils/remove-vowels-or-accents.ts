const hebrewVowels = /[\u05B0-\u05BD]/g;
const hebrewAccents = /[\u0591-\u05AF\u05BF\u05C0]/g;
const greekAccents = /[\u0300-\u036F]/g;

export const removeHebrewVowels = (text: string): string =>
  text.replace(hebrewVowels, "");

export const removeHebrewAccents = (text: string): string =>
  text.replace(hebrewAccents, "");

export const removeGreekAccents = (text: string): string =>
  text.normalize("NFD").replace(greekAccents, "");
