import React, {useEffect, useCallback, useState} from 'react';
import {useRouter} from 'next/router';
import {useToast, RenderProps, useDisclosure} from '@chakra-ui/react';

import {useWarnBeforeLeaving} from '@middlewares/useWarnBeforeLeaving';

import * as UI from '@components/ui';
import {MarkdownEditor} from '@components/MarkdownEditor';
import {Previewer} from '@components/MarkdownPreviewer';

import {
  FileState,
  RepositoryContextProvider,
} from '@middlewares/useRepositoryContext';
import {usePreviewSourceContext} from '@middlewares/usePreviewSourceContext';
import {DocumentData, DocumentReference} from 'firebase/firestore';
import {useAppContext} from '@middlewares/useAppContext';
import {ProjectExplorer} from '@components/ProjectExplorer';
import {MenuBar} from '@components/MenuBar';

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
 * メインコンポーネント
 * @returns
 */
const GitHubOwnerRepo = () => {
  console.log('GitHubOwnerRepo');
  const app = useAppContext();
  const router = useRouter();
  const {owner, repo} = router.query;
  const [ownerRepo, setOwnerRepo] = useState<{owner: string; repo: string}>();
  useEffect(() => {
    if (app.user) {
      const ownerStr = Array.isArray(owner) ? owner[0] : owner ?? null;
      const repoStr = Array.isArray(repo) ? repo[0] : repo ?? null;
      setOwnerRepo({owner: ownerStr!, repo: repoStr!});
    }
  }, [app.user, owner, repo]);

  // const [session, setSession] =
  //   useState<DocumentReference<DocumentData> | null>(null);

  const [status, setStatus] = useState<FileState>('init');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [buildID, setBuildID] = useState<string | null>(null);
  const toast = useToast();
  const setWarnDialog = useWarnBeforeLeaving();
  const [isPresentationMode, setPresentationMode] = useState<boolean>(false);

  const previewSource = usePreviewSourceContext();

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

  const onModified = useCallback(
    (updatedText) => {
      console.log('onModified');
      previewSource.modifyText(updatedText);
      // modifiedText.set(updatedText);
      setStatus('modified');
      setWarnDialog(true);
    },
    [previewSource, setWarnDialog],
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

  // useEffect(() => {
  //   if (config) {
  //     setStylesheet(config.theme ?? '');
  //   }
  // }, [config]);

  return (
    <UI.Box>
      {ownerRepo ? (
        <RepositoryContextProvider
          owner={ownerRepo!.owner}
          repo={ownerRepo!.repo}
        >
          <>
            <UI.Flex
              w="100%"
              h={12}
              borderBottomWidth={1}
              borderBottomColor="gray.300"
            >
              <MenuBar
                isProcessing={isProcessing}
                isPresentationMode={isPresentationMode}
                setPresentationMode={setPresentationMode}
                setStatus={setStatus}
                setWarnDialog={setWarnDialog}
                onBuildPDFButtonClicked={onBuildPDFButtonClicked}                
              />
            </UI.Flex>
            <UI.Flex
              w="100vw"
              h={isPresentationMode ? 'calc(100vh - 115px)' : ''}
            >
              {isPresentationMode ? '' : <ProjectExplorer />}
              {status !== 'init' ? (
                <UI.Flex flex="1">
                  {isPresentationMode ? (
                    ''
                  ) : (
                    <UI.Box flex="1">
                      <MarkdownEditor {...{onModified}} />
                    </UI.Box>
                  )}
                  <UI.Box
                    width={isPresentationMode ? '100%' : '40%'}
                    overflow="scroll"
                  >
                    <Previewer />
                  </UI.Box>
                </UI.Flex>
              ) : (
                <UI.Container flex="1">
                  <UI.Text mt={6}>Loading</UI.Text>
                </UI.Container>
              )}
            </UI.Flex>
          </>
        </RepositoryContextProvider>
      ) : null}
    </UI.Box>
  );
};

export default GitHubOwnerRepo;
