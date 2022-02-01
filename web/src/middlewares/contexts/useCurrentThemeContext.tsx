import {createContext, useCallback, useContext, useReducer} from 'react';
import {Theme} from 'theme-manager';
import {isURL} from '../frontendFunctions';
import upath from 'upath';
import {VPUBFS_ROOT} from '../previewFunctions';
import {useAppContext} from './useAppContext';
import {Log, useLogContext} from './useLogContext';
import {t} from 'i18next';

type CurrentTheme = {
  theme: Theme | null;
  stylePath: string | null; // viewer.jsのstyle= に渡すパス
  // メソッド
  changeTheme: (theme: Theme | null) => void;
};

const CurrentThemeContext = createContext({} as CurrentTheme);
/**
 * PreviewSourceContextを使用したいコンポーネントで呼び出すこと
 * @returns PreviewSourceContextオブジェクト
 */
export function useCurrentThemeContext() {
  return useContext(CurrentThemeContext);
}

/**
 * useReducer用のAction定義
 */
type Actions =
  | {
      type: 'changeTheme';
      func: (state: CurrentTheme) => void;
    }
  | {
      type: 'changeThemeCallback';
      theme: Theme | null;
      stylePath: string;
      log:Log;
    };

type CurrentThemeProps = {
  children: JSX.Element;
};

/**
 * useReducer用のディスパッチャ定義
 * コンポーネント内でディスパッチャを定義すると更新の度に新しい関数オブジェクトが作られて多重呼び出しになるので注意
 * @param state  現在の状態
 * @param action アクションオブジェクト
 * @returns 新しい状態
 */
const reducer = (state: CurrentTheme, action: Actions): CurrentTheme => {
  switch (action.type) {
    case 'changeTheme':
      action.func(state);
      return state;
    case 'changeThemeCallback': // テーマの準備が完了 TODOQ: 複数回呼ばれているので修正する
      console.log('changeThemeCallback', action);
      let stylePath: string | null = null;
      if (action.theme && action.stylePath) {
        stylePath = isURL(action.stylePath)
          ? action.stylePath
          : upath.resolve(VPUBFS_ROOT, action.stylePath);
      }
      action.log.success(
        t('テーマを変更しました', {
          themeName: action.theme?.name,
          themePath: stylePath,
        }),
        1000,
      );
      return {...state, theme: action.theme!, stylePath};
  }
};

export const CurrentThemeContextProvider: React.FC<CurrentThemeProps> = ({
  children,
}) => {
  const app = useAppContext();
  const log = useLogContext();

  /**
   * 対象となるテーマを切り替える
   * TODO: CSS単体ファイルだけではなく、テーマオブジェクトを扱えるようにする。
   * @param theme
   */
  const changeTheme = useCallback(
    (theme: Theme | null) => {
      dispatch({
        type: 'changeTheme',
        func: (state: CurrentTheme) => {
          console.log('changeTheme', theme);
          (async () => {
            if (theme) {
              // TODO: テーマオブジェクトのメソッド呼び出し
              try {
                const themePath = await theme.process(app.vpubFs!);
                //        processThemeString(app, theme)
                // 準備が終わったら状態を変化させる
                dispatch({
                  type: 'changeThemeCallback',
                  theme: theme,
                  stylePath: themePath,
                  log
                });
              } catch (err: any) {
                if (err.message.startsWith('403:')) {
                  console.error(err);
                  log.error(
                    t('テーマが大きすぎます', {
                      error: err.message.split(':')[1],
                    }),
                    3000,
                  );
                } else {
                  console.log(err);
                  log.error(
                    t('テーマの準備に失敗しました', {
                      themeStyle: theme.style,
                      error: err.message,
                    }),
                    3000,
                  );
                }
              }
            } else {
              // TODO: テーマのリセット
              // log.warning('テーマが指定されていません', 1000);
            }
          })();
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app,log],
  );
  /**
   * 初期値
   */
  const initialState = {
    theme: null,
    changeTheme,
  } as CurrentTheme;

  const [currentTheme, dispatch] = useReducer(reducer, initialState);

  return (
    <CurrentThemeContext.Provider value={currentTheme}>
      {children}
    </CurrentThemeContext.Provider>
  );
};
