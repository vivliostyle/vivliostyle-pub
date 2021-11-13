import React, {useEffect, useCallback, useState, useMemo} from 'react';
import {useRouter} from 'next/router';
import {useToast, RenderProps, useDisclosure} from '@chakra-ui/react';

import firebase from '@services/firebase';
import {useAuthorizedUser} from '@middlewares/useAuthorizedUser';
import {useWarnBeforeLeaving} from '@middlewares/useWarnBeforeLeaving';
import {useVivlioStyleConfig} from '@middlewares/useVivliostyleConfig';

import * as UI from '@components/ui';
import {Header} from '@components/Header';
import {MarkdownEditor} from '@components/MarkdownEditor';
import {Previewer} from '@components/MarkdownPreviewer';
import {CommitSessionButton} from '@components/CommitSessionButton';
import {FileUploadModal} from '@components/FileUploadModal';
import {BranchSelecter} from '@components/BranchSelecter';
import {createFile, readFile} from '@middlewares/functions';

import {ThemeManager} from 'theme-manager';
import { Theme } from 'theme-manager/lib/ThemeManager';

const GitHubAccessToken:string|null = "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";

const themeManager = new ThemeManager(GitHubAccessToken);

// const themes = [
//   {
//     name: '縦書き小説',
//     css: 'https://vivliostyle.github.io/vivliostyle_doc/samples/gingatetsudo/style.css',
//   },
//   {
//     name: '横書き欧文',
//     css: 'https://vivliostyle.github.io/vivliostyle_doc/samples/gutenberg/gutenberg.css',
//   },
//   {
//     name: 'Viola',
//     css: 'https://raw.githubusercontent.com/youchan/viola-project/master/main.css',
//   },
// ];

interface BuildRecord {
  url: string | null;
  repo: {
    owner: string;
    repo: string;
    stylesheet: string;
  };
}
type FileState = 'init' | 'clean' | 'modified' | 'saved';
export type CurrentFile = {
  text: string;
  state: FileState;
  path: string;
  session?: firebase.firestore.DocumentReference;
};

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
  }, [buildID, onBuildFinished]);
}

