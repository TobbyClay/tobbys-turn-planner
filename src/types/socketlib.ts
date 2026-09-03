/* eslint-disable @typescript-eslint/no-explicit-any */
import { socketFunctions } from "../socket/_socket";

export type SocketFunctionMap = typeof socketFunctions;
export type SocketFnKey = keyof SocketFunctionMap;
export type SocketFn<T extends SocketFnKey> = SocketFunctionMap[T];

type SocketlibExecuteAsGM = <K extends SocketFnKey>(
    key: K,
    ...args: Parameters<SocketFn<K>>
) => Promise<ReturnType<SocketFn<K>>>;

type SocketlibExecuteForEveryone = <K extends SocketFnKey>(
    key: K,
    ...args: Parameters<SocketFn<K>>
) => Promise<ReturnType<SocketFn<K>>>;

type SocketlibExecuteForOthers = <K extends SocketFnKey>(
    key: K,
    ...args: Parameters<SocketFn<K>>
) => Promise<ReturnType<SocketFn<K>>>;

type SocketlibExecuteAsUser = <K extends SocketFnKey>(
    fn: K,
    userId: string,
    ...params: Parameters<SocketFn<K>>
) => Promise<ReturnType<SocketFn<K>>>;

export interface SocketLib {
    registerModule(id: string): SocketLibType;
    modules: Map<string, SocketLibType>;
}

export declare const socketlib: SocketLib;

export interface SocketLibType {
    executeAsGM: SocketlibExecuteAsGM;
    executeAsUser: SocketlibExecuteAsUser;
    executeForEveryone: SocketlibExecuteForEveryone;
    executeForOthers: SocketlibExecuteForOthers;
    register<T extends (...args: any[]) => any>(id: string, fn: T): void;
}
