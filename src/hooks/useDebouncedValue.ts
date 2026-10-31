import { useEffect, useState } from 'react';

/**
 * 值防抖：`delay` 毫秒内连续变化只输出最后一次，首帧立即返回当前值。
 * 常用于搜索输入，避免每次按键都触发查询。
 *
 * @param value 需要防抖的值
 * @param delay 防抖延迟（毫秒），默认 150
 */
export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
