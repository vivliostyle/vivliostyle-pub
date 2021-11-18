import React, {useEffect, useCallback, useState, useMemo} from 'react';
import {ReflexContainer, ReflexSplitter, ReflexElement} from 'react-reflex';

import {useRouter} from 'next/router';
import {useToast, RenderProps} from '@chakra-ui/react';

import {useWarnBeforeLeaving} from '@middlewares/useWarnBeforeLeaving';

import * as UI from '@components/ui';
import {MarkdownEditor} from '@components/MarkdownEditor';
import {Previewer} from '@components/MarkdownPreviewer';

import {RepositoryContextProvider} from '@middlewares/useRepositoryContext';
import {DocumentData, DocumentReference} from 'firebase/firestore';
import {useAppContext} from '@middlewares/useAppContext';
import {PreviewSourceContextProvider} from '@middlewares/usePreviewSourceContext';

import {ProjectExplorer} from '@components/ProjectExplorer';
import {MenuBar} from '@components/MenuBar';
import {FileState} from '@middlewares/frontendFunctions';
import {useLogContext} from '@middlewares/useLogContext';
import {LogView} from '@components/LogView';
import {values} from 'lodash';

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
  const log = useLogContext();
  const app = useAppContext();
  const router = useRouter();
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
  console.log('GitHubOwnerRepo', app.isPending, owner, repo);

  // const [session, setSession] =
  //   useState<DocumentReference<DocumentData> | null>(null);

  const [status, setStatus] = useState<FileState>('init');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [buildID, setBuildID] = useState<string | null>(null);
  const toast = useToast();
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
    toast({
      duration: 9000,
      isClosable: true,
      render: ViewPDFToast,
    });
  });

  // check login
  useEffect(() => {
    if (!app.user) {
      router.replace('/');
    }
  }, [app.user, app.isPending, router]);

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
      log.error('modified');
      console.log('onModified');
      setStatus('modified');
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

  return (
    <UI.Box h={'calc(100vh - 4rem)'} backgroundColor={'white'}>
      {owner && owner != '' && repo && repo != '' ? (
        <RepositoryContextProvider owner={owner} repo={repo}>
          <PreviewSourceContextProvider>
            <UI.Box
              height={'calc(100vh - 4rem)'}
              // backgroundColor={'rgba(0,1,0,0.8)'}
            >{/* Wrapper  サイズ固定*/}
              <MenuBar
                status={status}
                isProcessing={isProcessing}
                isPresentationMode={isPresentationMode}
                setPresentationMode={setPresentationMode}
                setStatus={setStatus}
                setWarnDialog={setWarnDialog}
                onBuildPDFButtonClicked={onBuildPDFButtonClicked}
              />
              <UI.Box height={'calc(100vh - 8rem)'} backgroundColor={"pink"} borderTop={'solid 2px gray'}> {/* Main ファイルリスト、エディタ、プレビュー、ログ サイズ固定 */}
                <ReflexContainer orientation="horizontal" windowResizeAware={true}>
                  <ReflexElement className="top-pane" flex={1.0}>
                    <ReflexContainer orientation="vertical" windowResizeAware={true}>
                      <ReflexElement className="left-pane" flex={0.15} minSize={150}>
                        <UI.Box
                          height={'100%'}
                          backgroundColor="white"
                          overflow={'hidden'}
                        >
                          <ProjectExplorer />
                        </UI.Box>
                      </ReflexElement>
                      <ReflexSplitter />
                      <ReflexElement className="middle-pane">
                        <UI.Box
                          height={'100%'}
                          // height={'calc(100vh - 7em)'}
                          backgroundColor="lightblue"
                        >
                          <MarkdownEditor {...{onModified}} />
                        </UI.Box>
                      </ReflexElement>
                      <ReflexSplitter />
                      <ReflexElement className="right-pane">
                        <UI.Box height={'100%'}>
                        <Previewer />
                        </UI.Box>
                      </ReflexElement>
                    </ReflexContainer>
                  </ReflexElement>

                  <ReflexSplitter />

                  <ReflexElement className="bottom-pane" minSize={0} flex={0}>
                    <LogView />
                  </ReflexElement>
                </ReflexContainer>

              {/* Main */}</UI.Box>
              <UI.Box
                color={'white'}
                width={'100vw'}
                height={'1rem'}
                backgroundColor={'gray'}
                paddingLeft={10}
                fontSize={'0.5rem'}
              > {/* footer */}
                Vivliostyle Pub ver.0.0.0
              </UI.Box>
            {/* Wrapper */}</UI.Box>
          </PreviewSourceContextProvider>
        </RepositoryContextProvider>
      ) : null}
    </UI.Box>
  );
};

export default GitHubOwnerRepo;
