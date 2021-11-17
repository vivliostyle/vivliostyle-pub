import {createContext, useState, useContext, useReducer, Dispatch} from 'react';
import {stringify} from '@vivliostyle/vfm';
import {DocumentData, DocumentReference} from 'firebase/firestore';
import {parse} from 'scss-parser';
import {
  getFileContentFromGithub,
  updateCache,
  updateCacheFromPath,
} from './frontendFunctions';
import {useAuthorizedUser} from './useAuthorizedUser';
import {useRepositoryContext} from './useRepositoryContext';
import path from 'path';

const VPUBFS_ROOT = '/vpubfs';

/**
 * URLか判定
 * @param value
 * @returns
 */
const isURL = (value: string) => /^http(?:s)?:\/\//g.test(value);

/**
 * モデルクラスのインターフェースに相当
 */
export type PreviewSource = {
  // Read Onlyプロパティに相当
  path: string | null;
  vpubPath: string | null; // viewer.jsのx= に渡すパス
  text: string | null;
  theme: string | null;
  stylePath: string  | null; // viewer.jsのstyle= に渡すパス
  // パブリック メソッドに相当
  changeFile: (path: string | null, text: string | null) => void;
  changeTheme: (text: string | null) => void;
  modifyText: (text: string | null) => void;
  commit: (
    session: DocumentReference<DocumentData> | undefined,
    branch: string | undefined,
  ) => void;
};

type Actions =
  | {type: 'changeFileCallback'; path: string | null; vPubPath:string|null; text: string | null}
  | {type: 'changeThemeCallback'; theme: string | null}
  | {type: 'modifyText'; text: string | null}
  | {
      type: 'commit';
      session: DocumentReference | undefined;
      branch: string | undefined;
    };

const PreviewSourceContext = createContext({} as PreviewSource);

/**
 * PreviewSourceContextを使用したいコンポーネントで呼び出すこと
 * @returns PreviewSourceContentオブジェクト
 */
export function usePreviewSourceContext() {
  return useContext(PreviewSourceContext);
}

/**
 * PreviewSourceコンテクストコンポーネント
 * @param children 子要素
 * @returns
 */
