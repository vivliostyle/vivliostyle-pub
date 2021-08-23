import React, {useEffect, useCallback, useState, useRef, useMemo} from 'react';
import {useRouter} from 'next/router';
import {useToast} from '@chakra-ui/core';

import firebase from '@services/firebase';
import {useAuthorizedUser} from '@middlewares/useAuthorizedUser';
import {useEditorSession} from '@middlewares/useEditorSession';
import {useWarnBeforeLeaving} from '@middlewares/useWarnBeforeLeaving';
import {useVivlioStyleConfig} from '@middlewares/useVivliostyleConfig'

import * as UI from '@components/ui';
import {Header} from '@components/Header';
import {MarkdownEditor} from '@components/MarkdownEditor';
import {Previewer} from '@components/MarkdownPreviewer';
import {CommitSessionButton} from '@components/CommitSessionButton';

const themes = [
  {
    name: '縦書き小説',
    css:
      'https://vivliostyle.github.io/vivliostyle_doc/samples/gingatetsudo/style.css',
  },
  {
    name: '横書き欧文',
    css:
      'https://vivliostyle.github.io/vivliostyle_doc/samples/gutenberg/gutenberg.css',
  },
  {
    name: 'Viola',
    css:
      'https://raw.githubusercontent.com/youchan/viola-project/master/main.css',
  },
];

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
    const unsubscribe = firebase
      .firestore()
      .collection('builds')
      .doc(buildID)
      .onSnapshot(function (doc) {
        const {url} = doc.data() as BuildRecord;
        console.log('Current data: ', doc.data());
        if (!url) return;
        unsubscribe();
        if (onBuildFinished) onBuildFinished(url);
      });
    return unsubscribe;
  }, [buildID]);
}

