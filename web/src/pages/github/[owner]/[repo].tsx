import React, {useEffect, useCallback, useState, useMemo} from 'react';
import {useRouter} from 'next/router';
import {useToast, RenderProps} from '@chakra-ui/react';

import {useWarnBeforeLeaving} from '@middlewares/useWarnBeforeLeaving';

import * as UI from '@components/ui';
import {MarkdownEditor} from '@components/MarkdownEditor';
import {Previewer} from '@components/MarkdownPreviewer';

import {
  RepositoryContextProvider,
} from '@middlewares/useRepositoryContext';
import {usePreviewSourceContext} from '@middlewares/usePreviewSourceContext';
import {DocumentData, DocumentReference} from 'firebase/firestore';
import {useAppContext} from '@middlewares/useAppContext';
import {ProjectExplorer} from '@components/ProjectExplorer';
import {MenuBar} from '@components/MenuBar';
import { FileState } from '@middlewares/frontendFunctions';

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
  const app = useAppContext();
  const router = useRouter();
  const {owner, repo} = useMemo(() => {
    if (app.user) {
      const owner = Array.isArray(router.query.owner) ? router.query.owner[0] : router.query.owner ?? null;
      const repo = Array.isArray(router.query.repo) ? router.query.repo[0] : router.query.repo ?? null;
      return {owner, repo: repo};
    }
    return {};
  }, [app.user, router.query]);
  console.log('GitHubOwnerRepo',app.isPending,owner,repo);

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

  const onModified = useCallback(
    (updatedText) => {
      console.log('onModified');
      previewSource.modifyText(updatedText);
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

  return (
      <UI.Box>
    {owner && owner != '' && repo && repo !='' ? (
        <RepositoryContextProvider
          owner={owner}
          repo={repo}
        >
          <>
            <UI.Flex
              w="100%"
              h={12}
              borderBottomWidth={1}
              borderBottomColor="gray.300"
            >
              <MenuBar
                status={status}
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
              {isPresentationMode ? null : <ProjectExplorer />}
                <UI.Flex flex="1">
                  {isPresentationMode ? null : (
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
            </UI.Flex>
          </>
        </RepositoryContextProvider>
    ) : null}
    </UI.Box>
    );
};

export default GitHubOwnerRepo;
