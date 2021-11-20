import React, {useEffect, useCallback, useState, useMemo} from 'react';
import {ReflexContainer, ReflexSplitter, ReflexElement} from 'react-reflex';

import {useRouter} from 'next/router';
import {RenderProps} from '@chakra-ui/react';

import {useWarnBeforeLeaving} from '@middlewares/useWarnBeforeLeaving';

import * as UI from '@components/ui';
import {MarkdownEditor} from '@components/MarkdownEditor';
import {Previewer} from '@components/MarkdownPreviewer';

import {RepositoryContextProvider} from '@middlewares/useRepositoryContext';
import {useAppContext} from '@middlewares/useAppContext';
import {PreviewSourceContextProvider, usePreviewSourceContext} from '@middlewares/usePreviewSourceContext';

import {ProjectExplorer} from '@components/ProjectExplorer';
import {MenuBar} from '@components/MenuBar';
import {FileState} from '@middlewares/frontendFunctions';
import {useLogContext} from '@middlewares/useLogContext';
import {LogView} from '@components/LogView';
import {Footer} from '@components/Footer';

interface BuildRecord {
  url: string | null;
  repo: {
    owner: string;
    repo: string;
    stylesheet: string;
  };
}

function useBuildStatus(
  buildID: string | null,
  onBuildFinished?: (artifactURL: string) => void,
) {
  useEffect(() => {
    if (!buildID) return;
    // const unsubscribe = firebase
    //   .firestore()
    //   .collection('builds')
    //   .doc(buildID)
    //   .onSnapshot(function (doc) {
    //     const {url} = doc.data() as BuildRecord;
    //     console.log('Current data: ', doc.data());
    //     if (!url) return;
    //     unsubscribe();
    //     if (onBuildFinished) onBuildFinished(url);
    //   });
    // return unsubscribe;
  }, [buildID, onBuildFinished]);
}

/**
 * メインコンポーネント
 * @returns
 */
const GitHubOwnerRepo = () => {
  const router = useRouter();

  const log = useLogContext();
  const app = useAppContext();

  // check login
  useEffect(() => {
    if (!app.user) {
      router.replace('/');
    }
  }, [app.user, app.isPending, router]);

  const {owner, repo} = useMemo(() => {
    if (app.user) {
      const owner = Array.isArray(router.query.owner)
        ? router.query.owner[0]
        : router.query.owner ?? null;
      const repo = Array.isArray(router.query.repo)
        ? router.query.repo[0]
        : router.query.repo ?? null;
      return {owner, repo: repo};
    }
    return {};
  }, [app.user, router.query]);
  console.log('[GitHubOwnerRepo]', app.isPending, owner, repo);

  // const [session, setSession] =
  //   useState<DocumentReference<DocumentData> | null>(null);

  const [status, setStatus] = useState<FileState>(FileState.init);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [buildID, setBuildID] = useState<string | null>(null);
  // const toast = useToast();
  const setWarnDialog = useWarnBeforeLeaving();
  const [isPresentationMode, setPresentationMode] = useState<boolean>(false);

  useBuildStatus(buildID, (artifactURL: string) => {
    setIsProcessing(false);
    const ViewPDFToast = ({onClose}: RenderProps) => (
      <UI.Box bg="tomato" p={5} color="white">
        <UI.Link href={artifactURL} isExternal onClick={onClose}>
          View PDF
        </UI.Link>
      </UI.Box>
    );
    log.info('View PDF'); // TODO リンクにする
    // toast({
    //   duration: 9000,
    //   isClosable: true,
    //   render: ViewPDFToast,
    // });
  });

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

  function onBuildPDFButtonClicked() {
    setIsProcessing(true);

    // const buildPDF = firebase.functions().httpsCallable('buildPDF');
    // buildPDF({owner, repo, stylesheet})
    //   .then((result:any) => {
    //     console.log(result);
    //     const buildID = result.data.buildID;
    //     setBuildID(buildID);
    //     toast({
    //       title: 'Build started',
    //       description: 'Your build has been started',
    //       status: 'success',
    //       duration: 5000,
    //       isClosable: false,
    //     });
    //   })
    //   .catch((err:any) => {
    //     toast({
    //       title: err.message,
    //       description: err.details,
    //       status: 'error',
    //       duration: 9000,
    //       isClosable: true,
    //     });
    //   });
  }

  const onLogging = (num: number) => {
    console.log('onLogging', num);
    // TODO: ログが追加されたらLogViewを表示する。 手動で大きさを変えたあとでも対応できるようにする。
  };

  return (
    <UI.Box h={'calc(100vh - 4rem)'}>
      {owner && owner != '' && repo && repo != '' ? (
        <RepositoryContextProvider owner={owner} repo={repo}>
          <PreviewSourceContextProvider>
            <UI.Box height={'calc(100vh - 4rem)'}>
              {/* Wrapper  サイズ固定*/}
              <MenuBar
                isProcessing={isProcessing}
                isPresentationMode={isPresentationMode}
                setPresentationMode={setPresentationMode}
                setWarnDialog={setWarnDialog}
                onBuildPDFButtonClicked={onBuildPDFButtonClicked}
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
                      {isPresentationMode ? null : (
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
                      {isPresentationMode ? null : <ReflexSplitter />}
                      {isPresentationMode ? null : (
                        <ReflexElement className="middle-pane">
                          <UI.Box height={'100%'}>
                            <MarkdownEditor {...{onModified}} />
                          </UI.Box>
                        </ReflexElement>
                      )}
                      {isPresentationMode ? null : <ReflexSplitter />}
                      <ReflexElement className="right-pane">
                        <UI.Box height={'100%'}>
                          <Previewer />
                        </UI.Box>
                      </ReflexElement>
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
      ) : null}
    </UI.Box>
  );
};

export default GitHubOwnerRepo;
