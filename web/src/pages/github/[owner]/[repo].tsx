import React, {useEffect, useCallback, useState, useMemo, useRef} from 'react';
import {ReflexContainer, ReflexSplitter, ReflexElement} from 'react-reflex';

import {useRouter} from 'next/router';

import {useWarnBeforeLeaving} from '@middlewares/useWarnBeforeLeaving';

import * as UI from '@components/ui';
import {MarkdownEditor} from '@components/MarkdownEditor';
import {MarkdownPreviewer} from '@components/MarkdownPreviewer';

import {RepositoryContextProvider} from '@middlewares/contexts/useRepositoryContext';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {PreviewSourceContextProvider} from '@middlewares/contexts/usePreviewSourceContext';

import {ProjectExplorer} from '@components/ProjectExplorer';
import {MenuBar} from '@components/MenuBar';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {LogView} from '@components/LogView';
import {Footer} from '@components/Footer';
import {CurrentThemeContextProvider} from '@middlewares/contexts/useCurrentThemeContext';
import {getFunctions, httpsCallable} from 'firebase/functions';
import {doc, onSnapshot} from 'firebase/firestore';
import {db} from '@services/firebase';
import {t} from 'i18next';
import {Theme} from 'theme-manager';

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
 * メインコンポーネント
 * @returns
 */
