/**
 * consoleにコンポーネント名を付けて表示するためのラッパー
 * ユーザに通知するならLogContextを使用する
 * 使用例
 * const {_log, _err} = devConsole('[useAppContext]');
 * _log('init');
 * @param header コンポーネント名
 * @param isEnable 表示フラグ
 * @returns
 */
export function devConsole(header: string, isEnable: boolean = true) {
  return {
    _log: isEnable ? console.log.bind(console, header) : () => {},
    _err: isEnable ? console.error.bind(console, header) : () => {},
  };
}
