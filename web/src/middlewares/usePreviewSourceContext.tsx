import {createContext, useState, useContext, useReducer, Dispatch, useEffect} from 'react';
import {stringify} from '@vivliostyle/vfm';
import {DocumentData, DocumentReference} from 'firebase/firestore';
import {parse} from 'scss-parser';
import {
  getFileContentFromGithub,
  updateCache,
  updateCacheFromPath,
} from './frontendFunctions';
import {useRepositoryContext} from './useRepositoryContext';
import path from 'path';
import {useAppContext} from './useAppContext';
import {Theme} from 'theme-manager';

const VPUBFS_ROOT = '/vpubfs';

/**
 * URLか判定
 * @param value
 * @returns
 */
const isURL = (value: string) => /^http(?:s)?:\/\//g.test(value);


/**
 * 遅延処理
 */
// const REFRESH_MS = 2000;
// function useDefferedEffect(
//   fn: () => void,
//   args: React.DependencyList,
//   duration: number,
// ) {
//   useEffect(() => {
//     const timer = setTimeout(() => fn(), duration);
//     return () => {
//       clearTimeout(timer);
//     };
//   }, args);
// }

/**
 * 遅延処理
 */
  // useDefferedEffect(
  //   () => {
  //     if(modifiedText.text){
  //       console.log('onUpdate');
  //       if (!session) {
  //         // console.log('same text',session ,updatedText, currentFile.text);
  //         return;
  //       }
  //       session
  //         .update({
  //           userUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  //           text: modifiedText.text,
  //           state: 'update',
  //         })
  //         .then(() => {
  //           setStatus('saved');
  //         });
  //       }
  //   },
  //   [modifiedText.text],
  //   REFRESH_MS,
  // );

/**
 * モデルクラスのインターフェースに相当
 */
export type PreviewSource = {
  // Read Onlyプロパティに相当
  path: string | null;
  vpubPath: string | null; // viewer.jsのx= に渡すパス
  text: string | null;
  theme: string | null;
  stylePath: string | null; // viewer.jsのstyle= に渡すパス
  // パブリック メソッドに相当
  changeFile: (path: string | null, text: string | null) => void;
  changeTheme: (text: Theme | null) => void;
  modifyText: (text: string | null) => void;
  commit: (
    session: DocumentReference<DocumentData> | undefined,
    branch: string | undefined,
  ) => void;
};

type Actions =
  | {
      type: 'changeFileCallback';
      path: string | null;
      vPubPath: string | null;
      text: string | null;
    }
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
  const app = useAppContext();
  const repository = useRepositoryContext();

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
    transpile(filePath!, text!);
  };
  /**
   * 対象となるテーマを切り替える
   * TODO: CSS単体ファイルだけではなく、テーマオブジェクトを扱えるようにする。
   * @param theme
   */
  const changeTheme = (theme: Theme | null) => {
    console.log('changeTheme', theme, app.user);
    if (theme) {
      processTheme(theme.files[0]);
    } else {
      // TODO: テーマのリセット
    }
  };
  /**
   * テキストを更新する
   * @param text
   */
  const modifyText = (text: string | null) => {
    dispatch({type: 'modifyText', text});
  };

  /**
   * 初期値
   */
  const [state] = useState<PreviewSource>({
    // properties
    path: null,
    vpubPath: null,
    text: null,
    theme: null,
    stylePath: null,
    // methods
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
  const transpile = (srcPath: string, text: string): void => {
    if (srcPath && text && srcPath.endsWith('.md')) {
      srcPath = srcPath.replace(/\.md$/, '.html');
      text = stringify(text);
    }
    console.log('transpiled', path, '\n' /*, text*/);
    if (srcPath.endsWith('.html')) {
      const imagePaths = pickupHtmlResources(text);
      Promise.all(
        imagePaths.map((imagePath) =>
          updateCacheFromPath(
            repository.owner!,
            repository.repo!,
            repository.currentBranch!,
            srcPath!,
            imagePath,
            app.user!,
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
    updateCache(srcPath, text).then(() => {});
    const vPubPath = path.join(VPUBFS_ROOT, srcPath ?? '');
    // 準備が終わったら状態を変化させる
    if (dispatcher) {
      dispatch({
        type: 'changeFileCallback',
        path: srcPath,
        vPubPath: vPubPath,
        text: text,
      });
    }
  };

  const fetchTheme = () => {
    const VPUBFS_CACHE_NAME = 'vpubfs';
    const VPUBFS_ROOT = '/vpubfs';
    (async () => {
      // const cache = await caches.open(VPUBFS_CACHE_NAME);
      // const file: File = new File([theme.files[theme.style]], theme.style);
      // const headers = new Headers();
      // headers.append('content-type', 'text/css');
      // const stylesheetPath = `${theme.name}/${theme.style}`;
      // const vpubfsPath = `${VPUBFS_ROOT}/${stylesheetPath}`;
      // await cache.delete(new Request(vpubfsPath));
      // await cache.put(
      //   vpubfsPath,
      //   new Response(theme.files[theme.style], {headers}),
      // );
      // previewSource.changeTheme(stylesheetPath);
      // setStylesheet(stylesheetPath);
    })();
  };

  /**
   * テーマの準備
   */
  const processTheme = (path: string) => {
    if (app.user && path && !isURL(path)) {
      (async () => {
        const content = await getFileContentFromGithub(
          repository.owner!,
          repository.repo!,
          repository.currentBranch!,
          path,
          app.user!,
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
                repository.currentBranch!,
                stylesheet,
                imageOfStyle,
                app.user!,
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
      case 'changeFileCallback': // ドキュメントの準備が完了
        console.log('changeFileCallback');
        return {
          ...state,
          path: action.path,
          vpubPath: action.vPubPath,
          text: action.text,
        };
      case 'changeThemeCallback': // テーマの準備が完了
        console.log('changeThemeCallback', action.theme);
        let stylePath: string = '';
        if (action.theme) {
          stylePath = isURL(action.theme)
            ? action.theme
            : path.join(VPUBFS_ROOT, action.theme);
        }
        return {...state, theme: action.theme!, stylePath};
      case 'modifyText': // テキストが変更された
        return {...state, text: action.text};
      case 'commit': // コミット
        commit(action.session!, action.branch);
        return state;
    }
  };

  const [previewTarget, dispatch] = useReducer(reducer, state);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dispatcher = dispatch;
  }, [dispatch]);
  return (
    <PreviewSourceContext.Provider value={previewTarget}>
      {children}
    </PreviewSourceContext.Provider>
  );
}
