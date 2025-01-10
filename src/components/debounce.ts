export default function debounce<Args extends unknown[]>(
  func: (...args: [...Args]) => void,
  timeout = 300,
) {
  let timer: NodeJS.Timeout;
  return (...args: [...Args]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}
