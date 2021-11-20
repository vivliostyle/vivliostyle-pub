import { useAppContext } from '@middlewares/useAppContext';
import { useModifiedTextContext } from '@middlewares/useModifiedTextContext';
import { useRepositoryContext } from '@middlewares/useRepositoryContext';
import React, { useCallback, useState } from 'react';
import * as UI from './ui';

export const CommitSessionButton = ({
  onDidSaved = () => {},
}: {
  onDidSaved?: () => void;
}) => {
  const app = useAppContext();
  const repository = useRepositoryContext();
  const modifiedText = useModifiedTextContext();
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    (async () => {
      setBusy(true);
      try {
        await modifiedText.commit(repository.currentFile?.session,repository.currentBranch!,app.user!);
        console.log('commit end');
        onDidSaved();
      } catch (error) {
        console.error(error);
      } finally {
        setBusy(false);
      }
    })();
  }, [modifiedText, repository.currentFile?.session, repository.currentBranch, app.user, onDidSaved]);

  return (
    <UI.Button
      {...{ onClick }}
      disabled={!(repository.currentFile?.state == 'saved' || repository.currentFile?.state == 'modified')}
      isLoading={busy}
      loadingText="Saving document"
    >
      Save document
    </UI.Button>
  );
};
