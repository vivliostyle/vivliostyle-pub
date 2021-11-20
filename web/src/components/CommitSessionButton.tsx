import { FileState } from '@middlewares/frontendFunctions';
import { useAppContext } from '@middlewares/useAppContext';
import { useCurrentFileContext } from '@middlewares/useCurrentFileContext';
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
  const currentFile = useCurrentFileContext();
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    // (async () => {
    //   setBusy(true);
    //   try {
    //     await modifiedText.commit(repository.currentFile?.session,repository.currentBranch!,app.user!);
    //     console.log('commit end');
    //     onDidSaved();
    //   } catch (error) {
    //     console.error(error);
    //   } finally {
    //     setBusy(false);
    //   }
    // })();
  }, []);

  return (
    <UI.Button
      {...{ onClick }}
      disabled={!(currentFile?.state == FileState.saved || currentFile?.state == FileState.modified)}
      isLoading={busy}
      loadingText="Saving document"
    >
      Save document
    </UI.Button>
  );
};
