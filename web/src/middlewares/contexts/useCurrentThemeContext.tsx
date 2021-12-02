import { createContext, useCallback, useContext, useReducer } from "react";
import { Theme } from "theme-manager";
import { isURL } from "../frontendFunctions";
import upath from "upath";
import { VPUBFS_ROOT } from "../previewFunctions";
import { useAppContext } from "./useAppContext";
import { useLogContext } from "./useLogContext";

type CurrentTheme ={
    theme: Theme | null;
    stylePath: string | null; // viewer.jsのstyle= に渡すパス  

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

type Actions =
| {type:"changeThemeCallback"; theme: Theme | null; stylePath: string; } 


type CurrentThemeProps = {
    children: JSX.Element;
}

export const CurrentThemeContextProvider: React.FC<CurrentThemeProps> = ({
    children
}) => {
    const app = useAppContext();
    const log = useLogContext();

    let n = 0;

    /**
   * 対象となるテーマを切り替える
   * TODO: CSS単体ファイルだけではなく、テーマオブジェクトを扱えるようにする。
   * @param theme
   */
  const changeTheme = useCallback(
    (theme: Theme | null) => {
      console.log('changeTheme', theme);
      if (theme) {
        // TODO: テーマオブジェクトのメソッド呼び出し
        theme.process(app.vpubFs!)
//        processThemeString(app, theme)
          .then((themePath) => {
            // 準備が終わったら状態を変化させる
            if (dispatch) {
              dispatch({
                type: 'changeThemeCallback',
                theme: theme,
                stylePath: themePath,
              });
              log.success('テーマを変更しました:'+theme.name+":"+themePath,1000);
            }
          })
          .catch((err) => {
            if (err.message.startsWith('403:')) {
              console.error(err);
              log.error(
                'file size too large : ' + err.message.split(':')[1],
                3000,
              );
            } else {
              console.log(err);
              log.error(
                `テーマの準備に失敗しました(${theme.style}) : ${err.message}`,
                3000,
              );
            }
          });
      } else {
        // TODO: テーマのリセット
        // log.warning('テーマが指定されていません', 1000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app],
  );

    const initialState = {
        theme:null,
        changeTheme
    } as CurrentTheme;


    const reducer = (state:CurrentTheme, action:Actions):CurrentTheme => { 
        switch(action.type) {
            case 'changeThemeCallback': // テーマの準備が完了 TODOQ: 複数回呼ばれているので修正する
              console.log('changeThemeCallback', action);
              let stylePath: string | null = null;
              if (action.theme && action.stylePath) {
                stylePath = isURL(action.stylePath)
                  ? action.stylePath
                  : upath.resolve(VPUBFS_ROOT, action.stylePath);
              }
              return {...state, theme: action.theme!, stylePath};

        }
    }

    const [currentTheme, dispatch] = useReducer(reducer, initialState);

    return (
        <CurrentThemeContext.Provider value={currentTheme}>
        {children}
        </CurrentThemeContext.Provider>
    );
}