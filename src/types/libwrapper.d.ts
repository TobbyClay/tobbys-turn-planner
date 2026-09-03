declare namespace libWrapper {
    function register<Wrapped extends (...args: any[]) => any>(
        moduleId: string,
        path: string,
        wrapper: (
            wrapped: (
                ...args: Parameters<Wrapped>
            ) => ReturnType<Wrapped> & ThisType<any>,
            ...args: Parameters<Wrapped>
        ) => ReturnType<Wrapped>,
        op: "WRAPPER"
    ): void;

    function register<Wrapped extends (...args: any[]) => any>(
        moduleId: string,
        path: string,
        wrapper: (...args: Parameters<Wrapped>) => ReturnType<Wrapped>,
        op: "OVERRIDE"
    );

    function register<Wrapped extends (...args: any[]) => any>(
        moduleId: string,
        path: string,
        wrapper: (
            wrapped: (
                ...args: Parameters<Wrapped>
            ) => ReturnType<Wrapped> & ThisType<any>,
            ...args: Parameters<Wrapped>
        ) => ReturnType<Wrapped>,
        op: "MIXED"
    );
}
