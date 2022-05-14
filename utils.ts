export function oneOf<T>(items: Array<T>): T {
    return items[Math.floor(Math.random() * items.length)]
}

export function oneOfIndex(items: Array<any>): number {
    return Math.floor(Math.random() * items.length)
}