import React, {useEffect, useCallback, useState} from 'react';
import {useRouter} from 'next/router';

import firebase from '../../../services/firebase';
import {useAuthorizedUser} from '../../../middlewares/useAuthorizedUser';
import {useEditorSession} from '../../../middlewares/useEditorSession';
import {useWarnBeforeLeaving} from './useWarnBeforeLeaving';

import * as UI from '../../../components/ui';
import {Header} from '../../../components/Header';
import {MarkdownEditor} from '../../../components/MarkdownEditor';
import {Previewer} from '../../../components/MarkdownPreviewer';
import {CommitSessionButton} from '../../../components/CommitSessionButton';

const themes = [
  {
    name: '銀河鉄道の夜',
    css:
      'https://vivliostyle.github.io/vivliostyle_doc/samples/gingatetsudo/style.css',
  },
  {
    name: 'Gutenberg',
    css:
      'https://vivliostyle.github.io/vivliostyle_doc/samples/gutenberg/gutenberg.css',
  },
];

export default () => {
  const {user, isPending} = useAuthorizedUser();
  const router = useRouter();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'init' | 'clean' | 'modified' | 'saved'>(
    'init',
  );
  const [themeURL, setThemeURL] = useState<string>('');
  const setWarnDialog = useWarnBeforeLeaving();

  const {owner, repo} = router.query;
  const ownerStr = Array.isArray(owner) ? owner[0] : owner;
  const repoStr = Array.isArray(repo) ? repo[0] : repo;
  const {session, sessionId} = useEditorSession({
    user,
    owner: ownerStr!,
    repo: repoStr!,
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
    // TODO: Build PDF
  }

  function onThemeSelected(themeURL: string) {
    setThemeURL(themeURL);
  }

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
                <UI.MenuItem onClick={onBuildPDFButtonClicked}>PDF</UI.MenuItem>
              </UI.MenuGroup>
            </UI.MenuList>
          </UI.Menu>
        </UI.Flex>
      </UI.Flex>
      {!isPending && status !== 'init' ? (
        <UI.Flex>
          <MarkdownEditor value={text} {...{onModified, onUpdate}} />
          <Previewer body={text} stylesheet={themeURL} />
        </UI.Flex>
      ) : (
        <UI.Container mt={6}>
          <UI.Text>Loading</UI.Text>
        </UI.Container>
      )}
    </UI.Box>
  );
};