export function PreviewSourceContextProvider({
  children,
}: {
  children: JSX.Element;
}) {
  let dispatcher: Dispatch<Actions> | undefined;

  const repository = useRepositoryContext();
  const {user, isPending} = useAuthorizedUser();

  /**
   * ファイルをリポジトリにコミットする
   * @param session
   * @param branch
   */
  const commit = async (
    session: DocumentReference<DocumentData> | undefined,
    branch: string | undefined,
  ) => {};
  /**
   * 対象となるファイルを切り替える
   * @param path
   * @param text
   */
  const changeFile = (filePath: string | null, text: string | null) => {
    // TODO: ファイル未選択や空ファイルへの対応
    const {path:srcPath, text:resultText} = transpile(filePath!, text!);
    const vPubPath = path.join(VPUBFS_ROOT, srcPath??'');
    dispatch({type: 'changeFileCallback', path: filePath,vPubPath: vPubPath, text: resultText});
  };
  /**
   * 対象となるテーマを切り替える
   * TODO: CSS単体ファイルだけではなく、テーマオブジェクトを扱えるようにする。
   * @param theme
   */
  const changeTheme = (theme: string | null) => {
    console.log('changeTheme', theme, user);
    if (theme) {
      processTheme(theme);
    } else {
      // TODO: テーマのリセット
    }
    // この時点では状態は変化しない。
    // 全ての準備が完了したらchangeThemeCallbackを呼び出す
  };
  /**
   * テキストを更新する
   * @param text
   */
  const modifyText = (text: string | null) => {
    dispatch({type: 'modifyText', text});
  };

  /**
   *
   */
  const [state] = useState<PreviewSource>({
    path: null,
    vpubPath: null,
    text: null,
    theme: null,
    stylePath: null,
    changeFile: changeFile,
    changeTheme: changeTheme,
    modifyText: modifyText,
    commit: commit,
  });

  /**
   * HTMLからアプリケーションキャッシュの対象になるファイルのリストアップ
   * @param text
   * @returns
   */
  const pickupHtmlResources = (text: string): string[] => {
    const imagePaths = [] as string[];
    const parser = new DOMParser();
    // アプリケーションキャッシュの対象になる画像ファイルの取得
    parser
      .parseFromString(text, 'text/html')
      .querySelectorAll('img')
      .forEach((element) => {
        const src = element.getAttribute('src');
        if (src && !isURL(src)) imagePaths.push(src);
      });
    // TODO: link要素によるCSSファイルも扱う

    return imagePaths;
  };

  /**
   * CSSからアプリケーションキャッシュの対象になるファイルのリストアップ
   * @param text
   * @returns
   */
  const pickupCSSResources = (text: string): string[] => {
    // TODO: パースして取り出す エラー処理も重要
    // const ast = parse(text);

    const imagePaths = Array.from(
      text.matchAll(/url\("?(.+?)"?\)/g),
      (m) => m[1],
    );
    return imagePaths;
  };

  /**
   * MarkDownファイルをHTMLに変換する
   * @param path
   * @param text
   * @returns {path, text}
   */
  const transpile = (
    path: string,
    text: string,
  ): {path: string; text: string} => {
    if (path && text && path.endsWith('.md')) {
      path = path.replace(/\.md$/, '.html');
      text = stringify(text);
    }
    console.log('transpiled', path, '\n'/*, text*/);
    if (path.endsWith('.html')) {
      const imagePaths = pickupHtmlResources(text);
      Promise.all(
        imagePaths.map((imagePath) =>
          updateCacheFromPath(
            repository.owner!,
            repository.repo!,
            repository.branch!,
            path!,
            imagePath,
            user!,
          ),
        ),
      ).catch((error) => {
        if (error.message.startsWith('403:')) {
          console.error(error.message);
          // toast({
          //   title: "file size too large (Max 1MB) : " + error.message.split(':')[1],
          //   status: "error"
          // });
        }
      });
      console.log('imagePaths', imagePaths);
    }
    updateCache(path, text).then(() => {});

    return {path, text};
  };

  /**
   * テーマの準備
   */
  const processTheme = (path: string) => {
    if (user && path && !isURL(path)) {
      (async () => {
        const content = await getFileContentFromGithub(
          repository.owner!,
          repository.repo!,
          repository.branch!,
          path,
          user,
        );
        if ('content' in content) {
          const stylesheet = content.content;
          await updateCache(path, stylesheet);
          const imagesOfStyle = pickupCSSResources(stylesheet);
          await Promise.all(
            imagesOfStyle.map((imageOfStyle) =>
              updateCacheFromPath(
                repository.owner!,
                repository.repo!,
                repository.branch!,
                stylesheet,
                imageOfStyle,
                user,
              ),
            ),
          ).catch((error) => {
            if (error.message.startsWith('403:')) {
              console.error(error);
              // toast({
              //   title: "file size too large (Max 1MB) : " + error.message.split(':')[1],
              //   status: "error"
              // });
            }
          });
        }
        pickupCSSResources(path);

        // 準備が終わったら状態を変化させる
        if (dispatcher) {
          dispatcher({type: 'changeThemeCallback', theme: path});
        }
      })();
    }
  };

  /**
   * 処理のディスパッチ
   * @param state
   * @param action
   * @returns
   */
  const reducer = (state: PreviewSource, action: Actions): PreviewSource => {
    switch (action.type) {
      case 'changeFileCallback':
        console.log('changeFileCallback');
        return {
          ...state,
          path:action.path,
          vpubPath:action.vPubPath,
          text:action.text,
        };
      case 'changeThemeCallback': // テーマの準備が完了
        console.log('changeThemeCallback', action.theme);
        let stylePath:string='';
        if(action.theme){
          stylePath = isURL(action.theme) ? action.theme : path.join(VPUBFS_ROOT, action.theme);
        }
        return {...state, theme: action.theme!,stylePath};
      case 'modifyText':  // テキストが変更された
        return {...state, text: action.text};
      case 'commit':
        commit(action.session!, action.branch);
        return state;
    }
  };

  const [previewTarget, dispatch] = useReducer(reducer, state);
  dispatcher = dispatch;

  return (
    <PreviewSourceContext.Provider value={previewTarget}>
      {children}
    </PreviewSourceContext.Provider>
  );
}