export default () => {
  const {user, isPending} = useAuthorizedUser();
  const router = useRouter();
  const {owner, repo} = router.query;
  const ownerStr = Array.isArray(owner) ? owner[0] : owner;
  const repoStr = Array.isArray(repo) ? repo[0] : repo;
  const [filePath, setFilePath] = useState('');
  const {session, sessionId} = useEditorSession({
    user,
    owner: ownerStr!,
    repo: repoStr!,
    path: filePath
  });
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'init' | 'clean' | 'modified' | 'saved'>(
    'init',
  );
  const [stylesheet, setStylesheet] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [buildID, setBuildID] = useState<string | null>(null);
  const toast = useToast();
  const setWarnDialog = useWarnBeforeLeaving();

  useBuildStatus(buildID, (artifactURL: string) => {
    setIsProcessing(false);
    toast({
      duration: 9000,
      isClosable: true,
      render: ({onClose}) => (
        <UI.Box bg="tomato" p={5} color="white">
          <UI.Link href={artifactURL} isExternal onClick={onClose}>
            View PDF
          </UI.Link>
        </UI.Box>
      ),
    });
  });

  // check login
  useEffect(() => {
    if (!user && !isPending) {
      router.replace('/');
    }
  }, [user, isPending]);

  // set text
  useEffect(() => {
    if (!session) {
      return;
    }
    return session.onSnapshot((doc) => {
      const data = doc.data();
      if (!data?.text || data.text === text || doc.metadata.hasPendingWrites) {
        return;
      }
      setText(data.text);
      setStatus('clean');
    });
  }, [session, text]);

  const onModified = useCallback(() => {
    setStatus('modified');
    setWarnDialog(true);
  }, []);

  const onUpdate = useCallback(
    (updatedText) => {
      if (!session || updatedText === text) {
        return;
      }
      setText(updatedText);
      session
        .update({
          userUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          text: updatedText,
        })
        .then(() => {
          setStatus('saved');
        });
    },
    [text, session],
  );

  const onDidSaved = useCallback(() => {
    setStatus('clean');
    setWarnDialog(false);
  }, []);

  function onBuildPDFButtonClicked() {
    setIsProcessing(true);

    const buildPDF = firebase.functions().httpsCallable('buildPDF');
    buildPDF({owner, repo, stylesheet})
      .then((result) => {
        console.log(result);
        const buildID = result.data.buildID;
        setBuildID(buildID);
        toast({
          title: 'Build started',
          description: 'Your build has been started',
          status: 'success',
          duration: 5000,
          isClosable: false,
        });
      })
      .catch((err) => {
        toast({
          title: err.message,
          description: err.details,
          status: 'error',
          duration: 9000,
          isClosable: true,
        });
      });
  }

  function onThemeSelected(themeURL: string) {
    setStylesheet(themeURL);
  }

  const config = useVivlioStyleConfig({
    user,
    owner: ownerStr!,
    repo: repoStr!,
  })
  const filenames = useMemo(() => {
    if(!config || !config.entry) return []
    const ret = [] as string[]
    if(Array.isArray(config.entry)) {
      config.entry.forEach(e => {
        if(typeof e == 'string') ret.push(e)
        else if('path' in e) ret.push(e.path)
      })
    } else {
      if(typeof config.entry == 'string') ret.push(config.entry)
      else if('path' in config.entry) ret.push(config.entry.path)
    }
    return ret
  }, [config])
  const [filenamesFilterText, setFilenamesFilterText] = useState("")
  const filterdFilenames = useMemo(() => {
    return filenames.filter(f => f.includes(filenamesFilterText))
  }, [filenames, filenamesFilterText])

  return (
    <UI.Box>
      <Header />
      <UI.Flex
        w="100%"
        h={12}
        borderBottomWidth={1}
        borderBottomColor="gray.300"
      >
        <UI.Flex w="100%" px={8} justify="space-between" align="center">
          {status === 'saved' && <UI.Text>Document updated</UI.Text>}
          {user && sessionId && (
            <CommitSessionButton
              {...{user, sessionId, onDidSaved}}
              disabled={status !== 'saved'}
            />
          )}
          <UI.Flex align="center">
            {isProcessing && <UI.Spinner style={{marginRight: '10px'}} />}
            <UI.Menu>
              <UI.MenuButton as={UI.Button}>
                <UI.Icon name="chevron-down" /> Actions
              </UI.MenuButton>
              <UI.MenuList>
                <UI.MenuGroup title="Theme">
                  {themes.map((theme) => (
                    <UI.MenuItem
                      key={theme.name}
                      onClick={() => onThemeSelected(theme.css)}
                    >
                      {theme.name}
                    </UI.MenuItem>
                  ))}
                </UI.MenuGroup>
                <UI.MenuDivider />
                <UI.MenuGroup title="Export">
                  <UI.MenuItem onClick={onBuildPDFButtonClicked}>
                    PDF
                  </UI.MenuItem>
                </UI.MenuGroup>
              </UI.MenuList>
            </UI.Menu>
          </UI.Flex>
        </UI.Flex>
      </UI.Flex>
      <UI.Flex w="100vw">
        <UI.Box w="180px" resize="horizontal" overflowX="hidden" p="4">
          <UI.Input
            placeholder="search file" 
            value={filenamesFilterText}
            onChange={(event: React.ChangeEvent<HTMLInputElement>)=> {
              setFilenamesFilterText(event.target.value)
            }}
          />
          <UI.Box h="calc(100vh - 200px)" overflowY="auto">
            { filterdFilenames.map( path =>(
              <UI.Container p={0} key={path} onClick={() => setFilePath(path)}>
                <UI.Text mt={3} fontSize="sm">{path}</UI.Text>
              </UI.Container>
            )) }
          </UI.Box>
        </UI.Box>
        {!isPending && status !== 'init' ? (
          <UI.Flex flex="1">
            <UI.Box flex="1">
              <MarkdownEditor value={text} {...{onModified, onUpdate}} />
            </UI.Box>
            <UI.Box width="40%" overflow="scroll">
              <Previewer basename={`${filePath}.html`} body={text} stylesheet={stylesheet} owner={ownerStr!} repo={repoStr!} user={user} />
            </UI.Box>
          </UI.Flex>
        ) : (
          <UI.Container flex="1">
            <UI.Text mt={6}>Loading</UI.Text>
          </UI.Container>
        )}
      </UI.Flex>
    </UI.Box>
  );
};
