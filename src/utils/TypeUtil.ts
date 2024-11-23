const arrH = Symbol('arrH');
type ArrH = typeof arrH;

type UtilArrayOfLen<T extends number, TT, Initial extends TT[]> = Initial extends { length: T }
    ? Initial
    : UtilArrayOfLen<T, TT, [TT, ...Initial]>;

export type ArrayOfLen<T extends number, TT> = UtilArrayOfLen<T, TT, []>;

export type Increment<T extends number> = [ArrH, ...ArrayOfLen<T, ArrH>]['length'] extends number
    ? [ArrH, ...ArrayOfLen<T, ArrH>]['length']
    : never;
export type Decrement<T extends number> = ArrayOfLen<T, ArrH> extends [ArrH, ...infer A] ? A['length'] : never;
