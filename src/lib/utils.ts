export const throttleByArgument = (
  func: (...args: any[]) => any,
  limit: number,
  accessor: (...args: any[]) => any,
) => {
  const fns = new Map()
  return function (...args: any[]) {
    const key = accessor(...args)
    if (!fns.has(key)) {
      fns.set(key, throttle(func, limit))
    }
    const throttledFn = fns.get(key)
    throttledFn(...args)
  }
}

export const throttle = (func: (...args: any[]) => any, limit: number) => {
  let inThrottle = false
  return function (...args: any[]) {
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