const GitHubOwnerRepo = () => {


  const {user, isPending} = useAuthorizedUser();
  const router = useRouter();
  const {owner, repo} = router.query;
  const ownerStr = Array.isArray(owner) ? owner[0] : owner;
  const repoStr = Array.isArray(repo) ? repo[0] : repo;
  // const [filePath, setFilePath] = useState('');
  const [currentFile, setCurrentFile] = useState<CurrentFile>({
    text: '',
    path: '',
    state: 'init',
  });
  const [branch, setBranch] = useState<string | undefined>();
  const [session, setSession] =
    useState<firebase.firestore.DocumentReference<firebase.firestore.DocumentData> | null>(
      null,
    );

  // const [text, setText] = useState('');
  const [status, setStatus] = useState<FileState>('init');
  const [stylesheet, setStylesheet] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [buildID, setBuildID] = useState<string | null>(null);
  const toast = useToast();
  const setWarnDialog = useWarnBeforeLeaving();
  const [isPresentationMode,setPresentationMode] = useState<boolean>(false);

  const [themes, setThemes] = useState<Theme[]>([]);
  useEffect(()=>{
    (async () =>{
      const themeList = await themeManager.searchFromNpm();
      setThemes(themeList);
    })();
  },[user]);

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
    if (!user && !isPending) {
      router.replace('/');
    }
  }, [user, isPending, router]);

  // set text
  useEffect(() => {
    if (!session) {
      return;
    }
    // console.log('setOnSnapshot', session, currentFile);
    return session.onSnapshot((doc) => {
      const data = doc.data();
      if(data?.path !== currentFile.path) {
        return;
      }
      // console.log(
      //   'session(' + session.id + ').onSnapshot(state:',
      //   data?.state,
      //   ' path:',
      //   data?.path,
      //   ', hasPendingWrites:',
      //   doc.metadata.hasPendingWrites,
      //   ')',
      // );
      if (data?.state === 'update') { // update content
        setStatus('saved');
      } else if (data?.state === 'commit') { // commit file
        setStatus('clean');
      }

      if (
        !data?.text ||
        data.text === currentFile.text ||
        doc.metadata.hasPendingWrites
      ) {
        return;
      }
      // console.log('setText');
      setCurrentFile({...currentFile, text: data.text});
      //      setText(data.text);
      setStatus('clean');
    });
  }, [session, currentFile]);

  const onModified = useCallback(() => {
    console.log('onModified');
    setStatus('modified');
    setWarnDialog(true);
  }, [setWarnDialog]);

  const onUpdate = useCallback(
    (updatedText) => {
      console.log('onUpdate');
      if (!session || updatedText === currentFile.text) {
        // console.log('same text',session ,updatedText, currentFile.text);
        return;
      }
      //      setText(updatedText);
      setCurrentFile({...currentFile, text: updatedText});
      session
        .update({
          userUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          text: updatedText,
          state: 'update',
        })
        .then(() => {
          setStatus('saved');
        });
    },
    [currentFile, session],
  );

  const onDidSaved = useCallback(() => {
    setStatus('clean');
    setWarnDialog(false);
  }, [setWarnDialog]);

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

  /**
   * スタイルシートが変更された
   * @param theme 
   */
  function onThemeSelected(theme: Theme) {
    const VPUBFS_CACHE_NAME = 'vpubfs';
    const VPUBFS_ROOT = '/vpubfs';
    (async()=>{
      const cache = await caches.open(VPUBFS_CACHE_NAME);
      const file:File = new File([theme.files[theme.style]],theme.style);
      const headers = new Headers();
      headers.append('content-type', 'text/css');
      const stylesheetPath = `${theme.name}/${theme.style}`;
      const vpubfsPath = `${VPUBFS_ROOT}/${stylesheetPath}`;
      await cache.delete(new Request(vpubfsPath));
      await cache.put(
        vpubfsPath,
        new Response(theme.files[theme.style], { headers }),
      );
      setStylesheet(stylesheetPath);
    })();
  }

  const config = useVivlioStyleConfig({
    user,
    owner: ownerStr!,
    repo: repoStr!,
    branch: branch,
  });
  const filenames = useMemo(() => {
    if (!config || !config.entry) return [];
    const ret = [] as string[];
    if (Array.isArray(config.entry)) {
      config.entry.forEach((e) => {
        if (typeof e == 'string') ret.push(e);
        else if ('path' in e) ret.push(e.path);
      });
    } else {
      if (typeof config.entry == 'string') ret.push(config.entry);
      else if ('path' in config.entry) ret.push(config.entry.path);
    }
    return ret;
  }, [config]);
  const [filenamesFilterText, setFilenamesFilterText] = useState('');
  const filterdFilenames = useMemo(() => {
    return filenames.filter((f) => f.includes(filenamesFilterText));
  }, [filenames, filenamesFilterText]);

  useEffect(() => {
    if (config && config.theme) setStylesheet(config.theme);
  }, [config]);

  const {
    isOpen: isOpenFileUploadModal,
    onOpen: onOpenFileUploadModal,
    onClose: onCloseFileUploadModal,
  } = useDisclosure();

  const onBranchUpdate = useCallback((branch: string) => {
    setBranch(branch);
  }, []);

  /**
   * ファイルリストでファイルが選択された
   * @param path ファイルのパス
   * @returns void
   */
  const selectFile = (path: string) => {
    // 同じファイルを選択した場合何もしない
    if (path === currentFile.path || !user) {
      return;
    }
    // 現在の対象ファイルが未コミットなら警告を表示
    if (
      status !== 'clean' &&
      !confirm('ファイルが保存されていません。変更を破棄しますか?')
    ) {
      return;
    }
    // 対象ファイルが切り替えられたらWebAPIを通してファイルの情報を要求する
    readFile({user, owner: ownerStr, repo: repoStr, branch, path})
      .then((file) => {
        if (file) {
          // ファイル情報が取得できたら対象ファイルを変更してstateをcleanにする
          setCurrentFile(file);
          setStatus('clean');
          if (file.session) {
            setSession(file.session);
          }
        } else {
          // ファイル情報が取得できなかった
          console.error('file not found');
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

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
          <UI.Flex align="center">
            {owner} / {repo} /
            <UI.Box w="180px" px="4">
              <BranchSelecter
                user={user}
                owner={ownerStr!}
                repo={repoStr!}
                onChange={onBranchUpdate}
              />
            </UI.Box>
            {status === 'saved' && <UI.Text>Document updated : </UI.Text>}
            {user && session?.id && (
              <CommitSessionButton
                {...{user, sessionId: session.id, onDidSaved, branch}}
                disabled={status !== 'saved'}
              />
            )}
            {/* {stylesheet} */}
          </UI.Flex>
          <UI.Flex align="center">
            {isProcessing && <UI.Spinner style={{marginRight: '10px'}} />}
            <UI.Menu>
              <UI.MenuButton as={UI.Button}>
                <UI.Icon name="chevron-down" /> Actions
              </UI.MenuButton>
              <UI.MenuList>
                <UI.MenuItem onClick={()=>{ setPresentationMode(!isPresentationMode) }}>Presentation Mode</UI.MenuItem>
                <UI.MenuGroup title="Theme">
                  {themes.map((theme) => (
                    <UI.MenuItem
                      key={theme.name}
                      onClick={() => onThemeSelected(theme)}
                    >
                      {theme.description}
                    </UI.MenuItem>
                  ))}
                </UI.MenuGroup>
                <UI.MenuDivider />
                <UI.MenuGroup title="Add Files">
                  <UI.MenuItem onClick={onOpenFileUploadModal}>
                    Add Image
                  </UI.MenuItem>
                  <FileUploadModal
                    user={user}
                    owner={ownerStr!}
                    repo={repoStr!}
                    branch={branch}
                    isOpen={isOpenFileUploadModal}
                    onOpen={onOpenFileUploadModal}
                    onClose={onCloseFileUploadModal}
                  />
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
      <UI.Flex w="100vw" h={isPresentationMode ? 'calc(100vh - 115px)' : ''}>
        { isPresentationMode ? '': (
          <UI.Box w="180px" resize="horizontal" overflowX="hidden" p="4">
          <UI.Input
            placeholder="search file"
            value={filenamesFilterText}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setFilenamesFilterText(event.target.value);
            }}
          />
          <UI.Box h="calc(100vh - 200px)" overflowY="auto">
            {filterdFilenames.map((path) => (
              <UI.Container
                p={0}
                key={path}
                onClick={() => selectFile(path)}
                cursor="default"
              >
                <UI.Text
                  mt={3}
                  fontSize="sm"
                  fontWeight={path == currentFile.path ? 'bold' : 'normal'}
                >
                  {path}
                </UI.Text>
              </UI.Container>
            ))}
          </UI.Box>
        </UI.Box>
        )}
        {!isPending && status !== 'init' ? (
          <UI.Flex flex="1">
            { isPresentationMode ? '': (
            <UI.Box flex="1">
              <MarkdownEditor
                currentFile={currentFile}
                {...{onModified, onUpdate}}
              />
            </UI.Box>
            )}
            <UI.Box width={isPresentationMode ? '100%' : '40%'} overflow="scroll">
              <Previewer
                basename={currentFile.path.replace(/\.md$/, '.html')}
                body={currentFile.text}
                stylesheet={stylesheet}
                owner={ownerStr!}
                repo={repoStr!}
                user={user}
              />
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

export default GitHubOwnerRepo;
