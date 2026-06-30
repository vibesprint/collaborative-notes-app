import { debounce } from './debounce.js'

describe('debounce', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('does not invoke fn synchronously', () => {
        const fn = vi.fn()
        const d = debounce(fn, 100)
        d('a')
        expect(fn).not.toHaveBeenCalled()
    })

    it('invokes fn once after wait ms', () => {
        const fn = vi.fn()
        const d = debounce(fn, 100)
        d('a')
        vi.advanceTimersByTime(99)
        expect(fn).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('a')
    })

    it('collapses rapid calls to a single invocation', () => {
        const fn = vi.fn()
        const d = debounce(fn, 100)
        d('a'); d('b'); d('c')
        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('uses the args from the last call', () => {
        const fn = vi.fn()
        const d = debounce(fn, 100)
        d('a'); d('b'); d('c')
        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledWith('c')
    })

    it('forwards all arguments', () => {
        const fn = vi.fn()
        const d = debounce(fn, 50)
        d(1, 2, 3)
        vi.advanceTimersByTime(50)
        expect(fn).toHaveBeenCalledWith(1, 2, 3)
    })

    it('resets the timer when called again before wait elapses', () => {
        const fn = vi.fn()
        const d = debounce(fn, 100)
        d('a')
        vi.advanceTimersByTime(90)
        d('b')
        vi.advanceTimersByTime(90)
        expect(fn).not.toHaveBeenCalled()
        vi.advanceTimersByTime(10)
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('b')
    })

    it('allows a second invocation after the first has fired', () => {
        const fn = vi.fn()
        const d = debounce(fn, 100)
        d('a')
        vi.advanceTimersByTime(100)
        d('b')
        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenNthCalledWith(1, 'a')
        expect(fn).toHaveBeenNthCalledWith(2, 'b')
    })

    it('keeps separate timers across debounced instances', () => {
        const fn1 = vi.fn()
        const fn2 = vi.fn()
        const d1 = debounce(fn1, 100)
        const d2 = debounce(fn2, 100)
        d1('x')
        d2('y')
        vi.advanceTimersByTime(100)
        expect(fn1).toHaveBeenCalledWith('x')
        expect(fn2).toHaveBeenCalledWith('y')
    })
})
