export default function throttle<Args extends unknown[]>(func: (...args: [...Args]) => void, delay = 300) {
  let timerFlag: NodeJS.Timeout | null = null;
  return (...args: [...Args]) => {
    if (timerFlag === null) {
      func(...args);
      timerFlag = setTimeout(() => {
        timerFlag = null;
      }, delay);
    }
  };
}