const GitHubOwnerRepo = () => {
  const router = useRouter();

  const log = useLogContext();
  const app = useAppContext();

  const [isExplorerVisible, setExplorerVisible] = useState<boolean>(true);
  const [isEditorVisible, setEditorVisible] = useState<boolean>(true);
  const [isPreviewerVisible, setPreviewerVisible] = useState<boolean>(true);

  const [isAutoReload, setAutoReload] = useState<boolean>(true);

  // クエリパラメータでカレントブランチ、カレントファイルが指定されている
  const url = new URL(window.location.toString());
  const paramBranch = url.searchParams.get('branch') ?? undefined;
  const paramFile = url.searchParams.get('file') ?? undefined;

  // check login
  useEffect(() => {
    if (!app.state.user) {
      router.replace('/');
    }
  }, [app.state.user, app.state.isPending, router]);

  const {owner, repo} = useMemo(() => {
    if (app.state.user) {
      const owner = Array.isArray(router.query.owner)
        ? router.query.owner[0]
        : router.query.owner ?? null;
      const repo = Array.isArray(router.query.repo)
        ? router.query.repo[0]
        : router.query.repo ?? null;
      return {owner, repo: repo};
    }
    return {};
  }, [app.state.user, router.query]);
  console.log('[GitHubOwnerRepo]', app.state.isPending, owner, repo);

  // const [session, setSession] =
  //   useState<DocumentReference<DocumentData> | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [buildID, setBuildID] = useState<string | null>(null);
  // const toast = useToast();
  const setWarnDialog = useWarnBeforeLeaving();
  const [isPresentationMode, setPresentationMode] = useState<boolean>(false);

  useEffect(() => {
    if (!buildID || !app.state.user) return;
    const unsubscribe = onSnapshot(
      doc(db, `users/${app.state.user.uid}/builds/${buildID}`),
      (doc) => {
        const {signedUrl} = doc.data() as BuildRecord;
        if (!signedUrl) return;
        unsubscribe();
        setIsProcessing(false);
        log.success(
          <UI.Text>
            {t('以下のリンクをクリックして表示してください')}
            <UI.Link href={signedUrl} isExternal textDecoration={'underline'}>
              View PDF
            </UI.Link>
          </UI.Text>,
          5000,
        );
        setBuildID(null);
      },
    );
  }, [buildID, app.state.user]);

  // set text
  // useEffect(() => {
  //   if (!session) {
  //     return;
  //   }
  //   // console.log('setOnSnapshot', session, currentFile);
  //   return session.onSnapshot((doc) => {
  //     const data = doc.data();
  //     if(data?.path !== currentFile.path) {
  //       return;
  //     }
  //     // console.log(
  //     //   'session(' + session.id + ').onSnapshot(state:',
  //     //   data?.state,
  //     //   ' path:',
  //     //   data?.path,
  //     //   ', hasPendingWrites:',
  //     //   doc.metadata.hasPendingWrites,
  //     //   ')',
  //     // );
  //     if (data?.state === 'update') { // update content
  //       setStatus('saved');
  //     } else if (data?.state === 'commit') { // commit file
  //       setStatus('clean');
  //     }

  //     if (
  //       !data?.text ||
  //       data.text === currentFile.text ||
  //       doc.metadata.hasPendingWrites
  //     ) {
  //       return;
  //     }
  //     // console.log('setText');
  //     // setCurrentFile({...currentFile, text: data.text});
  //     //      setText(data.text);
  //     // setStatus('clean');
  //   });
  // }, [session, currentFile]);

  const onModified = useCallback(
    (updatedText) => {
      setWarnDialog(true);
    },
    [setWarnDialog],
  );

  const onBuildPDFButtonClicked = useCallback(
    (theme: Theme | null, httpMode: boolean, branch: string | null) => {
      setIsProcessing(true);
      const functions = getFunctions();
      const buildPDF = httpsCallable(functions, 'buildPDF');
      const themeName =
        theme &&
        theme.name !== 'plain-theme' &&
        theme.name !== 'vivliostyle-custom-theme'
          ? theme.name
          : '';
      buildPDF({owner, repo, themeName, httpMode, branch: branch ?? ''})
        .then((result: any) => {
          console.log('buildPDF function', result);
          const buildID = result.data.buildID;
          setBuildID(buildID);
          log.info(t('ビルドを開始しました'), 5000);
        })
        .catch((err: any) => {
          log.error(err.message, 9000);
        });
    },
    [],
  );

  const onLogging = (num: number) => {
    console.log('onLogging', num);
    // TODO: ログが追加されたらLogViewを表示する。 手動で大きさを変えたあとでも対応できるようにする。
  };

  return (
    <UI.Box h={'calc(100vh - 4rem)'}>
      {owner && owner != '' && repo && repo != '' ? (
        <CurrentThemeContextProvider>
          <RepositoryContextProvider
            owner={owner}
            repo={repo}
            branch={paramBranch}
            file={paramFile}
          >
            <PreviewSourceContextProvider isAutoReload={isAutoReload}>
              <UI.Box height={'calc(100vh - 4rem)'}>
                {/* Wrapper  サイズ固定*/}
                <MenuBar
                  isProcessing={isProcessing}
                  isPresentationMode={isPresentationMode}
                  setPresentationMode={setPresentationMode}
                  setWarnDialog={setWarnDialog}
                  onBuildPDFButtonClicked={onBuildPDFButtonClicked}
                  isEditorVisible={isEditorVisible}
                  onToggleEditor={(f: boolean) => {
                    setEditorVisible(f);
                  }}
                  isExplorerVisible={isExplorerVisible}
                  onToggleExplorer={(f: boolean) => {
                    setExplorerVisible(f);
                  }}
                  isPreviewerVisible={isPreviewerVisible}
                  onTogglePreviewer={(f: boolean) => {
                    setPreviewerVisible(f);
                  }}
                  isAutoReload={isAutoReload}
                  setAutoReload={(f: boolean) => {
                    setAutoReload(f);
                  }}
                  onReload={() => {
                    /* TODO: 手動リロード */
                  }}
                />
                <UI.Box
                  height={'calc(100vh - 8rem)'}
                  borderTop={'solid 1px gray'}
                >
                  {/* Main ファイルリスト、エディタ、プレビュー、ログ サイズ固定 */}
                  <ReflexContainer
                    orientation="horizontal"
                    windowResizeAware={true}
                  >
                    <ReflexElement className="top-pane" flex={1.0}>
                      <ReflexContainer
                        orientation="vertical"
                        windowResizeAware={true}
                      >
                        {isPresentationMode || !isExplorerVisible ? null : (
                          <ReflexElement
                            className="left-pane"
                            flex={0.15}
                            minSize={150}
                          >
                            <UI.Box
                              height={'100%'}
                              backgroundColor="white"
                              overflow={'hidden'}
                            >
                              <ProjectExplorer />
                            </UI.Box>
                          </ReflexElement>
                        )}
                        {isPresentationMode || !isEditorVisible ? null : (
                          <ReflexSplitter />
                        )}
                        {isPresentationMode || !isEditorVisible ? null : (
                          <ReflexElement className="middle-pane">
                            <UI.Box height={'100%'}>
                              <MarkdownEditor {...{onModified}} />
                            </UI.Box>
                          </ReflexElement>
                        )}

                        {isPresentationMode ? null : <ReflexSplitter />}
                        {!isPreviewerVisible ? null : (
                          <ReflexElement className="right-pane">
                            <UI.Box height={'100%'}>
                              <MarkdownPreviewer />
                            </UI.Box>
                          </ReflexElement>
                        )}
                      </ReflexContainer>
                    </ReflexElement>

                    <ReflexSplitter />

                    <ReflexElement className="bottom-pane" minSize={0} flex={0}>
                      <LogView onLogging={onLogging} />
                    </ReflexElement>
                  </ReflexContainer>
                  {/* Main */}
                </UI.Box>
                <Footer />
                {/* Wrapper */}
              </UI.Box>
            </PreviewSourceContextProvider>
          </RepositoryContextProvider>
        </CurrentThemeContextProvider>
      ) : null}
    </UI.Box>
  );
};

export default GitHubOwnerRepo;
