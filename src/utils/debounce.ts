export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return function (this: any, ...args: any[]) {
        if (timeoutId !== null) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    } as T;
}
