/**
 * PDF生成管理コンテクスト
 */
import {devConsole} from '@middlewares/frontendFunctions';
import {getFunctions, httpsCallable} from 'firebase/functions';
import {createContext, FC, useContext, useMemo, useState} from 'react';
import {useLogContext} from './useLogContext';
import * as UI from '@components/ui';
import {t} from 'i18next';
import {doc, onSnapshot} from 'firebase/firestore';
import {db} from '@services/firebase';
import {Theme} from 'theme-manager';

const {_log, _err} = devConsole('[usePDFBuildContext]');

/**
 * FireStoreに保存されているレコード
 *
 * TODO: branch,themeName,状態(処理中、成功、失敗),失敗の原因は追加したい
 */
interface BuildRecord {
  url: string | null;
  signedUrl: string | null;
  repo: {
    owner: string;
    repo: string;
    stylesheet: string;
  };
}

/**
 * 操作
 */
type PDFBuild = {
  // vivliostyle.config.jsに基いてPDF作成
  buildProject: ({
    owner,
    repo,
    branch,
    theme,
  }: {
    owner: string;
    repo: string;
    branch: string;
    theme: Theme | null;
  }) => void;
  // 現在選択しているMarkdownやHTMLだけからPDF作成 (プレビューのvivliostyle.jsを使用)
  buildDocument: () => void;
  // ログの内容を全て削除
  clearLog: () => void;
};
/**
 * ビルド状態
 */
type BuildStatus =
  | 'idle' // ビルド指示待ち(初期状態)
  | 'waiting'; // ビルド要求後結果待ち (この状態では再ビルド指示は受け付けない)
type BuildResult =
  | 'success' // ビルド成功
  | 'failed' // ビルド失敗
  | 'timeout' // タイムアウト
  | 'cancel'; // ユーザによるキャンセル
type PDFBuildState = {
  id: string | null; // buildID
  status: BuildStatus | BuildResult; // isProcessingを細分化
};
/**
 * ビルドログ
 */
type PDFBuildLogEntry = {
  owner: string; // リポジトリのオーナー
  repository: string; // リポジトリ名
  branch: string; // ブランチ
  buildID: string; // ビルドID
  buildDate: Date; // 生成日時 (ビルド依頼を送った日時)
  result?: BuildResult; // ビルド結果
  url?: string; // 生成されたPDFのURL
  expireDate?: Date; // 有効期限 (成功したときのみ。正確な値が取得できないのでbuildDate+15分とする)
  message?: string; // エラー情報など
};

/**
 * PDFビルドログコンテクストオブジェクトの作成
 */
const PDFBuildLogContext = createContext<PDFBuildLogEntry[]>([]);
/**
 * ビルド状態コンテクストオブジェクトの作成
 */
const PDFBuildStateContext = createContext<PDFBuildLogEntry | null>(null);
/**
 * PDFビルド操作オブジェクトの作成
 */
const PDFBuildContext = createContext<PDFBuild>({
  buildProject: ({
    owner,
    repo,
    branch,
    theme,
  }: {
    owner: string;
    repo: string;
    branch: string;
    theme: Theme | null;
  }) => {},
  buildDocument: () => {},
  clearLog: () => {},
});

/**
 * PDF生成Logを読み込みたいコンポーネントで呼び出すこと
 * @returns PDFBuildLogContextオブジェクト
 */
export const usePDFBuildLogContext = () => useContext(PDFBuildLogContext);

/**
 * ビルド状態を読み込みたいコンポーネントで呼び出すこと
 * @returns PDFBuildStateContextオブジェクト
 */
export const usePDFBuildStateContext = () => useContext(PDFBuildStateContext);

/**
 * PDFを生成したいコンポーネントで呼び出すこと
 * @returns PDFBuildContextオブジェクト
 */
export const usePDFBuildContext = () => useContext(PDFBuildContext);

/**
 * PDFBuildContextProviderコンテクスト
 *
 * LogContextProviderよりも子孫に配置すること
 *
 * @param param0
 * @returns
 */
export const PDFBuildContextProvider: FC = ({children}) => {
  const log = useLogContext();
  const [buildLog, setBuildLog] = useState<PDFBuildLogEntry[]>([]); // ビルドログ
  const [buildState, setBuildState] = useState<PDFBuildLogEntry | null>(null); // ビルド状態

  const state = useMemo(() => {
    return {
      // プロジェクト全体をビルド
      buildProject: ({
        owner,
        repo,
        branch,
        theme,
      }: {
        owner: string;
        repo: string;
        branch: string;
        theme: Theme | null;
      }) => {
        _log('buildProject', owner, repo, theme);
        setBuildState((state) => {
          if (state !== null && state.result !== undefined) {
            throw new Error('すでにビルド処理中です');
          }
          return state;
        });

        const functions = getFunctions();
        const buildPDF = httpsCallable(functions, 'buildPDF');
        const themeName = theme ? theme.name : '';
        buildPDF({owner, repo, themeName}) // TODO: branchにも対応
          .then((result: any) => {
            _log('buildPDF function', result);
            const buildID = result.data.buildID;
            log.info(t('ビルドを開始しました'), 5000);
            const entry = {
              owner: owner,
              repository: repo,
              branch: '',
              buildID: buildID,
              buildDate: new Date(),
            } as PDFBuildLogEntry;
            // 現在処理中
            setBuildState(entry);
            // ログに追加
            setBuildLog((buf) => {
              _log('buildProject');
              return [entry, ...buf];
            });
            // Firestoreの更新購読
            const unsubscribe = onSnapshot(
              doc(db, 'builds', buildID),
              (doc) => {
                const {signedUrl} = doc.data() as BuildRecord;
                _log('Current data: ', doc.data());
                if (!signedUrl) return;
                // 購読終了
                unsubscribe();
                _log('buildStatus unsubscribed', unsubscribe);
                const finishEntry: PDFBuildLogEntry = {
                  ...entry,
                  url: signedUrl,
                };
                setBuildLog((buf) => {
                  return buf;
                });
                setBuildState(null);
                log.success(
                  <UI.Text>
                    {t('以下のリンクをクリックしてダウンロードしてください')}
                    &nbsp;
                    <UI.Link
                      href={signedUrl}
                      isExternal
                      textDecoration={'underline'}
                      download="result.pdf"
                    >
                      Download PDF
                    </UI.Link>
                  </UI.Text>,
                  5000,
                );
              },
            );
          })
          .catch((err: any) => {
            setBuildLog((buf) => {
              const entry = {
                owner: owner,
                repository: repo,
                branch: '',
                buildDate: new Date(),
                result: 'failed',
                message: err.message,
              } as PDFBuildLogEntry;
              _err('buildProject', entry);
              return [entry, ...buf];
            });
            log.error(err.message, 9000);
          });
      },
      // ドキュメント単体をビルド
      buildDocument: () => {
        setBuildLog((buf) => {
          _log('buildProject');
          return [...buf];
        });
      },
      // ログのクリア
      clearLog: () => {
        setBuildLog([]);
      },
    };
  }, []);

  return (
    <PDFBuildLogContext.Provider value={buildLog}>
      <PDFBuildStateContext.Provider value={buildState}>
        <PDFBuildContext.Provider value={state}>
          {children}
        </PDFBuildContext.Provider>
      </PDFBuildStateContext.Provider>
    </PDFBuildLogContext.Provider>
  );
};
