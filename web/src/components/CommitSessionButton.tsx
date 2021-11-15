import { useModifiedTextContext } from '@middlewares/useModifiedTextContext';
import firebase from 'firebase';
import { CurrentFile } from 'pages/github/[owner]/[repo]';
import React, { useCallback, useState } from 'react';
import * as UI from './ui';

export const CommitSessionButton = ({
  user,
  currentFile,
  branch,
  disabled,
  onDidSaved = () => {},
}: {
  user: firebase.User;
  currentFile: CurrentFile;
  branch: string | undefined;
  disabled?: boolean;
  onDidSaved?: () => void;
}) => {
  const modifiedText = useModifiedTextContext();
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    (async () => {
      setBusy(true);
      try {
        await modifiedText.commit(currentFile.session,branch,user);
        console.log('commit end');
        onDidSaved();
      } catch (error) {
        console.error(error);
      } finally {
        setBusy(false);
      }
    })();
  }, [user, currentFile, branch, onDidSaved, modifiedText]);

  return (
    <UI.Button
      {...{ onClick }}
      isDisabled={disabled}
      isLoading={busy}
      loadingText="Saving document"
    >
      Save document
    </UI.Button>
  );
};
